/**
 * Mock 数据服务
 * 提供丰富的演示数据，模拟真实 InfluxDB 环境
 */

import { QueryResult, Series, InfluxDBConnection } from '../types/influxdb';

export interface MockDataSet {
  name: string;
  description: string;
  databases: string[];
  measurements: Record<string, string[]>; // database -> measurements
  connections: InfluxDBConnection[];
}

class MockDataService {
  private readonly dataSets: Record<string, MockDataSet> = {
    // 系统监控数据集
    monitoring: {
      name: '系统监控',
      description: '服务器性能监控数据',
      databases: ['telegraf', 'monitoring', 'infrastructure'],
      measurements: {
        telegraf: ['cpu', 'memory', 'disk', 'network', 'system', 'docker'],
        monitoring: ['alerts', 'logs', 'metrics', 'events'],
        infrastructure: ['kubernetes', 'nodes', 'pods', 'services']
      },
      connections: [
        {
          id: 'demo-monitoring-1',
          name: '演示-监控集群',
          url: 'http://monitoring.demo.com:8086',
          database: 'telegraf',
          username: 'monitor',
          status: 'connected'
        }
      ]
    },
    
    // IoT 设备数据集
    iot: {
      name: 'IoT 设备',
      description: '物联网设备传感器数据',
      databases: ['sensors', 'devices', 'smart_home'],
      measurements: {
        sensors: ['temperature', 'humidity', 'pressure', 'light', 'motion'],
        devices: ['gateways', 'endpoints', 'heartbeat', 'battery'],
        smart_home: ['hvac', 'lighting', 'security', 'energy']
      },
      connections: [
        {
          id: 'demo-iot-1',
          name: '演示-IoT平台',
          url: 'http://iot.demo.com:8086',
          database: 'sensors',
          username: 'iot_user',
          status: 'connected'
        }
      ]
    },

    // 金融交易数据集
    finance: {
      name: '金融交易',
      description: '股票、加密货币交易数据',
      databases: ['trading', 'market_data', 'risk_metrics'],
      measurements: {
        trading: ['orders', 'executions', 'positions', 'pnl'],
        market_data: ['prices', 'volumes', 'orderbook', 'tickers'],
        risk_metrics: ['var', 'exposures', 'limits', 'alerts']
      },
      connections: [
        {
          id: 'demo-finance-1',
          name: '演示-交易系统',
          url: 'http://trading.demo.com:8086',
          database: 'trading',
          username: 'trader',
          status: 'connected'
        }
      ]
    }
  };

  private currentDataSet: string = 'monitoring';

  /**
   * 获取当前数据集
   */
  getCurrentDataSet(): MockDataSet {
    return this.dataSets[this.currentDataSet];
  }

  /**
   * 切换数据集
   */
  switchDataSet(dataSetName: string): void {
    if (this.dataSets[dataSetName]) {
      this.currentDataSet = dataSetName;
      console.log(`🔄 切换到数据集: ${dataSetName}`);
    } else {
      console.warn(`⚠️ 数据集不存在: ${dataSetName}`);
    }
  }

  /**
   * 获取所有可用数据集
   */
  getAvailableDataSets(): Array<{name: string; key: string; description: string}> {
    return Object.entries(this.dataSets).map(([key, dataSet]) => ({
      name: dataSet.name,
      key,
      description: dataSet.description
    }));
  }

  /**
   * 获取演示数据库列表
   */
  getMockDatabases(): string[] {
    return this.getCurrentDataSet().databases;
  }

  /**
   * 获取演示测量列表
   */
  getMockMeasurements(database: string): string[] {
    const dataSet = this.getCurrentDataSet();
    return dataSet.measurements[database] || [];
  }

  /**
   * 获取演示连接列表
   */
  getMockConnections(): InfluxDBConnection[] {
    return this.getCurrentDataSet().connections;
  }

  /**
   * 生成标签键数据
   */
  getMockTagKeys(measurement: string): string[] {
    const commonTags = ['host', 'region', 'datacenter', 'environment'];
    
    const measurementSpecificTags: Record<string, string[]> = {
      cpu: ['cpu', 'core'],
      memory: ['type'],
      disk: ['device', 'fstype', 'path'],
      network: ['interface'],
      temperature: ['sensor_id', 'location'],
      humidity: ['room', 'floor'],
      orders: ['symbol', 'side', 'type'],
      prices: ['exchange', 'pair']
    };

    const specificTags = measurementSpecificTags[measurement] || [];
    return [...commonTags, ...specificTags];
  }

