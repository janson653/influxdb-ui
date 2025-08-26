# 调试日志使用指南

本文档说明了项目中添加的调试日志功能，帮助开发者更好地理解和调试前后端交互。

## 🎯 日志设计目标

1. **完整性**: 记录所有前后端交互的入参和出参
2. **可读性**: 使用清晰的结构和表情符号
3. **安全性**: 自动过滤敏感信息（如密码）
4. **性能**: 记录执行时间，便于性能分析

## 📋 日志分类

### 前端日志 (Frontend Logs)

#### 1. InfluxDB 服务日志
- **前缀**: `[InfluxDBService]`
- **功能**: 记录数据库操作、连接测试、查询执行等

#### 2. 连接存储日志
- **前缀**: `[ConnectionStorage]`
- **功能**: 记录连接配置的增删改查操作

### 后端日志 (Backend Logs)

#### 1. 连接存储日志
- **前缀**: `[Backend]`
- **功能**: 记录连接配置的存储和加载

#### 2. 数据库操作日志
- **前缀**: `[Backend]`
- **功能**: 记录数据库查询、元数据获取等操作

## 🔧 日志功能特性

### 1. 入参记录
- 记录所有传入参数的值和类型
- 自动过滤敏感信息（密码、token等）
- 限制长字符串的显示（如查询语句）

### 2. 出参记录
- 记录函数返回值
- 记录执行时间
- 记录错误信息（如果有）

### 3. 执行时间跟踪
- 前端：记录每个命令的总执行时间
- 后端：记录数据库操作的执行时间
- 便于性能分析和优化

### 4. 敏感信息过滤
- 密码字段显示为 `***`
- Token 字段显示为 `***`
- 防止敏感信息泄露

## 📊 日志示例

### 1. 连接测试日志

#### 前端日志
```bash
🔍 [InfluxDBService] 开始测试连接: {
  name: "My InfluxDB",
  id: "conn-123",
  url: "http://localhost:8086",
  database: "testdb",
  hasAuth: true,
  timestamp: "2025-08-26T15:30:00.000Z"
}

🔧 [Frontend] 调用 Rust 命令: test_connection
📥 [Frontend] 入参: {
  command: "test_connection",
  payload: { connectionId: "conn-123" },
  timestamp: "2025-08-26T15:30:00.001Z"
}

✅ [Frontend] Rust 命令执行成功: test_connection
📤 [Frontend] 出参: {
  command: "test_connection",
  executionTime: "45ms",
  result: { success: true, response_time: 42 },
  timestamp: "2025-08-26T15:30:00.046Z"
}

✅ [InfluxDBService] 连接测试完成: {
  name: "My InfluxDB",
  success: true,
  responseTime: "45ms",
  serverResponseTime: "42ms",
  timestamp: "2025-08-26T15:30:00.046Z"
}
```

#### 后端日志
```bash
🔧 [Backend] 开始测试连接:
  📥 入参: connection_id=conn-123

🔧 [Backend] 开始加载连接配置
  📁 存储路径: "/home/user/.local/share/com/influxdb-ui/connections/connections.json"

✅ [Backend] 连接配置加载成功: 1 个连接
  📋 连接 1: My InfluxDB (http://localhost:8086)
  📤 出参: 连接数量 1

  📋 连接配置: name=My InfluxDB, url=http://localhost:8086, database=testdb, has_auth=true

🔧 [Backend] 开始 InfluxDB 查询:
  📝 查询语句: PING

✅ [Backend] InfluxDB 查询执行成功 - 耗时: 42ms

✅ [Backend] 连接测试成功: conn-123
  📤 出参: {"success":true,"response_time":42}
```

### 2. 查询执行日志

#### 前端日志
```bash
🔍 [InfluxDBService] 开始执行查询: {
  database: "testdb",
  queryLength: 45,
  queryType: "SELECT",
  hasConnection: true,
  timestamp: "2025-08-26T15:31:00.000Z"
}

📝 [InfluxDBService] 查询语句: SELECT * FROM "cpu" LIMIT 10

🔧 [Frontend] 调用 Rust 命令: execute_query
📥 [Frontend] 入参: {
  command: "execute_query",
  payload: { 
    connectionId: "conn-123", 
    database: "testdb", 
    query: "SELECT * FROM \"cpu\" LIMIT 10" 
  },
  timestamp: "2025-08-26T15:31:00.001Z"
}

✅ [Frontend] Rust 命令执行成功: execute_query
📤 [Frontend] 出参: {
  command: "execute_query",
  executionTime: "120ms",
  result: {
    series: [{ name: "cpu", columns: ["time", "value"], values: [...] }],
    execution_time_ms: 115,
    row_count: 10
  },
  timestamp: "2025-08-26T15:31:00.121Z"
}

✅ [InfluxDBService] 查询执行成功: {
  database: "testdb",
  executionTime: "120ms",
  serverExecutionTime: "115ms",
  rowCount: 10,
  seriesCount: 1,
  cacheSize: 1,
  timestamp: "2025-08-26T15:31:00.121Z"
}
```

