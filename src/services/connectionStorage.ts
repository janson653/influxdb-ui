import { InfluxDBConnection } from '../types/influxdb';
import { dataModeManager } from './dataModeManager';
import { simplifiedMockDataService } from './simplifiedMockDataService';

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
      // 检查当前数据模式
      if (dataModeManager.isDemoMode()) {
        console.log('🎭 演示模式 - 加载模拟连接');
        const mockConnections = simplifiedMockDataService.getMockConnections();
        
        // 合并用户保存的连接和模拟连接
        const userConnections = await this.loadUserConnections();
        return [...mockConnections, ...userConnections];
      }

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
      console.error('加载用户连接失败:', error);
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
    console.log('📋 连接参数详情:', {
      url,
      database,
      username: username || '(未设置)',
      hasPassword: !!password,
      passwordLength: password ? password.length : 0
    });

    try {
      console.log('🔄 调用 Rust 命令: test_connection_with_auth');
      console.log('📤 发送到 Rust 的参数:', {
        url,
        database,
        username: username || null,
        hasPassword: !!password
      });
      
      const result = await this.invokeRustCommand('test_connection_with_auth', {
        url,
        database,
        username,
        password,
      });
      
      console.log('✅ Rust 连接测试结果:', result ? '✅ 连接成功' : '❌ 连接失败');
      console.groupEnd();
      return result;
    } catch (error) {
      console.error('❌ ConnectionStorage 连接测试失败:', error);
      console.error('🔍 错误详情分析:', {
        message: error instanceof Error ? error.message : '未知错误',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
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
    console.log('📋 命令详情:', {
      command,
      payloadKeys: Object.keys(payload),
      hasTauriIPC: !!(typeof window !== 'undefined' && (window as any).__TAURI_IPC__),
      timestamp: new Date().toISOString()
    });
    console.log('📦 参数详情:', JSON.stringify(payload, null, 2));

    if (typeof window !== 'undefined' && (window as any).__TAURI_IPC__) {
      try {
        console.log('✅ 检测到 Tauri 环境，使用 invoke 调用 Rust');
        console.log('🔗 导入 Tauri invoke API...');
        const { invoke } = await import('@tauri-apps/api/core');
        console.log('📤 发送命令到 Rust 后端...');
        const result = await invoke(command, payload);
        console.log('✅ Rust 命令执行成功，返回结果:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Rust 命令执行失败:', error);
        console.error('🔍 错误详情分析:', {
          message: error instanceof Error ? error.message : '未知错误',
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
          isTauriError: error instanceof Error && error.message.includes('TAURI'),
          timestamp: new Date().toISOString()
        });
        console.groupEnd();
        throw error;
      }
    } else {
      console.log('⚠️ 未检测到 Tauri 环境，使用开发模式');
      console.log('📊 当前数据模式:', dataModeManager.getCurrentMode());
      // 开发模式下，根据命令和数据模式进行模拟操作
      const currentMode = dataModeManager.getCurrentMode();

      if (command === 'load_connections') {
        const stored = localStorage.getItem('influxdb_connections');
        const result = stored ? JSON.parse(stored) : [];
        console.log('开发模式 - 加载连接:', result);
        console.groupEnd();
        return result;
      } 
      
      if (command === 'store_connection') {
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
      }
      
      if (command === 'delete_connection') {
        const existing = JSON.parse(localStorage.getItem('influxdb_connections') || '[]');
        const filtered = existing.filter((c: any) => c.id !== payload.connection_id);
        localStorage.setItem('influxdb_connections', JSON.stringify(filtered));
        console.log('开发模式 - 删除连接:', payload.connection_id);
        console.groupEnd();
        return null;
      }

      // 对于需要后端交互的命令，根据数据模式处理
      if (currentMode === 'demo') {
        console.log(`🎭 演示模式 - 模拟命令: ${command}`);
        console.groupEnd();
        if (command === 'test_connection_with_auth') {
          return true;
        }
        if (command === 'query_data') {
          // 此处可以返回一个标准的模拟查询结果
          return JSON.stringify([{
            name: "mock_measurement",
            columns: ["time", "value"],
            values: [["2024-01-01T00:00:00Z", 100]]
          }]);
        }
      } else {
        // 真实数据模式下，尝试直接连接数据库
        console.log(`🔗 真实数据模式 - 尝试直接连接: ${command}`);
        
        if (command === 'test_connection_with_auth') {
          try {
            // 在开发模式下测试连接
            const testUrl = `${payload.url}/ping`;
            console.log(`🏓 直接ping测试: ${testUrl}`);
            
            // 检查是否为本地开发服务器
            const isLocalhost = payload.url.includes('localhost') || 
                             payload.url.includes('127.0.0.1') || 
                             payload.url.includes('192.168.') ||
                             payload.url.includes('10.') ||
                             payload.url.includes('172.');
            
            if (isLocalhost) {
              // 本地服务器使用代理
              const proxyUrl = testUrl.replace(payload.url, '/influxdb-proxy');
              console.log(`🔗 使用代理测试: ${proxyUrl}`);
              
              const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json'
                }
              });
              
              const isConnected = response.status === 204; // InfluxDB ping返回204
              console.log(`📡 代理连接测试结果: ${isConnected ? '✅ 成功' : '❌ 失败'}, 状态码: ${response.status}`);
              console.groupEnd();
              return isConnected;
            } else {
              // 远程服务器尝试带认证的请求
              console.log(`🌐 远程服务器测试: ${payload.url}`);
              
              // 直接使用原始URL，认证信息放在headers中
              const finalUrl = `${payload.url}/ping`;
              console.log(`🔐 认证URL: ${finalUrl}`);
              
              const headers: Record<string, string> = {
                'Accept': 'application/json'
              };
              
              if (payload.username && payload.password) {
                headers['Authorization'] = `Basic ${btoa(`${payload.username}:${payload.password}`)}`;
                console.log(`🔑 使用Basic认证: ${payload.username}:***`);
              }
              
              const response = await fetch(finalUrl, {
                method: 'GET',
                headers,
                mode: 'cors',
                credentials: 'omit'
              });
              
              const isConnected = response.status === 204;
              console.log(`📡 远程连接测试结果: ${isConnected ? '✅ 成功' : '❌ 失败'}, 状态码: ${response.status}`);
              
              if (!isConnected) {
                console.log(`⚠️ 注意: 远程服务器可能需要配置CORS或使用Tauri生产环境`);
              }
              
              console.groupEnd();
              return isConnected;
            }
          } catch (error) {
            console.error('❌ 连接测试失败:', error);
            
            // 如果是CORS错误，提供更有用的信息
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
              console.log(`💡 提示: CORS错误通常意味着：`);
              console.log(`   1. 远程服务器未配置CORS`);
              console.log(`   2. 服务器不可达`);
              console.log(`   3. 认证信息错误`);
              console.log(`   🚀 建议在生产环境(Tauri)中测试远程连接`);
            }
            
            console.groupEnd();
            return false;
          }
        }
        
        if (command === 'query_data') {
          try {
            // 在开发模式下直接使用fetch执行查询
            const queryParams = new URLSearchParams({
              db: payload.influxdb_database,
              q: payload.query_string
            });
            
            const queryUrl = `${payload.influxdb_url}/query?${queryParams}`;
            console.log(`📊 直接执行查询: ${queryUrl}`);
            
            const response = await fetch(queryUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`✅ 查询执行成功，结果:`, result);
            console.groupEnd();
            return JSON.stringify(result);
          } catch (error) {
            console.error('❌ 直接查询执行失败:', error);
            console.groupEnd();
            throw error;
          }
        }
      }
    }
    
    // 如果不是Tauri环境，并且无法处理的命令，则抛出API不可用错误
    console.error('❌ TAURI API not available - 无法处理的命令:', command);
    console.groupEnd();
    throw new Error(`TAURI API not available for command: ${command}`);
  }
}

export const connectionStorage = new ConnectionStorage();

// 重新导出简化后的服务
export { simplifiedConnectionStorage } from './connectionStorageSimplified';