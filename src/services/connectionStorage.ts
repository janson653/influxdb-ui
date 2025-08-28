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
        username: connection.username || null,
        password: connection.password || null,
        database: connection.database,
        is_encrypted: true,
      };

      await this.invokeRustCommand('store_connection', { config });
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
        username: connection.username || null,
        password: connection.password || null,
        database: connection.database,
        is_encrypted: true,
      };

      await this.invokeRustCommand('update_connection', { config });
    } catch (error) {
      console.error('更新连接失败:', error);
      throw error;
    }
  }

  // 测试连接
  async testConnection(connection: InfluxDBConnection): Promise<boolean> {
    try {
      const result = await this.invokeRustCommand('test_connection', {
        connectionId: connection.id
      });
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
    
    // 打印入参日志
    console.log(`🔧 [ConnectionStorage] 调用 Rust 命令: ${command}`);
    console.log(`📥 [ConnectionStorage] 入参:`, {
      command,
      payload: this.sanitizePayload(payload),
      timestamp: new Date().toISOString()
    });
    
    const startTime = Date.now();
    
    try {
      const result = await invoke(command, payload);
      const executionTime = Date.now() - startTime;
      
      // 打印出参日志
      console.log(`✅ [ConnectionStorage] Rust 命令执行成功: ${command}`);
      console.log(`📤 [ConnectionStorage] 出参:`, {
        command,
        executionTime: `${executionTime}ms`,
        result: this.sanitizeResult(result),
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // 打印错误日志
      console.error(`❌ [ConnectionStorage] Rust 命令执行失败: ${command}`);
      console.error(`📤 [ConnectionStorage] 错误信息:`, {
        command,
        executionTime: `${executionTime}ms`,
        error: error instanceof Error ? error.message : '未知错误',
        errorObject: error,
        errorType: typeof error,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * 清理敏感信息的载荷
   */
  private sanitizePayload(payload: any): any {
    if (!payload) return payload;
    
    const sanitized = { ...payload };
    
    // 隐藏敏感信息
    if (sanitized.password) {
      sanitized.password = '***';
    }
    if (sanitized.token) {
      sanitized.token = '***';
    }
    
    return sanitized;
  }

  /**
   * 清理敏感信息的结果
   */
  private sanitizeResult(result: any): any {
    if (!result) return result;
    
    // 如果是字符串，直接返回
    if (typeof result === 'string') {
      return result;
    }
    
    // 如果是对象，递归清理
    if (typeof result === 'object') {
      const sanitized = Array.isArray(result) ? [...result] : { ...result };
      
      // 隐藏敏感信息
      if (sanitized.password) {
        sanitized.password = '***';
      }
      if (sanitized.token) {
        sanitized.token = '***';
      }
      
      return sanitized;
    }
    
    return result;
  }
}

// 导出单例实例
export const connectionStorage = new ConnectionStorage();