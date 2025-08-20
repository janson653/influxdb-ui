/**
 * 连接管理服务
 * 提供自动重连、超时处理、连接状态监控等功能
 */

import { InfluxDBConnection } from '../types/influxdb';
import { influxDBService } from './influxdb';
import { message } from 'antd';

export interface ConnectionHealth {
  isHealthy: boolean;
  responseTime: number;
  lastCheck: string;
  error?: string;
}

export interface ConnectionConfig {
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  connectionTimeout: number;
  healthCheckInterval: number;
}

export class ConnectionManager {
  private static instance: ConnectionManager;
  private connections: Map<string, InfluxDBConnection> = new Map();
  private connectionHealth: Map<string, ConnectionHealth> = new Map();
  private reconnectTimers: Map<string, number> = new Map();
  private healthCheckTimers: Map<string, number> = new Map();
  private connectionConfigs: Map<string, ConnectionConfig> = new Map();
  private connectionListeners: Map<string, Array<(connection: InfluxDBConnection, status: 'connected' | 'disconnected' | 'error') => void>> = new Map();

  private constructor() {
    // 私有构造函数，确保单例模式
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * 添加连接
   */
  async addConnection(connection: InfluxDBConnection, config?: Partial<ConnectionConfig>): Promise<boolean> {
    try {
      // 设置默认配置
      const defaultConfig: ConnectionConfig = {
        autoReconnect: true,
        maxReconnectAttempts: 5,
        reconnectInterval: 5000,
        connectionTimeout: 30000,
        healthCheckInterval: 60000,
        ...config
      };

      this.connectionConfigs.set(connection.id, defaultConfig);
      this.connections.set(connection.id, connection);

      // 测试连接
      const isConnected = await this.testConnection(connection);
      
      if (isConnected) {
        this.startHealthCheck(connection.id);
        this.notifyConnectionListeners(connection, 'connected');
        return true;
      } else {
        this.notifyConnectionListeners(connection, 'error');
        return false;
      }
    } catch (error) {
      console.error('添加连接失败:', error);
      this.notifyConnectionListeners(connection, 'error');
      return false;
    }
  }

  /**
   * 移除连接
   */
  removeConnection(connectionId: string): void {
    // 清理定时器
    this.clearReconnectTimer(connectionId);
    this.clearHealthCheckTimer(connectionId);
    
    // 移除连接相关数据
    this.connections.delete(connectionId);
    this.connectionHealth.delete(connectionId);
    this.connectionConfigs.delete(connectionId);
    this.reconnectTimers.delete(connectionId);
    this.healthCheckTimers.delete(connectionId);
    this.connectionListeners.delete(connectionId);
  }

  /**
   * 测试连接
   */
  async testConnection(connection: InfluxDBConnection): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const isConnected = await influxDBService.testConnection(connection);
      const responseTime = Date.now() - startTime;
      
      this.updateConnectionHealth(connection.id, {
        isHealthy: isConnected,
        responseTime,
        lastCheck: new Date().toISOString(),
        error: isConnected ? undefined : '连接测试失败'
      });

      return isConnected;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateConnectionHealth(connection.id, {
        isHealthy: false,
        responseTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : '未知错误'
      });
      
      return false;
    }
  }

  /**
   * 获取连接健康状态
   */
  getConnectionHealth(connectionId: string): ConnectionHealth | null {
    return this.connectionHealth.get(connectionId) || null;
  }

  /**
   * 获取所有连接的健康状态
   */
  getAllConnectionsHealth(): Array<{ connection: InfluxDBConnection; health: ConnectionHealth }> {
    const result: Array<{ connection: InfluxDBConnection; health: ConnectionHealth }> = [];
    
    this.connections.forEach((connection, id) => {
      const health = this.connectionHealth.get(id);
      if (health) {
        result.push({ connection, health });
      }
    });
    
    return result;
  }

  /**
   * 手动重连
   */
  async reconnect(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    this.clearReconnectTimer(connectionId);
    
    const isConnected = await this.testConnection(connection);
    
    if (isConnected) {
      this.startHealthCheck(connectionId);
      this.notifyConnectionListeners(connection, 'connected');
      message.success(`连接 "${connection.name}" 已重新建立`);
    } else {
      this.notifyConnectionListeners(connection, 'error');
      message.error(`连接 "${connection.name}" 重连失败`);
    }
    
    return isConnected;
  }

  /**
   * 添加连接状态监听器
   */
  addConnectionListener(
    connectionId: string, 
    listener: (connection: InfluxDBConnection, status: 'connected' | 'disconnected' | 'error') => void
  ): void {
    if (!this.connectionListeners.has(connectionId)) {
      this.connectionListeners.set(connectionId, []);
    }
    
    this.connectionListeners.get(connectionId)!.push(listener);
  }

  /**
   * 移除连接状态监听器
   */
  removeConnectionListener(connectionId: string, listener: Function): void {
    const listeners = this.connectionListeners.get(connectionId);
    if (listeners) {
      const index = listeners.indexOf(listener as any);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 开始健康检查
   */
  private startHealthCheck(connectionId: string): void {
    this.clearHealthCheckTimer(connectionId);
    
    const config = this.connectionConfigs.get(connectionId);
    if (!config) return;

    const timer = setInterval(async () => {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      const wasHealthy = this.connectionHealth.get(connectionId)?.isHealthy;
      const isHealthy = await this.testConnection(connection);

      // 如果连接状态发生变化，通知监听器
      if (wasHealthy !== undefined && wasHealthy !== isHealthy) {
        if (isHealthy) {
          this.notifyConnectionListeners(connection, 'connected');
        } else {
          this.notifyConnectionListeners(connection, 'disconnected');
          // 如果配置了自动重连，开始重连
          if (config.autoReconnect) {
            this.startReconnect(connectionId);
          }
        }
      }
    }, config.healthCheckInterval);

    this.healthCheckTimers.set(connectionId, timer);
  }

  /**
   * 开始重连
   */
  private startReconnect(connectionId: string): void {
    const config = this.connectionConfigs.get(connectionId);
    const connection = this.connections.get(connectionId);
    
    if (!config || !connection || !config.autoReconnect) return;

    let attempt = 0;
    
    const reconnect = async () => {
      attempt++;
      
      if (attempt > config.maxReconnectAttempts) {
        this.clearReconnectTimer(connectionId);
        this.notifyConnectionListeners(connection, 'error');
        message.error(`连接 "${connection.name}" 重连失败，已达到最大重试次数`);
        return;
      }

      console.log(`尝试重连连接 "${connection.name}" (${attempt}/${config.maxReconnectAttempts})`);
      
      const isConnected = await this.testConnection(connection);
      
      if (isConnected) {
        this.clearReconnectTimer(connectionId);
        this.startHealthCheck(connectionId);
        this.notifyConnectionListeners(connection, 'connected');
        message.success(`连接 "${connection.name}" 已重新建立`);
      } else {
        // 继续重连
        const timer = setTimeout(reconnect, config.reconnectInterval);
        this.reconnectTimers.set(connectionId, timer);
      }
    };

    const timer = setTimeout(reconnect, config.reconnectInterval);
    this.reconnectTimers.set(connectionId, timer);
  }

  /**
   * 清理重连定时器
   */
  private clearReconnectTimer(connectionId: string): void {
    const timer = this.reconnectTimers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(connectionId);
    }
  }

  /**
   * 清理健康检查定时器
   */
  private clearHealthCheckTimer(connectionId: string): void {
    const timer = this.healthCheckTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(connectionId);
    }
  }

  /**
   * 更新连接健康状态
   */
  private updateConnectionHealth(connectionId: string, health: ConnectionHealth): void {
    this.connectionHealth.set(connectionId, health);
  }

  /**
   * 通知连接状态监听器
   */
  private notifyConnectionListeners(
    connection: InfluxDBConnection, 
    status: 'connected' | 'disconnected' | 'error'
  ): void {
    const listeners = this.connectionListeners.get(connection.id);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(connection, status);
        } catch (error) {
          console.error('连接状态监听器执行失败:', error);
        }
      });
    }
  }

  /**
   * 获取连接配置
   */
  getConnectionConfig(connectionId: string): ConnectionConfig | null {
    return this.connectionConfigs.get(connectionId) || null;
  }

  /**
   * 更新连接配置
   */
  updateConnectionConfig(connectionId: string, config: Partial<ConnectionConfig>): void {
    const currentConfig = this.connectionConfigs.get(connectionId);
    if (currentConfig) {
      const newConfig = { ...currentConfig, ...config };
      this.connectionConfigs.set(connectionId, newConfig);
      
      // 如果配置了自动重连且连接不健康，开始重连
      const health = this.connectionHealth.get(connectionId);
      if (newConfig.autoReconnect && health && !health.isHealthy) {
        this.startReconnect(connectionId);
      }
    }
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    totalConnections: number;
    healthyConnections: number;
    unhealthyConnections: number;
    averageResponseTime: number;
  } {
    const healths = Array.from(this.connectionHealth.values());
    const totalConnections = healths.length;
    const healthyConnections = healths.filter(h => h.isHealthy).length;
    const unhealthyConnections = totalConnections - healthyConnections;
    const averageResponseTime = healths.length > 0 
      ? healths.reduce((sum, h) => sum + h.responseTime, 0) / healths.length 
      : 0;

    return {
      totalConnections,
      healthyConnections,
      unhealthyConnections,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }
}

// 导出单例实例
export const connectionManager = ConnectionManager.getInstance();