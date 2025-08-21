import React, { useState, useEffect } from 'react';
import { Input, Button, Spin, Empty, Popconfirm, message, Divider } from 'antd';
import { SearchOutlined, PlusOutlined, DatabaseOutlined, TableOutlined, CaretDownOutlined, CaretRightOutlined, EditOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { InfluxDBConnection } from '../types/influxdb';
import { dataService } from '../services/dataService';
import { dataModeManager } from '../services/dataModeManager';
import DataSetSelector from './DataSetSelector';
import './ConnectionTree.css';

interface ConnectionTreeProps {
  connections: InfluxDBConnection[];
  currentConnection: InfluxDBConnection | null;
  onSelectConnection: (connection: InfluxDBConnection) => void;
  onDeleteConnection: (connectionId: string) => void;
  onNewConnection: () => void;
  onEditConnection?: (connection: InfluxDBConnection) => void;
  onMeasurementSelect: (measurement: string) => void;
  loading?: boolean;
}

interface DatabaseInfo {
  name: string;
  measurements: string[];
  expanded: boolean;
  loading: boolean;
}

interface ConnectionNode {
  connection: InfluxDBConnection;
  expanded: boolean;
  databases: DatabaseInfo[];
  loading: boolean;
}

const ConnectionTree: React.FC<ConnectionTreeProps> = ({
  connections,
  currentConnection,
  onSelectConnection,
  onDeleteConnection,
  onNewConnection,
  onEditConnection,
  onMeasurementSelect,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionNodes, setConnectionNodes] = useState<ConnectionNode[]>([]);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(dataModeManager.isDemoMode());

  // 监听数据模式变化
  useEffect(() => {
    const unsubscribe = dataModeManager.addModeListener((mode) => {
      setIsDemoMode(mode === 'demo');
    });

    return unsubscribe;
  }, []);

  // 高亮搜索文本的函数
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return <mark key={index} style={{ backgroundColor: '#ffd700', padding: '0 2px', fontWeight: 'bold' }}>{part}</mark>;
      }
      return part;
    });
  };

  // 初始化连接节点
  useEffect(() => {
    const nodes = connections.map(conn => ({
      connection: conn,
      expanded: conn.id === currentConnection?.id,
      databases: [],
      loading: false,
    }));
    setConnectionNodes(nodes);
  }, [connections, currentConnection]);

  // 切换连接展开状态
  const toggleConnection = async (connectionId: string) => {
    setConnectionNodes(prev => 
      prev.map(node => {
        if (node.connection.id === connectionId) {
          const newExpanded = !node.expanded;
          
          // 如果展开连接，加载数据库列表
          if (newExpanded && node.databases.length === 0) {
            loadDatabasesForConnection(connectionId);
          }
          
          return { ...node, expanded: newExpanded };
        }
        return node;
      })
    );

    // 选择连接
    const connection = connections.find(conn => conn.id === connectionId);
    if (connection) {
      onSelectConnection(connection);
    }
  };

  // 加载连接的数据库列表
  const loadDatabasesForConnection = async (connectionId: string) => {
    setConnectionNodes(prev => 
      prev.map(node => 
        node.connection.id === connectionId 
          ? { ...node, loading: true }
          : node
      )
    );

    try {
      const connection = connections.find(conn => conn.id === connectionId);
      if (!connection) return;

      await dataService.connect(connection);
      const databaseList = await dataService.getDatabases();
      
      const databases = databaseList.map(db => ({
        name: db,
        measurements: [],
        expanded: false,
        loading: false,
      }));

      setConnectionNodes(prev => 
        prev.map(node => 
          node.connection.id === connectionId 
            ? { ...node, databases, loading: false }
            : node
        )
      );
    } catch (error) {
      console.error('加载数据库列表失败:', error);
      setConnectionNodes(prev => 
        prev.map(node => 
          node.connection.id === connectionId 
            ? { ...node, loading: false }
            : node
        )
      );
    }
  };

  // 切换数据库展开状态
  const toggleDatabase = async (connectionId: string, databaseName: string) => {
    setConnectionNodes(prev => 
      prev.map(node => {
        if (node.connection.id === connectionId) {
          const updatedDatabases = node.databases.map(db => {
            if (db.name === databaseName) {
              const newExpanded = !db.expanded;
              
              // 如果展开数据库，加载测量列表
              if (newExpanded && db.measurements.length === 0) {
                loadMeasurementsForDatabase(connectionId, databaseName);
              }
              
              return { ...db, expanded: newExpanded };
            }
            return db;
          });
          
          return { ...node, databases: updatedDatabases };
        }
        return node;
      })
    );
  };

  // 加载数据库的测量列表
  const loadMeasurementsForDatabase = async (connectionId: string, databaseName: string) => {
    setConnectionNodes(prev => 
      prev.map(node => {
        if (node.connection.id === connectionId) {
          const updatedDatabases = node.databases.map(db => 
            db.name === databaseName 
              ? { ...db, loading: true }
              : db
          );
          return { ...node, databases: updatedDatabases };
        }
        return node;
      })
    );

    try {
      const connection = connections.find(conn => conn.id === connectionId);
      if (!connection) return;

      const measurementList = await dataService.getMeasurements(databaseName);
      
      setConnectionNodes(prev => 
        prev.map(node => {
          if (node.connection.id === connectionId) {
            const updatedDatabases = node.databases.map(db => 
              db.name === databaseName 
                ? { ...db, measurements: measurementList, loading: false }
                : db
            );
            return { ...node, databases: updatedDatabases };
          }
          return node;
        })
      );
    } catch (error) {
      console.error('加载测量列表失败:', error);
      setConnectionNodes(prev => 
        prev.map(node => {
          if (node.connection.id === connectionId) {
            const updatedDatabases = node.databases.map(db => 
              db.name === databaseName 
                ? { ...db, loading: false }
                : db
            );
            return { ...node, databases: updatedDatabases };
          }
          return node;
        })
      );
    }
  };

  // 选择测量
  const selectMeasurement = (measurement: string) => {
    onMeasurementSelect(measurement);
  };

  // 处理删除连接
  const handleDeleteConnection = async (connectionId: string, connectionName: string) => {
    try {
      await onDeleteConnection(connectionId);
      message.success(`连接 "${connectionName}" 已删除`);
      setShowActions(null);
    } catch (error) {
      console.error('删除连接失败:', error);
      message.error('删除连接失败');
    }
  };

  // 处理编辑连接
  const handleEditConnection = (connection: InfluxDBConnection) => {
    if (onEditConnection) {
      onEditConnection(connection);
      setShowActions(null);
    } else {
      message.info('编辑功能暂未实现');
    }
  };

  // 切换操作菜单显示
  const toggleActions = (connectionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setShowActions(showActions === connectionId ? null : connectionId);
  };

  // 点击其他地方关闭操作菜单
  useEffect(() => {
    const handleClickOutside = () => setShowActions(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 过滤连接
  const filteredConnections = connectionNodes.filter(node =>
    node.connection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.databases.some(db => 
      db.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      db.measurements.some(m => 
        m.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return '#28a745';
      case 'error':
        return '#dc3545';
      default:
        return '#6c757d';
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
    <div className="connection-tree-container">
      {/* 头部搜索和新建按钮 */}
      <div className="connection-tree-header">
        <h2>数据库工具</h2>
        <div className="search-container">
          <Input
            className="search-input"
            placeholder="搜索数据库对象..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            allowClear
          />
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={onNewConnection} 
          style={{ width: '100%' }}
          disabled={loading}
        >
          新建连接
        </Button>
        
        {/* 演示模式下显示数据集选择器 */}
        {isDemoMode && (
          <>
            <Divider style={{ margin: '12px 0', borderColor: '#3f4448' }} />
            <DataSetSelector 
              size="small" 
              onChange={() => {
                // 数据集切换后，可能需要刷新连接列表
                console.log('数据集已切换，可以在这里添加刷新逻辑');
              }}
            />
          </>
        )}
      </div>

      {/* 连接树 */}
      <div className="connection-tree">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spin />
          </div>
        ) : filteredConnections.length === 0 ? (
          <Empty 
            description="没有找到连接"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          filteredConnections.map(node => (
            <div key={node.connection.id} className="connection-node">
              {/* 连接头部 */}
              <div 
                className={`connection-header ${node.connection.id === currentConnection?.id ? 'active' : ''}`}
                onClick={() => toggleConnection(node.connection.id)}
              >
                <div className="connection-status-wrapper">
                  <div 
                    className="connection-status"
                    style={{ backgroundColor: getStatusColor(node.connection.status) }}
                    title={getStatusText(node.connection.status)}
                  />
                </div>
                <div className="connection-info">
                  <div className="connection-name">
                    {highlightSearchTerm(node.connection.name, searchTerm)}
                  </div>
                  <div className="connection-details">
                    {node.connection.url} / {node.connection.database}
                  </div>
                </div>
                <div className="connection-actions">
                  <div className="connection-toggle">
                    {node.expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                  </div>
                  <div className="action-menu">
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      onClick={(e) => toggleActions(node.connection.id, e)}
                      style={{ 
                        padding: '2px 4px',
                        fontSize: '12px',
                        opacity: showActions === node.connection.id ? 1 : 0.6
                      }}
                    />
                    {showActions === node.connection.id && (
                      <div className="action-dropdown" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEditConnection(node.connection)}
                        >
                          编辑
                        </Button>
                        <Popconfirm
                          title="确认删除连接"
                          description={`确定要删除连接 "${node.connection.name}" 吗？`}
                          onConfirm={() => handleDeleteConnection(node.connection.id, node.connection.name)}
                          okText="确认"
                          cancelText="取消"
                          placement="left"
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            danger
                          >
                            删除
                          </Button>
                        </Popconfirm>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 数据库列表 */}
              {node.expanded && (
                <div className="database-list">
                  {node.loading ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                      <Spin size="small" />
                    </div>
                  ) : node.databases.length === 0 ? (
                    <div className="no-databases">暂无数据库</div>
                  ) : (
                    node.databases.map(db => (
                      <div key={db.name} className="database-node">
                        {/* 数据库头部 */}
                        <div 
                          className={`database-header ${db.expanded ? 'expanded' : ''}`}
                          onClick={() => toggleDatabase(node.connection.id, db.name)}
                        >
                          <DatabaseOutlined className="database-icon" />
                          <span className="database-name">
                            {highlightSearchTerm(db.name, searchTerm)}
                          </span>
                          {db.expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                        </div>

                        {/* 测量列表 */}
                        {db.expanded && (
                          <div className="measurement-list">
                            {db.loading ? (
                              <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                                <Spin size="small" />
                              </div>
                            ) : db.measurements.length === 0 ? (
                              <div className="no-measurements">暂无测量</div>
                            ) : (
                              db.measurements.map(measurement => (
                                <div 
                                  key={measurement}
                                  className="measurement-item"
                                  onClick={() => selectMeasurement(measurement)}
                                >
                                  <TableOutlined className="measurement-icon" />
                                  <span className="measurement-name">
                                    {highlightSearchTerm(measurement, searchTerm)}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConnectionTree;