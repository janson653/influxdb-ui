import axios, { AxiosInstance } from 'axios';
import { InfluxDBConnection, QueryResult } from '../types/influxdb';

class InfluxDBService {
  private client: AxiosInstance | null = null;
  private currentConnection: InfluxDBConnection | null = null;

  // 测试连接
  async testConnection(connection: InfluxDBConnection): Promise<boolean> {
    try {
      const client = this.createClient(connection);
      const response = await client.get('/ping');
      return response.status === 204;
    } catch (error) {
      console.error('连接测试失败:', error);
      return false;
    }
  }

  // 建立连接
  async connect(connection: InfluxDBConnection): Promise<boolean> {
    try {
      const isConnected = await this.testConnection(connection);
      if (isConnected) {
        this.currentConnection = connection;
        this.client = this.createClient(connection);
        return true;
      }
      return false;
    } catch (error) {
      console.error('连接失败:', error);
      return false;
    }
  }

  // 获取数据库列表
  async getDatabases(): Promise<string[]> {
    if (!this.client) throw new Error('未建立连接');
    
    try {
      const response = await this.client.get('/query', {
        params: {
          q: 'SHOW DATABASES'
        }
      });
      
      const result: QueryResult = response.data;
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.series && result.series.length > 0) {
        return result.series[0].values.map(row => row[0]);
      }
      
      return [];
    } catch (error) {
      console.error('获取数据库列表失败:', error);
      throw error;
    }
  }

  // 获取 measurements
  async getMeasurements(database: string): Promise<string[]> {
    if (!this.client) throw new Error('未建立连接');
    
    try {
      const response = await this.client.get('/query', {
        params: {
          q: `SHOW MEASUREMENTS`,
          db: database
        }
      });
      
      const result: QueryResult = response.data;
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.series && result.series.length > 0) {
        return result.series[0].values.map(row => row[0]);
      }
      
      return [];
    } catch (error) {
      console.error('获取 measurements 失败:', error);
      throw error;
    }
  }

  // 执行查询
  async executeQuery(query: string, database: string): Promise<QueryResult> {
    if (!this.client) throw new Error('未建立连接');
    
    try {
      const response = await this.client.get('/query', {
        params: {
          q: query,
          db: database
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('查询执行失败:', error);
      throw error;
    }
  }

  // 获取 measurement 的字段信息
  async getMeasurementFields(database: string, measurement: string): Promise<{tags: string[], fields: string[]}> {
    if (!this.client) throw new Error('未建立连接');
    
    try {
      // 获取 tag keys
      const tagResponse = await this.client.get('/query', {
        params: {
          q: `SHOW TAG KEYS FROM "${measurement}"`,
          db: database
        }
      });
      
      // 获取 field keys
      const fieldResponse = await this.client.get('/query', {
        params: {
          q: `SHOW FIELD KEYS FROM "${measurement}"`,
          db: database
        }
      });
      
      const tagResult: QueryResult = tagResponse.data;
      const fieldResult: QueryResult = fieldResponse.data;
      
      const tags = tagResult.series?.[0]?.values?.map(row => row[0]) || [];
      const fields = fieldResult.series?.[0]?.values?.map(row => row[0]) || [];
      
      return { tags, fields };
    } catch (error) {
      console.error('获取字段信息失败:', error);
      throw error;
    }
  }

  // 创建 HTTP 客户端
  private createClient(connection: InfluxDBConnection): AxiosInstance {
    const client = axios.create({
      baseURL: connection.url,
      timeout: 10000,
    });

    // 添加认证信息
    if (connection.username && connection.password) {
      client.defaults.auth = {
        username: connection.username,
        password: connection.password
      };
    }

    return client;
  }

  // 获取当前连接
  getCurrentConnection(): InfluxDBConnection | null {
    return this.currentConnection;
  }

  // 断开连接
  disconnect(): void {
    this.client = null;
    this.currentConnection = null;
  }
}

export const influxDBService = new InfluxDBService(); 