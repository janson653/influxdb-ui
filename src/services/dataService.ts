/**
 * 统一数据服务接口
 * 只使用真实数据模式，直接连接InfluxDB
 */

import { InfluxDBConnection, QueryResult } from '../types/influxdb';

interface DataServiceInterface {
  testConnection(connection: InfluxDBConnection): Promise<boolean>;
  connect(connection: InfluxDBConnection): Promise<boolean>;
  getDatabases(): Promise<string[]>;
  getMeasurements(database: string): Promise<string[]>;
  executeQuery(query: string, database: string): Promise<QueryResult>;
  getMeasurementFields(database: string, measurement: string): Promise<{tags: string[], fields: string[]}>;
  disconnect(): void;
}

class UnifiedDataService implements DataServiceInterface {
  private currentConnection: InfluxDBConnection | null = null;
  private realDataService: any = null;

  /**
   * 延迟加载真实数据服务
   */
  private async loadRealDataService(): Promise<void> {
    if (!this.realDataService) {
      const { influxDBService } = await import('./influxdb');
      this.realDataService = influxDBService;
      console.log('✅ 真实数据服务已加载（使用Tauri Commands）');
    }
  }

  /**
   * 获取当前数据服务
   */
  private async getCurrentService(): Promise<DataServiceInterface> {
    console.log('🔗 路由到真实数据服务');
    await this.loadRealDataService();
    if (!this.realDataService) {
      throw new Error('无法加载真实数据服务');
    }
    return this.realDataService;
  }

  // 实现 DataServiceInterface 接口
  async testConnection(connection: InfluxDBConnection): Promise<boolean> {
    console.log('🔍 测试连接');
    const service = await this.getCurrentService();
    return service.testConnection(connection);
  }

  async connect(connection: InfluxDBConnection): Promise<boolean> {
    console.log('🔗 建立连接');
    const service = await this.getCurrentService();
    const result = await service.connect(connection);
    if (result) {
      this.currentConnection = connection;
    }
    return result;
  }

  async getDatabases(): Promise<string[]> {
    console.log('🔍 获取数据库列表');
    if (!this.currentConnection) {
      throw new Error('未建立连接');
    }
    const service = await this.getCurrentService();
    return service.getDatabases();
  }

  async getMeasurements(database: string): Promise<string[]> {
    console.log('🔍 获取测量列表');
    if (!this.currentConnection) {
      throw new Error('未建立连接');
    }
    const service = await this.getCurrentService();
    return service.getMeasurements(database);
  }

  async executeQuery(query: string, database: string): Promise<QueryResult> {
    console.log('🔍 执行查询');
    if (!this.currentConnection) {
      throw new Error('未建立连接');
    }
    const service = await this.getCurrentService();
    return service.executeQuery(query, database);
  }

  async getMeasurementFields(database: string, measurement: string): Promise<{tags: string[], fields: string[]}> {
    console.log('🔍 获取字段信息');
    if (!this.currentConnection) {
      throw new Error('未建立连接');
    }
    const service = await this.getCurrentService();
    return service.getMeasurementFields(database, measurement);
  }

  disconnect(): void {
    console.log('🔌 断开连接');
    this.currentConnection = null;
  }

  /**
   * 获取当前连接
   */
  getCurrentConnection(): InfluxDBConnection | null {
    return this.currentConnection;
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): {
    isConnected: boolean;
    currentConnection: InfluxDBConnection | null;
    serviceType: 'real' | 'none';
  } {
    return {
      isConnected: this.currentConnection !== null,
      currentConnection: this.currentConnection,
      serviceType: this.realDataService ? 'real' : 'none'
    };
  }

  /**
   * 强制刷新服务状态
   */
  async refreshService(): Promise<void> {
    console.log('🔄 刷新数据服务状态');
    // 重新加载数据服务
    this.realDataService = null;
    await this.loadRealDataService();
  }
}

// 导出单例实例
export const dataService = new UnifiedDataService();