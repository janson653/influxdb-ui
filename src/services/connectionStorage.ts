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
      // 真实数据模式 - 只加载用户连接
      return await this.loadUserConnections();
    } catch (error) {
      console.error('加载连接失败:', error);
      return [];
    }
  }

  // 加载用户保存的连接
  private async loadUserConnections(): Promise<InfluxDBConnection[]> {
    try {
      const connections = await this.invokeRustCommand('load_connections', {});
      return connections.map((conn: any) => ({
        id: conn.id,
        name: conn.name,
        url: conn.url,
        username: conn.username,
        password: conn.password,
        database: conn.database,
        status: 'disconnected'
      }));
    } catch (error) {
      console.error('加载用户连接失败:', error);
      return [];
    }
  }

  // 删除一个连接
  async deleteConnection(connectionId: string): Promise<void> {
    try {
      await this.invokeRustCommand('delete_connection', { connectionId });
    } catch (error) {
      console.error('删除连接失败:', error);
      throw error;
    }
  }

  // 更新连接
  async updateConnection(connection: InfluxDBConnection): Promise<void> {
    try {
      const config = {
        id: connection.id,
        name: connection.name,
        url: connection.url,
        username: connection.username,
        password: connection.password,
        database: connection.database,
        is_encrypted: true,
      };

      await this.invokeRustCommand('update_connection', config);
    } catch (error) {
      console.error('更新连接失败:', error);
      throw error;
    }
  }

  // 测试连接
  async testConnection(connection: InfluxDBConnection): Promise<boolean> {
    try {
      const config = {
        id: connection.id,
        name: connection.name,
        url: connection.url,
        username: connection.username,
        password: connection.password,
        database: connection.database,
        is_encrypted: true,
      };

      const result = await this.invokeRustCommand('test_connection', config);
      return result.success;
    } catch (error) {
      console.error('测试连接失败:', error);
      return false;
    }
  }

  // 调用 Rust 命令的通用方法
  private async invokeRustCommand(command: string, payload: any): Promise<any> {
    // 统一使用 Tauri invoke
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke(command, payload);
    return result;
  }
}

// 导出单例实例
export const connectionStorage = new ConnectionStorage();