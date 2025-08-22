/**
 * 简化后的连接存储服务
 * 统一使用 Tauri Commands，移除开发环境的直接 HTTP 调用
 */

import { InfluxDBConnection } from '../types/influxdb';
import { dataModeManager } from './dataModeManager';
import { simplifiedMockDataService } from './simplifiedMockDataService';

class SimplifiedConnectionStorage {
  // 存储一个新连接
  async storeConnection(connection: InfluxDBConnection): Promise<void> {
    try {
      console.log('💾 使用 Tauri Command 存储连接配置');
      
      const config = {
        id: connection.id,
        name: connection.name,
        url: connection.url,
        username: connection.username,
        password: connection.password,
        database: connection.database,
        is_encrypted: true,
      };

      await this.invokeTauriCommand('store_connection', config);
      console.log('✅ 连接配置存储成功');
    } catch (error) {
      console.error('❌ 存储连接失败:', error);
      throw error;
    }
  }

  // 加载所有连接
  async loadConnections(): Promise<InfluxDBConnection[]> {
    try {
      console.log('📂 使用 Tauri Command 加载连接配置');
      
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
      console.error('❌ 加载连接失败:', error);
      return [];
    }
  }

  // 加载用户保存的连接
  private async loadUserConnections(): Promise<InfluxDBConnection[]> {
    try {
      const configs: any[] = await this.invokeTauriCommand('load_connections', {});
      
      return configs.map(config => ({
        id: config.id,
        name: config.name,
        url: config.url,
        username: config.username,
        password: config.password,
        database: config.database,
        status: 'disconnected' as const,
      }));
    } catch (error) {
      console.error('❌ 加载用户连接失败:', error);
      return [];
    }
  }

  // 删除连接
  async deleteConnection(connectionId: string): Promise<void> {
    try {
      console.log('🗑️ 使用 Tauri Command 删除连接配置');
      
      await this.invokeTauriCommand('delete_connection', { connection_id: connectionId });
      console.log('✅ 连接配置删除成功');
    } catch (error) {
      console.error('❌ 删除连接失败:', error);
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
    console.group('🔧 SimplifiedConnectionStorage 连接测试');
    console.log('📋 连接参数详情:', {
      url,
      database,
      username: username || '(未设置)',
      hasPassword: !!password,
      passwordLength: password ? password.length : 0
    });

    try {
      console.log('🔄 使用 Tauri Command 测试连接');
      console.log('📤 发送到 Tauri 的参数:', {
        url,
        database,
        username: username || null,
        hasPassword: !!password
      });
      
      const result = await this.invokeTauriCommand<boolean>('test_connection_with_auth', {
        url,
        database,
        username,
        password,
      });
      
      console.log('✅ Tauri 连接测试结果:', result ? '✅ 连接成功' : '❌ 连接失败');
      console.groupEnd();
      return result;
    } catch (error) {
      console.error('❌ Tauri 连接测试失败:', error);
      console.groupEnd();
      return false;
    }
  }

  // 查询数据 (简化版本，仅用于向后兼容)
  async queryData(
    query: string,
    url: string,
    database: string,
    username?: string,
    password?: string
  ): Promise<any> {
    console.group('🔍 SimplifiedConnectionStorage 查询数据 (已弃用)');
    console.log('⚠️ 此方法已弃用，请使用 influxdbRefactored.ts 服务');
    console.log('查询参数:', {
      query,
      url,
      database,
      username,
      hasPassword: !!password
    });

    try {
      // 对于新的架构，这个方法应该抛出错误，引导使用新的服务
      throw new Error('queryData 方法已弃用，请使用 influxdbRefactored.ts 服务的 executeQuery 方法');
    } catch (error) {
      console.error('❌ 查询失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * 统一的 Tauri Command 调用方法
   */
  private async invokeTauriCommand<T>(command: string, payload: any): Promise<T> {
    console.group('🚀 调用 Tauri Command');
    console.log('📋 命令详情:', {
      command,
      payloadKeys: Object.keys(payload),
      timestamp: new Date().toISOString()
    });
    console.log('📦 参数详情:', JSON.stringify(payload, null, 2));

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      console.log('✅ 检测到 Tauri 环境，使用 invoke 调用 Rust');
      
      const result = await invoke<T>(command, payload);
      console.log('✅ Tauri Command 执行成功，返回结果:', result);
      console.groupEnd();
      return result;
    } catch (error) {
      console.error('❌ Tauri Command 执行失败:', error);
      console.error('🔍 错误详情分析:', {
        message: error instanceof Error ? error.message : '未知错误',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      console.groupEnd();
      throw error;
    }
  }
}

// 导出简化后的连接存储实例
export const simplifiedConnectionStorage = new SimplifiedConnectionStorage();