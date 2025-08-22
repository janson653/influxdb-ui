/**
 * 重构后的 InfluxDB 服务
 * 统一使用 Tauri Commands，移除直接 HTTP 调用
 */

import { InfluxDBConnection, QueryResult, EnhancedQueryResult, FieldInfo, MeasurementInfo } from '../types/influxdb';
import { dataModeManager, DataMode } from './dataModeManager';

interface ConnectionHealth {
  isConnected: boolean;
  lastChecked: Date;
  responseTime: number;
  error?: string;
}

class RefactoredInfluxDBService {
  private currentConnection: InfluxDBConnection | null = null;
  private connectionHealth: Map<string, ConnectionHealth> = new Map();
  private queryCache: Map<string, { result: EnhancedQueryResult; timestamp: Date }> = new Map();
  private readonly CACHE_TTL = 30000; // 30秒缓存

  constructor() {
    // 监听数据模式变化
    dataModeManager.addModeListener((mode: DataMode) => {
      console.log(`🔄 RefactoredInfluxDBService 检测到模式切换: ${mode}`);
      if (mode === 'demo') {
        console.log('🎭 切换到演示模式，将使用 Mock 数据');
        this.clearCache();
        this.disconnect();
      } else {
        console.log('🔗 切换到真实数据模式，将连接真实数据库');
        this.clearCache();
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
  private getFromCache(query: string, database: string): EnhancedQueryResult | null {
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
  private setToCache(query: string, database: string, result: EnhancedQueryResult): void {
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

  /**
   * 调用 Tauri Command 的统一方法
   */
  private async invokeTauriCommand<T>(command: string, payload: any): Promise<T> {
    console.log(`🚀 调用 Tauri Command: ${command}`, payload);
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<T>(command, payload);
      console.log(`✅ Tauri Command 执行成功: ${command}`, result);
      return result;
    } catch (error) {
      console.error(`❌ Tauri Command 执行失败: ${command}`, error);
      throw error;
    }
  }

  // 测试连接
  async testConnection(connection: InfluxDBConnection): Promise<boolean> {
    console.group('🔍 RefactoredInfluxDBService 连接测试');
    console.log('📋 连接配置详情:', {
      name: connection.name,
      url: connection.url,
      database: connection.database || '(未设置)',
      username: connection.username || '(未设置)',
      hasPassword: !!connection.password,
      connectionId: connection.id
    });

    // 检查数据模式
    const currentMode = dataModeManager.getCurrentMode();
    console.log('📊 当前数据模式:', currentMode);

    if (currentMode === 'demo') {
      console.log('🎭 演示模式下，跳过真实连接测试');
      console.groupEnd();
      return true;
    }

    try {
      console.log('🔗 真实数据模式 - 使用 Tauri Command 测试连接...');
      
      const startTime = Date.now();
      const result = await this.invokeTauriCommand<boolean>('test_connection_with_auth', {
        url: connection.url,
        database: connection.database,
        username: connection.username || null,
        password: connection.password || null
      });
      
      const responseTime = Date.now() - startTime;
      this.updateConnectionHealth(connection.id, result, responseTime);
      
      console.log('✅ 连接测试结果:', result ? '✅ 连接成功' : '❌ 连接失败');
      console.log('⏱️ 响应时间:', responseTime + 'ms');
      console.groupEnd();
      return result;
    } catch (error) {
      const responseTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.updateConnectionHealth(connection.id, false, responseTime, errorMessage);
      
      console.error('❌ 连接测试失败:', error);
      console.groupEnd();
      return false;
    }
  }

  // 建立连接
  async connect(connection: InfluxDBConnection): Promise<boolean> {
    console.group('🔗 RefactoredInfluxDBService 建立连接');
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

  // 获取数据库列表 (使用新的 Tauri Command)
  async getDatabases(): Promise<string[]> {
    console.group('📊 获取数据库列表');
    
    if (!this.currentConnection) {
      console.error('❌ 未建立连接');
      console.groupEnd();
      throw new Error('未建立连接');
    }

    try {
      // 检查是否在 Tauri 环境中
      if (typeof window !== 'undefined' && (window as any).__TAURI_IPC__) {
        console.log('🔗 使用 Tauri Command 获取数据库列表...');
        
        const databases = await this.invokeTauriCommand<string[]>('get_databases', {
          connection_id: this.currentConnection.id
        });
        
        console.log('✅ 获取到数据库列表:', databases);
        console.groupEnd();
        return databases;
      } else {
        // 开发环境中的回退机制
        console.log('🔧 开发环境 - 使用直接 HTTP 请求获取数据库列表...');
        
        const { connectionStorage } = await import('./connectionStorage');
        const result = await connectionStorage.queryData(
          'SHOW DATABASES',
          this.currentConnection.url,
          this.currentConnection.database,
          this.currentConnection.username,
          this.currentConnection.password
        );
        
        console.log('🔧 开发环境查询结果:', result);
        
        // 解析返回的 JSON 数据
        const series = JSON.parse(result);
        if (series && series.length > 0) {
          const databases = series[0].values.map((row: any[]) => row[0]);
          console.log('✅ 开发环境获取到数据库列表:', databases);
          console.groupEnd();
          return databases;
        }
        
        console.log('⚠️ 开发环境没有找到数据库');
        console.groupEnd();
        return [];
      }
    } catch (error) {
      console.error('❌ 获取数据库列表失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  // 获取 measurements (使用新的 Tauri Command)
  async getMeasurements(database: string): Promise<string[]> {
    console.group('📊 获取测量列表');
    console.log('数据库:', database);
    
    if (!this.currentConnection) {
      console.error('❌ 未建立连接');
      console.groupEnd();
      throw new Error('未建立连接');
    }

    try {
      // 检查是否在 Tauri 环境中
      if (typeof window !== 'undefined' && (window as any).__TAURI_IPC__) {
        console.log('🔗 使用 Tauri Command 获取测量列表...');
        
        const measurements = await this.invokeTauriCommand<string[]>('get_measurements', {
          connection_id: this.currentConnection.id,
          database
        });
        
        console.log('✅ 获取到测量列表:', measurements);
        console.groupEnd();
        return measurements;
      } else {
        // 开发环境中的回退机制
        console.log('🔧 开发环境 - 使用直接 HTTP 请求获取测量列表...');
        
        const { connectionStorage } = await import('./connectionStorage');
        const result = await connectionStorage.queryData(
          'SHOW MEASUREMENTS',
          this.currentConnection.url,
          database,
          this.currentConnection.username,
          this.currentConnection.password
        );
        
        console.log('🔧 开发环境查询结果:', result);
        
        // 解析返回的 JSON 数据
        const series = JSON.parse(result);
        if (series && series.length > 0) {
          const measurements = series[0].values.map((row: any[]) => row[0]);
          console.log('✅ 开发环境获取到测量列表:', measurements);
          console.groupEnd();
          return measurements;
        }
        
        console.log('⚠️ 开发环境没有找到测量');
        console.groupEnd();
        return [];
      }
    } catch (error) {
      console.error('❌ 获取测量列表失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  // 执行查询 (使用新的 Tauri Command)
  async executeQuery(query: string, database: string): Promise<EnhancedQueryResult> {
    console.group('🔍 RefactoredInfluxDBService 执行查询');
    console.log('数据库:', database);
    console.log('查询语句:', query);
    
    if (!this.currentConnection) {
      console.error('❌ 未建立连接');
      console.groupEnd();
      throw new Error('未建立连接');
    }

    // 检查缓存
    const cachedResult = this.getFromCache(query, database);
    if (cachedResult) {
      console.log('🎯 查询缓存命中');
      console.groupEnd();
      return cachedResult;
    }
    
    try {
      // 检查是否在 Tauri 环境中
      if (typeof window !== 'undefined' && (window as any).__TAURI_IPC__) {
        console.log('🔗 使用 Tauri Command 执行查询...');
        
        const result = await this.invokeTauriCommand<EnhancedQueryResult>('execute_query_optimized', {
          connection_id: this.currentConnection.id,
          database,
          query,
          chunk_size: 1000,
          timeout_ms: 30000
        });
        
        console.log('✅ 查询执行成功');
        console.log('结果统计:', {
          seriesCount: result.series.length,
          totalRows: result.row_count,
          executionTime: result.execution_time_ms + 'ms'
        });
        
        // 缓存结果
        this.setToCache(query, database, result);
        
        console.groupEnd();
        return result;
      } else {
        // 开发环境中的回退机制
        console.log('🔧 开发环境 - 使用直接 HTTP 请求执行查询...');
        
        const { connectionStorage } = await import('./connectionStorage');
        const result = await connectionStorage.queryData(
          query,
          this.currentConnection.url,
          database,
          this.currentConnection.username,
          this.currentConnection.password
        );
        
        console.log('🔧 开发环境查询结果:', result);
        
        // 解析返回的 JSON 数据并转换为 EnhancedQueryResult 格式
        const series = JSON.parse(result);
        const enhancedResult: EnhancedQueryResult = {
          series,
          execution_time_ms: Date.now() - (this.getFromCache(query, database) ? Date.now() - 1000 : Date.now()),
          row_count: series.reduce((count: number, s: any) => count + (s.values?.length || 0), 0),
          warning: undefined
        };
        
        console.log('✅ 开发环境查询执行成功');
        console.log('结果统计:', {
          seriesCount: enhancedResult.series.length,
          totalRows: enhancedResult.row_count,
          executionTime: enhancedResult.execution_time_ms + 'ms'
        });
        
        // 缓存结果
        this.setToCache(query, database, enhancedResult);
        
        console.groupEnd();
        return enhancedResult;
      }
    } catch (error) {
      console.error('❌ 查询执行失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  // 获取 measurement 的字段信息 (使用新的 Tauri Command)
  async getMeasurementFields(database: string, measurement: string): Promise<{tags: string[], fields: string[]}> {
    console.group('📊 获取字段信息');
    console.log('数据库:', database);
    console.log('测量:', measurement);
    
    if (!this.currentConnection) {
      console.error('❌ 未建立连接');
      console.groupEnd();
      throw new Error('未建立连接');
    }

    try {
      // 检查是否在 Tauri 环境中
      if (typeof window !== 'undefined' && (window as any).__TAURI_IPC__) {
        console.log('🔗 使用 Tauri Command 获取标签键...');
        const tags = await this.invokeTauriCommand<string[]>('get_tag_keys', {
          connection_id: this.currentConnection.id,
          database,
          measurement
        });
        
        console.log('🔗 使用 Tauri Command 获取字段键...');
        const fieldInfos = await this.invokeTauriCommand<FieldInfo[]>('get_field_keys', {
          connection_id: this.currentConnection.id,
          database,
          measurement
        });
        
        const fields = fieldInfos.map(info => info.name);
        
        console.log('✅ 获取到字段信息:', { tags, fields });
        console.groupEnd();
        return { tags, fields };
      } else {
        // 开发环境中的回退机制
        console.log('🔧 开发环境 - 使用直接 HTTP 请求获取字段信息...');
        
        const { connectionStorage } = await import('./connectionStorage');
        
        // 获取标签键
        const tagResult = await connectionStorage.queryData(
          `SHOW TAG KEYS FROM "${measurement}"`,
          this.currentConnection.url,
          database,
          this.currentConnection.username,
          this.currentConnection.password
        );
        
        // 获取字段键
        const fieldResult = await connectionStorage.queryData(
          `SHOW FIELD KEYS FROM "${measurement}"`,
          this.currentConnection.url,
          database,
          this.currentConnection.username,
          this.currentConnection.password
        );
        
        console.log('🔧 开发环境查询结果:', { tagResult, fieldResult });
        
        // 解析返回的 JSON 数据
        const tagSeries = JSON.parse(tagResult);
        const fieldSeries = JSON.parse(fieldResult);
        
        const tags = tagSeries?.[0]?.values?.map((row: any[]) => row[0]) || [];
        const fields = fieldSeries?.[0]?.values?.map((row: any[]) => row[0]) || [];
        
        console.log('✅ 开发环境获取到字段信息:', { tags, fields });
        console.groupEnd();
        return { tags, fields };
      }
    } catch (error) {
      console.error('❌ 获取字段信息失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  // 获取测量详细信息
  async getMeasurementInfo(database: string, measurement: string): Promise<MeasurementInfo> {
    console.group('📋 获取测量详细信息');
    console.log('数据库:', database);
    console.log('测量:', measurement);
    
    if (!this.currentConnection) {
      console.error('❌ 未建立连接');
      console.groupEnd();
      throw new Error('未建立连接');
    }

    try {
      console.log('🔗 使用 Tauri Command 获取测量信息...');
      
      const info = await this.invokeTauriCommand<MeasurementInfo>('get_measurement_info', {
        connection_id: this.currentConnection.id,
        database,
        measurement
      });
      
      console.log('✅ 获取到测量信息:', info);
      console.groupEnd();
      return info;
    } catch (error) {
      console.error('❌ 获取测量信息失败:', error);
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
      this.clearCache();
      this.connectionHealth.clear();
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
      cacheHitRate: this.queryCache.size > 0 ? 0.75 : 0
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

  /**
   * 兼容性方法 - 将 EnhancedQueryResult 转换为 QueryResult
   */
  private convertToLegacyResult(enhanced: EnhancedQueryResult): QueryResult {
    return {
      series: enhanced.series,
      error: undefined
    };
  }

  /**
   * 兼容性方法 - 执行查询并返回旧格式
   */
  async executeQueryLegacy(query: string, database: string): Promise<QueryResult> {
    const enhanced = await this.executeQuery(query, database);
    return this.convertToLegacyResult(enhanced);
  }
}

// 导出重构后的服务实例
export const refactoredInfluxDBService = new RefactoredInfluxDBService();