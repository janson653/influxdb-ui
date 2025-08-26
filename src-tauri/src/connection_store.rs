use serde::{Deserialize, Serialize};
use serde_json;
use tauri::{command};
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub url: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: String,
    pub is_encrypted: bool,
}

const STORAGE_FILE: &str = "connections.json";

fn get_storage_path() -> std::path::PathBuf {
    let dirs = directories::ProjectDirs::from("com", "influxdb-ui", "connections").unwrap();
    dirs.data_dir().join(STORAGE_FILE)
}

#[command]
pub async fn store_connection(config: ConnectionConfig) -> Result<(), String> {
    let path = get_storage_path();
    
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    
    let mut connections: Vec<ConnectionConfig> = if path.exists() {
        let data = fs::read_to_string(&path)
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&data).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };
    
    // 更新或添加新的连接配置
    if let Some(index) = connections.iter().position(|c| c.id == config.id) {
        connections[index] = config;
    } else {
        connections.push(config);
    }
    
    fs::write(&path, serde_json::to_string_pretty(&connections).unwrap())
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub async fn load_connections() -> Result<Vec<ConnectionConfig>, String> {
    let path = get_storage_path();
    
    if !path.exists() {
        return Ok(Vec::new());
    }
    
    let data = fs::read_to_string(&path)
        .map_err(|e| e.to_string())?;
    
    let connections: Vec<ConnectionConfig> = serde_json::from_str(&data)
        .unwrap_or_else(|_| Vec::new());
    
    Ok(connections)
}

#[command]
pub async fn delete_connection(connection_id: String) -> Result<(), String> {
    let path = get_storage_path();
    
    if !path.exists() {
        return Ok(());
    }
    
    let data = fs::read_to_string(&path)
        .map_err(|e| e.to_string())?;
    
    let mut connections: Vec<ConnectionConfig> = serde_json::from_str(&data)
        .unwrap_or_else(|_| Vec::new());
    
    connections.retain(|c| c.id != connection_id);
    
    fs::write(&path, serde_json::to_string_pretty(&connections).unwrap())
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub async fn test_connection_with_auth(
    url: String,
    database: String,
    username: Option<String>,
    password: Option<String>,
) -> Result<serde_json::Value, String> {
    use influxdb::Client;
    
    println!("🔧 [Rust] 开始测试连接:");
    println!("  📍 调用栈: test_connection_with_auth");
    println!("  🌐 URL: {}", url);
    println!("  🗄️  Database: {}", database);
    println!("  👤 Username: {:?}", username);
    println!("  🔐 Has Password: {}", password.is_some());
    println!("  📏 Password Length: {:?}", password.as_ref().map(|p| p.len()));
    
    // 验证URL格式
    if !url.starts_with("http://") && !url.starts_with("https://") {
        println!("❌ [Rust] URL格式错误，缺少协议前缀: {}", url);
        return Err(format!("URL格式错误，请使用http://或https://开头: {}", url));
    }
    
    let mut client = Client::new(&url, &database);
    
    if let Some(u) = username {
        let p = password.unwrap_or_default(); // Use empty string if password is None
        println!("🔐 [Rust] 添加认证信息 - 用户名: {}, 密码长度: {}", u, p.len());
        client = client.with_auth(u, p);
    } else {
        println!("ℹ️ [Rust] 无认证信息，使用匿名连接");
    }
    
    println!("🏓 [Rust] 发送 ping 请求到: {}", url);
    let start_time = std::time::Instant::now();
    
    match client.ping().await {
        Ok(_) => {
            let duration = start_time.elapsed();
            println!("✅ [Rust] 连接测试成功 - 响应时间: {:?}", duration);
            println!("✅ [Rust] 可以成功连接到 InfluxDB 实例");
            Ok(serde_json::json!({ "success": true, "response_time": duration.as_millis() }))
        }
        Err(e) => {
            let duration = start_time.elapsed();
            println!("❌ [Rust] 连接测试失败 - 响应时间: {:?}", duration);
            println!("❌ [Rust] 错误详情: {}", e);
            println!("❌ [Rust] 错误类型: {:?}", std::mem::discriminant(&e));
            
            // 提供更详细的错误信息
            let error_msg = if e.to_string().contains("connection refused") {
                format!("连接被拒绝，请检查服务器是否运行在: {}", url)
            } else if e.to_string().contains("timed out") {
                format!("连接超时，请检查网络连通性: {}", url)
            } else if e.to_string().contains("certificate") {
                format!("SSL证书错误: {}", e)
            } else {
                format!("连接失败: {}", e)
            };
            
            Err(error_msg)
        }
    }
}

#[command]
pub async fn test_connection(
    url: String,
    database: String,
    username: Option<String>,
    password: Option<String>,
) -> Result<serde_json::Value, String> {
    test_connection_with_auth(url, database, username, password).await
}