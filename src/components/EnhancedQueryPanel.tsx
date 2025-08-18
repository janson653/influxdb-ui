import React, { useState, useEffect } from 'react';
import { 
  Tabs, 
  Button, 
  Select, 
  Input, 
  Table, 
  message, 
  Space, 
  Card,
  Row,
  Col,
  Badge,
  Tooltip,
  notification,
  Spin,
  List,
  Popover
} from 'antd';
import { 
  PlayCircleOutlined, 
  DatabaseOutlined, 
  TableOutlined, 
  DownloadOutlined,
  CodeOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { influxDBService } from '../services/influxdb';
import { QueryResult, InfluxDBConnection } from '../types/influxdb';

const { TextArea } = Input;
const { Option } = Select;

interface EnhancedQueryPanelProps {
  currentConnection: InfluxDBConnection;
  onMeasurementSelect: (measurement: string) => void;
}

interface TabInfo {
  key: string;
  title: string;
  query: string;
  selectedDatabase: string;
  measurements: string[];
  queryResult: QueryResult | null;
  loading: boolean;
  executionTime?: number;
  rowCount?: number;
  error?: string;
}

const queryTemplates = [
  { label: 'SELECT 基础查询', value: 'SELECT * FROM "<measurement>" LIMIT 100' },
  { label: 'SELECT 指定字段', value: 'SELECT "field1", "field2" FROM "<measurement>" LIMIT 100' },
  { label: 'WHERE 条件', value: 'SELECT * FROM "<measurement>" WHERE "field" > 0 LIMIT 100' },
  { label: 'GROUP BY 时间', value: 'SELECT MEAN("field") FROM "<measurement>" WHERE time >= now() - 1h GROUP BY time(1m)' },
  { label: '聚合函数', value: 'SELECT COUNT("field"), MIN("field"), MAX("field") FROM "<measurement>" WHERE time >= now() - 1h' },
  { label: 'TAG 分组', value: 'SELECT * FROM "<measurement>" GROUP BY "tag1", "tag2"' },
];

const EnhancedQueryPanel: React.FC<EnhancedQueryPanelProps> = ({ currentConnection, onMeasurementSelect }) => {
  const [databases, setDatabases] = useState<string[]>([]);
  const [activeKey, setActiveKey] = useState('1');
  const [tabs, setTabs] = useState<TabInfo[]>([{
    key: '1',
    title: '查询 1',
    query: 'SELECT * FROM "cpu" LIMIT 100',
    selectedDatabase: '',
    measurements: [],
    queryResult: null,
    loading: false,
  }]);

  // 加载数据库列表
  useEffect(() => {
    const fetchDatabases = async () => {
      if (!currentConnection) {
        console.log('⚠️ 没有当前连接，跳过数据库列表加载');
        return;
      }
      
      console.group('📊 加载数据库列表');
      console.log('当前连接:', currentConnection.name);
      
      try {
        console.log('步骤 1: 建立连接');
        await influxDBService.connect(currentConnection);
        
        console.log('步骤 2: 获取数据库列表');
        const dbList = await influxDBService.getDatabases();
        console.log('获取到数据库列表:', dbList);
        
        setDatabases(dbList);
        
        // 如果只有一个数据库，自动选中
        if (dbList.length === 1) {
          console.log('只有一个数据库，自动选中:', dbList[0]);
          const updatedTab = {
            ...tabs[0],
            selectedDatabase: dbList[0],
          };
          setTabs([updatedTab]);
          // 自动加载测量列表
          await loadMeasurementsForTab(tabs[0].key, dbList[0]);
        }
        
        console.log('✅ 数据库列表加载完成');
        console.groupEnd();
      } catch (error) {
        console.error('❌ 获取数据库列表失败:', error);
        console.error('错误详情:', {
          message: error instanceof Error ? error.message : '未知错误',
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined
        });
        
        message.error('获取数据库列表失败');
        notification.error({
          message: '连接错误',
          description: `无法连接到数据库服务器，请检查连接配置。错误: ${error instanceof Error ? error.message : '未知错误'}`
        });
        console.groupEnd();
      }
    };
    fetchDatabases();
  }, [currentConnection]);

  const handleTabChange = (key: string) => {
    setActiveKey(key);
  };

  const addTab = () => {
    const newKey = `query-${tabs.length + 1}`;
    setTabs([...tabs, {
      key: newKey,
      title: `查询 ${tabs.length + 1}`,
      query: '',
      selectedDatabase: '',
      measurements: [],
      queryResult: null,
      loading: false,
    }]);
    setActiveKey(newKey);
  };

  const removeTab = (targetKey: string) => {
    let newActiveKey = activeKey;
    let lastIndex = -1;
    tabs.forEach((tab, i) => {
      if (tab.key === targetKey) {
        lastIndex = i - 1;
      }
    });
    const newTabs = tabs.filter(tab => tab.key !== targetKey);
    if (newTabs.length && newActiveKey === targetKey) {
      newActiveKey = newTabs[lastIndex >= 0 ? lastIndex : 0].key;
    }
    setTabs(newTabs);
    setActiveKey(newActiveKey);
  };

  const updateTabState = (key: string, newState: Partial<TabInfo>) => {
    setTabs(tabs.map(tab => 
      tab.key === key ? { ...tab, ...newState } : tab
    ));
  };

  const executeQuery = async (tabKey: string) => {
    const tab = tabs.find(t => t.key === tabKey);
    if (!tab || !tab.selectedDatabase) {
      console.log('❌ 未选择数据库');
      message.error('请先选择数据库');
      return;
    }

    if (!tab.query.trim()) {
      console.log('❌ 查询语句为空');
      message.error('请输入查询语句');
      return;
    }

    console.group('🔍 执行查询');
    console.log('查询标签:', tabKey);
    console.log('数据库:', tab.selectedDatabase);
    console.log('查询语句:', tab.query);

    const startTime = Date.now();
    updateTabState(tabKey, { loading: true, error: undefined });

    try {
      console.log('发送查询请求...');
      const result = await influxDBService.executeQuery(tab.query, tab.selectedDatabase);
      const executionTime = Date.now() - startTime;
      
      console.log('查询响应:', result);
      
      const rowCount = result.series?.reduce((count, series) => 
        count + (series.values?.length || 0), 0) || 0;
      
      console.log('查询统计:', {
        executionTime: `${executionTime}ms`,
        rowCount,
        seriesCount: result.series?.length || 0,
        hasError: !!result.error
      });

      updateTabState(tabKey, { 
        queryResult: result,
        loading: false,
        executionTime,
        rowCount,
        error: result.error
      });

      if (result.error) {
        console.error('❌ 查询返回错误:', result.error);
        notification.error({
          message: '查询执行失败',
          description: result.error
        });
      } else {
        console.log('✅ 查询执行成功');
        notification.success({
          message: '查询执行成功',
          description: `执行时间: ${executionTime}ms, 返回 ${rowCount} 条记录`
        });
      }
      console.groupEnd();
    } catch (error) {
      console.error('❌ 查询执行异常:', error);
      console.error('错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      updateTabState(tabKey, { 
        loading: false,
        error: error instanceof Error ? error.message : '查询执行失败'
      });
      notification.error({
        message: '查询执行失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
      console.groupEnd();
    }
  };

  const exportQueryResult = (tabKey: string) => {
    const tab = tabs.find(t => t.key === tabKey);
    if (!tab || !tab.queryResult || tab.queryResult.error) {
      message.error('没有可导出的查询结果');
      return;
    }

    const data = getTableData(tab.queryResult);
    const csvContent = [
      data.columns.map(col => col.title).join(','),
      ...data.data.map(row => data.columns.map(col => row[col.dataIndex]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `influxdb_query_${Date.now()}.csv`;
    link.click();
  };

  const insertTemplate = (template: string) => {
    setTabs(tabs.map(tab => 
      tab.key === activeKey ? { ...tab, query: template } : tab
    ));
  };

  // 加载测量列表 - 在数据库选择变化时加载
  const loadMeasurementsForTab = async (tabKey: string, database: string) => {
    if (!database) return;
    try {
      const measurementList = await influxDBService.getMeasurements(database);
      updateTabState(tabKey, { measurements: measurementList });
    } catch (error) {
      // 静默失败，不显示错误
    }
  };

  const getTableData = (queryResult: QueryResult | null) => {
    if (!queryResult?.series || queryResult.series.length === 0) {
      return { columns: [], data: [] };
    }

    let allColumns = new Set<string>();
    let allData: any[] = [];
    let rowIndex = 0;

    queryResult.series.forEach(series => {
      series.columns.forEach(col => allColumns.add(col));
      
      series.values.forEach(value => {
        const row: any = { 
          key: rowIndex++, 
          __series_name: series.name,
          __tags: series.tags || {}
        };
        series.columns.forEach((col, index) => {
          row[col] = value[index];
        });
        allData.push(row);
      });
    });

    const columns = Array.from(allColumns).map(col => ({
      title: col,
      dataIndex: col,
      key: col,
      ellipsis: {
        showTitle: true,
      },
      width: 150,
      render: (text: any) => {
        if (text === null || text === undefined) return '-';
        if (typeof text === 'number') return text.toLocaleString();
        if (typeof text === 'string' && text.length > 50) {
          return (
            <Tooltip title={text}>
              <span>{text.slice(0, 47)}...</span>
            </Tooltip>
          );
        }
        return String(text);
      }
    }));

    // 添加时间格式化
    if (columns.some(col => col.dataIndex === 'time')) {
      const timeCol = columns.find(col => col.dataIndex === 'time');
      if (timeCol) {
        timeCol.render = (text: any) => {
          if (!text) return '-';
          try {
            const date = new Date(text);
            return date.toLocaleString();
          } catch {
            return text;
          }
        };
        timeCol.width = 200;
      }
    }

    return { columns, data: allData };
  };

  // 生成 Tab items
  const tabItems = tabs.map(tab => {
    const { columns, data } = getTableData(tab.queryResult);
    return {
      key: tab.key,
      label: tab.title,
      closable: tabs.length > 1,
      children: (
        <div className="query-panel-tab-content">
          <Row gutter={16}>
            <Col span={16}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Select
                    placeholder="选择数据库"
                    value={tab.selectedDatabase}
                    onChange={async (value) => {
                      updateTabState(tab.key, { selectedDatabase: value });
                      await loadMeasurementsForTab(tab.key, value);
                    }}
                    style={{ minWidth: 120 }}
                    loading={!databases.length}
                  >
                    {databases.map(db => (
                      <Option key={db} value={db}>
                        <DatabaseOutlined /> {db}
                      </Option>
                    ))}
                  </Select>
                  <Select
                    placeholder="选择表/测量值"
                    style={{ minWidth: 120 }}
                    onSelect={(value: string) => {
                      // 替换当前查询中的表名
                      const newQuery = tab.query.replace(/FROM\s+\"([^\"]+)\"/, `FROM \"${value}\"`);
                      updateTabState(tab.key, { query: newQuery });
                      onMeasurementSelect(value);
                    }}
                    disabled={!tab.selectedDatabase}
                  >
                    {tab.measurements.map(m => (
                      <Option key={m} value={m}>
                        <TableOutlined /> {m}
                      </Option>
                    ))}
                  </Select>
                </Space>

                <TextArea
                  value={tab.query}
                  onChange={(e) => updateTabState(tab.key, { query: e.target.value })}
                  placeholder="输入 InfluxQL 查询语句 (按 Ctrl+Enter 执行)..."
                  rows={6}
                  style={{ 
                    fontFamily: 'Monaco,Consolas,Courier New,monospace',
                    resize: 'vertical'
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                      executeQuery(tab.key);
                    }
                  }}
                />

                <Space>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => executeQuery(tab.key)}
                    loading={tab.loading}
                  >
                    执行查询
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => exportQueryResult(tab.key)}
                    disabled={!tab.queryResult || !!tab.queryResult.error}
                  >
                    导出 CSV
                  </Button>
                  <Popover
                    content={
                      <Card
                        title="查询模板"
                        size="small"
                        bodyStyle={{ padding: 8 }}
                      >
                        <List
                          size="small"
                          dataSource={queryTemplates}
                          renderItem={template => (
                            <List.Item
                              className="query-template-item"
                              onClick={() => insertTemplate(template.value)}
                            >
                              <Space>
                                <CodeOutlined />
                                <span style={{ whiteSpace: 'nowrap' }}>
                                  {template.label}
                                </span>
                              </Space>
                            </List.Item>
                          )}
                        />
                      </Card>
                    }
                    title="选择查询模板"
                    trigger="click"
                  >
                    <Button icon={<CodeOutlined />} size="small">
                      模板
                    </Button>
                  </Popover>
                </Space>
              </Space>
            </Col>
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card size="small" title="查询信息">
                  <Space>
                    <ClockCircleOutlined />
                    <span>执行时间: {tab.executionTime || 0}ms</span>
                  </Space>
                  <div>
                    <Badge 
                      status={tab.rowCount ? "success" : "default"} 
                      text={`返回行数: ${tab.rowCount || 0}`} 
                    />
                  </div>
                </Card>
              </Space>
            </Col>
          </Row>

          {tab.loading && (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" tip="正在执行查询..." />
            </div>
          )}

          {tab.queryResult && (
            <div style={{ marginTop: 16 }}>
              {tab.error ? (
                <Card 
                  bodyStyle={{ 
                    backgroundColor: '#fff2f0', 
                    borderColor: '#ffccc7',
                    color: '#a8071a'
                  }}
                >
                  <Space>
                    <InfoCircleOutlined />
                    <span>{tab.error}</span>
                  </Space>
                </Card>
              ) : (
                <Card 
                  size="small"
                  title={`查询结果 - ${columns.length} 列  ${data.length} 行`}
                  extra={
                    <Space>
                      <Button 
                        size="small" 
                        icon={<DownloadOutlined />}
                        onClick={() => exportQueryResult(tab.key)}
                      >
                        导出
                      </Button>
                    </Space>
                  }
                >
                  <Table
                    columns={columns}
                    dataSource={data}
                    scroll={{ x: 'max-content', y: 400 }}
                    pagination={{ 
                      pageSize: 100, 
                      showSizeChanger: true, 
                      showQuickJumper: true,
                      showTotal: (total, range) => 
                        `${range[0]}-${range[1]} / ${total} 条记录`
                    }}
                    size="small"
                    sticky
                  />
                </Card>
              )}
            </div>
          )}
        </div>
      )
    };
  });

  return (
    <div className="enhanced-query-panel-container">
      <Tabs
        type="editable-card"
        onChange={handleTabChange}
        activeKey={activeKey}
        onEdit={(targetKey, action) => 
          action === 'add' ? addTab() : removeTab(targetKey as string)
        }
        items={tabItems}
        className="query-panel-tabs"
      />
    </div>
  );
};

export default EnhancedQueryPanel;