  /**
   * 生成字段键数据
   */
  getMockFieldKeys(measurement: string): Array<{name: string; type: string}> {
    const measurementFields: Record<string, Array<{name: string; type: string}>> = {
      cpu: [
        { name: 'usage_idle', type: 'float' },
        { name: 'usage_system', type: 'float' },
        { name: 'usage_user', type: 'float' },
        { name: 'usage_iowait', type: 'float' }
      ],
      memory: [
        { name: 'used', type: 'integer' },
        { name: 'free', type: 'integer' },
        { name: 'total', type: 'integer' },
        { name: 'usage_percent', type: 'float' }
      ],
      disk: [
        { name: 'used', type: 'integer' },
        { name: 'free', type: 'integer' },
        { name: 'total', type: 'integer' },
        { name: 'inodes_used', type: 'integer' }
      ],
      temperature: [
        { name: 'value', type: 'float' },
        { name: 'min_value', type: 'float' },
        { name: 'max_value', type: 'float' }
      ],
      orders: [
        { name: 'quantity', type: 'float' },
        { name: 'price', type: 'float' },
        { name: 'filled', type: 'float' },
        { name: 'status', type: 'string' }
      ],
      prices: [
        { name: 'open', type: 'float' },
        { name: 'high', type: 'float' },
        { name: 'low', type: 'float' },
        { name: 'close', type: 'float' },
        { name: 'volume', type: 'float' }
      ]
    };

    return measurementFields[measurement] || [
      { name: 'value', type: 'float' },
      { name: 'count', type: 'integer' },
      { name: 'status', type: 'string' }
    ];
  }

  /**
   * 生成模拟查询结果数据
   */
  generateMockQueryResult(query: string, database: string): QueryResult {
    console.log(`🎭 生成模拟查询数据 - 数据库: ${database}, 查询: ${query}`);

    // 标准化查询语句
    const normalizedQuery = query.trim().toUpperCase();
    
    // 根据查询类型生成不同的数据
    if (normalizedQuery.includes('SHOW DATABASES')) {
      return this.generateShowDatabasesResult();
    }
    
    if (normalizedQuery.includes('SHOW MEASUREMENTS')) {
      return this.generateShowMeasurementsResult(database);
    }
    
    if (normalizedQuery.includes('SHOW TAG KEYS')) {
      const measurement = this.extractMeasurementFromQuery(query);
      return this.generateShowTagKeysResult(measurement);
    }
    
    if (normalizedQuery.includes('SHOW FIELD KEYS')) {
      const measurement = this.extractMeasurementFromQuery(query);
      return this.generateShowFieldKeysResult(measurement);
    }
    
    if (normalizedQuery.includes('SHOW RETENTION POLICIES')) {
      return this.generateShowRetentionPoliciesResult(database);
    }
    
    if (normalizedQuery.includes('SHOW SERIES')) {
      return this.generateShowSeriesResult(database, query);
    }
    
    if (normalizedQuery.includes('SHOW TAG VALUES')) {
      return this.generateShowTagValuesResult(query);
    }
    
    // 处理 SELECT 查询
    if (normalizedQuery.startsWith('SELECT')) {
      return this.generateSelectQueryResult(query, database);
    }
    
    // 默认生成时序数据
    return this.generateTimeSeriesData(query, database);
  }

  /**
   * 生成 SHOW DATABASES 结果
   */
  private generateShowDatabasesResult(): QueryResult {
    const databases = this.getMockDatabases();
    const series: Series = {
      name: 'databases',
      columns: ['name'],
      values: databases.map(db => [db])
    };
    
    return { series: [series] };
  }

  /**
   * 生成 SHOW MEASUREMENTS 结果
   */
  private generateShowMeasurementsResult(database: string): QueryResult {
    const measurements = this.getMockMeasurements(database);
    const series: Series = {
      name: 'measurements',
      columns: ['name'],
      values: measurements.map(m => [m])
    };
    
    return { series: [series] };
  }

  /**
   * 生成 SHOW TAG KEYS 结果
   */
  private generateShowTagKeysResult(measurement: string): QueryResult {
    const tagKeys = this.getMockTagKeys(measurement);
    const series: Series = {
      name: 'tagKeys',
      columns: ['tagKey'],
      values: tagKeys.map(tag => [tag])
    };
    
    return { series: [series] };
  }

  /**
   * 生成 SHOW FIELD KEYS 结果
   */
  private generateShowFieldKeysResult(measurement: string): QueryResult {
    const fieldKeys = this.getMockFieldKeys(measurement);
    const series: Series = {
      name: 'fieldKeys',
      columns: ['fieldKey', 'fieldType'],
      values: fieldKeys.map(field => [field.name, field.type])
    };
    
    return { series: [series] };
  }

