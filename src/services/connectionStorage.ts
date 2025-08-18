import { InfluxDBConnection } from '../types/influxdb';

class ConnectionStorage {
  // 存储一个新连接
  async storeConnection(connection: InfluxDBConnection): Promise<void> {
    try {
      // 这里我们需要将InfluxDBConnection转换为Rust的结构
      const config = {
        id: connection.id,
        name: connection.name,
        url: connection.url,
        username: connection.username,
        password: connection.password,
        database: connection.database,
        is_encrypted: true,
      };

      await this.invokeRustCommand('store_connection', config);
    } catch (error) {
      console.error('存储连接失败:', error);
      throw error;
    }
  }

  // 加载所有连接
  async loadConnections(): Promise<InfluxDBConnection[]> {
    try {
      const configs: any[] = await this.invokeRustCommand('load_connections', {});
      
      return configs.map(config => ({
        id: config.id,
        name: config.name,
        url: config.url,
        username: config.username,
        password: config.password,
        database: config.database,
        status: 'disconnected',
      }));
    } catch (error) {
      console.error('加载连接失败:', error);
      return [];
    }
  }

  // 删除连接
  async deleteConnection(connectionId: string): Promise<void> {
    try {
      await this.invokeRustCommand('delete_connection', { connection_id: connectionId });
    } catch (error) {
      console.error('删除连接失败:', error);
      throw error;
    }
  }

  // 测试带认证的连接
  async testConnection(
    url: string,
    database: string,
    username?: string,
    password?: string
  ): Promise<boolean> {
    console.group('🔧 ConnectionStorage 连接测试');
    console.log('连接参数:', {
      url,
      database,
      username,
      hasPassword: !!password
    });

    try {
      console.log('调用 Rust 命令: test_connection_with_auth');
      const result = await this.invokeRustCommand('test_connection_with_auth', {
        url,
        database,
        username,
        password,
      });
      
      console.log('Rust 连接测试结果:', result ? '✅ 成功' : '❌ 失败');
      console.groupEnd();
      return result;
    } catch (error) {
      console.error('❌ ConnectionStorage 连接测试失败:', error);
      console.error('错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      console.groupEnd();
      return false;
    }
  }

  // 查询数据
  async queryData(
    query: string,
    url: string,
    database: string,
    username?: string,
    password?: string
  ): Promise<any> {
    console.group('🔍 ConnectionStorage 查询数据');
    console.log('查询参数:', {
      query,
      url,
      database,
      username,
      hasPassword: !!password
    });

    try {
      console.log('调用 Rust 命令: query_data');
      const result = await this.invokeRustCommand('query_data', {
        query_string: query,
        influxdb_url: url,
        influxdb_database: database,
        username,
        password,
      });
      
      console.log('Rust 查询执行成功');
      console.groupEnd();
      return result;
    } catch (error) {
      console.error('❌ ConnectionStorage 查询失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  // 工具方法：调用Rust命令
  private async invokeRustCommand(command: string, payload: any): Promise<any> {
    console.group('🚀 调用 Rust 命令');
    console.log('命令:', command);
    console.log('参数:', JSON.stringify(payload, null, 2));

    if (typeof window !== 'undefined' && (window as any).__TAURI_IPC__) {
      try {
        console.log('检测到 Tauri 环境，使用 invoke 调用 Rust');
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke(command, payload);
        console.log('✅ Rust 命令执行成功，返回结果:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Rust 命令执行失败:', error);
        console.error('错误详情:', {
          message: error instanceof Error ? error.message : '未知错误',
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined
        });
        console.groupEnd();
        throw error;
      }
    } else {
      console.log('⚠️ 未检测到 Tauri 环境，使用开发模式');
      // 开发模式下使用本地存储 - 简化版本保持兼容性
      if (command === 'load_connections') {
        const stored = localStorage.getItem('influxdb_connections');
        const result = stored ? JSON.parse(stored) : [];
        console.log('开发模式 - 加载连接:', result);
        console.groupEnd();
        return result;
      } else if (command === 'store_connection') {
        const existing = JSON.parse(localStorage.getItem('influxdb_connections') || '[]');
        const index = existing.findIndex((c: any) => c.id === payload.id);
        if (index >= 0) {
          existing[index] = payload;
        } else {
          existing.push(payload);
        }
        localStorage.setItem('influxdb_connections', JSON.stringify(existing));
        console.log('开发模式 - 保存连接:', payload);
        console.groupEnd();
        return null;
      } else if (command === 'delete_connection') {
        const existing = JSON.parse(localStorage.getItem('influxdb_connections') || '[]');
        const filtered = existing.filter((c: any) => c.id !== payload.connection_id);
        localStorage.setItem('influxdb_connections', JSON.stringify(filtered));
        console.log('开发模式 - 删除连接:', payload.connection_id);
        console.groupEnd();
        return null;
      } else if (command === 'test_connection_with_auth') {
        console.log('开发模式 - 模拟连接测试成功');
        console.groupEnd();
        return true; // 开发模式下简化测试
      } else if (command === 'query_data') {
        console.log('开发模式 - 模拟查询数据');
        console.log('查询语句:', payload.query_string);
        
        // 根据不同的查询语句返回不同的模拟数据
        if (payload.query_string === 'SHOW DATABASES') {
          console.log('返回模拟数据库列表');
          const mockDatabases = [
            {
              name: "databases",
              columns: ["name"],
              values: [
                ["telegraf"],
                ["k6"],
                ["mydb"],
                ["test_db"],
                ["monitoring"]
              ]
            }
          ];
          console.groupEnd();
          return JSON.stringify(mockDatabases);
        } else if (payload.query_string === 'SHOW MEASUREMENTS') {
          console.log('返回模拟测量列表');
          const mockMeasurements = [
            {
              name: "measurements",
              columns: ["name"],
              values: [
                ["cpu"],
                ["memory"],
                ["disk"],
                ["network"],
                ["system"]
              ]
            }
          ];
          console.groupEnd();
          return JSON.stringify(mockMeasurements);
        } else if (payload.query_string.startsWith('SHOW TAG KEYS FROM')) {
          console.log('返回模拟标签键');
          const mockTags = [
            {
              name: "tagKeys",
              columns: ["tagKey"],
              values: [
                ["host"],
                ["region"],
                ["datacenter"],
                ["environment"]
              ]
            }
          ];
          console.groupEnd();
          return JSON.stringify(mockTags);
        } else if (payload.query_string.startsWith('SHOW FIELD KEYS FROM')) {
          console.log('返回模拟字段键');
          const mockFields = [
            {
              name: "fieldKeys",
              columns: ["fieldKey", "fieldType"],
              values: [
                ["usage", "float"],
                ["total", "integer"],
                ["free", "float"],
                ["count", "integer"]
              ]
            }
          ];
          console.groupEnd();
          return JSON.stringify(mockFields);
        } else {
          console.log('返回通用模拟数据');
          const mockData = [
            {
              name: "cpu",
              columns: ["time", "host", "region", "cpu_usage", "memory_free"],
              values: [
                ["2024-01-01T00:00:00Z", "server1", "us-west", 45.2, 1024.0],
                ["2024-01-01T00:01:00Z", "server1", "us-west", 48.7, 980.0],
                ["2024-01-01T00:02:00Z", "server1", "us-west", 52.1, 920.0]
              ]
            }
          ];
          console.groupEnd();
          return JSON.stringify(mockData);
        }
      }
    }
    console.error('❌ TAURI API not available');
    console.groupEnd();
    throw new Error('TAURI API not available');
  }
}

export const connectionStorage = new ConnectionStorage();