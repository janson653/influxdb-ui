# InfluxDB UI 技术说明

## 当前架构

项目当前采用 Electron + React + TypeScript 架构：

- Renderer: React 18 + Ant Design 5 + Vite 6
- Main Process: Electron 主进程
- Preload: 受限 typed API 暴露
- 持久化: `app.getPath('userData')` 下的 JSON 文件
- InfluxDB 通信: 主进程 `fetch()` 调用 InfluxDB 1.x `/ping` 和 `/query`

## 关键目录

```text
src/                     前端组件、服务和类型
electron/                Electron 主进程、preload、存储和 HTTP 模块
electron/assets/icons/   图标资源
dist-electron/           Electron TS 编译输出
.harness/                计划、任务和恢复状态
```

## 主要模块

### 前端

- `src/App.tsx`: 布局和连接状态
- `src/services/connectionStorage.ts`: Electron API / 浏览器 fallback 桥接
- `src/services/influxdb.ts`: 查询和元数据访问

### Electron

- `electron/main.ts`: 窗口、IPC、外链
- `electron/preload.ts`: 受限 API 暴露
- `electron/connectionStore.ts`: 连接持久化
- `electron/influxHttp.ts`: InfluxDB 1.x HTTP 实现

## 运行命令

### 浏览器开发

```bash
pnpm dev
```

### Electron 开发

```bash
pnpm electron:dev
```

### 编译主进程

```bash
pnpm electron:compile
```

### 构建

```bash
pnpm build
pnpm electron:build
```

## 现状说明

- Electron 启动链路、连接持久化、InfluxDB `/ping` 与 `/query` 已切换完成
- 浏览器 fallback 仍保留，用于前端快速开发
- 仓库内仍有历史 TypeScript 严格模式错误，导致完整生产构建尚未打通