#### 后端日志
```bash
🔧 [Backend] 开始执行查询:
  📥 入参: connection_id=conn-123, database=testdb, query_length=45
  📝 查询语句: SELECT * FROM "cpu" LIMIT 10

🔧 [Backend] 创建 InfluxDB 客户端:
  📥 入参: url=http://localhost:8086, database=testdb, has_auth=true
  🔐 [Backend] 使用认证: username=admin, password_length=8
✅ [Backend] InfluxDB 客户端创建成功
  📤 出参: Client(url=http://localhost:8086, database=testdb)

🔧 [Backend] 执行 InfluxDB 查询:
  📝 查询语句: SELECT * FROM "cpu" LIMIT 10

✅ [Backend] InfluxDB 查询执行成功 - 耗时: 115ms

📊 [Backend] 查询结果解析成功:
  📊 数据统计: 1 series, 10 rows
  📋 Series 1: name=cpu, columns=2, values=10
  📤 出参: QueryResult { series_count: 1, row_count: 10, execution_time_ms: 115 }

✅ [Backend] 查询执行成功:
  📤 出参: series_count=1, row_count=10, execution_time=115ms
```

## 🛠️ 使用方法

### 1. 启用日志

日志默认启用，无需额外配置。在开发环境中，日志会自动输出到控制台。

### 2. 查看日志

#### 浏览器开发者工具
1. 打开浏览器开发者工具 (F12)
2. 切换到 Console 标签
3. 查看前端日志输出

#### Tauri 应用日志
1. 启动应用时查看终端输出
2. 后端日志会直接输出到终端

### 3. 过滤日志

#### 按模块过滤
```javascript
// 在浏览器控制台中过滤日志
console.log = (function() {
  const original = console.log;
  return function(...args) {
    if (args[0] && args[0].includes('[InfluxDBService]')) {
      original.apply(console, args);
    }
  };
})();
```

#### 按类型过滤
```bash
# 在终端中过滤后端日志
cargo tauri dev | grep "Backend"
```

## 🎨 日志图标说明

| 图标 | 含义 |
|------|------|
| 🔧 | 工具/方法调用 |
| 📥 | 入参/输入 |
| 📤 | 出参/输出 |
| 🔍 | 查询/搜索操作 |
| ✅ | 成功/完成 |
| ❌ | 失败/错误 |
| 📊 | 数据统计 |
| 📋 | 列表/详情 |
| ⏱️ | 时间/性能 |
| 🔄 | 更新/修改 |
| ➕ | 添加/创建 |
| 🗑️ | 删除/移除 |
| 📁 | 文件/目录 |
| 🔐 | 认证/安全 |
| 💥 | 错误/异常 |

## 🚨 调试技巧

### 1. 跟踪请求链路
使用日志中的时间戳来跟踪完整的请求链路：
```
前端请求 → 后端处理 → 数据库查询 → 返回结果
```

### 2. 性能分析
比较前端和后端的执行时间：
- 前端执行时间 = 后端执行时间 + 网络延迟
- 如果前端时间远大于后端时间，可能存在网络问题

### 3. 错误诊断
查看错误日志中的详细信息：
- 错误类型（连接错误、认证错误、查询错误）
- 错误原因和建议解决方案

### 4. 数据验证
检查入参和出参的数据格式：
- 确保参数类型正确
- 确认返回值格式符合预期

## 📈 性能考虑

### 1. 日志开销
- 日志记录会增加少量性能开销
- 在生产环境中可以通过环境变量控制日志级别

### 2. 敏感信息
- 密码和敏感信息会被自动过滤
- 确保日志不会泄露用户隐私

### 3. 日志大小
- 长字符串会被截断显示
- 大数据集只会显示统计信息

## 🔧 自定义日志

### 1. 添加新的日志点
```typescript
// 前端
console.log('🔧 [YourModule] 开始处理:', {
  param1: value1,
  param2: value2,
  timestamp: new Date().toISOString()
});
```

```rust
// 后端
println!("🔧 [Backend] 开始处理:");
println!("  📥 入参: param1={}, param2={}", param1, param2);
```

### 2. 日志级别
可以根据需要添加不同的日志级别：
- `INFO`: 一般信息
- `DEBUG`: 调试信息
- `WARN`: 警告信息
- `ERROR`: 错误信息

## 📝 最佳实践

1. **保持一致性**: 使用统一的日志格式和前缀
2. **记录关键信息**: 记录足够的上下文信息，但避免过多细节
3. **保护隐私**: 始终过滤敏感信息
4. **考虑性能**: 避免在性能关键路径上记录过多日志
5. **定期清理**: 避免日志文件过大

## 🆘 常见问题

### Q: 如何禁用日志？
A: 可以通过环境变量控制日志级别，或者在代码中添加条件判断。

### Q: 日志文件在哪里？
A: Tauri 应用的日志会输出到终端，浏览器的日志可以在开发者工具中查看。

### Q: 如何添加自定义日志格式？
A: 可以修改日志工具函数，添加自定义的格式化逻辑。

### Q: 如何处理大量日志？
A: 可以使用日志过滤工具，或者调整日志级别来减少日志输出量。