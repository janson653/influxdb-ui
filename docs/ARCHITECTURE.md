# InfluxDB UI Architecture

> Updated: 2026-03-27 | Status: Electron runtime active

## Overview

| Item | Detail |
|------|--------|
| Product | InfluxDB 1.x desktop client |
| Runtime | Electron 41 |
| Frontend | React 18 + TypeScript + Ant Design 5 |
| Build | Vite 6 + TypeScript |
| Persistence | Electron main process JSON store in `app.getPath('userData')` |
| InfluxDB Access | Electron main process `fetch()` to `/ping` and `/query` |

## Runtime Architecture

```mermaid
graph TD
    A[React Renderer] -->|typed preload API| B[Electron Main Process]
    B -->|JSON file store| C[connections.json in userData]
    B -->|HTTP /ping and /query| D[InfluxDB 1.x Server]
    B -->|shell.openExternal| E[OS default browser]
    A -->|localStorage/mock fallback| F[Browser Dev Mode]
```

## Main Modules

### Renderer

- `src/App.tsx`: overall layout and connection-oriented state
- `src/components/ConnectionTree.tsx`: database and measurement browser
- `src/components/ConnectionForm.tsx`: create and test connections
- `src/services/connectionStorage.ts`: bridge to Electron preload API or browser fallback
- `src/services/influxdb.ts`: high-level query and metadata access

### Electron

- `electron/main.ts`: BrowserWindow setup and IPC registration
- `electron/preload.ts`: restricted API surface exposed to the renderer
- `electron/connectionStore.ts`: persistent connection repository
- `electron/influxHttp.ts`: InfluxDB 1.x HTTP client implementation
- `electron/assets/icons/`: runtime and packaging icon assets

## IPC Surface

The renderer only accesses the following preload methods:

- `window.electronAPI.connections.load()`
- `window.electronAPI.connections.store(config)`
- `window.electronAPI.connections.deleteConnection(id)`
- `window.electronAPI.influx.testConnection(payload)`
- `window.electronAPI.influx.queryData(payload)`
- `window.electronAPI.app.openExternal(url)`

This keeps the boundary narrower than a generic `invoke(channel, payload)` bridge.

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant R as React Renderer
    participant P as Preload API
    participant M as Electron Main
    participant FS as Connection Store
    participant IDB as InfluxDB

    U->>R: Save connection
    R->>P: connections.store(config)
    P->>M: ipcRenderer.invoke()
    M->>FS: write connections.json
    FS-->>M: ok
    M-->>R: success

    U->>R: Execute query
    R->>P: influx.queryData(payload)
    P->>M: ipcRenderer.invoke()
    M->>IDB: POST /query
    IDB-->>M: JSON results
    M-->>R: JSON string
```

## Development Modes

### Browser Mode

- Command: `pnpm dev`
- Uses renderer-side localStorage/mock fallback
- Useful for UI-only work

### Electron Mode

- Command: `pnpm electron:dev`
- Uses preload + main-process persistence and HTTP transport
- Preferred for integration verification

## Known Gaps

- `pnpm build` still fails due to historical TypeScript errors outside the Electron migration slice
- Some advanced UI components remain present but are not yet part of the active main flow

## Historical Note

The repository previously used Tauri 2 + Rust. That runtime has been removed from the active codepath. Any older migration analysis should be treated as historical context, not current implementation.
