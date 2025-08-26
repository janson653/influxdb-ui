# Project Overview

## Purpose
基于 Tauri + React + TypeScript 的 InfluxDB 1.0 桌面图形界面工具，专注于连接管理、数据库查询和数据可视化。

## Tech Stack
- **Frontend**: React 18 + TypeScript 5.6 + Vite 6 + Ant Design 5
- **Backend**: Rust + Tauri 2 + influxdb-rust 0.6 + Tokio
- **Database**: InfluxDB 1.0 (InfluxQL)
- **Package Manager**: pnpm

## Architecture
- Unified Tauri Commands architecture for both development and production
- Frontend connects to InfluxDB 1.0 through Tauri commands only
- Connection configurations managed by Rust backend for security
- Direct database queries processed in Rust backend for performance