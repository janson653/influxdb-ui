use serde::{Deserialize, Serialize};
use influxdb::{Client, ReadQuery};
use std::collections::HashMap;

// 重用连接配置
use crate::connection_store::ConnectionConfig;

// 数据结构定义
#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub measurement_count: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MeasurementInfo {
    pub name: String,
    pub field_count: usize,
    pub tag_count: usize,
    pub series_count: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FieldInfo {
    pub name: String,
    pub data_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TagValue {
    pub key: String,
    pub value: String,
    pub count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub series: Vec<Series>,
    pub execution_time_ms: u64,
    pub row_count: usize,
    pub warning: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Series {
    pub name: String,
    pub columns: Vec<String>,
    pub values: Vec<Vec<serde_json::Value>>,
    pub tags: Option<HashMap<String, String>>,
}

// 错误类型
#[derive(Debug, Serialize, Deserialize)]
pub enum ApiError {
    ConnectionError(String),
    QueryError(String),
    ParseError(String),
    TimeoutError(String),
    AuthenticationError(String),
    ValidationError(String),
    UnknownError(String),
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ApiError::ConnectionError(msg) => write!(f, "Connection error: {}", msg),
            ApiError::QueryError(msg) => write!(f, "Query error: {}", msg),
            ApiError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            ApiError::TimeoutError(msg) => write!(f, "Timeout error: {}", msg),
            ApiError::AuthenticationError(msg) => write!(f, "Authentication error: {}", msg),
            ApiError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            ApiError::UnknownError(msg) => write!(f, "Unknown error: {}", msg),
        }
    }
}

impl std::error::Error for ApiError {}

// 工具函数：创建 InfluxDB 客户端
fn create_client(config: &ConnectionConfig) -> Result<Client, ApiError> {
    println!("🔧 [Database] 创建客户端: {}", config.url);
    
    // 验证 URL 格式
    if !config.url.starts_with("http://") && !config.url.starts_with("https://") {
        return Err(ApiError::ValidationError(format!(
            "URL格式错误，请使用http://或https://开头: {}", config.url
        )));
    }

    let mut client = Client::new(&config.url, &config.database);
    
    if let Some(username) = &config.username {
        let password = config.password.as_deref().unwrap_or("");
        println!("🔐 [Database] 使用认证: {}", username);
        client = client.with_auth(username, password);
    } else {
        println!("ℹ️ [Database] 无认证信息，使用匿名连接");
    }

    Ok(client)
}

// 工具函数：执行查询
async fn execute_query_with_client(
    client: &Client,
    query: &str,
) -> Result<QueryResult, ApiError> {
    println!("🔍 [Database] 执行查询: {}", query);
    let start_time = std::time::Instant::now();

    let influx_query = ReadQuery::new(query.to_string());

    match client.json_query(influx_query).await {
        Ok(json_response) => {
            let execution_time = start_time.elapsed().as_millis() as u64;
            println!("✅ [Database] 查询执行成功 - 耗时: {}ms", execution_time);

            // 解析响应
            let result: Result<Vec<Series>, _> = serde_json::from_value(
                serde_json::to_value(json_response.results).unwrap_or_default()
            );

            match result {
                Ok(series) => {
                    let row_count = series.iter()
                        .map(|s| s.values.len())
                        .sum();
                    
                    println!("📊 [Database] 返回数据: {} series, {} rows", series.len(), row_count);
                    
                    Ok(QueryResult {
                        series,
                        execution_time_ms: execution_time,
                        row_count,
                        warning: None,
                    })
                }
                Err(e) => {
                    println!("❌ [Database] JSON 解析失败: {}", e);
                    Err(ApiError::ParseError(format!("Failed to parse query result: {}", e)))
                }
            }
        }
        Err(e) => {
            let execution_time = start_time.elapsed().as_millis() as u64;
            println!("❌ [Database] 查询执行失败 - 耗时: {}ms, 错误: {}", execution_time, e);
            
            // 分类错误类型
            let error_msg = e.to_string();
            let api_error = if error_msg.contains("connection refused") {
                ApiError::ConnectionError(format!("连接被拒绝: {}", error_msg))
            } else if error_msg.contains("timed out") {
                ApiError::TimeoutError(format!("查询超时: {}", error_msg))
            } else if error_msg.contains("authentication") || error_msg.contains("unauthorized") {
                ApiError::AuthenticationError(format!("认证失败: {}", error_msg))
            } else if error_msg.contains("syntax") || error_msg.contains("parse") {
                ApiError::QueryError(format!("查询语法错误: {}", error_msg))
            } else {
                ApiError::QueryError(format!("查询失败: {}", error_msg))
            };

            Err(api_error)
        }
    }
}

