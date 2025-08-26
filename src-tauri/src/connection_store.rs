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

fn get_storage_path() -> std::path::PathBuf {
    let mut path = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::new());
    
    // 更健壮的路径解析
    if path.ends_with("src-tauri") {
        path.pop();
    } else if path.ends_with("target/debug") {
        path.pop(); // target
        path.pop(); // src-tauri
        path.pop(); // 项目根目录
    } else if path.ends_with("target/release") {
        path.pop(); // target
        path.pop(); // src-tauri
        path.pop(); // 项目根目录
    }
    
    path.push("connections.json");
    
    // 添加详细日志
    println!("📁 [Backend] 计算得到的配置文件路径: {:?}", path);
    println!("📁 [Backend] 当前工作目录: {:?}", std::env::current_dir());
    
    path
}

#[command]
pub async fn store_connection(config: ConnectionConfig) -> Result<(), String> {
    println!("🔧 [Backend] 开始存储连接配置:");
    println!("  📥 入参: id={}, name={}, url={}, database={}, has_auth={}", 
        config.id, config.name, config.url, config.database, config.username.is_some());
    
    let path = get_storage_path();
    println!("  📁 存储路径: {:?}", path);
    
    // 简单处理：文件不存在就创建，存在就读取
    let mut connections: Vec<ConnectionConfig> = if path.exists() {
        let data = fs::read_to_string(&path)
            .map_err(|e| format!("读取文件失败: {}", e))?;
        serde_json::from_str(&data)
            .map_err(|e| format!("解析JSON失败: {}", e))?
    } else {
        println!("  📄 文件不存在，创建新的连接列表");
        Vec::new()
    };
    
    // 更新或添加新的连接配置
    if let Some(index) = connections.iter().position(|c| c.id == config.id) {
        connections[index] = config.clone();
        println!("  🔄 更新现有连接配置");
    } else {
        connections.push(config.clone());
        println!("  ➕ 添加新连接配置");
    }
    
    // 确保目录存在
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }
    
    // 写入文件
    fs::write(&path, serde_json::to_string_pretty(&connections).unwrap())
        .map_err(|e| format!("写入文件失败: {}", e))?;
    
    println!("✅ [Backend] 连接配置存储成功: {} (总连接数: {})", config.name, connections.len());
    println!("  📤 出参: Ok(())");
    
    Ok(())
}

#[command]
pub async fn load_connections() -> Result<Vec<ConnectionConfig>, String> {
    println!("🔧 [Backend] 开始加载连接配置");
    
    let path = get_storage_path();
    println!("  📁 存储路径: {:?}", path);
    
    // 检查文件是否存在
    if !path.exists() {
        println!("❌ [Backend] 配置文件不存在: {:?}", path);
        return Err(format!("配置文件不存在: {:?}", path));
    }
    
    // 检查文件权限
    if !std::path::Path::new(&path).is_file() {
        println!("❌ [Backend] 路径不是文件: {:?}", path);
        return Err(format!("路径不是文件: {:?}", path));
    }
    
    // 读取文件
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("读取文件失败: {}", e))?;
    
    println!("  📄 [Backend] 文件大小: {} 字节", data.len());
    
    // 解析JSON
    let connections: Vec<ConnectionConfig> = serde_json::from_str(&data)
        .map_err(|e| format!("解析JSON失败: {}", e))?;
    
    println!("✅ [Backend] 连接配置加载成功: {} 个连接", connections.len());
    for (i, conn) in connections.iter().enumerate() {
        println!("  📋 连接 {}: {} ({})", i + 1, conn.name, conn.url);
    }
    println!("  📤 出参: 连接数量 {}", connections.len());
    
    Ok(connections)
}

#[command]
pub async fn delete_connection(connection_id: String) -> Result<(), String> {
    println!("🔧 [Backend] 开始删除连接配置:");
    println!("  📥 入参: connection_id={}", connection_id);
    
    let path = get_storage_path();
    println!("  📁 存储路径: {:?}", path);
    
    if !path.exists() {
        println!("  📄 文件不存在，无需删除");
        println!("  📤 出参: Ok(())");
        return Ok(());
    }
    
    let data = fs::read_to_string(&path)
        .map_err(|e| e.to_string())?;
    
    let mut connections: Vec<ConnectionConfig> = serde_json::from_str(&data)
        .unwrap_or_else(|_| Vec::new());
    
    let _initial_count = connections.len();
    connections.retain(|c| c.id != connection_id);
    let final_count = connections.len();
    
    fs::write(&path, serde_json::to_string_pretty(&connections).unwrap())
        .map_err(|e| e.to_string())?;
    
    println!("✅ [Backend] 连接配置删除成功: {} (剩余连接数: {})", connection_id, final_count);
    println!("  📤 出参: Ok(())");
    
    Ok(())
}

#[command]
pub async fn update_connection(config: ConnectionConfig) -> Result<(), String> {
    store_connection(config).await
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
    connection_id: String,
) -> Result<serde_json::Value, String> {
    println!("🔧 [Backend] 开始测试连接:");
    println!("  📥 入参: connection_id={}", connection_id);
    
    // 加载连接配置
    let configs = match load_connections().await {
        Ok(configs) => {
            println!("  📋 已加载的连接配置数量: {}", configs.len());
            configs
        }
        Err(e) => {
            println!("❌ [Backend] 加载连接配置失败: {}", e);
            return Err(format!("加载连接配置失败: {}", e));
        }
    };
    
    let config = configs.into_iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| {
            println!("❌ [Backend] 未找到连接配置: {}", connection_id);
            format!("连接配置不存在: {}", connection_id)
        })?;
    
    println!("  📋 连接配置: name={}, url={}, database={}, has_auth={}", 
        config.name, config.url, config.database, config.username.is_some());
    
    let result = test_connection_with_auth(
        config.url,
        config.database,
        config.username,
        config.password
    ).await;
    
    match &result {
        Ok(success_json) => {
            println!("✅ [Backend] 连接测试成功: {}", connection_id);
            println!("  📤 出参: {:?}", success_json);
        }
        Err(error) => {
            println!("❌ [Backend] 连接测试失败: {}", connection_id);
            println!("  📤 出参: Err({})", error);
        }
    }
    
    result
}