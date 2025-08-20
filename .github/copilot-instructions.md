# Copilot Instructions for influxdb-ui

## 项目架构与核心知识

- **前端**：基于 React 18 + TypeScript，UI 组件库为 Ant Design 5.x，构建工具为 Vite。状态管理主要用 React Hooks，类型定义集中在 `src/types/`。
- **后端**：Tauri (Rust) 提供桌面应用能力，Rust 代码位于 `src-tauri/src/`，核心依赖 `influxdb-rust`，异步用 Tokio，连接配置持久化用 `directories` crate。
- **数据流**：前端通过 Axios 调用 HTTP API 与 InfluxDB 1.0 通信，Rust 侧通过 Tauri commands 处理连接配置和本地存储。
- **样式**：全局样式在 `src/App.css`，局部样式采用 CSS 模块，原型优化样式在 `prototype-influxdb-ui/styles.css`。

## 主要目录结构

- `src/`：前端主代码（组件、服务、类型、入口）
- `src/components/`：核心 UI 组件（如 `ConnectionForm.tsx`, `QueryPanel.tsx`）
- `src/services/`：前端与后端/InfluxDB 通信逻辑
- `src-tauri/`：Tauri 桌面端（Rust）
- `prototype-influxdb-ui/`：UI 原型及样式优化示例

## 关键开发流程

- **依赖安装**：`pnpm install`
- **前端开发**：`pnpm dev`
- **前端构建**：`pnpm build`
- **Tauri 开发模式**：`pnpm tauri dev`
- **Tauri 构建**：`pnpm tauri build`
- **依赖管理**：`pnpm update`、`pnpm audit`、`pnpm prune`

## 项目约定与模式

- **连接管理**：所有 InfluxDB 连接信息通过 Rust/Tauri 持久化，前端通过服务层统一调用。
- **查询面板**：支持多标签页查询，查询语句为 InfluxQL，结果分页展示。
- **样式方案**：主色、边框色等通过 CSS 变量集中管理，详见 `prototype-influxdb-ui/README.md`。
- **类型定义**：所有与 InfluxDB 相关的数据结构在 `src/types/influxdb.ts`。
- **组件复用**：表单、列表、侧边栏等均为独立组件，便于扩展和维护。

## 重要集成点

- **InfluxDB 1.0**：仅支持 1.0 版本，所有查询均为 InfluxQL。
- **Tauri IPC**：前后端通过 Tauri commands 通信，Rust 负责本地存储和部分业务逻辑。
- **配置文件**：原型优化配置在 `prototype-influxdb-ui/profile-influxdb-ui.json`。

## 参考文件

- `README.md`、`CLAUDE.md`、`prototype-influxdb-ui/README.md`：详细介绍架构、开发流程和 UI 规范。
- 关键组件和服务代码：`src/components/`、`src/services/`、`src-tauri/src/`

---

如需扩展功能或修复 bug，优先遵循现有组件和服务分层模式。遇到不明确的约定或流程，请查阅上述参考文件或现有实现。
