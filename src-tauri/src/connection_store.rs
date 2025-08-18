use serde::{Deserialize, Serialize};
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
) -> Result<bool, String> {
    use influxdb::Client;
    
    println!("🔧 [Rust] 开始测试连接:");
    println!("  URL: {}", url);
    println!("  Database: {}", database);
    println!("  Username: {:?}", username);
    println!("  Has Password: {}", password.is_some());
    
    let mut client = Client::new(&url, &database);
    
    if let (Some(u), Some(p)) = (username, password) {
        println!("🔐 [Rust] 添加认证信息: {}", u);
        client = client.with_auth(u, p);
    }
    
    println!("🏓 [Rust] 发送 ping 请求...");
    match client.ping().await {
        Ok(_) => {
            println!("✅ [Rust] 连接测试成功");
            Ok(true)
        }
        Err(e) => {
            println!("❌ [Rust] 连接测试失败: {}", e);
            println!("❌ [Rust] 错误类型: {:?}", std::mem::discriminant(&e));
            Err(format!("连接失败: {}", e))
        }
    }
}