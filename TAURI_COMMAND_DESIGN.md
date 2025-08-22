# Tauri Command 架构设计

## 设计原则

### 1. 统一接口
- 所有 InfluxDB 操作必须通过 Tauri Command
- 前端不直接调用 HTTP API
- 开发和生产环境使用相同的架构

### 2. 安全性
- 连接配置在后端管理
- 敏感信息不暴露给前端
- 统一的访问控制

### 3. 性能优化
- 利用 Rust 的并发能力
- 查询结果在后端处理
- 减少前后端数据传输

### 4. 可扩展性
- 模块化设计
- 清晰的接口定义
- 易于添加新功能

## Tauri Command 接口设计

### 连接管理 Commands

```rust
// 连接配置管理
#[command]
pub async fn store_connection(config: ConnectionConfig) -> Result<(), String>

#[command]
pub async fn load_connections() -> Result<Vec<ConnectionConfig>, String>

#[command]
pub async fn delete_connection(connection_id: String) -> Result<(), String>

// 连接测试
#[command]
pub async fn test_connection(connection_id: String) -> Result<ConnectionTestResult, String>

// 连接信息
#[command]
pub async fn get_connection_info(connection_id: String) -> Result<ConnectionInfo, String>

#[command]
pub async fn validate_connection_config(config: ConnectionConfig) -> Result<ValidationResult, String>
```

### 数据库操作 Commands

```rust
// 数据库管理
#[command]
pub async fn get_databases(connection_id: String) -> Result<Vec<String>, String>

#[command]
pub async fn create_database(connection_id: String, database: String) -> Result<(), String>

#[command]
pub async fn drop_database(connection_id: String, database: String) -> Result<(), String>

// 测量管理
#[command]
pub async fn get_measurements(connection_id: String, database: String) -> Result<Vec<String>, String>

#[command]
pub async fn get_measurement_info(
    connection_id: String, 
    database: String, 
    measurement: String
) -> Result<MeasurementInfo, String>
```

### 查询操作 Commands

```rust
// 基础查询
#[command]
pub async fn execute_query(
    connection_id: String,
    database: String,
    query: String,
    options: QueryOptions
) -> Result<QueryResult, String>

// 查询优化
#[command]
pub async fn explain_query(
    connection_id: String,
    database: String,
    query: String
) -> Result<ExplainResult, String>

// 查询历史
#[command]
pub async fn get_query_history(connection_id: String) -> Result<Vec<QueryHistoryItem>, String>

#[command]
pub async fn save_query_history(item: QueryHistoryItem) -> Result<(), String>
```

### 数据操作 Commands

```rust
// 数据写入
#[command]
pub async fn write_points(
    connection_id: String,
    database: String,
    points: Vec<WritePoint>
) -> Result<WriteResult, String>

// 数据删除
#[command]
pub async fn delete_data(
    connection_id: String,
    database: String,
    query: String
) -> Result<DeleteResult, String>
```

### 元数据 Commands

```rust
// 标签和字段信息
#[command]
pub async fn get_tag_keys(
    connection_id: String,
    database: String,
    measurement: String
) -> Result<Vec<String>, String>

#[command]
pub async fn get_tag_values(
    connection_id: String,
    database: String,
    measurement: String,
    tag_key: String
) -> Result<Vec<String>, String>

#[command]
pub async fn get_field_keys(
    connection_id: String,
    database: String,
    measurement: String
) -> Result<Vec<FieldInfo>, String>
```

### 系统管理 Commands

```rust
// 服务器信息
#[command]
pub async fn get_server_info(connection_id: String) -> Result<ServerInfo, String>

#[command]
pub async fn get_server_stats(connection_id: String) -> Result<ServerStats, String>

// 查询管理
#[command]
pub async fn get_running_queries(connection_id: String) -> Result<Vec<QueryInfo>, String>

#[command]
pub async fn kill_query(connection_id: String, query_id: String) -> Result<(), String>
```

## 数据结构定义

