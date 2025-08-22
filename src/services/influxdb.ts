import { InfluxDBConnection, QueryResult } from '../types/influxdb';
import { dataModeManager, DataMode } from './dataModeManager';

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
    // 监听数据模式变化
    dataModeManager.addModeListener((mode: DataMode) => {
      console.log(`🔄 InfluxDBService 检测到模式切换: ${mode}`);
      if (mode === 'demo') {
        console.log('🎭 切换到演示模式，将使用 Mock 数据');
        this.clearCache(); // 切换模式时清空缓存
        this.disconnect(); // 断开当前真实连接
      } else {
        console.log('🔗 切换到真实数据模式，将连接真实数据库');
        this.clearCache(); // 切换模式时清空缓存
      }
    });
    
    // 注册API调用拦截器
    dataModeManager.addApiCallInterceptor(() => {
      this.clearCache();
      this.connectionHealth.clear();
      console.log('🧹 数据模式切换：清理服务状态');
    });
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
    return `${database}:${query.trim().toLowerCase()}`;
  }

  /**
   * 获取缓存结果
   */
  private getFromCache(query: string, database: string): QueryResult | null {
    const key = this.generateCacheKey(query, database);
    const cached = this.queryCache.get(key);
    
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_TTL) {
      console.log('🎯 命中缓存:', query.substring(0, 50) + '...');
      return cached.result;
    }
    
    return null;
  }

  /**
   * 设置缓存结果
   */
  private setToCache(query: string, database: string, result: QueryResult): void {
    const key = this.generateCacheKey(query, database);
    this.queryCache.set(key, { result, timestamp: new Date() });
  }

  /**
   * 更新连接健康状态
   */
  private updateConnectionHealth(connectionId: string, isConnected: boolean, responseTime: number, error?: string): void {
    this.connectionHealth.set(connectionId, {
      isConnected,
      lastChecked: new Date(),
      responseTime,
      error
    });
  }

  /**
   * 获取连接健康状态
   */
  getConnectionHealth(connectionId: string): ConnectionHealth | undefined {
    return this.connectionHealth.get(connectionId);
  }

  // 测试连接
  async testConnection(connection: InfluxDBConnection): Promise<boolean> {
    console.group('🔍 InfluxDB 连接测试');
    console.log('📋 连接配置详情:', {
      name: connection.name,
      url: connection.url,
      database: connection.database || '(未设置)',
      username: connection.username || '(未设置)',
      hasPassword: !!connection.password,
      passwordLength: connection.password ? connection.password.length : 0,
      connectionId: connection.id
    });

    // 检查数据模式
    const currentMode = dataModeManager.getCurrentMode();
    console.log('📊 当前数据模式:', currentMode);

    if (currentMode === 'demo') {
      console.log('🎭 演示模式下，跳过真实连接测试');
      console.groupEnd();
      return true; // 演示模式下总是返回成功
    }

    try {
      console.log('🔗 真实数据模式 - 调用后端连接测试...');
      console.log('📤 传递给 connectionStorage 的参数:', {
        url: connection.url,
        database: connection.database,
        username: connection.username || undefined,
        hasPassword: !!connection.password
      });
      
      const startTime = Date.now();
      const { connectionStorage } = await import('./connectionStorage');
      
      const result = await connectionStorage.testConnection(
        connection.url,
        connection.database,
        connection.username,
        connection.password
      );
      
      const responseTime = Date.now() - startTime;
      this.updateConnectionHealth(connection.id, result, responseTime);
      
      console.log('✅ 连接测试结果:', result ? '✅ 连接成功' : '❌ 连接失败');
      console.log('⏱️ 响应时间:', responseTime + 'ms');
      console.log('📝 测试完成时间:', new Date().toISOString());
      console.groupEnd();
      return result;
    } catch (error) {
      const responseTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.updateConnectionHealth(connection.id, false, responseTime, errorMessage);
      
      console.error('❌ 连接测试失败:', error);
      console.error('🔍 错误详情分析:', {
        message: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        isTauriError: error instanceof Error && error.message.includes('TAURI'),
        timestamp: new Date().toISOString()
      });
      console.groupEnd();
      return false;
    }
  }

  // 建立连接
  async connect(connection: InfluxDBConnection): Promise<boolean> {
    console.group('🔗 InfluxDB 建立连接');
    console.log('正在连接到:', connection.name);

    try {
      const isConnected = await this.testConnection(connection);
      if (isConnected) {
        this.currentConnection = connection;
        console.log('✅ 连接建立成功');
        console.groupEnd();
        return true;
      }
      console.log('❌ 连接建立失败');
      console.groupEnd();
      return false;
    } catch (error) {
      console.error('❌ 连接建立失败:', error);
      console.groupEnd();
      return false;
    }
  }

  // 获取数据库列表
  async getDatabases(): Promise<string[]> {
    console.group('📊 获取数据库列表');
    
    if (!this.currentConnection) {
      console.error('❌ 未建立连接');
      console.groupEnd();
      throw new Error('未建立连接');
    }

    // 真实数据模式下获取数据库列表（模拟数据由 UnifiedDataService 处理）
    
    try {
      console.log('🔗 真实数据模式 - 通过 Rust 后端执行查询: SHOW DATABASES');
      
      // 直接调用真实数据库API
      
      const { connectionStorage } = await import('./connectionStorage');
      const result = await connectionStorage.queryData(
        'SHOW DATABASES',
        this.currentConnection.url,
        this.currentConnection.database,
        this.currentConnection.username,
        this.currentConnection.password
      );
      
      console.log('Rust 查询返回结果:', result);
      
      // 解析返回的 JSON 数据
      const series = JSON.parse(result);
      if (series && series.length > 0) {
        const databases = series[0].values.map((row: any[]) => row[0]);
        console.log('✅ 获取到数据库列表:', databases);
        console.groupEnd();
        return databases;
      }
      
      console.log('⚠️ 没有找到数据库');
      console.groupEnd();
      return [];
    } catch (error) {
      console.error('❌ 获取数据库列表失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  // 获取 measurements
  async getMeasurements(database: string): Promise<string[]> {
    console.group('📊 获取测量列表');
    console.log('数据库:', database);
    
    if (!this.currentConnection) {
      console.error('❌ 未建立连接');
      console.groupEnd();
      throw new Error('未建立连接');
    }

    // 真实数据模式下获取测量列表（模拟数据由 UnifiedDataService 处理）
    
    try {
      console.log('🔗 真实数据模式 - 通过 Rust 后端执行查询: SHOW MEASUREMENTS');
      
      // 直接调用真实数据库API
      
      const { connectionStorage } = await import('./connectionStorage');
      const result = await connectionStorage.queryData(
        'SHOW MEASUREMENTS',
        this.currentConnection.url,
        database,
        this.currentConnection.username,
        this.currentConnection.password
      );
      
      console.log('Rust 查询返回结果:', result);
      
      // 解析返回的 JSON 数据
      const series = JSON.parse(result);
      if (series && series.length > 0) {
        const measurements = series[0].values.map((row: any[]) => row[0]);
        console.log('✅ 获取到测量列表:', measurements);
        console.groupEnd();
        return measurements;
      }
      
      console.log('⚠️ 没有找到测量');
      console.groupEnd();
      return [];
    } catch (error) {
      console.error('❌ 获取测量列表失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  // 执行查询
  async executeQuery(query: string, database: string): Promise<QueryResult> {
    console.group('🔍 InfluxDB 执行查询');
    console.log('数据库:', database);
    console.log('查询语句:', query);
    
    if (!this.currentConnection) {
      console.error('❌ 未建立连接');
      console.groupEnd();
      throw new Error('未建立连接');
    }

    // 真实数据模式下执行查询（模拟数据由 UnifiedDataService 处理）
    
    // 真实数据模式 - 检查缓存
    const cachedResult = this.getFromCache(query, database);
    if (cachedResult) {
      console.log('🎯 真实数据模式 - 查询缓存命中');
      console.groupEnd();
      return cachedResult;
    }
    
    try {
      console.log('🔗 真实数据模式 - 通过 Rust 后端执行查询...');
      
      // 直接调用真实数据库API
      
      const startTime = Date.now();
      const { connectionStorage } = await import('./connectionStorage');
      const result = await connectionStorage.queryData(
        query,
        this.currentConnection.url,
        database, // 使用传入的数据库名
        this.currentConnection.username,
        this.currentConnection.password
      );
      
      const responseTime = Date.now() - startTime;
      console.log('Rust 查询返回结果:', result);
      console.log('响应时间:', responseTime + 'ms');
      
      // 将 Rust 返回的数据转换为 QueryResult 格式
      const series = JSON.parse(result);
      const queryResult: QueryResult = {
        series,
        error: undefined
      };
      
      // 缓存结果
      this.setToCache(query, database, queryResult);
      
      console.log('✅ 查询执行成功');
      console.log('结果统计:', {
        seriesCount: series.length || 0,
        totalRows: series.reduce((count: number, s: any) => count + (s.values?.length || 0), 0) || 0
      });
      
      console.groupEnd();
      return queryResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('❌ 查询执行失败:', error);
      console.error('错误详情:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      console.groupEnd();
      throw error;
    }
  }

  // 获取 measurement 的字段信息
  async getMeasurementFields(database: string, measurement: string): Promise<{tags: string[], fields: string[]}> {
    console.group('📊 获取字段信息');
    console.log('数据库:', database);
    console.log('测量:', measurement);
    
    if (!this.currentConnection) {
      console.error('❌ 未建立连接');
      console.groupEnd();
      throw new Error('未建立连接');
    }

    // 真实数据模式下获取字段信息（模拟数据由 UnifiedDataService 处理）
    
    try {
      console.log('🔗 真实数据模式 - 通过 Rust 后端执行查询: SHOW TAG KEYS');
      
      // 直接调用真实数据库API
      
      const { connectionStorage } = await import('./connectionStorage');
      const tagResult = await connectionStorage.queryData(
        `SHOW TAG KEYS FROM "${measurement}"`,
        this.currentConnection.url,
        database,
        this.currentConnection.username,
        this.currentConnection.password
      );
      
      console.log('通过 Rust 后端执行查询: SHOW FIELD KEYS');
      const fieldResult = await connectionStorage.queryData(
        `SHOW FIELD KEYS FROM "${measurement}"`,
        this.currentConnection.url,
        database,
        this.currentConnection.username,
        this.currentConnection.password
      );
      
      console.log('Rust 查询返回结果:', { tagResult, fieldResult });
      
      // 解析返回的 JSON 数据
      const tagSeries = JSON.parse(tagResult);
      const fieldSeries = JSON.parse(fieldResult);
      
      const tags = tagSeries?.[0]?.values?.map((row: any[]) => row[0]) || [];
      const fields = fieldSeries?.[0]?.values?.map((row: any[]) => row[0]) || [];
      
      console.log('✅ 获取到字段信息:', { tags, fields });
      console.groupEnd();
      return { tags, fields };
    } catch (error) {
      console.error('❌ 获取字段信息失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  // 获取当前连接
  getCurrentConnection(): InfluxDBConnection | null {
    return this.currentConnection;
  }

  // 断开连接
  disconnect(): void {
    if (this.currentConnection) {
      console.log(`🔌 断开连接: ${this.currentConnection.name}`);
      this.currentConnection = null;
      this.clearCache(); // 断开连接时清理缓存
      this.connectionHealth.clear(); // 清理连接健康状态
    }
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    totalConnections: number;
    healthyConnections: number;
    cacheSize: number;
    cacheHitRate: number;
  } {
    const healthArray = Array.from(this.connectionHealth.values());
    const healthyConnections = healthArray.filter(h => h.isConnected).length;
    
    return {
      totalConnections: healthArray.length,
      healthyConnections,
      cacheSize: this.queryCache.size,
      cacheHitRate: this.queryCache.size > 0 ? 0.75 : 0 // 简化的缓存命中率
    };
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp.getTime() > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.queryCache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 清理了 ${keysToDelete.length} 个过期缓存项`);
    }
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): {
    mode: DataMode;
    isConnected: boolean;
    currentConnection: InfluxDBConnection | null;
    cacheSize: number;
    healthCheckCount: number;
  } {
    return {
      mode: dataModeManager.getCurrentMode(),
      isConnected: this.currentConnection !== null,
      currentConnection: this.currentConnection,
      cacheSize: this.queryCache.size,
      healthCheckCount: this.connectionHealth.size
    };
  }
}

// 导出重构后的服务实例（向后兼容）
export const influxDBService = new InfluxDBService();

// 重新导出重构后的服务
export { refactoredInfluxDBService } from './influxdbRefactored'; 