# 前后端一致性开发规范

## 概述

本文档定义了 InfluxDB UI 项目中前后端开发的规范性原则，确保前后端接口的一致性和可维护性。

## 核心原则

### 接口契约一致性原则

前后端必须遵循统一的接口契约，包括参数结构、返回值格式和错误处理机制。

## 具体规范

### 1. 参数结构一致性

#### 规则
- 前端传递的参数必须与后端期望的参数完全匹配
- 避免参数名称、类型、数量不一致
- 使用 TypeScript 类型定义确保编译时检查

#### 实施要点
```typescript
// 前端 - 正确的参数传递
const result = await invokeRustCommand('test_connection', {
  connectionId: connection.id  // 与后端参数名完全一致
});
```

```rust
// 后端 - 正确的参数定义
#[tauri::command]
pub async fn test_connection(connection_id: String) -> Result<serde_json::Value, String> {
    // 参数名与前端完全一致
}
```

#### 错误示例
```typescript
// 错误 - 参数名不匹配
const result = await invokeRustCommand('test_connection', {
  id: connection.id  // 应该是 connectionId
});
```

### 2. 返回值格式一致性

#### 规则
- 后端返回的数据结构必须与前端的类型定义完全对应
- 错误信息的格式和字段名称要保持统一
- 使用相同的字段命名约定（如：success、error、data）

#### 标准返回格式
```typescript
// 成功响应
interface SuccessResponse<T> {
  success: boolean;
  data: T;
  execution_time?: number;
}

// 错误响应
interface ErrorResponse {
  success: boolean;
  error: string;
  error_code?: string;
}
```

#### 实施要点
```rust
// 后端 - 统一的返回格式
Ok(serde_json::json!({
  "success": true,
  "data": result,
  "execution_time": duration.as_millis()
}))
```

### 3. 命令注册完整性

#### 规则
- 所有前端调用的 Tauri 命令都必须在后端正确注册
- 避免前端调用不存在的命令
- 使用 `lib.rs` 中的 `generate_handler!` 宏确保命令可用

#### 注册检查清单
- [ ] 命令函数已定义
- [ ] 命令已添加到 `generate_handler!` 宏中
- [ ] 命令参数类型正确
- [ ] 命令返回值类型正确

#### 示例
```rust
// lib.rs
.invoke_handler(tauri::generate_handler![
    greet,
    connection_store::store_connection,
    connection_store::load_connections,
    database_operations::get_databases,
    database_operations::execute_query,  // 确保所有命令都已注册
])
```

### 4. 类型定义同步

#### 规则
- 前端 TypeScript 接口必须与后端 Rust 结构体保持同步
- 使用接口文档或代码生成工具确保一致性
- 建立类型定义的单一数据源

#### 类型映射表
| Rust 类型 | TypeScript 类型 | 说明 |
|-----------|-----------------|------|
| `String` | `string` | 字符串 |
| `i32/u32` | `number` | 整数 |
| `f64` | `number` | 浮点数 |
| `bool` | `boolean` | 布尔值 |
| `Vec<T>` | `T[]` | 数组 |
| `Option<T>` | `T \| undefined` | 可选值 |
| `HashMap<K, V>` | `Record<K, V>` | 键值对 |

#### 示例
```rust
// 后端
#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub url: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: String,
    pub is_encrypted: bool,
}
```

```typescript
// 前端
export interface ConnectionConfig {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  database: string;
  is_encrypted: boolean;
}
```

### 5. 错误处理统一性

#### 规则
- 统一的错误格式和错误码
- 一致的错误信息本地化策略
- 标准化的错误处理流程

#### 错误码定义
| 错误码 | 含义 | 处理方式 |
|--------|------|----------|
| `CONNECTION_ERROR` | 连接失败 | 显示连接错误信息 |
| `AUTH_ERROR` | 认证失败 | 提示用户检查凭据 |
| `QUERY_ERROR` | 查询错误 | 显示查询语法错误 |
| `VALIDATION_ERROR` | 验证错误 | 显示输入验证错误 |
| `TIMEOUT_ERROR` | 超时错误 | 显示超时信息 |

#### 实施要点
```rust
// 后端 - 统一错误处理
#[derive(Debug, Serialize, Deserialize)]
pub enum ApiError {
    ConnectionError(String),
    AuthenticationError(String),
    QueryError(String),
    ValidationError(String),
    TimeoutError(String),
}
```

```typescript
// 前端 - 统一错误处理
try {
  const result = await invokeRustCommand('get_databases', { connectionId });
  return result;
} catch (error) {
  if (error.message.includes('connection')) {
    throw new Error('连接失败，请检查网络设置');
  } else if (error.message.includes('authentication')) {
    throw new Error('认证失败，请检查用户名和密码');
  }
  throw error;
}
```

## 开发流程

### 1. 新功能开发流程

#### 步骤1：定义接口契约
```markdown
## 命令：get_measurement_info
### 参数
- connectionId: string
- database: string
- measurement: string

### 返回值
```typescript
interface MeasurementInfo {
  name: string;
  field_count: number;
  tag_count: number;
  series_count?: number;
}
```

### 错误处理
- 连接失败：CONNECTION_ERROR
- 数据库不存在：VALIDATION_ERROR
- 测量不存在：QUERY_ERROR
```

