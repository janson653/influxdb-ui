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
    try {
      return await this.invokeRustCommand('test_connection_with_auth', {
        url,
        database,
        username,
        password,
      });
    } catch (error) {
      console.error('连接测试失败:', error);
      return false;
    }
  }

  // 工具方法：调用Rust命令
  private async invokeRustCommand(command: string, payload: any): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).__TAURI_IPC__) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke(command, payload);
    } else {
      // 开发模式下使用本地存储 - 简化版本保持兼容性
      if (command === 'load_connections') {
        const stored = localStorage.getItem('influxdb_connections');
        return stored ? JSON.parse(stored) : [];
      } else if (command === 'store_connection') {
        const existing = JSON.parse(localStorage.getItem('influxdb_connections') || '[]');
        const index = existing.findIndex((c: any) => c.id === payload.id);
        if (index >= 0) {
          existing[index] = payload;
        } else {
          existing.push(payload);
        }
        localStorage.setItem('influxdb_connections', JSON.stringify(existing));
        return null;
      } else if (command === 'delete_connection') {
        const existing = JSON.parse(localStorage.getItem('influxdb_connections') || '[]');
        const filtered = existing.filter((c: any) => c.id !== payload.connection_id);
        localStorage.setItem('influxdb_connections', JSON.stringify(filtered));
        return null;
      } else if (command === 'test_connection_with_auth') {
        return true; // 开发模式下简化测试
      }
    }
    throw new Error('TAURI API not available');
  }
}

export const connectionStorage = new ConnectionStorage();