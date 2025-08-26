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
    const testStartTime = Date.now();
    
    console.log('🔍 [InfluxDBService] 开始测试连接:', {
      name: connection.name,
      id: connection.id,
      url: connection.url,
      database: connection.database,
      hasAuth: !!(connection.username && connection.password),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 检查连接是否为空
      if (!connection || !connection.url) {
        console.error('❌ [InfluxDBService] 连接配置无效:', connection);
        throw new Error('连接配置无效');
      }

      // 调用Tauri命令测试连接
      const result = await this.invokeRustCommand('test_connection', {
        connectionId: connection.id
      });
      
      const responseTime = Date.now() - testStartTime;
      
      // 更新连接健康状态
      this.connectionHealth.set(connection.id, {
        isConnected: result.success,
        lastChecked: new Date(),
        responseTime,
        error: result.success ? undefined : '连接测试失败'
      });

      console.log(`✅ [InfluxDBService] 连接测试完成:`, {
        name: connection.name,
        success: result.success,
        responseTime: `${responseTime}ms`,
        serverResponseTime: result.response_time ? `${result.response_time}ms` : 'N/A',
        timestamp: new Date().toISOString()
      });
      
      return result.success;
    } catch (error) {
      const responseTime = Date.now() - testStartTime;
      
      console.error('❌ [InfluxDBService] 连接测试失败:', {
        name: connection.name,
        error: error instanceof Error ? error.message : '未知错误',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      });
      
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
    const startTime = Date.now();
    
    console.log('📊 [InfluxDBService] 开始获取数据库列表:', {
      connectionId: this.currentConnection?.id,
      connectionName: this.currentConnection?.name,
      timestamp: new Date().toISOString()
    });
    
    try {
      if (!this.currentConnection) {
        console.error('❌ [InfluxDBService] 未建立连接，无法获取数据库列表');
        throw new Error('未建立连接');
      }

      const result = await this.invokeRustCommand('get_databases', {
        connectionId: this.currentConnection.id
      });
      
      const executionTime = Date.now() - startTime;
      
      console.log('📊 [InfluxDBService] 数据库列表获取成功:', {
        databaseCount: result.length,
        executionTime: `${executionTime}ms`,
        databases: result,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.error('❌ [InfluxDBService] 获取数据库列表失败:', {
        connectionId: this.currentConnection?.id,
        executionTime: `${executionTime}ms`,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      });
      
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
    const queryStartTime = Date.now();
    
    console.log('🔍 [InfluxDBService] 开始执行查询:', {
      database,
      queryLength: query.length,
      queryType: this.getQueryType(query),
      hasConnection: !!this.currentConnection,
      timestamp: new Date().toISOString()
    });
    
    // 打印查询语句（限制长度）
    const queryPreview = query.length > 100 ? query.substring(0, 100) + '...' : query;
    console.log('📝 [InfluxDBService] 查询语句:', queryPreview);
    
    try {
      if (!this.currentConnection) {
        console.error('❌ [InfluxDBService] 未建立连接，无法执行查询');
        throw new Error('未建立连接');
      }

      // 检查缓存
      const cacheKey = this.generateCacheKey(query, database);
      const cached = this.queryCache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached.timestamp)) {
        const cacheAge = Date.now() - cached.timestamp.getTime();
        console.log('🎯 [InfluxDBService] 使用缓存结果:', {
          cacheKey,
          cacheAge: `${cacheAge}ms`,
          cacheValid: this.isCacheValid(cached.timestamp),
          timestamp: new Date().toISOString()
        });
        return cached.result;
      }

      // 执行查询
      const result = await this.invokeRustCommand('execute_query', {
        connectionId: this.currentConnection.id,
        database,
        query
      });

      const executionTime = Date.now() - queryStartTime;
      
      // 缓存结果
      this.queryCache.set(cacheKey, {
        result,
        timestamp: new Date()
      });

      console.log('✅ [InfluxDBService] 查询执行成功:', {
        database,
        executionTime: `${executionTime}ms`,
        serverExecutionTime: result.execution_time_ms ? `${result.execution_time_ms}ms` : 'N/A',
        rowCount: result.row_count || 0,
        seriesCount: result.series?.length || 0,
        cacheSize: this.queryCache.size,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - queryStartTime;
      
      console.error('❌ [InfluxDBService] 查询执行失败:', {
        database,
        executionTime: `${executionTime}ms`,
        error: error instanceof Error ? error.message : '未知错误',
        cacheSize: this.queryCache.size,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * 获取查询类型
   */
  private getQueryType(query: string): string {
    const upperQuery = query.trim().toUpperCase();
    
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('SHOW')) return 'SHOW';
    if (upperQuery.startsWith('CREATE')) return 'CREATE';
    if (upperQuery.startsWith('DROP')) return 'DROP';
    if (upperQuery.startsWith('ALTER')) return 'ALTER';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    if (upperQuery.startsWith('EXPLAIN')) return 'EXPLAIN';
    
    return 'UNKNOWN';
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
    
    // 打印入参日志
    console.log(`🔧 [Frontend] 调用 Rust 命令: ${command}`);
    console.log(`📥 [Frontend] 入参:`, {
      command,
      payload: this.sanitizePayload(payload),
      timestamp: new Date().toISOString()
    });
    
    const startTime = Date.now();
    
    try {
      const result = await invoke(command, payload);
      const executionTime = Date.now() - startTime;
      
      // 打印出参日志
      console.log(`✅ [Frontend] Rust 命令执行成功: ${command}`);
      console.log(`📤 [Frontend] 出参:`, {
        command,
        executionTime: `${executionTime}ms`,
        result: this.sanitizeResult(result),
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // 打印错误日志
      console.error(`❌ [Frontend] Rust 命令执行失败: ${command}`);
      console.error(`📤 [Frontend] 错误信息:`, {
        command,
        executionTime: `${executionTime}ms`,
        error: error instanceof Error ? error.message : '未知错误',
        errorObject: error,
        errorType: typeof error,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * 清理敏感信息的载荷
   */
  private sanitizePayload(payload: any): any {
    if (!payload) return payload;
    
    const sanitized = { ...payload };
    
    // 隐藏敏感信息
    if (sanitized.password) {
      sanitized.password = '***';
    }
    if (sanitized.token) {
      sanitized.token = '***';
    }
    
    return sanitized;
  }

  /**
   * 清理敏感信息的结果
   */
  private sanitizeResult(result: any): any {
    if (!result) return result;
    
    // 如果是字符串，直接返回
    if (typeof result === 'string') {
      return result;
    }
    
    // 如果是对象，递归清理
    if (typeof result === 'object') {
      const sanitized = Array.isArray(result) ? [...result] : { ...result };
      
      // 隐藏敏感信息
      if (sanitized.password) {
        sanitized.password = '***';
      }
      if (sanitized.token) {
        sanitized.token = '***';
      }
      
      return sanitized;
    }
    
    return result;
  }
}

// 导出单例实例
export const influxDBService = new InfluxDBService();