  /**
   * 生成时序数据
   */
  private generateTimeSeriesData(
    query: string, 
    _database: string, 
    timeRange?: { start: Date, end: Date }, 
    limit: number = 50,
    groupBy: string[] = []
  ): QueryResult {
    const measurement = this.extractMeasurementFromQuery(query) || 'cpu';
    const fieldKeys = this.getMockFieldKeys(measurement);
    const tagKeys = this.getMockTagKeys(measurement);
    
    // 使用指定的时间范围或默认值
    const now = timeRange?.end || new Date();
    const start = timeRange?.start || new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const points = Math.min(limit, 100); // 限制最大数据点数
    
    // 计算时间间隔
    const timeDiff = now.getTime() - start.getTime();
    const interval = Math.max(timeDiff / points, 1000); // 最小1秒间隔
    
    const columns = ['time', ...tagKeys.slice(0, 2), ...fieldKeys.slice(0, 3).map(f => f.name)];
    const values: any[][] = [];
    
    // 生成数据点
    for (let i = 0; i < points; i++) {
      const time = new Date(start.getTime() + i * interval).toISOString();
      const row = [time];
      
      // 添加标签值
      if (groupBy.length === 0) {
        row.push('server' + (Math.floor(Math.random() * 5) + 1));
        row.push('us-' + ['west', 'east', 'central'][Math.floor(Math.random() * 3)]);
      } else {
        // 根据 GROUP BY 生成标签
        for (const groupKey of groupBy.slice(0, 2)) {
          if (groupKey === 'time' || groupKey.startsWith('time(')) {
            continue; // 跳过时间分组
          }
          const values = this.getTagValues(groupKey);
          row.push(values[Math.floor(Math.random() * values.length)]);
        }
      }
      
      // 添加字段值
      for (const field of fieldKeys.slice(0, 3)) {
        if (field.type === 'float') {
          // 生成更真实的浮动数据
          const baseValue = this.getBaseFieldValue(field.name);
          const variation = (Math.random() - 0.5) * baseValue * 0.2; // 20% 变化
          row.push(Math.max(0, baseValue + variation).toString());
        } else if (field.type === 'integer') {
          const baseValue = this.getBaseFieldValue(field.name);
          const variation = Math.floor((Math.random() - 0.5) * baseValue * 0.2);
          row.push(Math.max(0, Math.floor(baseValue + variation)).toString());
        } else {
          row.push(['active', 'inactive', 'warning'][Math.floor(Math.random() * 3)]);
        }
      }
      
      values.push(row);
    }
    
    const series: Series = {
      name: measurement,
      columns,
      values
    };
    
    return { series: [series] };
  }

  /**
   * 获取字段基础值
   */
  private getBaseFieldValue(fieldName: string): number {
    const baseValues: Record<string, number> = {
      'usage_idle': 80,
      'usage_system': 10,
      'usage_user': 8,
      'usage_iowait': 2,
      'used': 8589934592, // 8GB
      'free': 4294967296, // 4GB
      'total': 12884901888, // 12GB
      'usage_percent': 67,
      'value': 25,
      'count': 100,
      'quantity': 1000,
      'price': 100,
      'filled': 800,
      'open': 99,
      'high': 105,
      'low': 98,
      'close': 102,
      'volume': 1000000
    };
    
    return baseValues[fieldName] || 50;
  }

  /**
   * 生成 SHOW RETENTION POLICIES 结果
   */
  private generateShowRetentionPoliciesResult(database: string): QueryResult {
    const policies = [
      ['autogen', '168h0m0s', '1', 'false'],
      ['short', '1h0m0s', '1', 'true'],
      ['long', '8760h0m0s', '1', 'false']
    ];
    
    const series: Series = {
      name: database,
      columns: ['name', 'duration', 'replicaN', 'default'],
      values: policies
    };
    
    return { series: [series] };
  }

  /**
   * 生成 SHOW SERIES 结果
   */
  private generateShowSeriesResult(database: string, query: string): QueryResult {
    const measurement = this.extractMeasurementFromQuery(query);
    const tagKeys = this.getMockTagKeys(measurement);
    
    // 生成一些模拟的 series
    const seriesData = [];
    for (let i = 0; i < 10; i++) {
      const tags = tagKeys.slice(0, 3).map(key => {
        const values = this.getTagValues(key);
        return `${key}=${values[Math.floor(Math.random() * values.length)]}`;
      });
      seriesData.push([`${measurement},${tags.join(',')}`]);
    }
    
    const series: Series = {
      name: database,
      columns: ['key'],
      values: seriesData
    };
    
    return { series: [series] };
  }

