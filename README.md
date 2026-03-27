# InfluxDB UI

一个基于 Electron + React + TypeScript 的 InfluxDB 1.x 桌面客户端。

## 当前状态

- 桌面运行时已从 Tauri 迁移到 Electron
- 连接持久化、InfluxDB `/ping` 与 `/query` 已迁到 Electron 主进程
- 浏览器模式仍保留 localStorage/mock fallback 以便前端开发
- 当前 `pnpm build`、`pnpm electron:build` 和 Linux 打包链路已打通

## 技术栈

- React 18
- TypeScript
- Ant Design 5
- Vite 6
- Electron 41

## 开发环境

### 前置要求

- Node.js 20+
- pnpm

### 安装依赖

```bash
pnpm install
```

### 浏览器开发模式

```bash
pnpm dev
```

说明:
- 启动 Vite dev server，使用浏览器 fallback
- 适合纯前端样式和交互开发

### Electron 开发模式

```bash
pnpm electron:dev
```

说明:
- 启动 Electron 主进程、preload 和 Vite dev server
- 用于验证主进程持久化和 InfluxDB HTTP 调用链路

### 编译 Electron 主进程

```bash
pnpm electron:compile
```

## 构建

```bash
pnpm build
pnpm electron:build
```

说明:
- `pnpm build` 会生成前端产物到 `dist/`
- `pnpm electron:build` 会继续编译 Electron 主进程，并在 `release/` 目录生成当前平台安装包

## GitHub Actions 发布

仓库已提供 `.github/workflows/release.yml`，用于在 GitHub 上自动发布桌面安装包。

触发方式:

1. 确保 `package.json` 的 `version` 已更新到目标版本。
2. 创建并推送同版本 tag，例如：

```bash
git tag v0.1.0
git push origin v0.1.0
```

3. GitHub Actions 会自动执行以下流程：
   - 先校验 tag 和 `package.json` 版本是否一致
   - 创建一个 draft GitHub Release
   - 并行构建三个平台安装包
   - 全部成功后把 draft Release 发布为正式 Release

当前产物目标:
- Windows: NSIS `.exe`
- macOS: `.dmg`
- Linux: `.AppImage` 和 `.deb`

说明:
- 当前流程使用仓库自带的 `GITHUB_TOKEN`，不需要额外上传发布 token
- workflow 已声明 `contents: write` 权限，用于创建 Release 和上传产物
- 当前流程不包含 Windows 代码签名和 macOS notarization，生成的是 unsigned 安装包
- 如果任一平台失败，Release 会保留为 draft，便于排查和重跑

## 目录结构

```text
src/
  components/      React UI
  services/        前端服务层与浏览器 fallback
  types/           TypeScript 类型
electron/
  assets/          Electron 运行时图标资源
  main.ts          主进程入口
  preload.ts       受限 preload API
  connectionStore.ts
  influxHttp.ts
dist-electron/     Electron TypeScript 编译产物
```

## 支持范围

- InfluxDB 1.x
- 连接管理
- 数据库与 measurement 浏览
- InfluxQL 查询
- Electron 主进程持久化

## 已知问题

- 若本机没有图形环境，`pnpm electron:dev` 会出现 DBus/dconf 噪音日志，但不影响启动链路 smoke test
- 当前 GitHub Release 流程未接入代码签名和 macOS notarization