// 获取数据库列表
#[tauri::command]
pub async fn get_databases(connection_id: String) -> Result<Vec<String>, ApiError> {
    println!("📊 [Database] 获取数据库列表 - 连接ID: {}", connection_id);
    
    // 从连接存储中获取配置
    let configs = crate::connection_store::load_connections()
        .await
        .map_err(|e| ApiError::ConnectionError(format!("无法加载连接配置: {}", e)))?;
    
    let config = configs.into_iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| ApiError::ValidationError("连接配置不存在".to_string()))?;
    
    let client = create_client(&config)?;
    let result = execute_query_with_client(&client, "SHOW DATABASES").await?;
    
    let databases: Vec<String> = result.series.iter()
        .flat_map(|series| &series.values)
        .filter_map(|row| row.get(0))
        .filter_map(|value| value.as_str())
        .map(|s| s.to_string())
        .collect();
    
    println!("✅ [Database] 获取到 {} 个数据库", databases.len());
    Ok(databases)
}

// 获取测量列表
#[tauri::command]
pub async fn get_measurements(
    connection_id: String,
    database: String,
) -> Result<Vec<String>, ApiError> {
    println!("📊 [Database] 获取测量列表 - 连接ID: {}, 数据库: {}", connection_id, database);
    
    // 从连接存储中获取配置
    let configs = crate::connection_store::load_connections()
        .await
        .map_err(|e| ApiError::ConnectionError(format!("无法加载连接配置: {}", e)))?;
    
    let mut config = configs.into_iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| ApiError::ValidationError("连接配置不存在".to_string()))?;
    
    // 使用指定的数据库
    config.database = database;
    
    let client = create_client(&config)?;
    let result = execute_query_with_client(&client, "SHOW MEASUREMENTS").await?;
    
    let measurements: Vec<String> = result.series.iter()
        .flat_map(|series| &series.values)
        .filter_map(|row| row.get(0))
        .filter_map(|value| value.as_str())
        .map(|s| s.to_string())
        .collect();
    
    println!("✅ [Database] 获取到 {} 个测量", measurements.len());
    Ok(measurements)
}

// 获取标签键
#[tauri::command]
pub async fn get_tag_keys(
    connection_id: String,
    database: String,
    measurement: String,
) -> Result<Vec<String>, ApiError> {
    println!("🏷️ [Database] 获取标签键 - 连接ID: {}, 数据库: {}, 测量: {}", connection_id, database, measurement);
    
    let configs = crate::connection_store::load_connections()
        .await
        .map_err(|e| ApiError::ConnectionError(format!("无法加载连接配置: {}", e)))?;
    
    let mut config = configs.into_iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| ApiError::ValidationError("连接配置不存在".to_string()))?;
    
    config.database = database;
    
    let client = create_client(&config)?;
    let query = format!("SHOW TAG KEYS FROM \"{}\"", measurement);
    let result = execute_query_with_client(&client, &query).await?;
    
    let tag_keys: Vec<String> = result.series.iter()
        .flat_map(|series| &series.values)
        .filter_map(|row| row.get(0))
        .filter_map(|value| value.as_str())
        .map(|s| s.to_string())
        .collect();
    
    println!("✅ [Database] 获取到 {} 个标签键", tag_keys.len());
    Ok(tag_keys)
}

