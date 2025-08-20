import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Select, 
  Button, 
  Space, 
  Row, 
  Col, 
  Radio, 
  message,
  Tooltip as AntTooltip,
  Badge
} from 'antd';
import {
  LineChart,
  BarChart,
  PieChart,
  Line,
  Bar,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  LineChartOutlined,
  BarChartOutlined,
  PieChartOutlined,
  DownloadOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { DataVisualizationService } from '../services/dataVisualization';
import { QueryResult } from '../types/influxdb';

const { Option } = Select;
const { Group: RadioGroup } = Radio;

interface DataVisualizationProps {
  queryResult: QueryResult | null;
  query: string;
  database: string;
  onExport?: (format: 'png' | 'jpg' | 'svg') => void;
}

interface ChartConfigState {
  type: 'line' | 'bar' | 'pie';
  title: string;
  xAxis: string;
  yAxis: string;
  timeField: string;
  valueFields: string[];
  showGrid: boolean;
  showLegend: boolean;
}

const DataVisualization: React.FC<DataVisualizationProps> = ({
  queryResult,
  query,
  database
}) => {
  const [chartConfig, setChartConfig] = useState<ChartConfigState>({
    type: 'line',
    title: '',
    xAxis: 'time',
    yAxis: 'value',
    timeField: 'time',
    valueFields: [],
    showGrid: true,
    showLegend: true
  });

  const [chartData, setChartData] = useState<any>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  // 分析查询结果并初始化图表配置
  useEffect(() => {
    if (queryResult && queryResult.series && queryResult.series.length > 0) {
      analyzeQueryResult();
    }
  }, [queryResult]);

  const analyzeQueryResult = () => {
    if (!queryResult?.series || queryResult.series.length === 0) return;

    const firstSeries = queryResult.series[0];
    const fields = firstSeries.columns || [];
    
    // 检测时间字段
    const timeField = fields.find(field => 
      field.toLowerCase().includes('time') || 
      field.toLowerCase().includes('timestamp')
    ) || 'time';

    // 检测数值字段
    const numericFields = fields.filter((field, index) => {
      if (field === timeField) return false;
      return firstSeries.values.some(row => typeof row[index] === 'number');
    });

    setAvailableFields([timeField, ...numericFields]);
    
    // 自动选择数值字段
    const autoValueFields = numericFields.slice(0, Math.min(3, numericFields.length));
    
    // 生成图表数据
    const chartData = DataVisualizationService.convertInfluxDBToChartData(
      queryResult,
      'line',
      timeField,
      autoValueFields
    );

    setChartData(chartData);

    // 获取图表类型建议
    const suggestion = DataVisualizationService.suggestChartType(
      chartData.labels?.length || 0,
      numericFields.length,
      fields.includes(timeField)
    );

    // 更新配置
    setChartConfig(prev => ({
      ...prev,
      type: suggestion.type as any,
      timeField,
      valueFields: autoValueFields,
      title: DataVisualizationService.generateChartTitle(query, database),
      xAxis: timeField,
      yAxis: autoValueFields[0] || 'value'
    }));
  };

  const handleConfigChange = (key: keyof ChartConfigState, value: any) => {
    setChartConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      
      // 重新生成图表数据
      if (key === 'timeField' || key === 'valueFields' || key === 'type') {
        const newData = DataVisualizationService.convertInfluxDBToChartData(
          queryResult!,
          newConfig.type === 'pie' ? 'line' : newConfig.type,
          newConfig.timeField,
          newConfig.valueFields
        );
        setChartData(newData);
      }
      
      return newConfig;
    });
  };

  const renderChart = () => {
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#999'
        }}>
          <InfoCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <p>暂无数据或数据格式不支持图表展示</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            请确保查询返回了有效的数值数据
          </p>
        </div>
      );
    }

    const commonProps = {
      data: chartData.labels.map((label: string, index: number) => {
        const dataPoint: any = { name: label };
        chartData.datasets.forEach((dataset: any, datasetIndex: number) => {
          dataPoint[`value${datasetIndex}`] = dataset.data[index] || 0;
        });
        return dataPoint;
      }),
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    switch (chartConfig.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {chartConfig.showLegend && <Legend />}
              {chartData.datasets.map((dataset: any, index: number) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={`value${index}`}
                  stroke={dataset.borderColor}
                  fill={dataset.backgroundColor}
                  strokeWidth={2}
                  name={dataset.label}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {chartConfig.showLegend && <Legend />}
              {chartData.datasets.map((dataset: any, index: number) => (
                <Bar
                  key={index}
                  dataKey={`value${index}`}
                  fill={dataset.backgroundColor}
                  name={dataset.label}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );


      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData.labels.map((label: string, index: number) => ({
                  name: label,
                  value: chartData.datasets[0]?.data[index] || 0
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }: { name: string; percent?: number }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
              >
                {chartData.labels.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={chartData.datasets[0]?.backgroundColor?.[index] || '#8884d8'} />
                ))}
              </Pie>
              <Tooltip />
              {chartConfig.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="data-visualization">
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <h3 style={{ margin: 0 }}>
                  {chartConfig.title || '数据可视化'}
                </h3>
                <Badge count={chartData?.labels?.length || 0} showZero />
              </Space>
            </Col>
            <Col>
              <Space>
                <AntTooltip title="图表配置">
                  <Button
                    icon={<SettingOutlined />}
                    onClick={() => setShowConfig(!showConfig)}
                    type="text"
                  />
                </AntTooltip>
                <AntTooltip title="导出图表">
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      message.info('图表导出功能开发中');
                    }}
                  />
                </AntTooltip>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 图表类型选择 */}
        <div style={{ marginBottom: 16 }}>
          <RadioGroup 
            value={chartConfig.type} 
            onChange={(e) => handleConfigChange('type', e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="line">
              <LineChartOutlined /> 折线图
            </Radio.Button>
            <Radio.Button value="bar">
              <BarChartOutlined /> 柱状图
            </Radio.Button>
            <Radio.Button value="pie">
              <PieChartOutlined /> 饼图
            </Radio.Button>
          </RadioGroup>
        </div>

        {/* 图表配置面板 */}
        {showConfig && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>
                  <strong>时间字段</strong>
                </div>
                <Select
                  value={chartConfig.timeField}
                  onChange={(value) => handleConfigChange('timeField', value)}
                  style={{ width: '100%' }}
                >
                  {availableFields.map(field => (
                    <Option key={field} value={field}>
                      {field}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>
                  <strong>数值字段</strong>
                </div>
                <Select
                  mode="multiple"
                  value={chartConfig.valueFields}
                  onChange={(value) => handleConfigChange('valueFields', value)}
                  style={{ width: '100%' }}
                  placeholder="选择数值字段"
                >
                  {availableFields
                    .filter(field => field !== chartConfig.timeField)
                    .map(field => (
                      <Option key={field} value={field}>
                        {field}
                      </Option>
                    ))}
                </Select>
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>
                  <strong>显示选项</strong>
                </div>
                <Space direction="vertical">
                  <label>
                    <input
                      type="checkbox"
                      checked={chartConfig.showGrid}
                      onChange={(e) => handleConfigChange('showGrid', e.target.checked)}
                    />
                    显示网格
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={chartConfig.showLegend}
                      onChange={(e) => handleConfigChange('showLegend', e.target.checked)}
                    />
                    显示图例
                  </label>
                </Space>
              </Col>
            </Row>
          </Card>
        )}

        {/* 图表展示区域 */}
        <div className="chart-container">
          {renderChart()}
        </div>

        {/* 数据摘要 */}
        {chartData && chartData.datasets && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <h4>数据摘要</h4>
            <Row gutter={16}>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                    {chartData.labels.length}
                  </div>
                  <div style={{ color: '#666' }}>数据点</div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                    {chartData.datasets.length}
                  </div>
                  <div style={{ color: '#666' }}>数据系列</div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                    {Math.max(...chartData.datasets.flatMap((d: any) => d.data))}
                  </div>
                  <div style={{ color: '#666' }}>最大值</div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>
                    {Math.min(...chartData.datasets.flatMap((d: any) => d.data.filter((n: number) => !isNaN(n))))}
                  </div>
                  <div style={{ color: '#666' }}>最小值</div>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DataVisualization;