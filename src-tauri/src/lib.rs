mod influxdb_api;
mod connection_store;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            influxdb_api::write_data,
            influxdb_api::query_data,
            connection_store::store_connection,
            connection_store::load_connections,
            connection_store::delete_connection,
            connection_store::test_connection_with_auth
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}