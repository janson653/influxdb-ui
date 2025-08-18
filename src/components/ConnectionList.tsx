import React, { useState } from 'react';
import { Input, Button, List, Tag, Spin, Space, Tooltip } from 'antd';
import { SearchOutlined, PlusOutlined, DatabaseOutlined } from '@ant-design/icons';
import { InfluxDBConnection } from '../types/influxdb';
import './ConnectionList.css';

interface ConnectionListProps {
  connections: InfluxDBConnection[];
  currentConnection: InfluxDBConnection | null;
  onSelectConnection: (connection: InfluxDBConnection) => void;
  onDeleteConnection: (connectionId: string) => void;
  onNewConnection: () => void;
  loading?: boolean;
}

const ConnectionList: React.FC<ConnectionListProps> = ({
  connections,
  currentConnection,
  onSelectConnection,
  onNewConnection,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConnections = connections.filter(connection =>
    connection.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'error':
        return 'red';
      default:
        return 'orange';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return '已连接';
      case 'disconnected':
        return '未连接';
      case 'error':
        return '连接错误';
      default:
        return '未知';
    }
  };

  return (
    <div className="connection-list-container">
      <div className="connection-list-header">
        <Input
          className="connection-list-search"
          placeholder="搜索连接..."
          prefix={<SearchOutlined />}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={onNewConnection} 
          style={{ marginTop: '1rem', width: '100%' }}
          disabled={loading}
        >
          新建连接
        </Button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Spin />
        </div>
      ) : (
        <List
          className="connection-list"
          dataSource={filteredConnections}
          renderItem={connection => (
            <List.Item
              className={`connection-list-item ${currentConnection?.id === connection.id ? 'active' : ''}`}
              onClick={() => onSelectConnection(connection)}
              extra={(
                <Space>
                  {connection.username && (
                    <Tooltip title="已配置认证">
                      <DatabaseOutlined style={{ color: '#52c41a' }} />
                    </Tooltip>
                  )}
                  <Tag color={getStatusColor(connection.status)} className="connection-list-item-status">
                    {getStatusText(connection.status)}
                  </Tag>
                </Space>
              )}
            >
              <Space direction="vertical">
                <div className="connection-list-item-name">{connection.name}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {connection.url} / {connection.database}
                </div>
              </Space>
            </List.Item>
          )}
          locale={{
            emptyText: '没有找到连接，请创建新连接'
          }}
        />
      )}
    </div>
  );
};

export default ConnectionList; 