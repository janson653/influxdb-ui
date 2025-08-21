import React, { useState, useEffect } from 'react';
import { Switch, Tooltip, Badge, Space, Button, Modal, Card, Typography, List } from 'antd';
import { ExperimentOutlined, DatabaseOutlined, InfoCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { dataModeManager, DataMode } from '../services/dataModeManager';
import { mockDataService } from '../services/mockDataService';
import './DataModeToggle.css';

const { Text } = Typography;

interface DataModeToggleProps {
  style?: React.CSSProperties;
  size?: 'small';
}

const DataModeToggle: React.FC<DataModeToggleProps> = ({ 
  style = {}, 
  size = 'small' 
}) => {
  const [currentMode, setCurrentMode] = useState<DataMode>(dataModeManager.getCurrentMode());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 监听模式变化
    const unsubscribe = dataModeManager.addModeListener((mode: DataMode) => {
      setCurrentMode(mode);
    });

    return unsubscribe;
  }, []);

  const handleModeSwitch = async (checked: boolean) => {
    setLoading(true);
    const newMode: DataMode = checked ? 'real' : 'demo';
    
    try {
      dataModeManager.switchMode(newMode);
      
      // 显示切换提示
      Modal.info({
        title: '数据模式已切换',
        content: (
          <div>
            <p>
              当前模式已切换为: <Badge 
                color={newMode === 'demo' ? 'gold' : 'green'} 
                text={newMode === 'demo' ? '演示模式' : '真实数据模式'} 
              />
            </p>
            <p>
              {newMode === 'demo' 
                ? '现在将使用模拟数据进行演示，无需真实数据库连接。' 
                : '现在将连接到真实的 InfluxDB 数据库。'
              }
            </p>
          </div>
        ),
        okText: '知道了'
      });
    } catch (error) {
      console.error('切换数据模式失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModeIcon = () => {
    return currentMode === 'demo' ? <ExperimentOutlined /> : <DatabaseOutlined />;
  };

  const getModeColor = () => {
    return currentMode === 'demo' ? '#fa8c16' : '#52c41a';
  };

  const getModeText = () => {
    return currentMode === 'demo' ? '演示模式' : '真实数据';
  };

  const getModeDescription = () => {
    return currentMode === 'demo' 
      ? '使用模拟数据进行演示' 
      : '连接真实 InfluxDB 数据库';
  };

  const showModeInfo = () => {
    const dataSets = mockDataService.getAvailableDataSets();
    const stats = dataModeManager.getModeStats();
    
    Modal.info({
      title: '数据模式说明',
      width: 600,
      content: (
        <div>
          <Card title="演示模式" size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>
                🎭 <strong>演示模式</strong>使用预设的模拟数据，无需连接真实数据库，适合：
              </Text>
              <List size="small" dataSource={[
                '产品功能演示和展示',
                '学习 InfluxDB 查询语法',
                '测试界面功能和交互',
                '快速体验数据分析流程'
              ]} renderItem={item => <List.Item>• {item}</List.Item>} />
              
              <Text strong>可用数据集:</Text>
              <List 
                size="small" 
                dataSource={dataSets} 
                renderItem={item => (
                  <List.Item>
                    <strong>{item.name}</strong>: {item.description}
                  </List.Item>
                )} 
              />
            </Space>
          </Card>

          <Card title="真实数据模式" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>
                🔗 <strong>真实数据模式</strong>连接真实的 InfluxDB 实例，适合：
              </Text>
              <List size="small" dataSource={[
                '生产环境数据分析',
                '实际业务数据查询',
                '数据库管理和维护',
                '真实性能监控分析'
              ]} renderItem={item => <List.Item>• {item}</List.Item>} />
            </Space>
          </Card>

          {stats && (
            <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
              使用统计: 已切换 {stats.sessionCount} 次，最后切换: {new Date(stats.lastSwitchTime).toLocaleString()}
            </div>
          )}
        </div>
      ),
      okText: '知道了'
    });
  };

  return (
    <div className="data-mode-toggle" style={style}>
      <Space size="small">
        {/* 模式指示器 */}
        <Badge 
          color={getModeColor()} 
          text={
            <Space size={2}>
              {getModeIcon()}
              <span style={{ 
                fontWeight: 500, 
                fontSize: size === 'small' ? 12 : 14,
                color: getModeColor()
              }}>
                {getModeText()}
              </span>
            </Space>
          } 
        />

        {/* 模式切换开关 */}
        <Tooltip 
          title={`切换到${currentMode === 'demo' ? '真实数据' : '演示'}模式`}
          placement="bottom"
        >
          <Switch
            size={size}
            checked={currentMode === 'real'}
            onChange={handleModeSwitch}
            loading={loading}
            checkedChildren={<DatabaseOutlined />}
            unCheckedChildren={<ExperimentOutlined />}
            style={{
              backgroundColor: currentMode === 'demo' ? '#fa8c16' : undefined
            }}
          />
        </Tooltip>

        {/* 信息按钮 */}
        <Tooltip title="查看数据模式说明" placement="bottom">
          <Button
            type="text"
            size={size}
            icon={<InfoCircleOutlined />}
            onClick={showModeInfo}
            style={{ 
              fontSize: size === 'small' ? 12 : 14,
              padding: size === 'small' ? '2px 4px' : undefined
            }}
          />
        </Tooltip>

        {/* 演示模式特效 */}
        {currentMode === 'demo' && (
          <Tooltip title="演示模式激活" placement="bottom">
            <ThunderboltOutlined 
              style={{ 
                color: '#fa8c16', 
                fontSize: size === 'small' ? 12 : 14,
                animation: 'pulse 2s infinite'
              }} 
            />
          </Tooltip>
        )}
      </Space>
      
      {/* 模式描述 */}
      {size !== 'small' && (
        <div style={{ 
          fontSize: 11, 
          color: '#666', 
          marginTop: 2,
          fontStyle: 'italic'
        }}>
          {getModeDescription()}
        </div>
      )}
    </div>
  );
};

export default DataModeToggle;