  /**
   * 生成 SHOW TAG VALUES 结果
   */
  private generateShowTagValuesResult(query: string): QueryResult {
    const tagKeyMatch = query.match(/WITH KEY\s*=\s*["`]?(\w+)["`]?/i);
    const tagKey = tagKeyMatch ? tagKeyMatch[1] : 'host';
    const values = this.getTagValues(tagKey);
    
    const series: Series = {
      name: 'tagValues',
      columns: ['key', 'value'],
      values: values.map(value => [tagKey, value])
    };
    
    return { series: [series] };
  }

  /**
   * 生成 SELECT 查询结果
   */
  private generateSelectQueryResult(query: string, database: string): QueryResult {
    // 解析查询条件
    const timeRange = this.extractTimeRange(query);
    const limit = this.extractLimit(query);
    const groupBy = this.extractGroupBy(query);
    
    // 生成数据
    return this.generateTimeSeriesData(query, database, timeRange, limit, groupBy);
  }

  /**
   * 获取标签值
   */
  private getTagValues(tagKey: string): string[] {
    const tagValues: Record<string, string[]> = {
      host: ['server1', 'server2', 'server3', 'server4', 'server5'],
      region: ['us-west', 'us-east', 'eu-central', 'ap-southeast'],
      datacenter: ['dc1', 'dc2', 'dc3'],
      environment: ['production', 'staging', 'development'],
      cpu: ['cpu0', 'cpu1', 'cpu2', 'cpu3', 'cpu4', 'cpu5', 'cpu6', 'cpu7'],
      device: ['/dev/sda', '/dev/sdb', '/dev/sdc'],
      interface: ['eth0', 'eth1', 'lo'],
      sensor_id: ['temp_001', 'temp_002', 'temp_003', 'temp_004'],
      location: ['room_a', 'room_b', 'room_c', 'server_room'],
      type: ['used', 'free', 'cached', 'buffers'],
      symbol: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
      side: ['buy', 'sell'],
      exchange: ['NYSE', 'NASDAQ', 'Binance'],
      pair: ['BTC/USD', 'ETH/USD', 'BNB/USD']
    };
    
    return tagValues[tagKey] || ['value1', 'value2', 'value3'];
  }

  /**
   * 提取时间范围
   */
  private extractTimeRange(query: string): { start: Date, end: Date } {
    const now = new Date();
    let start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 默认24小时
    let end = now;
    
    // 解析时间范围
    const timeMatch = query.match(/WHERE\s+time\s+>=?\s*['"]([^'"]+)['"]/i);
    if (timeMatch) {
      const timeStr = timeMatch[1];
      if (timeStr.includes('now()')) {
        const durationMatch = timeStr.match(/now\(\)\s*-\s*(\d+)([a-z]+)/i);
        if (durationMatch) {
          const value = parseInt(durationMatch[1]);
          const unit = durationMatch[2].toLowerCase();
          
          switch (unit) {
            case 'h':
            case 'hour':
            case 'hours':
              start = new Date(now.getTime() - value * 60 * 60 * 1000);
              break;
            case 'm':
            case 'minute':
            case 'minutes':
              start = new Date(now.getTime() - value * 60 * 1000);
              break;
            case 'd':
            case 'day':
            case 'days':
              start = new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
              break;
          }
        }
      }
    }
    
    return { start, end };
  }

  /**
   * 提取限制
   */
  private extractLimit(query: string): number {
    const limitMatch = query.match(/LIMIT\s+(\d+)/i);
    return limitMatch ? parseInt(limitMatch[1]) : 50;
  }

  /**
   * 提取 GROUP BY
   */
  private extractGroupBy(query: string): string[] {
    const groupByMatch = query.match(/GROUP BY\s+([^;]+)/i);
    if (groupByMatch) {
      return groupByMatch[1].split(',').map(item => item.trim().replace(/['"]/g, ''));
    }
    return [];
  }

  /**
   * 从查询中提取测量名
   */
  private extractMeasurementFromQuery(query: string): string {
    const fromMatch = query.match(/FROM\s+["`]?(\w+)["`]?/i);
    if (fromMatch) {
      return fromMatch[1];
    }
    
    const selectMatch = query.match(/SELECT.*FROM\s+["`]?(\w+)["`]?/i);
    if (selectMatch) {
      return selectMatch[1];
    }
    
    return 'cpu'; // 默认返回
  }

  /**
   * 模拟连接测试
   */
  mockConnectionTest(connection: InfluxDBConnection): boolean {
    // 演示模式下总是返回成功
    console.log(`🎭 模拟连接测试: ${connection.name} - 成功`);
    return true;
  }
}

export const mockDataService = new MockDataService();