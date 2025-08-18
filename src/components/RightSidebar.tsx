import React from 'react';
import { Card, Descriptions } from 'antd';
import './RightSidebar.css';

interface RightSidebarProps {
  selectedMeasurement: string | null;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ selectedMeasurement }) => {
  return (
    <div className="right-sidebar-container">
      <Card title="表属性">
        {selectedMeasurement ? (
          <Descriptions title={`${selectedMeasurement}表`} bordered column={1} size="small">
            <Descriptions.Item label="总记录数">N/A</Descriptions.Item>
            <Descriptions.Item label="数据大小">N/A</Descriptions.Item>
            <Descriptions.Item label="索引大小">N/A</Descriptions.Item>
            <Descriptions.Item label="最后更新">N/A</Descriptions.Item>
          </Descriptions>
        ) : (
          <div>请在左侧选择一个 Measurement</div>
        )}
      </Card>
    </div>
  );
};

export default RightSidebar;
