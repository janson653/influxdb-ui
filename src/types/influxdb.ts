// InfluxDB 1.0 连接配置
export interface InfluxDBConnection {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  database: string;
  status: 'connected' | 'disconnected' | 'error';
  error?: string;
}

// 数据库信息
export interface Database {
  name: string;
  measurements: Measurement[];
}

// Measurement 信息
export interface Measurement {
  name: string;
  tags: string[];
  fields: Field[];
}

// 字段信息
export interface Field {
  name: string;
  type: 'string' | 'number' | 'boolean';
}

// InfluxDB 1.0 查询结果
export interface QueryResult {
  series?: Series[];
  error?: string;
}

// 数据系列
export interface Series {
  name: string;
  columns: string[];
  values: any[][];
  tags?: Record<string, string>;
}

// 查询配置
export interface QueryConfig {
  id: string;
  name: string;
  query: string;
  database: string;
  measurement?: string;
} 