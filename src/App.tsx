import { useState, useEffect } from 'react';
import { Modal, message, Badge, Tooltip, Space, Button } from 'antd';
import { DatabaseOutlined, WifiOutlined } from '@ant-design/icons';
import './App.css';

import ConnectionTree from './components/ConnectionTree';
import ConnectionForm from './components/ConnectionForm';
import EnhancedQueryPanel from './components/EnhancedQueryPanel';
import RightSidebar from './components/RightSidebar';
import DataModeToggle from './components/DataModeToggle';
import DataSetSelector from './components/DataSetSelector';
import { InfluxDBConnection } from './types/influxdb';
import { connectionStorage } from './services/connectionStorage';
import { connectionManager } from './services/connectionManager';
import { dataModeManager } from './services/dataModeManager';
import { dataService } from './services/dataService';

function App() {
  const [connections, setConnections] = useState<InfluxDBConnection[]>([]);
  const [currentConnection, setCurrentConnection] = useState<InfluxDBConnection | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<InfluxDBConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStats, setConnectionStats] = useState({
    totalConnections: 0,
    healthyConnections: 0,
    unhealthyConnections: 0,
    averageResponseTime: 0
  });
  const [serviceStats, setServiceStats] = useState({
    cacheSize: 0,
    cacheHitRate: 0,
    mode: 'demo' as 'demo' | 'real'
  });

  // 监听数据模式变化，重新加载连接
  useEffect(() => {
    const unsubscribe = dataModeManager.addModeListener((mode) => {
      console.log('🔄 数据模式变化，重新加载连接列表');
      setServiceStats(prev => ({
        ...prev,
        mode
      }));
      loadConnections();
    });

    return unsubscribe;
  }, []);

  // 从持久化存储加载连接
  useEffect(() => {
    loadConnections();
  }, []);

  // 监听新建连接事件
  useEffect(() => {
    const handleNewConnection = () => {
      setShowConnectionForm(true);
    };

    window.addEventListener('newConnection', handleNewConnection);
    return () => {
      window.removeEventListener('newConnection', handleNewConnection);
    };
  }, []);

  // 初始化连接管理器
  useEffect(() => {
    const initConnectionManager = async () => {
      try {
        // 加载现有连接到连接管理器
        for (const connection of connections) {
          await connectionManager.addConnection(connection, {
            autoReconnect: true,
            maxReconnectAttempts: 3,
            reconnectInterval: 3000,
            connectionTimeout: 10000,
            healthCheckInterval: 30000
          });
          
          // 添加连接状态监听器
          connectionManager.addConnectionListener(connection.id, (conn, status) => {
            handleConnectionStatusChange(conn, status);
          });
        }
        
        // 启动连接统计更新
        updateConnectionStats();
        const statsInterval = setInterval(updateConnectionStats, 10000);
        
        return () => {
          clearInterval(statsInterval);
        };
      } catch (error) {
        console.error('初始化连接管理器失败:', error);
      }
    };
    
    if (connections.length > 0) {
      initConnectionManager();
    }
  }, [connections]);

  // 更新连接统计
  const updateConnectionStats = () => {
    const stats = connectionManager.getConnectionStats();
    setConnectionStats(stats);
    
    // 更新服务统计
    const serviceStatus = dataService.getServiceStatus();
    setServiceStats(prev => ({
      ...prev,
      cacheSize: 0, // Mock 数据不需要缓存
      cacheHitRate: 0,
      mode: serviceStatus.mode
    }));
  };

  // 处理连接状态变化
  const handleConnectionStatusChange = (
    connection: InfluxDBConnection, 
    status: 'connected' | 'disconnected' | 'error'
  ) => {
    console.log(`连接 "${connection.name}" 状态变化: ${status}`);
    
    // 更新当前连接状态
    if (currentConnection?.id === connection.id) {
      if (status === 'disconnected' || status === 'error') {
        // 如果是当前连接断开，可以显示通知
        message.warning(`连接 "${connection.name}" 已断开，正在尝试重连...`);
      } else if (status === 'connected') {
        message.success(`连接 "${connection.name}" 已重新建立`);
      }
    }
    
    // 更新连接统计
    updateConnectionStats();
  };

  const loadConnections = async () => {
    try {
      setLoading(true);
      const loaded = await connectionStorage.loadConnections();
      setConnections(loaded);
    } catch (error) {
      console.error('加载连接失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 新建连接
  const handleNewConnection = () => {
    setEditingConnection(null);
    setShowConnectionForm(true);
  };

  // 编辑连接
  const handleEditConnection = (connection: InfluxDBConnection) => {
    setEditingConnection(connection);
    setShowConnectionForm(true);
  };

  // 连接创建或更新成功
  const handleConnectionCreated = async (connection: InfluxDBConnection) => {
    try {
      await connectionStorage.storeConnection(connection);
      await loadConnections(); // 重新加载连接列表
      setShowConnectionForm(false);
      setCurrentConnection(connection);
      
      // 添加到连接管理器
      await connectionManager.addConnection(connection, {
        autoReconnect: true,
        maxReconnectAttempts: 3,
        reconnectInterval: 3000,
        connectionTimeout: 10000,
        healthCheckInterval: 30000
      });
      
      // 添加连接状态监听器
      connectionManager.addConnectionListener(connection.id, (conn, status) => {
        handleConnectionStatusChange(conn, status);
      });
      
      message.success(editingConnection ? '连接更新成功' : '连接创建并连接成功');
    } catch (error) {
      console.error('保存连接失败:', error);
      message.error(editingConnection ? '更新连接失败' : '保存连接失败');
    } finally {
      setEditingConnection(null);
    }
  };

  // 选择连接
  const handleSelectConnection = async (connection: InfluxDBConnection) => {
    setCurrentConnection(connection);
    message.success(`已连接到: ${connection.name}`);
  };

  // 删除连接
  const handleDeleteConnection = async (connectionId: string) => {
    try {
      await connectionStorage.deleteConnection(connectionId);
      const newConnections = connections.filter(conn => conn.id !== connectionId);
      setConnections(newConnections);
      
      // 从连接管理器中移除
      connectionManager.removeConnection(connectionId);
      
      if (currentConnection?.id === connectionId) {
        setCurrentConnection(null);
      }
      
      message.success('连接已删除');
    } catch (error) {
      console.error('删除连接失败:', error);
      message.error('删除连接失败');
    }
  };

  return (
    <div className="app-layout">
      {/* 顶部状态栏 */}
      <div className="status-bar">
        <div className="connection-stats">
          <Tooltip title={`总连接数: ${connectionStats.totalConnections} | 健康连接: ${connectionStats.healthyConnections} | 异常连接: ${connectionStats.unhealthyConnections}`}>
            <Space>
              <Badge 
                count={connectionStats.totalConnections}
                status="default"
                style={{ backgroundColor: '#f0f0f0' }}
              />
              <Badge 
                count={connectionStats.healthyConnections}
                status="success"
              />
              <Badge 
                count={connectionStats.unhealthyConnections}
                status="error"
              />
              <span style={{ fontSize: '12px', color: '#666' }}>
                平均响应: {connectionStats.averageResponseTime}ms
              </span>
            </Space>
          </Tooltip>
        </div>
        
        {/* 数据模式切换 */}
        <div className={`data-mode-section ${serviceStats.mode === 'demo' ? 'demo-mode' : 'real-mode'}`}>
          <Space direction="vertical" size="small">
            <DataModeToggle size="small" />
            <DataSetSelector size="small" />
          </Space>
        </div>
        
        <div className="connection-status">
          {currentConnection && (
            <Space>
              {connectionManager.getConnectionHealth(currentConnection.id)?.isHealthy ? (
                <Badge status="processing" text="已连接" />
              ) : (
                <Badge status="error" text="连接异常" />
              )}
              <Button
                size="small"
                icon={<WifiOutlined />}
                onClick={() => connectionManager.reconnect(currentConnection.id)}
              >
                重连
              </Button>
            </Space>
          )}
        </div>
      </div>

      {/* 主内容容器 - 水平布局 */}
      <div className="main-container">
        {/* 左侧边栏 - 连接管理 */}
        <div className="sidebar">
          <ConnectionTree
            connections={connections}
            currentConnection={currentConnection}
            onSelectConnection={handleSelectConnection}
            onDeleteConnection={handleDeleteConnection}
            onNewConnection={handleNewConnection}
            onEditConnection={handleEditConnection}
            onMeasurementSelect={setSelectedMeasurement}
            loading={loading}
          />
        </div>

        {/* 主内容区 - 查询面板 */}
        <div className="main-content">
          {currentConnection ? (
            <EnhancedQueryPanel 
              currentConnection={currentConnection}
              onMeasurementSelect={setSelectedMeasurement}
            />
          ) : (
            <div className="query-panel">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                flexDirection: 'column',
                color: '#666',
                backgroundColor: '#ffffff'
              }}>
                <DatabaseOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                <h2>欢迎使用 InfluxDB UI</h2>
                <p>请先选择一个连接或创建新连接开始使用</p>
                {loading && <span>正在加载连接...</span>}
              </div>
            </div>
          )}
        </div>

        {/* 右侧边栏 - 详情 */}
        <div className="right-sidebar">
          <RightSidebar selectedMeasurement={selectedMeasurement} />
        </div>
      </div>

      {/* 新建连接弹窗 */}
      <Modal
        title={editingConnection ? "编辑连接" : "新建连接"}
        open={showConnectionForm}
        onCancel={() => {
          setShowConnectionForm(false);
          setEditingConnection(null);
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <ConnectionForm
          editingConnection={editingConnection}
          onConnectionCreated={handleConnectionCreated}
          onCancel={() => {
            setShowConnectionForm(false);
            setEditingConnection(null);
          }}
        />
      </Modal>
    </div>
  );
}

export default App;
