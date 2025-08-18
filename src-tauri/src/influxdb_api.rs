use influxdb::{Client, Timestamp, InfluxDbWriteable, ReadQuery};
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug)]
struct Series {
    name: String,
    columns: Vec<String>,
    values: Vec<Vec<serde_json::Value>>,
}

#[derive(Debug, InfluxDbWriteable)]
pub struct Measurement {
    time: Timestamp,
    #[influxdb(tag)]
    host: String,
    #[influxdb(tag)]
    region: String,
    cpu_usage: f64,
    memory_free: f64,
}

#[tauri::command]
pub async fn write_data(
    host: String,
    region: String,
    cpu_usage: f64,
    memory_free: f64,
    influxdb_url: String,
    influxdb_database: String,
) -> Result<String, String> {
    let client = Client::new(influxdb_url, influxdb_database);

    let measurement = Measurement {
        time: Timestamp::from(Utc::now()),
        host,
        region,
        cpu_usage,
        memory_free,
    };

    match client.query(&measurement.into_query("cpu_metrics")).await {
        Ok(_) => Ok("Data written successfully".to_string()),
        Err(e) => Err(format!("Failed to write data: {}", e)),
    }
}

#[tauri::command]
pub async fn query_data(
    query_string: String,
    influxdb_url: String,
    influxdb_database: String,
    username: Option<String>,
    password: Option<String>,
) -> Result<String, String> {
    println!("🔍 [Rust] 执行查询:");
    println!("  URL: {}", influxdb_url);
    println!("  Database: {}", influxdb_database);
    println!("  Query: {}", query_string);
    println!("  Username: {:?}", username);
    
    let mut client = Client::new(influxdb_url, influxdb_database);
    
    if let (Some(u), Some(p)) = (username, password) {
        println!("🔐 [Rust] 使用认证: {}", u);
        client = client.with_auth(u, p);
    }
    
    let query = ReadQuery::new(query_string);

    match client.json_query(query).await {
        Ok(json) => {
            println!("✅ [Rust] 查询执行成功");
            let result: Result<Vec<Series>, _> = serde_json::from_value(serde_json::to_value(json.results).unwrap());
            match result {
                Ok(series) => {
                    let json_str = serde_json::to_string(&series).unwrap_or_else(|e| format!("Failed to serialize JSON: {}", e));
                    println!("📄 [Rust] 返回数据长度: {}", json_str.len());
                    Ok(json_str)
                },
                Err(e) => {
                    println!("❌ [Rust] JSON 反序列化失败: {}", e);
                    Err(format!("Failed to deserialize JSON: {}", e))
                },
            }
        },
        Err(e) => {
            println!("❌ [Rust] 查询执行失败: {}", e);
            Err(format!("Failed to query data: {}", e))
        }
    }
}