# Architecture Details

## Frontend Structure (React + TypeScript)
- **App.tsx**: Main application component managing connection state
- **Components**: ConnectionTree, QueryPanel, EnhancedQueryPanel, ConnectionForm
- **Services**: influxdb.ts (HTTP API), connectionStorage.ts, dataService.ts
- **Types**: influxdb.ts (complete InfluxDB 1.0 type definitions)

## Backend Structure (Rust + Tauri)
- **lib.rs**: Tauri command registration and entry point
- **connection_store.rs**: Connection configuration persistence
- **database_operations.rs**: Database metadata and query operations
- **influxdb_api.rs**: Core InfluxDB communication layer

## Data Flow
Frontend Components → Tauri Commands → Rust Backend → InfluxDB 1.0 → Data Rendering
Connection Config → Tauri Commands → File System Storage

## Key Tauri Commands
- Connection management: store_connection, load_connections, test_connection_with_auth
- Database operations: get_databases, get_measurements, execute_query_optimized
- Metadata queries: get_tag_keys, get_field_keys, get_measurement_info