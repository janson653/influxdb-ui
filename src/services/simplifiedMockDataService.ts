/**
 * 简化的 Mock 数据服务
 * 只提供基础的演示数据，移除复杂数据集选择功能
 */

import { QueryResult, Series, InfluxDBConnection } from '../types/influxdb';

class SimplifiedMockDataService {
  private currentDataSet: string = 'basic';

  // 基础的演示连接
  private mockConnections: InfluxDBConnection[] = [
    {
      id: 'demo-connection-1',
      name: '演示数据库连接',
      url: 'http://demo.influxdb.com:8086',
      database: 'demo',
      username: 'demo_user',
      status: 'connected'
    }
  ];

  // 基础的演示数据库
  private mockDatabases: string[] = ['demo', 'test', 'example'];

  // 基础的演示测量
  private mockMeasurements: Record<string, string[]> = {
    'demo': ['cpu', 'memory', 'disk', 'network'],
    'test': ['temperature', 'humidity', 'pressure'],
    'example': ['metrics', 'logs', 'events']
  };

  // 基础的演示数据
  private generateBasicDemoData(measurement: string, count: number = 10): Series {
    const now = Date.now();
    const values = [];
    
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now - (count - i) * 60000).toISOString();
      switch (measurement) {
        case 'cpu':
          values.push([timestamp, Math.random() * 100, 'server1']);
          break;
        case 'memory':
          values.push([timestamp, Math.random() * 8000 + 1000, 'server1']);
          break;
        case 'temperature':
          values.push([timestamp, Math.random() * 30 + 15, 'sensor1']);
          break;
        default:
          values.push([timestamp, Math.random() * 100, 'device1']);
      }
    }

    return {
      name: measurement,
      columns: ['time', 'value', 'host'],
      values
    };
  }

  // 测试连接（总是返回成功）
  mockConnectionTest(connection: InfluxDBConnection): boolean {
    console.log('🎭 Mock: 测试连接', connection.name);
    return true;
  }

  // 获取模拟数据库列表
  getMockDatabases(): string[] {
    console.log('🎭 Mock: 获取数据库列表');
    return [...this.mockDatabases];
  }

  // 获取模拟测量列表
  getMockMeasurements(database: string): string[] {
    console.log('🎭 Mock: 获取测量列表', database);
    return this.mockMeasurements[database] || [];
  }

  // 生成模拟查询结果
  generateMockQueryResult(query: string, _database: string): QueryResult {
    console.log('🎭 Mock: 执行查询', query);
    
    // 简单的查询解析
    const measurementMatch = query.match(/FROM\s+"([^"]+)"/i);
    const measurement = measurementMatch ? measurementMatch[1] : 'metrics';
    
    const series = this.generateBasicDemoData(measurement, 20);
    
    return {
      series: [series],
      error: undefined
    };
  }

  // 获取模拟标签键
  getMockTagKeys(measurement: string): string[] {
    console.log('🎭 Mock: 获取标签键', measurement);
    return ['host', 'region', 'device'];
  }

  // 获取模拟字段键
  getMockFieldKeys(measurement: string): Array<{name: string, type: string}> {
    console.log('🎭 Mock: 获取字段键', measurement);
    return [
      { name: 'value', type: 'float' },
      { name: 'count', type: 'integer' },
      { name: 'status', type: 'string' }
    ];
  }

  // 获取模拟连接
  getMockConnections(): InfluxDBConnection[] {
    console.log('🎭 Mock: 获取连接列表');
    return [...this.mockConnections];
  }

  // 切换数据集（简化版本，基本不做任何事）
  switchDataSet(dataSet: string): void {
    console.log('🎭 Mock: 切换数据集', dataSet);
    this.currentDataSet = dataSet;
  }

  // 获取当前数据集信息
  getCurrentDataSet(): {name: string, description: string} {
    return {
      name: this.currentDataSet,
      description: '基础演示数据集'
    };
  }

  // 获取可用数据集（简化版本）
  getAvailableDataSets(): Array<{id: string, name: string, description: string}> {
    return [
      {
        id: 'basic',
        name: '基础演示',
        description: '简单的演示数据，用于基本功能展示'
      }
    ];
  }
}

// 导出简化后的服务实例
export const simplifiedMockDataService = new SimplifiedMockDataService();