import React, { useState, useEffect } from 'react';
import { Tabs, Button, Select, Input, Table, message, Space } from 'antd';
import { PlayCircleOutlined, DatabaseOutlined, TableOutlined, PlusOutlined } from '@ant-design/icons';
import { influxDBService } from '../services/influxdb';
import { QueryResult, InfluxDBConnection } from '../types/influxdb';
import './QueryPanel.css';

const { TextArea } = Input;
const { Option } = Select;

interface QueryPanelProps {
  currentConnection: InfluxDBConnection;
  onMeasurementSelect: (measurement: string) => void;
}

const QueryPanel: React.FC<QueryPanelProps> = ({ currentConnection, onMeasurementSelect }) => {
  const [databases, setDatabases] = useState<string[]>([]);
  const [activeKey, setActiveKey] = useState('1');
  const [tabs, setTabs] = useState<any[]>([{ 
    key: '1',
    title: '查询 1',
    query: 'SELECT * FROM "cpu" LIMIT 10',
    selectedDatabase: '',
    measurements: [],
    queryResult: null,
    loading: false,
  }]);

  useEffect(() => {
    const fetchDatabases = async () => {
      if (!currentConnection) return;
      try {
        await influxDBService.connect(currentConnection);
        const dbList = await influxDBService.getDatabases();
        setDatabases(dbList);
      } catch (error) {
        message.error('获取数据库列表失败');
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
      if (lastIndex >= 0) {
        newActiveKey = newTabs[lastIndex].key;
      } else {
        newActiveKey = newTabs[0].key;
      }
    }
    setTabs(newTabs);
    setActiveKey(newActiveKey);
  };

  const updateTabState = (key: string, newState: any) => {
    setTabs(tabs.map(tab => tab.key === key ? { ...tab, ...newState } : tab));
  };

  const executeQuery = async (tabKey: string) => {
    const tab = tabs.find(t => t.key === tabKey);
    if (!tab || !tab.selectedDatabase) {
      message.error('请先选择数据库');
      return;
    }

    updateTabState(tabKey, { loading: true });
    try {
      const result = await influxDBService.executeQuery(tab.query, tab.selectedDatabase);
      updateTabState(tabKey, { queryResult: result });
      if (result.error) {
        message.error(`查询错误: ${result.error}`);
      } else {
        message.success('查询执行成功');
      }
    } catch (error) {
      message.error('查询执行失败');
    } finally {
      updateTabState(tabKey, { loading: false });
    }
  };

  const renderTabBar = (props: any, DefaultTabBar: any) => (
    <DefaultTabBar {...props}>
      <Button 
        icon={<PlusOutlined />} 
        onClick={addTab} 
        style={{ marginLeft: 8 }} 
        type="primary"
      />
    </DefaultTabBar>
  );

  useEffect(() => {
    const fetchMeasurements = async (database: string, tabKey: string) => {
      if (!database) return;
      try {
        const measurementList = await influxDBService.getMeasurements(database);
        updateTabState(tabKey, { measurements: measurementList });
      } catch (error) {
        message.error('获取 measurements 失败');
      }
    };

    tabs.forEach(tab => {
      if (tab.selectedDatabase) {
        fetchMeasurements(tab.selectedDatabase, tab.key);
      }
    });
  }, [tabs]);

  const getTableData = (queryResult: QueryResult | null) => {
    if (!queryResult?.series || queryResult.series.length === 0) {
      return { columns: [], data: [] };
    }

    const series = queryResult.series[0];
    const columns = series.columns.map(col => ({
      title: col,
      dataIndex: col,
      key: col,
    }));

    const data = series.values.map((row, index) => {
      const rowData: any = { key: index };
      series.columns.forEach((col, colIndex) => {
        rowData[col] = row[colIndex];
      });
      return rowData;
    });

    return { columns, data };
  };

  return (
    <div className="query-panel-container">
      <Tabs
        type="editable-card"
        onChange={handleTabChange}
        activeKey={activeKey}
        onEdit={(targetKey, action) => action === 'add' ? addTab() : removeTab(targetKey as string)}
        renderTabBar={renderTabBar}
        className="query-panel-tabs"
      >
        {tabs.map(tab => {
          const { columns, data } = getTableData(tab.queryResult);
          return (
            <Tabs.TabPane tab={tab.title} key={tab.key} closable={tabs.length > 1}>
              <div className="query-panel-tab-content">
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <Space>
                    <Select
                      placeholder="选择数据库"
                      value={tab.selectedDatabase}
                      onChange={value => updateTabState(tab.key, { selectedDatabase: value })}
                      style={{ width: 200 }}
                    >
                      {databases.map(db => (
                        <Option key={db} value={db}>
                          <DatabaseOutlined /> {db}
                        </Option>
                      ))}
                    </Select>
                  <Select
                      placeholder="选择 Measurement"
                      style={{ width: 200 }}
                      onSelect={(value: string) => {
                        updateTabState(tab.key, { query: `SELECT * FROM "${value}" LIMIT 10` });
                        onMeasurementSelect(value);
                      }}
                    >
                      {tab.measurements.map((m: string) => (
                        <Option key={m} value={m}>
                          <TableOutlined /> {m}
                        </Option>
                      ))}
                    </Select>
                  </Space>

                  <TextArea
                    value={tab.query}
                    onChange={(e) => updateTabState(tab.key, { query: e.target.value })}
                    placeholder="输入 InfluxQL 查询语句..."
                    rows={6}
                    style={{ fontFamily: 'monospace' }}
                  />

                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => executeQuery(tab.key)}
                    loading={tab.loading}
                  >
                    执行查询
                  </Button>
                </Space>

                {tab.queryResult && (
                  <div style={{ marginTop: 16 }}>
                    {tab.queryResult.error ? (
                      <div style={{ color: 'red' }}>{tab.queryResult.error}</div>
                    ) : (
                      <Table
                        columns={columns}
                        dataSource={data}
                        scroll={{ x: true }}
                        pagination={{ pageSize: 50, showSizeChanger: true, showQuickJumper: true }}
                        size="small"
                      />
                    )}
                  </div>
                )}
              </div>
            </Tabs.TabPane>
          );
        })}
      </Tabs>
    </div>
  );
};

export default QueryPanel; 