### 连接相关
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub url: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: String,
    pub is_encrypted: bool,
    pub connection_timeout: u64,
    pub query_timeout: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub response_time_ms: u64,
    pub error: Option<String>,
    pub server_version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub id: String,
    pub name: String,
    pub url: String,
    pub database: String,
    pub server_version: String,
    pub status: ConnectionStatus,
}
```

### 查询相关
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryOptions {
    pub chunk_size: Option<u32>,
    pub timeout_ms: Option<u64>,
    pub pretty: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub series: Vec<Series>,
    pub execution_time_ms: u64,
    pub row_count: u64,
    pub warning: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Series {
    pub name: String,
    pub columns: Vec<String>,
    pub values: Vec<Vec<serde_json::Value>>,
    pub tags: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExplainResult {
    pub query_plan: String,
    pub estimated_cost: f64,
    pub suggestions: Vec<String>,
}
```

### 元数据相关
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct MeasurementInfo {
    pub name: String,
    pub field_count: usize,
    pub tag_count: usize,
    pub series_count: usize,
    pub first_timestamp: Option<i64>,
    pub last_timestamp: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FieldInfo {
    pub name: String,
    pub data_type: String,
    pub sample_values: Vec<serde_json::Value>,
}
```

## 错误处理设计

### 统一错误类型
```rust
#[derive(Debug, Serialize, Deserialize)]
pub enum ApiError {
    ConnectionError(String),
    QueryError(String),
    ParseError(String),
    TimeoutError(String),
    AuthenticationError(String),
    AuthorizationError(String),
    ServerError(String),
    UnknownError(String),
}

impl ApiError {
    pub fn to_response(self) -> String {
        serde_json::to_string(&self).unwrap_or_else(|_| "Unknown error".to_string())
    }
}
```

### 错误信息结构
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error_type: String,
    pub error_code: u32,
    pub message: String,
    pub details: Option<String>,
    pub timestamp: i64,
}
```

## 性能优化设计

### 连接池
```rust
pub struct ConnectionPool {
    connections: HashMap<String, Arc<Mutex<Client>>>,
    max_connections: usize,
    ttl: Duration,
}

impl ConnectionPool {
    pub async fn get_connection(&self, connection_id: String) -> Result<Arc<Mutex<Client>>, ApiError> {
        // 连接池逻辑
    }
    
    pub async fn cleanup_expired_connections(&self) {
        // 清理过期连接
    }
}
```

### 查询缓存
```rust
pub struct QueryCache {
    cache: HashMap<String, CachedQueryResult>,
    max_size: usize,
    ttl: Duration,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CachedQueryResult {
    pub result: QueryResult,
    pub timestamp: i64,
    pub hit_count: u32,
}
```

## 安全设计

### 敏感信息处理
```rust
pub fn sanitize_connection_config(config: &ConnectionConfig) -> SanitizedConfig {
    SanitizedConfig {
        id: config.id.clone(),
        name: config.name.clone(),
        url: config.url.clone(),
        username: config.username.clone(),
        password: None, // 不返回密码
        database: config.database.clone(),
        is_encrypted: config.is_encrypted,
    }
}
```

### 访问控制
```rust
pub struct AccessController {
    allowed_operations: HashMap<String, Vec<String>>,
}

impl AccessController {
    pub fn can_execute(&self, connection_id: &str, operation: &str) -> bool {
        // 访问控制逻辑
    }
}
```

## 实施计划

### 阶段 1：核心 Commands
1. 实现连接管理 Commands
2. 实现基础查询 Commands
3. 实现数据库操作 Commands

### 阶段 2：高级功能
1. 实现元数据 Commands
2. 实现查询优化 Commands
3. 实现缓存和连接池

### 阶段 3：系统管理
1. 实现系统管理 Commands
2. 实现性能监控
3. 实现错误处理优化

### 阶段 4：测试和优化
1. 单元测试
2. 集成测试
3. 性能测试和优化

## 使用示例

### 前端调用
```typescript
// 获取数据库列表
const databases = await invoke('get_databases', { 
  connectionId: connection.id 
});

// 执行查询
const result = await invoke('execute_query', {
  connectionId: connection.id,
  database: selectedDatabase,
  query: "SELECT * FROM measurement WHERE time > now() - 1h",
  options: {
    chunk_size: 1000,
    timeout_ms: 30000,
    pretty: true
  }
});
```

### 错误处理
```typescript
try {
  const result = await invoke('execute_query', params);
  // 处理结果
} catch (error) {
  const errorInfo = JSON.parse(error);
  console.error(`Query failed: ${errorInfo.message}`);
  // 显示用户友好的错误信息
}
```

这个设计提供了一个完整的、可扩展的 Tauri Command 架构，解决了当前架构中的所有问题。