#### 步骤2：实现后端命令
```rust
#[tauri::command]
pub async fn get_measurement_info(
    connection_id: String,
    database: String,
    measurement: String,
) -> Result<MeasurementInfo, ApiError> {
    // 实现
}
```

#### 步骤3：注册命令
```rust
// lib.rs
.invoke_handler(tauri::generate_handler![
    // ... 其他命令
    database_operations::get_measurement_info,
])
```

#### 步骤4：实现前端调用
```typescript
async getMeasurementInfo(
  connectionId: string,
  database: string,
  measurement: string
): Promise<MeasurementInfo> {
  return await this.invokeRustCommand('get_measurement_info', {
    connectionId,
    database,
    measurement
  });
}
```

#### 步骤5：添加类型定义
```typescript
// types/influxdb.ts
export interface MeasurementInfo {
  name: string;
  field_count: number;
  tag_count: number;
  series_count?: number;
}
```

#### 步骤6：测试验证
```typescript
// 测试用例
describe('getMeasurementInfo', () => {
  it('should return measurement info correctly', async () => {
    const result = await service.getMeasurementInfo(connId, db, measurement);
    expect(result.name).toBe(measurement);
    expect(result.field_count).toBeGreaterThan(0);
  });
});
```

### 2. 修改现有功能流程

#### 步骤1：分析影响范围
- 检查哪些前端组件调用了该命令
- 检查后端命令的当前实现
- 检查类型定义是否需要更新

#### 步骤2：同步修改
- 更新后端命令实现
- 更新前端调用逻辑
- 更新类型定义
- 更新相关文档

#### 步骤3：回归测试
- 测试修改后的功能
- 测试相关的功能
- 运行完整的测试套件

## 检查清单

### 开发前检查
- [ ] 已阅读并理解接口契约
- [ ] 已检查相关的类型定义
- [ ] 已了解现有的错误处理机制

### 开发中检查
- [ ] 参数名称和类型与契约一致
- [ ] 返回值格式与契约一致
- [ ] 错误处理遵循统一规范
- [ ] 命令已在后端正确注册

### 开发后检查
- [ ] 代码已通过 TypeScript 编译检查
- [ ] 代码已通过 Rust 编译检查
- [ ] 相关测试用例已通过
- [ ] 文档已更新

## 工具和资源

### 开发工具
- **TypeScript 编译器**：类型检查
- **Rust 编译器**：后端编译检查
- **Tauri CLI**：应用构建和测试
- **ESLint**：代码质量检查
- **Prettier**：代码格式化

### 测试工具
- **Jest**：单元测试
- **React Testing Library**：组件测试
- **Tauri 测试框架**：集成测试

### 文档工具
- **TypeDoc**：API 文档生成
- **Markdown**：规范文档
- **Swagger/OpenAPI**：API 规范（如需要）

## 常见问题与解决方案

### 问题1：命令未注册
**现象**：前端调用命令时出现 "command not found" 错误
**原因**：后端 `lib.rs` 中未注册该命令
**解决**：
1. 检查命令函数是否已定义
2. 在 `generate_handler!` 宏中添加命令注册
3. 重新构建项目

### 问题2：参数不匹配
**现象**：前端传递的参数与后端期望的不一致
**原因**：接口契约定义不清晰或实现有偏差
**解决**：
1. 使用 TypeScript 类型定义强制检查参数格式
2. 确保参数名称完全匹配
3. 检查参数类型是否正确

### 问题3：返回值格式不一致
**现象**：前端无法正确解析后端返回的数据
**原因**：后端返回结构与前端类型定义不匹配
**解决**：
1. 统一返回值格式
2. 建立类型定义同步机制
3. 添加返回值验证

### 问题4：类型定义不同步
**现象**：前后端类型定义出现偏差
**原因**：缺乏统一的类型管理机制
**解决**：
1. 建立类型定义的单一数据源
2. 定期同步类型定义
3. 使用代码生成工具

## 维护和更新

### 定期检查
- 每月检查一次类型定义的一致性
- 每次发布前进行完整的回归测试
- 定期更新开发工具和依赖

### 版本控制
- 使用 Git 进行版本控制
- 遵循语义化版本控制
- 维护详细的变更日志

### 文档更新
- 每次接口变更时更新相关文档
- 保持文档的实时性和准确性
- 提供清晰的迁移指南

## 附录

### A. 术语表
- **接口契约**：前后端之间的参数和返回值约定
- **Tauri Command**：前端调用后端 Rust 函数的机制
- **类型同步**：保持前后端类型定义一致的过程
- **契约测试**：验证前后端接口一致性的测试

### B. 参考资料
- [Tauri 官方文档](https://tauri.app/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Rust 官方文档](https://doc.rust-lang.org/)
- [InfluxDB 1.0 文档](https://docs.influxdata.com/influxdb/v1.0/)

### C. 模板文件
- [接口契约模板](./templates/interface-contract.md)
- [测试用例模板](./templates/test-case.ts)
- [错误处理模板](./templates/error-handling.ts)