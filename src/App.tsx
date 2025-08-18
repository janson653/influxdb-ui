import { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import './App.css';

import ConnectionList from './components/ConnectionList';
import ConnectionForm from './components/ConnectionForm';
import EnhancedQueryPanel from './components/EnhancedQueryPanel';
import RightSidebar from './components/RightSidebar';
import { InfluxDBConnection } from './types/influxdb';
import { connectionStorage } from './services/connectionStorage';

function App() {
  const [connections, setConnections] = useState<InfluxDBConnection[]>([]);
  const [currentConnection, setCurrentConnection] = useState<InfluxDBConnection | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // 从持久化存储加载连接
  useEffect(() => {
    loadConnections();
  }, []);

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
    setShowConnectionForm(true);
  };

  // 连接创建成功
  const handleConnectionCreated = async (connection: InfluxDBConnection) => {
    try {
      await connectionStorage.storeConnection(connection);
      await loadConnections(); // 重新加载连接列表
      setShowConnectionForm(false);
      setCurrentConnection(connection);
      message.success('连接创建并连接成功');
    } catch (error) {
      console.error('保存连接失败:', error);
      message.error('保存连接失败');
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
      {/* 侧边栏 - 连接管理 */}
      <div className="sidebar">
        <ConnectionList
          connections={connections}
          currentConnection={currentConnection}
          onSelectConnection={handleSelectConnection}
          onDeleteConnection={handleDeleteConnection}
          onNewConnection={handleNewConnection}
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
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            flexDirection: 'column',
            color: '#666'
          }}>
            <DatabaseOutlined style={{ fontSize: 64, marginBottom: 16 }} />
            <h2>欢迎使用 InfluxDB UI</h2>
            <p>请先选择一个连接或创建新连接开始使用</p>
            {loading && <span>正在加载连接...</span>}
          </div>
        )}
      </div>

      {/* 右侧边栏 - 详情 */}
      <div className="right-sidebar">
        <RightSidebar selectedMeasurement={selectedMeasurement} />
      </div>

      {/* 新建连接弹窗 */}
      <Modal
        title="新建连接"
        open={showConnectionForm}
        onCancel={() => setShowConnectionForm(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <ConnectionForm
          onConnectionCreated={handleConnectionCreated}
          onCancel={() => setShowConnectionForm(false)}
        />
      </Modal>
    </div>
  );
}

export default App;
