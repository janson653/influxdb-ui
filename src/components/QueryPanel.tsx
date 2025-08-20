import React, { useState } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Select, 
  Table, 
  Tabs, 
  Space, 
  Tag, 
  message, 
  Modal,
  List,
  Typography
} from 'antd';
import { 
  PlayCircleOutlined, 
  StopOutlined, 
  HistoryOutlined, 
  InfoCircleOutlined,
  CloseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Text } = Typography;

interface QueryPanelProps {
  currentConnection: any;
}

const QueryPanel: React.FC<QueryPanelProps> = ({
  currentConnection
}) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('results');
  const [queryHistory, setQueryHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [logs, setLogs] = useState<any[]>([]);

  const executeQuery = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }

    setLoading(true);
    addLog('info', '开始执行查询');
    
    try {
      // 模拟查询执行
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟查询结果
      const mockResults = [
        { time: '2024-01-01T00:00:00Z', value: 100, host: 'server1' },
        { time: '2024-01-01T00:01:00Z', value: 105, host: 'server1' },
        { time: '2024-01-01T00:02:00Z', value: 98, host: 'server1' },
      ];
      
      setResults(mockResults);
      addLog('success', '查询执行成功');
      message.success('查询执行成功');
      
      // 添加到历史记录
      const historyItem = {
        id: Date.now().toString(),
        query,
        database: currentConnection?.database || 'unknown',
        timestamp: new Date().toISOString(),
        executionTime: 1000,
        resultCount: mockResults.length
      };
      setQueryHistory(prev => [historyItem, ...prev]);
      
    } catch (error) {
      addLog('error', '查询执行失败: ' + error);
      message.error('查询执行失败');
    } finally {
      setLoading(false);
    }
  };

  const addLog = (level: string, message: string) => {
    setLogs(prev => [{
      id: Date.now().toString(),
      level,
      message,
      timestamp: new Date()
    }, ...prev]);
  };

  const exportResults = (format: string) => {
    if (results.length === 0) {
      message.warning('没有数据可导出');
      return;
    }
    
    message.info(`导出${format.toUpperCase()}功能开发中`);
  };

  const loadQueryFromHistory = (item: any) => {
    setQuery(item.query);
    setShowHistory(false);
  };

  const clearResults = () => {
    setResults([]);
    setLogs([]);
    message.info('已清空结果');
  };

  const getColumns = () => {
    if (results.length === 0) return [];
    
    const firstRow = results[0];
    return Object.keys(firstRow).map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      ellipsis: true,
      render: (value: any) => {
        if (typeof value === 'number') {
          return value.toFixed(2);
        }
        return value?.toString() || '';
      }
    }));
  };

  return (
    <div className="query-panel">
      <Card 
        title="查询面板" 
        extra={
          <Space>
            <Button 
              icon={<HistoryOutlined />}
              onClick={() => setShowHistory(true)}
              size="small"
            >
              历史记录
            </Button>
            <Button 
              icon={<CloseOutlined />}
              onClick={clearResults}
              size="small"
            >
              清空
            </Button>
          </Space>
        }
      >
        {/* 查询编辑器 */}
        <div style={{ marginBottom: 16 }}>
          <TextArea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="请输入InfluxQL查询语句..."
            rows={6}
            style={{ 
              fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
              fontSize: 14
            }}
          />
        </div>

        {/* 工具栏 */}
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={executeQuery}
              loading={loading}
            >
              执行查询
            </Button>
            <Button
              icon={<StopOutlined />}
              disabled={!loading}
            >
              停止
            </Button>
            <Select
              defaultValue="csv"
              style={{ width: 120 }}
              onChange={exportResults}
            >
              <Option value="csv">CSV</Option>
              <Option value="json">JSON</Option>
              <Option value="excel">Excel</Option>
            </Select>
          </Space>
        </div>

        {/* 结果展示 */}
        <Card title="查询结果" size="small">
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="结果" key="results">
              {results.length > 0 ? (
                <Table
                  dataSource={results}
                  columns={getColumns()}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 'max-content' }}
                  size="small"
                />
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: '#999'
                }}>
                  <InfoCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <p>暂无查询结果</p>
                  <p style={{ fontSize: 12, marginTop: 8 }}>
                    请执行查询以查看结果
                  </p>
                </div>
              )}
            </TabPane>
            <TabPane tab="消息" key="messages">
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {logs.length > 0 ? (
                  logs.map(log => (
                    <div key={log.id} style={{ 
                      padding: 8, 
                      margin: 4, 
                      borderRadius: 4,
                      borderLeft: `3px solid ${log.level === 'error' ? '#ff4d4f' : log.level === 'success' ? '#52c41a' : '#1890ff'}`,
                      backgroundColor: log.level === 'error' ? '#fff2f0' : log.level === 'success' ? '#f6ffed' : '#e6f7ff'
                    }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                        {log.timestamp.toLocaleString()}
                      </div>
                      <div>{log.message}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: '#999'
                  }}>
                    <ClockCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>暂无日志</p>
                  </div>
                )}
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </Card>

      {/* 查询历史模态框 */}
      <Modal
        title="查询历史"
        open={showHistory}
        onCancel={() => setShowHistory(false)}
        footer={null}
        width={800}
      >
        <List
          dataSource={queryHistory}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="load"
                  type="link"
                  onClick={() => loadQueryFromHistory(item)}
                >
                  加载
                </Button>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{item.query.substring(0, 50)}...</Text>
                    <Tag color="blue">{item.database}</Tag>
                  </Space>
                }
                description={
                  <Space>
                    <Text type="secondary">执行时间: {item.executionTime}ms</Text>
                    <Text type="secondary">结果数: {item.resultCount}</Text>
                    <Text type="secondary">时间: {new Date(item.timestamp).toLocaleString()}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default QueryPanel;