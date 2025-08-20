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

// 查询历史记录项
export interface QueryHistoryItem {
  id: string;
  title: string;
  query: string;
  database: string;
  connectionId: string;
  createdAt: string;
  lastUsed: string;
  executionCount: number;
  tags: string[];
  description?: string;
  isFavorite: boolean;
  executionTime?: number;
  resultCount?: number;
  queryType?: 'select' | 'show' | 'create' | 'drop' | 'alter' | 'other';
}

// 查询历史搜索选项
export interface QueryHistorySearchOptions {
  keyword?: string;
  tags?: string[];
  connectionId?: string;
  database?: string;
  queryType?: QueryHistoryItem['queryType'];
  dateRange?: {
    start: string;
    end: string;
  };
  isFavorite?: boolean;
  limit?: number;
  offset?: number;
}

// 查询历史排序选项
export interface QueryHistorySortOptions {
  field: 'createdAt' | 'lastUsed' | 'executionCount' | 'title' | 'executionTime';
  order: 'asc' | 'desc';
}

// 查询历史统计信息
export interface QueryHistoryStats {
  totalQueries: number;
  totalExecutions: number;
  favoriteQueries: number;
  topTags: Array<{ tag: string; count: number }>;
  topConnections: Array<{ connectionId: string; count: number }>;
  recentQueries: QueryHistoryItem[];
} 