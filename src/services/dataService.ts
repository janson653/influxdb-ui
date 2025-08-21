/**
 * 统一数据服务接口
 * 负责根据数据模式路由到正确的数据源
 */

import { InfluxDBConnection, QueryResult } from '../types/influxdb';
import { dataModeManager, DataMode } from './dataModeManager';
import { mockDataService } from './mockDataService';

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

  constructor() {
    // 监听数据模式变化
    dataModeManager.addModeListener((mode: DataMode) => {
      console.log(`🔄 UnifiedDataService 检测到模式切换: ${mode}`);
      this.handleModeSwitch(mode);
    });
  }

  /**
   * 处理数据模式切换
   */
  private handleModeSwitch(mode: DataMode): void {
    // 清理当前连接和状态
    this.currentConnection = null;
    
    if (mode === 'demo') {
      console.log('🎭 切换到演示模式 - 将使用 Mock 数据服务');
      this.realDataService = null;
    } else {
      console.log('🔗 切换到真实数据模式 - 准备加载真实数据服务');
      // 延迟加载真实数据服务，避免循环依赖
      this.loadRealDataService();
    }
  }

  /**
   * 延迟加载真实数据服务
   */
  private async loadRealDataService(): Promise<void> {
    if (!this.realDataService) {
      const { influxDBService } = await import('./influxdb');
      this.realDataService = influxDBService;
      console.log('✅ 真实数据服务已加载');
    }
  }

  /**
   * 获取当前数据服务
   */
  private async getCurrentService(): Promise<DataServiceInterface> {
    const currentMode = dataModeManager.getCurrentMode();
    
    if (currentMode === 'demo') {
      console.log('🎭 路由到演示数据服务');
      return this.createMockServiceAdapter();
    } else {
      console.log('🔗 路由到真实数据服务');
      await this.loadRealDataService();
      if (!this.realDataService) {
        throw new Error('无法加载真实数据服务');
      }
      return this.realDataService;
    }
  }

  /**
   * 创建Mock服务适配器
   */
  private createMockServiceAdapter(): DataServiceInterface {
    return {
      testConnection: async (connection: InfluxDBConnection) => {
        console.log('🎭 Mock: 测试连接');
        return mockDataService.mockConnectionTest(connection);
      },
      
      connect: async (connection: InfluxDBConnection) => {
        console.log('🎭 Mock: 建立连接');
        this.currentConnection = connection;
        return mockDataService.mockConnectionTest(connection);
      },
      
      getDatabases: async () => {
        console.log('🎭 Mock: 获取数据库列表');
        return mockDataService.getMockDatabases();
      },
      
      getMeasurements: async (database: string) => {
        console.log('🎭 Mock: 获取测量列表');
        return mockDataService.getMockMeasurements(database);
      },
      
      executeQuery: async (query: string, database: string) => {
        console.log('🎭 Mock: 执行查询');
        return mockDataService.generateMockQueryResult(query, database);
      },
      
      getMeasurementFields: async (_database: string, measurement: string) => {
        console.log('🎭 Mock: 获取字段信息');
        const tags = mockDataService.getMockTagKeys(measurement);
        const fieldKeys = mockDataService.getMockFieldKeys(measurement);
        const fields = fieldKeys.map(f => f.name);
        return { tags, fields };
      },
      
      disconnect: () => {
        console.log('🎭 Mock: 断开连接');
        this.currentConnection = null;
      }
    };
  }

  /**
   * 验证数据模式并记录日志
   */
  private validateDataMode(operation: string): void {
    const currentMode = dataModeManager.getCurrentMode();
    console.log(`🔍 ${operation} - 当前数据模式: ${currentMode}`);
    
    if (currentMode === 'demo') {
      console.log(`🎭 演示模式下执行 ${operation} - 将使用模拟数据`);
    } else {
      console.log(`🔗 真实数据模式下执行 ${operation} - 将访问真实数据库`);
      // 验证真实模式下API调用的合法性
      if (!dataModeManager.validateRealDataApiCall(operation)) {
        throw new Error(`演示模式下禁止调用真实数据库API: ${operation}`);
      }
    }
  }

  // 实现 DataServiceInterface 接口
  async testConnection(connection: InfluxDBConnection): Promise<boolean> {
    this.validateDataMode('测试连接');
    const service = await this.getCurrentService();
    return service.testConnection(connection);
  }

  async connect(connection: InfluxDBConnection): Promise<boolean> {
    this.validateDataMode('建立连接');
    const service = await this.getCurrentService();
    const result = await service.connect(connection);
    if (result) {
      this.currentConnection = connection;
    }
    return result;
  }

  async getDatabases(): Promise<string[]> {
    this.validateDataMode('获取数据库列表');
    if (!this.currentConnection) {
      throw new Error('未建立连接');
    }
    const service = await this.getCurrentService();
    return service.getDatabases();
  }

  async getMeasurements(database: string): Promise<string[]> {
    this.validateDataMode('获取测量列表');
    if (!this.currentConnection) {
      throw new Error('未建立连接');
    }
    const service = await this.getCurrentService();
    return service.getMeasurements(database);
  }

  async executeQuery(query: string, database: string): Promise<QueryResult> {
    this.validateDataMode('执行查询');
    if (!this.currentConnection) {
      throw new Error('未建立连接');
    }
    const service = await this.getCurrentService();
    return service.executeQuery(query, database);
  }

  async getMeasurementFields(database: string, measurement: string): Promise<{tags: string[], fields: string[]}> {
    this.validateDataMode('获取字段信息');
    if (!this.currentConnection) {
      throw new Error('未建立连接');
    }
    const service = await this.getCurrentService();
    return service.getMeasurementFields(database, measurement);
  }

  disconnect(): void {
    this.validateDataMode('断开连接');
    this.currentConnection = null;
    // 不需要调用具体服务的disconnect，因为状态已经在这里管理
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
    mode: DataMode;
    isConnected: boolean;
    currentConnection: InfluxDBConnection | null;
    serviceType: 'mock' | 'real' | 'none';
  } {
    const mode = dataModeManager.getCurrentMode();
    return {
      mode,
      isConnected: this.currentConnection !== null,
      currentConnection: this.currentConnection,
      serviceType: mode === 'demo' ? 'mock' : (this.realDataService ? 'real' : 'none')
    };
  }

  /**
   * 强制刷新服务状态
   */
  async refreshService(): Promise<void> {
    const mode = dataModeManager.getCurrentMode();
    console.log(`🔄 刷新数据服务状态 - 当前模式: ${mode}`);
    this.handleModeSwitch(mode);
  }
}

// 导出单例实例
export const dataService = new UnifiedDataService();