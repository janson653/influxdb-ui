import React, { useState, useEffect, useRef } from 'react';
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
  Popover,
  Dropdown
} from 'antd';
import { 
  PlayCircleOutlined, 
  DatabaseOutlined, 
  TableOutlined, 
  DownloadOutlined,
  CodeOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  FileExcelOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { dataService } from '../services/dataService';
import { QueryResult, InfluxDBConnection } from '../types/influxdb';
import './QueryPanel.css';

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
  isUserSelected?: boolean; // 标记是否为用户手动选择
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
    isUserSelected: false,
  }]);
  
  // 使用 refs 来获取最新的状态，避免闭包问题
  const tabsRef = useRef<TabInfo[]>(tabs);
  const databasesRef = useRef<string[]>(databases);
  
  // 同步 refs 和 state
  useEffect(() => {
    tabsRef.current = tabs;
    databasesRef.current = databases;
  }, [tabs, databases]);
  
  
  // 加载数据库列表
  useEffect(() => {
    const fetchDatabases = async () => {
      if (!currentConnection) {
        console.log('⚠️ 没有当前连接，跳过数据库列表加载');
        setDatabases([]);
        // 清空所有标签页的数据库选择
        setTabs(tabs.map(tab => ({ ...tab, selectedDatabase: '', measurements: [] })));
        return;
      }
      
      console.group('📊 加载数据库列表');
      console.log('当前连接:', currentConnection.name);
      console.log('使用真实数据模式');
      
      try {
        console.log('步骤 1: 建立连接');
        const isConnected = await dataService.connect(currentConnection);
        
        if (!isConnected) {
          throw new Error('连接建立失败，请检查连接配置和网络状态');
        }
        
        console.log('步骤 2: 获取数据库列表');
        const dbList = await dataService.getDatabases();
        console.log('获取到数据库列表:', dbList);
        
        // 验证数据库列表格式
        if (!Array.isArray(dbList)) {
          throw new Error(`数据库列表格式错误，期望数组但收到 ${typeof dbList}`);
        }
        
        // 过滤和清理数据库名称
        const cleanDbList = dbList
          .filter(db => typeof db === 'string' && db.trim() !== '')
          .map(db => db.trim());
        
        console.log('清理后的数据库列表:', cleanDbList);
        setDatabases(cleanDbList);
        
        // 数据库选择逻辑优化
        if (cleanDbList.length === 0) {
          // 没有数据库，清空选择
          console.log('📊 没有数据库，清空选择');
          setTabs(tabs.map(tab => ({ 
            ...tab, 
            selectedDatabase: '', 
            measurements: [],
            isUserSelected: false 
          })));
        } else if (cleanDbList.length === 1) {
          // 只有一个数据库，自动选中（但不要覆盖用户手动选择）
          console.log('📊 只有一个数据库，自动选中:', cleanDbList[0]);
          const updatedTabs = tabs.map(tab => {
            // 如果用户已经手动选择，不要覆盖
            if (tab.isUserSelected) {
              return tab;
            }
            return {
              ...tab,
              selectedDatabase: cleanDbList[0],
              isUserSelected: false
            };
          });
          setTabs(updatedTabs);
          // 自动加载测量列表
          await loadMeasurementsForTab(tabs[0].key, cleanDbList[0]);
        } else {
          // 多个数据库，默认选择第一个（但不要覆盖用户手动选择）
          console.log('📊 多个数据库可用，默认选择第一个:', cleanDbList[0]);
          const updatedTabs = tabs.map(tab => {
            // 如果用户已经手动选择，不要覆盖
            if (tab.isUserSelected) {
              return tab;
            }
            return {
              ...tab,
              selectedDatabase: cleanDbList[0],
              isUserSelected: false
            };
          });
          setTabs(updatedTabs);
          // 自动加载第一个数据库的测量列表
          await loadMeasurementsForTab(tabs[0].key, cleanDbList[0]);
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
        
        // 提供更详细的错误诊断信息
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        
        let errorDescription = `无法连接到数据库服务器。错误: ${errorMessage}`;
        
        {
          errorDescription += '\n\n当前处于真实数据模式，请检查：';
          errorDescription += '\n1. InfluxDB 服务器是否正在运行';
          errorDescription += '\n2. 连接配置是否正确（URL、端口、认证信息）';
          errorDescription += '\n3. 网络连接是否正常';
          errorDescription += '\n4. 防火墙设置是否允许连接';
        }
        
        notification.error({
          message: '连接错误',
          description: errorDescription,
          duration: 8
        });
        
        // 出错时清空数据库列表和选择
        setDatabases([]);
        setTabs(tabs.map(tab => ({ ...tab, selectedDatabase: '', measurements: [] })));
        console.groupEnd();
      }
    };
    fetchDatabases();
  }, [currentConnection]);

  // 监听数据库列表变化，确保状态同步
  useEffect(() => {
    console.log('📊 数据库列表变化监听:', {
      databases,
      currentTabs: tabs.map(tab => ({ 
        key: tab.key, 
        selectedDatabase: tab.selectedDatabase,
        isUserSelected: tab.isUserSelected 
      })),
      timestamp: new Date().toISOString()
    });
    
    // 如果数据库列表为空，确保所有标签页的选择状态都被清空
    if (databases.length === 0) {
      const needsUpdate = tabs.some(tab => tab.selectedDatabase);
      if (needsUpdate) {
        console.log('📊 数据库列表为空，清空所有选择');
        setTabs(tabs.map(tab => ({ 
          ...tab, 
          selectedDatabase: '', 
          measurements: [],
          isUserSelected: false 
        })));
      }
    } else {
      // 如果数据库列表不为空，检查当前选择的数据库是否仍然有效
      const needsUpdate = tabs.some(tab => 
        tab.selectedDatabase && !databases.includes(tab.selectedDatabase)
      );
      if (needsUpdate) {
        console.log('📊 检测到无效的数据库选择，重置为有效值');
        const updatedTabs = tabs.map(tab => {
          // 如果用户手动选择的数据库仍然有效，不要重置
          if (tab.isUserSelected && databases.includes(tab.selectedDatabase)) {
            return tab;
          }
          if (tab.selectedDatabase && !databases.includes(tab.selectedDatabase)) {
            return { 
              ...tab, 
              selectedDatabase: databases[0], // 重置为第一个可用数据库
              measurements: [],
              isUserSelected: false // 重置用户选择状态
            };
          }
          return tab;
        });
        setTabs(updatedTabs);
        
        // 如果当前标签页的数据库被重置，加载新的测量值
        const currentTab = tabs.find(tab => tab.key === activeKey);
        if (currentTab && currentTab.selectedDatabase && !databases.includes(currentTab.selectedDatabase)) {
          loadMeasurementsForTab(activeKey, databases[0]);
        }
      }
    }
  }, [databases]);

  // 状态验证和同步 useEffect
  useEffect(() => {
    // 验证所有标签页的数据库状态
    const invalidTabs = tabs.filter(tab => 
      tab.selectedDatabase && !databases.includes(tab.selectedDatabase)
    );
    
    if (invalidTabs.length > 0) {
      console.log('🔍 发现无效的数据库选择，正在修复:', {
        invalidTabs: invalidTabs.map(tab => ({
          key: tab.key,
          selectedDatabase: tab.selectedDatabase,
          isUserSelected: tab.isUserSelected
        })),
        availableDatabases: databases
      });
      
      // 修复无效的数据库选择
      const updatedTabs = tabs.map(tab => {
        if (tab.selectedDatabase && !databases.includes(tab.selectedDatabase)) {
          return {
            ...tab,
            selectedDatabase: databases.length > 0 ? databases[0] : '',
            isUserSelected: false,
            measurements: []
          };
        }
        return tab;
      });
      
      setTabs(updatedTabs);
    }
  }, [databases, tabs]);

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
      isUserSelected: false,
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
    console.log('🔄 更新标签页状态:', { 
      key, 
      newState, 
      currentState: tabs.find(tab => tab.key === key),
      timestamp: new Date().toISOString()
    });
    
    // 使用函数式更新确保获取最新状态
    setTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab => 
        tab.key === key ? { ...tab, ...newState } : tab
      );
      
      console.log('🔄 更新后的标签页状态:', {
        key,
        updatedState: updatedTabs.find(tab => tab.key === key),
        allTabs: updatedTabs.map(tab => ({ key: tab.key, selectedDatabase: tab.selectedDatabase }))
      });
      
      return updatedTabs;
    });
    
    // 返回预期的更新状态（注意：由于异步性，这可能不是最终状态）
    const expectedUpdatedTab = { ...tabs.find(tab => tab.key === key), ...newState };
    return expectedUpdatedTab;
  };

  // 优化的状态更新函数，确保状态同步
  const updateTabStateSync = (key: string, newState: Partial<TabInfo>): TabInfo | null => {
    console.log('🔄 [同步] 更新标签页状态:', { 
      key, 
      newState, 
      currentState: tabs.find(tab => tab.key === key),
      timestamp: new Date().toISOString()
    });
    
    // 立即创建更新后的状态对象
    const currentTab = tabs.find(tab => tab.key === key);
    if (!currentTab) {
      console.warn('🔄 [同步] 未找到标签页:', key);
      return null;
    }
    
    const updatedTab = { ...currentTab, ...newState };
    
    // 使用函数式更新确保获取最新状态
    setTabs(prevTabs => {
      const newTabs = prevTabs.map(tab => 
        tab.key === key ? { ...tab, ...newState } : tab
      );
      console.log('🔄 [同步] 函数式更新完成:', {
        key,
        updatedState: newTabs.find(tab => tab.key === key),
        allTabs: newTabs.map(tab => ({ key: tab.key, selectedDatabase: tab.selectedDatabase }))
      });
      return newTabs;
    });
    
    console.log('🔄 [同步] 返回更新后的状态:', {
      key,
      updatedTab,
      selectedDatabase: updatedTab.selectedDatabase
    });
    
    return updatedTab;
  };

  const executeQuery = async (tabKey: string) => {
    // 使用 useRef 获取最新的 tabs 状态，避免闭包问题
    const currentTab = tabsRef.current.find((t: TabInfo) => t.key === tabKey);
    console.log('🔍 执行查询检查:', {
      tabKey,
      tab: currentTab ? { 
        selectedDatabase: currentTab.selectedDatabase, 
        query: currentTab.query,
        isUserSelected: currentTab.isUserSelected 
      } : '未找到标签页'
    });
    
    if (!currentTab) {
      console.log('❌ 未找到查询标签页');
      message.error('查询标签页不存在');
      return;
    }
    
    // 更严格的状态验证
    const selectedDatabase = currentTab.selectedDatabase?.trim();
    if (!selectedDatabase) {
      console.log('❌ 未选择数据库:', {
        selectedDatabase: currentTab.selectedDatabase,
        isUserSelected: currentTab.isUserSelected,
        availableDatabases: databasesRef.current
      });
      message.error('请先选择数据库');
      return;
    }

    // 验证选择的数据库是否在可用列表中
    if (!databasesRef.current.includes(selectedDatabase)) {
      console.log('❌ 选择的数据库不在可用列表中:', {
        selectedDatabase,
        availableDatabases: databasesRef.current
      });
      message.error('选择的数据库不可用，请重新选择');
      return;
    }

    if (!currentTab.query.trim()) {
      console.log('❌ 查询语句为空');
      message.error('请输入查询语句');
      return;
    }

    console.log('✅ 数据库验证通过:', {
      selectedDatabase,
      isUserSelected: currentTab.isUserSelected,
      availableDatabases: databases
    });

    console.group('🔍 执行查询');
    console.log('查询标签:', tabKey);
    console.log('数据库:', selectedDatabase);
    console.log('查询语句:', currentTab.query);

    const startTime = Date.now();
    updateTabState(tabKey, { loading: true, error: undefined });

    try {
      console.log('发送查询请求...');
      const result = await dataService.executeQuery(currentTab.query, selectedDatabase);
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

  const exportQueryResult = async (tabKey: string, format: 'csv' | 'json' | 'excel' = 'csv') => {
    const tab = tabs.find(t => t.key === tabKey);
    if (!tab || !tab.queryResult || tab.queryResult.error) {
      message.error('没有可导出的查询结果');
      return;
    }

    try {
      const data = getTableData(tab.queryResult);
      
      // 检查数据是否为空
      if (data.data.length === 0) {
        message.warning('查询结果为空，无法导出');
        return;
      }

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `influxdb_query_${tab.selectedDatabase || 'unknown'}_${timestamp}`;

      if (format === 'csv') {
        // CSV 导出
        const csvContent = [
          data.columns.map(col => `"${col.title}"`).join(','),
          ...data.data.map(row => 
            data.columns.map(col => {
              const value = row[col.dataIndex];
              if (value === null || value === undefined) return '""';
              return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
          )
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
        
      } else if (format === 'json') {
        // JSON 导出
        const jsonData = {
          metadata: {
            exportTime: new Date().toISOString(),
            database: tab.selectedDatabase,
            query: tab.query.trim(),
            recordCount: data.data.length,
            executionTime: tab.executionTime
          },
          columns: data.columns.map(col => ({
            name: col.title,
            dataIndex: col.dataIndex,
            type: col.dataIndex === 'time' ? 'datetime' : 
                  typeof data.data[0]?.[col.dataIndex] === 'number' ? 'number' : 'string'
          })),
          data: data.data
        };

        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.json`;
        link.click();
        
      } else if (format === 'excel') {
        // Excel 导出 (简化版，生成 TSV 格式)
        const tsvContent = [
          data.columns.map(col => col.title).join('\t'),
          ...data.data.map(row => 
            data.columns.map(col => {
              const value = row[col.dataIndex];
              if (value === null || value === undefined) return '';
              return String(value).replace(/\t/g, ' ');
            }).join('\t')
          )
        ].join('\n');

        const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.xlsx`;
        link.click();
      }

      message.success(`数据已导出为 ${format.toUpperCase()} 格式`);
      
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  const insertTemplate = (template: string) => {
    setTabs(tabs.map(tab => 
      tab.key === activeKey ? { ...tab, query: template } : tab
    ));
  };

  // 加载测量列表 - 在数据库选择变化时加载
  const loadMeasurementsForTab = async (tabKey: string, database: string) => {
    if (!database) {
      console.log('📊 数据库名称为空，跳过加载测量列表');
      return;
    }
    
    console.log('📊 开始加载测量列表:', {
      tabKey,
      database,
      timestamp: new Date().toISOString()
    });
    
    try {
      const measurementList = await dataService.getMeasurements(database);
      console.log('📊 测量列表加载成功:', {
        tabKey,
        database,
        measurementCount: measurementList.length,
        measurements: measurementList
      });
      
      // 使用函数式更新确保只更新 measurements 字段，不覆盖其他状态
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.key === tabKey 
            ? { ...tab, measurements: measurementList }
            : tab
        )
      );
    } catch (error) {
      console.error('📊 测量列表加载失败:', {
        tabKey,
        database,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      });
      
      // 静默失败，不显示错误，但清空测量列表
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.key === tabKey 
            ? { ...tab, measurements: [] }
            : tab
        )
      );
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
                {/* 工具栏 */}
                <div className="query-toolbar">
                  <div className="toolbar-left">
                    <Button
                      type="primary"
                      onClick={() => {}}
                      style={{ backgroundColor: '#0366d6' }}
                    >
                      新建连接
                    </Button>
                    <Button>
                      保存
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => executeQuery(tab.key)}
                      loading={tab.loading}
                      style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
                    >
                      运行 SQL
                    </Button>
                  </div>
                  <div className="toolbar-right">
                    <Select
                      placeholder="选择数据库"
                      value={tab.selectedDatabase}
                      onChange={async (value) => {
                        console.log('📊 数据库选择变更:', value);
                        const selectedValue = value || '';
                        console.log('📊 处理后的选择值:', selectedValue);
                        console.log('📊 当前数据库列表:', databases);
                        console.log('📊 选择值是否在数据库列表中:', databases.includes(selectedValue));
                        
                        // 验证选择的数据库是否在可用列表中
                        if (selectedValue && !databases.includes(selectedValue)) {
                          console.warn('📊 选择的数据库不在可用列表中:', selectedValue);
                          message.warning('选择的数据库不可用，请重新选择');
                          return;
                        }
                        
                        // 使用同步状态更新确保状态立即生效
                        const updatedTab = updateTabStateSync(tab.key, { 
                          selectedDatabase: selectedValue,
                          isUserSelected: true 
                        });
                        
                        console.log('📊 数据库选择状态已更新:', {
                          tabKey: tab.key,
                          selectedDatabase: updatedTab?.selectedDatabase,
                          isUserSelected: updatedTab?.isUserSelected
                        });
                        
                        if (selectedValue) {
                          await loadMeasurementsForTab(tab.key, selectedValue);
                        }
                      }}
                      style={{ minWidth: 120 }}
                      loading={!databases.length}
                      disabled={!databases.length}
                    >
                      {databases.map(db => (
                        <Option key={db} value={db} label={db}>
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
                        <Option key={m} value={m} label={m}>
                          <TableOutlined /> {m}
                        </Option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="query-editor-area">
                  <TextArea
                    value={tab.query}
                    onChange={(e) => updateTabState(tab.key, { query: e.target.value })}
                    placeholder="输入 InfluxQL 查询语句 (按 Ctrl+Enter 执行)..."
                    rows={6}
                    className="query-textarea"
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                        executeQuery(tab.key);
                      }
                    }}
                  />
                </div>

                <Space>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'csv',
                          label: '导出 CSV',
                          icon: <FileTextOutlined />,
                          onClick: () => exportQueryResult(tab.key, 'csv')
                        },
                        {
                          key: 'json',
                          label: '导出 JSON',
                          icon: <FileTextOutlined />,
                          onClick: () => exportQueryResult(tab.key, 'json')
                        },
                        {
                          key: 'excel',
                          label: '导出 Excel',
                          icon: <FileExcelOutlined />,
                          onClick: () => exportQueryResult(tab.key, 'excel')
                        }
                      ]
                    }}
                    disabled={!tab.queryResult || !!tab.queryResult.error}
                  >
                    <Button icon={<DownloadOutlined />}>
                      导出 <span style={{ fontSize: '10px' }}>▼</span>
                    </Button>
                  </Dropdown>
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

          {/* 查询结果面板 */}
          <div className="bottom-panel" style={{ marginTop: 16 }}>
            {/* 结果标签页 */}
            <div className="result-tabs">
              <div className={`result-tab ${!tab.error ? 'active' : ''}`}>
                结果
              </div>
              <div className={`result-tab ${tab.error ? 'active' : ''}`}>
                消息
              </div>
            </div>
            
            {/* 结果内容 */}
            <div className="results-container">
              {tab.error ? (
                // 错误信息显示
                <div style={{ padding: '20px', backgroundColor: '#fff2f0', borderRadius: '4px', margin: '16px' }}>
                  <Space>
                    <InfoCircleOutlined style={{ color: '#a8071a' }} />
                    <span style={{ color: '#a8071a' }}>{tab.error}</span>
                  </Space>
                </div>
              ) : tab.queryResult ? (
                <>
                  {/* 结果头部统计 */}
                  <div className="results-header">
                    <span className="results-info">
                      结果 ({data.length} 条记录, 执行时间: {(tab.executionTime || 0) / 1000} 秒)
                    </span>
                    <div className="action-buttons">
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'csv',
                              label: '导出 CSV',
                              icon: <FileTextOutlined />,
                              onClick: () => exportQueryResult(tab.key, 'csv')
                            },
                            {
                              key: 'json',
                              label: '导出 JSON',
                              icon: <FileTextOutlined />,
                              onClick: () => exportQueryResult(tab.key, 'json')
                            },
                            {
                              key: 'excel',
                              label: '导出 Excel',
                              icon: <FileExcelOutlined />,
                              onClick: () => exportQueryResult(tab.key, 'excel')
                            }
                          ]
                        }}
                      >
                        <Button 
                          className="btn btn-small"
                          icon={<DownloadOutlined />}
                          size="small"
                        >
                          导出 CSV
                        </Button>
                      </Dropdown>
                      <Button 
                        className="btn btn-small"
                        onClick={() => executeQuery(tab.key)}
                        size="small"
                      >
                        刷新
                      </Button>
                    </div>
                  </div>

                  {/* 结果表格容器 */}
                  <div className="results-table-container" style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
                    <Table
                      columns={columns}
                      dataSource={data}
                      scroll={{ x: 'max-content', y: 'calc(100% - 100px)' }}
                      pagination={{ 
                        pageSize: 100, 
                        showSizeChanger: true, 
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                          `${range[0]}-${range[1]} / ${total} 条记录`,
                        size: 'small'
                      }}
                      size="small"
                      sticky
                      className="results-table"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>
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