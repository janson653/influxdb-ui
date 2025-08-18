import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Spin } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { influxDBService } from '../services/influxdb';
import './RightSidebar.css';

interface RightSidebarProps {
  selectedMeasurement: string | null;
}

interface MeasurementInfo {
  recordCount: number;
  dataSize: string;
  lastUpdated: string;
  tags: string[];
  fields: string[];
}

const RightSidebar: React.FC<RightSidebarProps> = ({ selectedMeasurement }) => {
  const [measurementInfo, setMeasurementInfo] = useState<MeasurementInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMeasurementInfo = async () => {
      if (!selectedMeasurement) return;
      
      setLoading(true);
      try {
        // 获取当前连接
        const currentConnection = influxDBService.getCurrentConnection();
        if (!currentConnection) return;

        // 获取字段信息
        const fieldInfo = await influxDBService.getMeasurementFields(
          currentConnection.database,
          selectedMeasurement
        );

        // 获取记录数
        const countQuery = `SELECT COUNT(*) FROM "${selectedMeasurement}"`;
        const countResult = await influxDBService.executeQuery(countQuery, currentConnection.database);
        
        let recordCount = 0;
        if (countResult.series && countResult.series.length > 0) {
          const countValue = countResult.series[0].values[0]?.[1];
          recordCount = parseInt(countValue) || 0;
        }

        // 构造测量信息
        const info: MeasurementInfo = {
          recordCount,
          dataSize: '计算中...', // InfluxDB 1.0 不直接提供数据大小信息
          lastUpdated: new Date().toLocaleString(),
          tags: fieldInfo.tags,
          fields: fieldInfo.fields
        };

        setMeasurementInfo(info);
      } catch (error) {
        console.error('获取测量信息失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeasurementInfo();
  }, [selectedMeasurement]);

  return (
    <div className="right-sidebar-container">
      <Card title="表属性">
        {selectedMeasurement ? (
          <div>
            <Descriptions title={`${selectedMeasurement}表`} bordered column={1} size="small">
              <Descriptions.Item label="总记录数">
                {loading ? <Spin size="small" /> : measurementInfo?.recordCount || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="数据大小">
                {measurementInfo?.dataSize || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新">
                {measurementInfo?.lastUpdated || 'N/A'}
              </Descriptions.Item>
            </Descriptions>
            
            {measurementInfo && (
              <>
                <Card size="small" title="标签" style={{ marginTop: 16 }}>
                  {measurementInfo.tags.length > 0 ? (
                    measurementInfo.tags.map(tag => (
                      <Descriptions.Item key={tag} label={tag} style={{ marginBottom: 0 }}>
                        <DatabaseOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                        标签
                      </Descriptions.Item>
                    ))
                  ) : (
                    <div style={{ color: '#999', textAlign: 'center', padding: '8px 0' }}>
                      无标签
                    </div>
                  )}
                </Card>
                
                <Card size="small" title="字段" style={{ marginTop: 8 }}>
                  {measurementInfo.fields.length > 0 ? (
                    measurementInfo.fields.map(field => (
                      <Descriptions.Item key={field} label={field} style={{ marginBottom: 0 }}>
                        字段
                      </Descriptions.Item>
                    ))
                  ) : (
                    <div style={{ color: '#999', textAlign: 'center', padding: '8px 0' }}>
                      无字段
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
            <DatabaseOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <div>请在左侧选择一个 Measurement</div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RightSidebar;