// 获取字段键
#[tauri::command]
pub async fn get_field_keys(
    connection_id: String,
    database: String,
    measurement: String,
) -> Result<Vec<FieldInfo>, ApiError> {
    println!("🔑 [Database] 获取字段键 - 连接ID: {}, 数据库: {}, 测量: {}", connection_id, database, measurement);
    
    let configs = crate::connection_store::load_connections()
        .await
        .map_err(|e| ApiError::ConnectionError(format!("无法加载连接配置: {}", e)))?;
    
    let mut config = configs.into_iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| ApiError::ValidationError("连接配置不存在".to_string()))?;
    
    config.database = database;
    
    let client = create_client(&config)?;
    let query = format!("SHOW FIELD KEYS FROM \"{}\"", measurement);
    let result = execute_query_with_client(&client, &query).await?;
    
    let field_infos: Vec<FieldInfo> = result.series.iter()
        .flat_map(|series| &series.values)
        .filter_map(|row| {
            if let (Some(key), Some(data_type)) = (row.get(0), row.get(1)) {
                Some(FieldInfo {
                    name: key.as_str().unwrap_or("").to_string(),
                    data_type: data_type.as_str().unwrap_or("unknown").to_string(),
                })
            } else {
                None
            }
        })
        .collect();
    
    println!("✅ [Database] 获取到 {} 个字段键", field_infos.len());
    Ok(field_infos)
}

// 获取测量详细信息
#[tauri::command]
pub async fn get_measurement_info(
    connection_id: String,
    database: String,
    measurement: String,
) -> Result<MeasurementInfo, ApiError> {
    println!("📋 [Database] 获取测量信息 - 连接ID: {}, 数据库: {}, 测量: {}", connection_id, database, measurement);
    
    let configs = crate::connection_store::load_connections()
        .await
        .map_err(|e| ApiError::ConnectionError(format!("无法加载连接配置: {}", e)))?;
    
    let mut config = configs.into_iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| ApiError::ValidationError("连接配置不存在".to_string()))?;
    
    config.database = database;
    
    let client = create_client(&config)?;
    
    // 获取字段键
    let field_query = format!("SHOW FIELD KEYS FROM \"{}\"", measurement);
    let field_result = execute_query_with_client(&client, &field_query).await?;
    let field_count = field_result.series.iter()
        .flat_map(|series| &series.values)
        .count();
    
    // 获取标签键
    let tag_query = format!("SHOW TAG KEYS FROM \"{}\"", measurement);
    let tag_result = execute_query_with_client(&client, &tag_query).await?;
    let tag_count = tag_result.series.iter()
        .flat_map(|series| &series.values)
        .count();
    
    // 获取系列数量
    let series_query = format!("SHOW SERIES FROM \"{}\"", measurement);
    let series_result = execute_query_with_client(&client, &series_query).await?;
    let series_count = series_result.series.iter()
        .flat_map(|series| &series.values)
        .count();
    
    let info = MeasurementInfo {
        name: measurement,
        field_count,
        tag_count,
        series_count: if series_count > 0 { Some(series_count) } else { None },
    };
    
    println!("✅ [Database] 测量信息: 字段={}, 标签={}, 系列={:?}", field_count, tag_count, info.series_count);
    Ok(info)
}

// 优化的查询执行
#[tauri::command]
pub async fn execute_query_optimized(
    connection_id: String,
    database: String,
    query: String,
    chunk_size: Option<u32>,
    _timeout_ms: Option<u64>,
) -> Result<QueryResult, ApiError> {
    println!("🚀 [Database] 执行优化查询 - 连接ID: {}, 数据库: {}", connection_id, database);
    println!("📝 [Database] 查询语句: {}", query);
    
    let configs = crate::connection_store::load_connections()
        .await
        .map_err(|e| ApiError::ConnectionError(format!("无法加载连接配置: {}", e)))?;
    
    let mut config = configs.into_iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| ApiError::ValidationError("连接配置不存在".to_string()))?;
    
    config.database = database;
    
    let client = create_client(&config)?;
    
    // 添加 LIMIT 子句（如果指定了 chunk_size）
    let final_query = if let Some(chunk) = chunk_size {
        if query.to_uppercase().contains("LIMIT") {
            query // 已经有 LIMIT，不重复添加
        } else {
            format!("{} LIMIT {}", query, chunk)
        }
    } else {
        query
    };
    
    let result = execute_query_with_client(&client, &final_query).await?;
    
    println!("✅ [Database] 优化查询执行成功");
    Ok(result)
}