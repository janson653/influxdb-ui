import React, { useState, useEffect } from 'react';
import { Switch, Tooltip, Badge, Space, Modal } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { simplifiedDataModeManager, DataMode } from '../services/simplifiedDataModeManager';
import './DataModeToggle.css';


interface DataModeToggleProps {
  style?: React.CSSProperties;
  size?: 'small';
}

const SimplifiedDataModeToggle: React.FC<DataModeToggleProps> = ({ 
  style = {}, 
  size = 'small' 
}) => {
  const [currentMode, setCurrentMode] = useState<DataMode>(simplifiedDataModeManager.getCurrentMode());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 监听模式变化
    const unsubscribe = simplifiedDataModeManager.addModeListener((mode: DataMode) => {
      setCurrentMode(mode);
    });

    return unsubscribe;
  }, []);

  const handleModeSwitch = async (checked: boolean) => {
    setLoading(true);
    const newMode: DataMode = checked ? 'real' : 'demo';
    
    try {
      simplifiedDataModeManager.switchMode(newMode);
      
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
              {newMode === 'demo' ? (
                <span>使用模拟数据进行功能演示，无需真实数据库连接。</span>
              ) : (
                <span>使用真实数据库连接进行数据操作。</span>
              )}
            </p>
          </div>
        ),
        okText: '知道了',
        width: 400
      });
    } catch (error) {
      console.error('模式切换失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={style}>
      <Space align="center" size={size === 'small' ? 'small' : 'middle'}>
        <Tooltip 
          title={
            <div>
              <p>切换数据模式:</p>
              <p>• 演示模式: 使用模拟数据</p>
              <p>• 真实模式: 使用真实数据库</p>
            </div>
          }
        >
          <Space>
            <ExperimentOutlined 
              style={{ 
                fontSize: size === 'small' ? 14 : 16,
                color: currentMode === 'demo' ? '#faad14' : undefined 
              }} 
            />
            <span style={{ fontSize: size === 'small' ? 12 : 14 }}>
              {currentMode === 'demo' ? '演示模式' : '真实模式'}
            </span>
          </Space>
        </Tooltip>
        
        <Switch
          checked={currentMode === 'real'}
          onChange={handleModeSwitch}
          loading={loading}
          checkedChildren="真实"
          unCheckedChildren="演示"
          size={size === 'small' ? 'small' : 'default'}
        />
        
        <Badge 
          color={currentMode === 'demo' ? 'gold' : 'green'} 
          text={currentMode === 'demo' ? '演示中' : '真实中'}
          style={{ fontSize: size === 'small' ? 10 : 12 }}
        />
      </Space>
    </div>
  );
};

export default SimplifiedDataModeToggle;