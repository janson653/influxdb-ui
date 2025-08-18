import { InfluxDBConnection, QueryResult } from '../types/influxdb';

class InfluxDBService {
  private currentConnection: InfluxDBConnection | null = null;

  // 测试连接
  async testConnection(connection: InfluxDBConnection): Promise<boolean> {
    console.group('🔍 InfluxDB 连接测试');
    console.log('连接配置:', {
      name: connection.name,
      url: connection.url,
      database: connection.database,
      username: connection.username,
      hasPassword: !!connection.password
    });

    try {
      // 使用 connectionStorage 的测试连接方法，它会调用后端 Rust API
      const { connectionStorage } = await import('./connectionStorage');
      console.log('开始调用后端连接测试...');
      
      const result = await connectionStorage.testConnection(
        connection.url,
        connection.database,
        connection.username,
        connection.password
      );
      
      console.log('连接测试结果:', result ? '✅ 成功' : '❌ 失败');
      console.groupEnd();
      return result;
    } catch (error) {
      console.error('❌ 连接测试失败:', error);
      console.error('错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
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
    
    try {
      console.log('通过 Rust 后端执行查询: SHOW DATABASES');
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
    
    try {
      console.log('通过 Rust 后端执行查询: SHOW MEASUREMENTS');
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
    
    try {
      console.log('通过 Rust 后端执行查询...');
      const { connectionStorage } = await import('./connectionStorage');
      const result = await connectionStorage.queryData(
        query,
        this.currentConnection.url,
        database, // 使用传入的数据库名
        this.currentConnection.username,
        this.currentConnection.password
      );
      
      console.log('Rust 查询返回结果:', result);
      
      // 将 Rust 返回的数据转换为 QueryResult 格式
      const series = JSON.parse(result);
      const queryResult: QueryResult = {
        series,
        error: undefined
      };
      
      console.log('✅ 查询执行成功');
      console.log('结果统计:', {
        seriesCount: series.length || 0,
        totalRows: series.reduce((count: number, s: any) => count + (s.values?.length || 0), 0) || 0
      });
      
      console.groupEnd();
      return queryResult;
    } catch (error) {
      console.error('❌ 查询执行失败:', error);
      console.error('错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
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
    
    try {
      console.log('通过 Rust 后端执行查询: SHOW TAG KEYS');
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
    this.currentConnection = null;
  }
}

export const influxDBService = new InfluxDBService(); 