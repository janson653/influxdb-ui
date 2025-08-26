# InfluxDB UI

一个基于 Tauri + React + TypeScript 的 InfluxDB 1.0 图形化界面工具。

## 功能特性

### 1. 连接管理
- **新建连接**：支持配置 InfluxDB 1.0 服务器连接
- **连接测试**：自动测试连接配置是否正确
- **连接列表**：管理多个 InfluxDB 连接
- **连接状态**：实时显示连接状态（已连接/未连接/错误）

### 2. 数据库查询
- **数据库选择**：自动获取并选择数据库
- **Measurement 浏览**：查看数据库中的所有 measurements
- **InfluxQL 查询**：支持完整的 InfluxQL 查询语言
- **查询结果展示**：以表格形式展示查询结果
- **分页支持**：支持大量数据的分页显示

## 技术栈

- **前端框架**：React 18 + TypeScript
- **UI 组件库**：Ant Design 5.x
- **桌面应用框架**：Tauri 2.x
- **后端语言**：Rust + Tokio
- **数据库**：InfluxDB 1.0 (InfluxQL)
- **构建工具**：Vite
- **包管理器**：pnpm

## 开发环境

### 前置要求
- Node.js 18+
- pnpm
- Rust (用于 Tauri)

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
pnpm dev
```

### 构建应用
```bash
pnpm build
pnpm tauri build
```

## 架构特点

- **统一架构**: 开发环境与生产环境使用完全相同的Tauri Commands架构
- **安全性**: 数据库连接配置由Rust后端管理，不暴露给前端
- **性能**: 利用Rust的并发能力处理数据库操作
- **一致性**: 消除了开发环境与生产环境的行为差异

## 使用说明

### 1. 新建连接
1. 点击左侧边栏的"新建连接"按钮
2. 填写连接信息：
   - **连接名称**：给连接起一个易识别的名称
   - **服务器地址**：InfluxDB 服务器地址（默认：http://localhost:8086）
   - **数据库名称**：要连接的数据库名称
   - **认证信息**：如果需要认证，启用并填写用户名和密码
3. 点击"测试并保存"按钮

### 2. 查询数据库
1. 选择一个已建立的连接
2. 在查询面板中选择目标数据库
3. 选择要查询的 measurement（可选）
4. 在查询编辑器中输入 InfluxQL 查询语句
5. 点击"执行查询"按钮

### 示例查询
```sql
-- 查询最近的 CPU 数据
SELECT * FROM "cpu" LIMIT 10

-- 查询特定时间范围的数据
SELECT * FROM "cpu" WHERE time > now() - 1h

-- 聚合查询
SELECT mean("value") FROM "cpu" GROUP BY time(5m)
```

## 项目结构

```
src/
├── components/          # React 组件
│   ├── ConnectionForm.tsx    # 连接表单
│   ├── ConnectionList.tsx    # 连接列表
│   └── QueryPanel.tsx       # 查询面板
├── services/           # 服务层
│   └── influxdb.ts    # InfluxDB API 服务
├── types/             # TypeScript 类型定义
│   └── influxdb.ts    # InfluxDB 相关类型
├── App.tsx            # 主应用组件
└── main.tsx           # 应用入口
```

## 支持的 InfluxDB 版本

当前版本专门支持 **InfluxDB 1.0**，包括：
- InfluxQL 查询语言
- 用户名/密码认证
- 数据库和 measurement 浏览
- 标准 InfluxDB 1.0 API 端点

## 开发计划

- [ ] 支持 InfluxDB 2.x
- [ ] 数据可视化功能
- [ ] 查询历史记录
- [ ] 导出功能
- [ ] 批量操作支持
