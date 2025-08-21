import React, { useState, useEffect } from 'react';
import { Select, Card, Space, Typography, Tag, Modal } from 'antd';
import { ExperimentOutlined, MonitorOutlined, RobotOutlined, DollarOutlined } from '@ant-design/icons';
import { mockDataService } from '../services/mockDataService';
import { dataModeManager } from '../services/dataModeManager';

const { Text } = Typography;
const { Option } = Select;

interface DataSetSelectorProps {
  style?: React.CSSProperties;
  size?: 'small' | 'large';
  onChange?: (dataSetKey: string) => void;
}

const DataSetSelector: React.FC<DataSetSelectorProps> = ({ 
  style = {}, 
  size = 'small',
  onChange 
}) => {
  const [currentDataSet, setCurrentDataSet] = useState('monitoring');
  const [isDemoMode, setIsDemoMode] = useState(dataModeManager.isDemoMode());

  useEffect(() => {
    // 监听数据模式变化
    const unsubscribe = dataModeManager.addModeListener((mode) => {
      setIsDemoMode(mode === 'demo');
    });

    return unsubscribe;
  }, []);

  const dataSets = mockDataService.getAvailableDataSets();

  const getDataSetIcon = (key: string) => {
    const icons: Record<string, React.ReactNode> = {
      monitoring: <MonitorOutlined />,
      iot: <RobotOutlined />,
      finance: <DollarOutlined />
    };
    return icons[key] || <ExperimentOutlined />;
  };

  const getDataSetColor = (key: string) => {
    const colors: Record<string, string> = {
      monitoring: '#52c41a',
      iot: '#1890ff',
      finance: '#fa8c16'
    };
    return colors[key] || '#666';
  };

  const handleDataSetChange = (value: string) => {
    setCurrentDataSet(value);
    mockDataService.switchDataSet(value);
    onChange?.(value);
    
    // 显示切换提示
    const selectedDataSet = dataSets.find(ds => ds.key === value);
    if (selectedDataSet) {
      Modal.info({
        title: '数据集已切换',
        content: (
          <div>
            <p>
              当前演示数据集: <Tag color={getDataSetColor(value)}>
                {getDataSetIcon(value)} {selectedDataSet.name}
              </Tag>
            </p>
            <p>{selectedDataSet.description}</p>
          </div>
        ),
        okText: '知道了'
      });
    }
  };

  const showDataSetInfo = () => {
    const currentDataSetInfo = mockDataService.getCurrentDataSet();
    
    Modal.info({
      title: '数据集详情',
      width: 600,
      content: (
        <div>
          <Card 
            title={
              <Space>
                {getDataSetIcon(currentDataSet)}
                <span>{currentDataSetInfo.name}</span>
              </Space>
            } 
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>{currentDataSetInfo.description}</Text>
              
              <div>
                <Text strong>包含数据库:</Text>
                <div style={{ marginTop: 8 }}>
                  {currentDataSetInfo.databases.map(db => (
                    <Tag key={db} style={{ marginBottom: 4 }}>{db}</Tag>
                  ))}
                </div>
              </div>
              
              <div>
                <Text strong>测量数据:</Text>
                <div style={{ marginTop: 8 }}>
                  {Object.entries(currentDataSetInfo.measurements).map(([db, measurements]) => (
                    <div key={db} style={{ marginBottom: 8 }}>
                      <Text code>{db}</Text>: {measurements.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Text strong>预设连接:</Text>
                <div style={{ marginTop: 8 }}>
                  {currentDataSetInfo.connections.map(conn => (
                    <Tag key={conn.id} color="blue">{conn.name}</Tag>
                  ))}
                </div>
              </div>
            </Space>
          </Card>
        </div>
      ),
      okText: '知道了'
    });
  };

  // 只在演示模式下显示
  if (!isDemoMode) {
    return null;
  }

  return (
    <div style={style}>
      <Space size="small">
        <Text style={{ fontSize: size === 'small' ? 11 : 12, color: '#666' }}>
          演示数据集:
        </Text>
        <Select
          size={size}
          value={currentDataSet}
          onChange={handleDataSetChange}
          style={{ 
            minWidth: size === 'small' ? 120 : 160,
          }}
          placeholder="选择数据集"
        >
          {dataSets.map(dataSet => (
            <Option key={dataSet.key} value={dataSet.key}>
              <Space size="small">
                {getDataSetIcon(dataSet.key)}
                <span>{dataSet.name}</span>
              </Space>
            </Option>
          ))}
        </Select>
        
        <Text 
          style={{ 
            fontSize: size === 'small' ? 10 : 11, 
            color: '#999',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onClick={showDataSetInfo}
        >
          查看详情
        </Text>
      </Space>
    </div>
  );
};

export default DataSetSelector;