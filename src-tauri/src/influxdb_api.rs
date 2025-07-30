use influxdb::{Client, Timestamp, InfluxDbWriteable, ReadQuery};
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug)]
struct Series {
    name: String,
    columns: Vec<String>,
    values: Vec<Vec<serde_json::Value>>,
}

#[derive(Debug, InfluxDbWriteable)]
pub struct Measurement {
    time: Timestamp,
    #[influxdb(tag)]
    host: String,
    #[influxdb(tag)]
    region: String,
    cpu_usage: f64,
    memory_free: f64,
}

#[tauri::command]
pub async fn write_data(
    host: String,
    region: String,
    cpu_usage: f64,
    memory_free: f64,
    influxdb_url: String,
    influxdb_database: String,
) -> Result<String, String> {
    let client = Client::new(influxdb_url, influxdb_database);

    let measurement = Measurement {
        time: Timestamp::from(Utc::now()),
        host,
        region,
        cpu_usage,
        memory_free,
    };

    match client.query(&measurement.into_query("cpu_metrics")).await {
        Ok(_) => Ok("Data written successfully".to_string()),
        Err(e) => Err(format!("Failed to write data: {}", e)),
    }
}

#[tauri::command]
pub async fn query_data(
    query_string: String,
    influxdb_url: String,
    influxdb_database: String,
) -> Result<String, String> {
    let client = Client::new(influxdb_url, influxdb_database);

    let query = ReadQuery::new(query_string);

    match client.json_query(query).await {
        Ok(json) => {
            let result: Result<Vec<Series>, _> = serde_json::from_value(serde_json::to_value(json.results).unwrap());
            match result {
                Ok(series) => {
                    Ok(serde_json::to_string(&series).unwrap_or_else(|e| format!("Failed to serialize JSON: {}", e)))
                },
                Err(e) => Err(format!("Failed to deserialize JSON: {}", e)),
            }
        },
        Err(e) => Err(format!("Failed to query data: {}", e)),
    }
}