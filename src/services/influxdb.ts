import { InfluxDBConnection, QueryResult } from '../types/influxdb';

interface ConnectionHealth {
  isConnected: boolean;
  lastChecked: Date;
  responseTime: number;
  error?: string;
}

class InfluxDBService {
  private currentConnection: InfluxDBConnection | null = null;
  private connectionHealth: Map<string, ConnectionHealth> = new Map();
  private queryCache: Map<string, { result: QueryResult; timestamp: Date }> = new Map();
  private readonly CACHE_TTL = 30000; // 30秒缓存

  constructor() {
    console.log('🔗 InfluxDBService 初始化 - 使用真实数据模式');
  }

  /**
   * 清空查询缓存
   */
  private clearCache(): void {
    this.queryCache.clear();
    console.log('🗑️ 查询缓存已清空');
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(query: string, database: string): string {
    return `${database}:${query}`;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(timestamp: Date): boolean {
    const now = new Date();
    return (now.getTime() - timestamp.getTime()) < this.CACHE_TTL;
  }

  /**
   * 测试连接
   */
  async testConnection(connection: InfluxDBConnection): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // 检查连接是否为空
      if (!connection || !connection.url) {
        throw new Error('连接配置无效');
      }

      console.log('🔍 测试连接:', connection.name);

      // 构建请求数据
      const requestData = {
        connectionId: connection.id,
        url: connection.url,
        username: connection.username,
        password: connection.password,
        database: connection.database
      };

      // 调用Tauri命令测试连接
      const result = await this.invokeRustCommand('test_connection', requestData);
      
      const responseTime = Date.now() - startTime;
      
      // 更新连接健康状态
      this.connectionHealth.set(connection.id, {
        isConnected: result.success,
        lastChecked: new Date(),
        responseTime,
        error: result.error
      });

      console.log(`🔍 连接测试完成: ${connection.name} - ${result.success ? '成功' : '失败'} (${responseTime}ms)`);
      
      return result.success;
    } catch (error) {
      console.error('❌ 连接测试失败:', error);
      
      // 更新连接健康状态
      this.connectionHealth.set(connection.id, {
        isConnected: false,
        lastChecked: new Date(),
        responseTime: 0,
        error: error instanceof Error ? error.message : '未知错误'
      });
      
      return false;
    }
  }

  /**
   * 建立连接
   */
  async connect(connection: InfluxDBConnection): Promise<boolean> {
    try {
      console.log('🔗 建立连接:', connection.name);
      
      // 测试连接
      const isConnected = await this.testConnection(connection);
      if (isConnected) {
        this.currentConnection = connection;
        console.log('✅ 连接建立成功:', connection.name);
        return true;
      }
      
      console.log('❌ 连接建立失败:', connection.name);
      return false;
    } catch (error) {
      console.error('❌ 连接建立失败:', error);
      return false;
    }
  }

  /**
   * 获取数据库列表
   */
  async getDatabases(): Promise<string[]> {
    try {
      if (!this.currentConnection) {
        throw new Error('未建立连接');
      }

      console.log('📊 获取数据库列表');
      
      const result = await this.invokeRustCommand('get_databases', {
        connectionId: this.currentConnection.id
      });
      
      console.log('📊 数据库列表获取成功，数量:', result.length);
      return result;
    } catch (error) {
      console.error('❌ 获取数据库列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取测量列表
   */
  async getMeasurements(database: string): Promise<string[]> {
    try {
      if (!this.currentConnection) {
        throw new Error('未建立连接');
      }

      console.log('📊 获取测量列表:', database);
      
      const result = await this.invokeRustCommand('get_measurements', {
        connectionId: this.currentConnection.id,
        database
      });
      
      console.log('📊 测量列表获取成功，数量:', result.length);
      return result;
    } catch (error) {
      console.error('❌ 获取测量列表失败:', error);
      throw error;
    }
  }

  /**
   * 执行查询
   */
  async executeQuery(query: string, database: string): Promise<QueryResult> {
    try {
      if (!this.currentConnection) {
        throw new Error('未建立连接');
      }

      console.log('🔍 执行查询:', query);

      // 检查缓存
      const cacheKey = this.generateCacheKey(query, database);
      const cached = this.queryCache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached.timestamp)) {
        console.log('🎯 使用缓存结果');
        return cached.result;
      }

      // 执行查询
      const result = await this.invokeRustCommand('execute_query', {
        connectionId: this.currentConnection.id,
        database,
        query
      });

      // 缓存结果
      this.queryCache.set(cacheKey, {
        result,
        timestamp: new Date()
      });

      console.log('🔍 查询执行成功');
      return result;
    } catch (error) {
      console.error('❌ 查询执行失败:', error);
      throw error;
    }
  }

  /**
   * 获取测量字段信息
   */
  async getMeasurementFields(database: string, measurement: string): Promise<{tags: string[], fields: string[]}> {
    try {
      if (!this.currentConnection) {
        throw new Error('未建立连接');
      }

      console.log('📊 获取字段信息:', measurement);
      
      const [tagKeys, fieldKeys] = await Promise.all([
        this.invokeRustCommand('get_tag_keys', {
          connectionId: this.currentConnection.id,
          database,
          measurement
        }),
        this.invokeRustCommand('get_field_keys', {
          connectionId: this.currentConnection.id,
          database,
          measurement
        })
      ]);
      
      const fields = fieldKeys.map((f: any) => f.name);
      
      console.log('📊 字段信息获取成功');
      return { tags: tagKeys, fields };
    } catch (error) {
      console.error('❌ 获取字段信息失败:', error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    console.log('🔌 断开连接');
    this.currentConnection = null;
    this.clearCache();
  }

  /**
   * 获取连接健康状态
   */
  getConnectionHealth(connectionId: string): ConnectionHealth | undefined {
    return this.connectionHealth.get(connectionId);
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): {
    isConnected: boolean;
    currentConnection: InfluxDBConnection | null;
    cacheSize: number;
    healthChecks: number;
  } {
    return {
      isConnected: this.currentConnection !== null,
      currentConnection: this.currentConnection,
      cacheSize: this.queryCache.size,
      healthChecks: this.connectionHealth.size
    };
  }

  /**
   * 调用 Rust 命令的通用方法
   */
  private async invokeRustCommand(command: string, payload: any): Promise<any> {
    // 统一使用 Tauri invoke
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke(command, payload);
    return result;
  }
}

// 导出单例实例
export const influxDBService = new InfluxDBService();