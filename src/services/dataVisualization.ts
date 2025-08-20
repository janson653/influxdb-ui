/**
 * 数据可视化服务
 * 基于Chart.js提供图表生成功能
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  TimeSeriesScale,
  Filler
} from 'chart.js';
import { ChartData, ChartOptions } from 'chart.js';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  TimeSeriesScale,
  Filler
);

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string | string[];
  fill?: boolean;
  tension?: number;
  yAxisID?: string;
}

export interface TimeSeriesDataPoint {
  x: string | Date;
  y: number;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie';
  title?: string;
  xAxis?: {
    label: string;
    type: 'category' | 'time' | 'linear';
  };
  yAxis?: {
    label: string;
    type: 'linear' | 'logarithmic';
    min?: number;
    max?: number;
  };
  legend?: {
    display: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  responsive?: boolean;
  maintainAspectRatio?: boolean;
}

export class DataVisualizationService {
  /**
   * 生成图表配置
   */
  static generateChartConfig(
    data: ChartData<'line' | 'bar' | 'pie'>,
    config: ChartConfig
  ): {
    type: 'line' | 'bar' | 'pie';
    data: ChartData<'line' | 'bar' | 'pie'>;
    options: ChartOptions<'line' | 'bar' | 'pie'>;
  } {
    const chartOptions: ChartOptions<'line' | 'bar' | 'pie'> = {
      responsive: config.responsive ?? true,
      maintainAspectRatio: config.maintainAspectRatio ?? false,
      plugins: {
        title: {
          display: !!config.title,
          text: config.title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: config.legend?.display ?? true,
          position: config.legend?.position ?? 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#ddd',
          borderWidth: 1
        }
      },
      scales: {}
    };

    // 配置X轴
    if (config.xAxis && config.type !== 'pie') {
      chartOptions.scales!.x = {
        display: true,
        title: {
          display: !!config.xAxis.label,
          text: config.xAxis.label
        },
        type: config.xAxis.type === 'time' ? 'time' : 'category',
        time: config.xAxis.type === 'time' ? {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'MM-DD HH:mm',
            day: 'MM-DD',
            week: 'MM-DD',
            month: 'YYYY-MM'
          }
        } : undefined
      };
    }

    // 配置Y轴
    if (config.yAxis && config.type !== 'pie') {
      chartOptions.scales!.y = {
        display: true,
        title: {
          display: !!config.yAxis.label,
          text: config.yAxis.label
        },
        type: config.yAxis.type,
        min: config.yAxis.min,
        max: config.yAxis.max,
        beginAtZero: true
      };
    }

    return {
      type: config.type,
      data,
      options: chartOptions
    };
  }

  /**
   * 将InfluxDB查询结果转换为图表数据
   */
  static convertInfluxDBToChartData(
    queryResult: any,
    chartType: 'line' | 'bar' | 'area' = 'line',
    timeField: string = 'time',
    valueFields: string[] = []
  ): ChartData<'line' | 'bar'> {
    if (!queryResult?.series || queryResult.series.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // 自动检测数值字段
    if (valueFields.length === 0) {
      const firstSeries = queryResult.series[0];
      valueFields = firstSeries.columns
        .filter((col: string, index: number) => {
          // 排除时间字段和tag字段
          if (col === timeField) return false;
          if (index < firstSeries.values.length && typeof firstSeries.values[0][index] === 'number') {
            return true;
          }
          return false;
        })
        .slice(0, 5); // 最多支持5个数值字段
    }

    const datasets: ChartDataset[] = [];
    const colors = [
      'rgb(75, 192, 192)',
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(255, 205, 86)',
      'rgb(153, 102, 255)'
    ];

    // 处理时间序列数据
    const timeLabels: string[] = [];
    const allDataPoints: { [key: string]: number[] } = {};

    queryResult.series.forEach((series: any, seriesIndex: number) => {
      const seriesName = series.name || `Series ${seriesIndex + 1}`;
      
      series.values.forEach((row: any[]) => {
        const timeIndex = series.columns.indexOf(timeField);
        const timeValue = row[timeIndex];
        
        if (timeValue) {
          const timeLabel = new Date(timeValue).toLocaleString();
          if (!timeLabels.includes(timeLabel)) {
            timeLabels.push(timeLabel);
          }
        }

        // 处理每个数值字段
        valueFields.forEach((field) => {
          const fieldIndex = series.columns.indexOf(field);
          if (fieldIndex !== -1 && typeof row[fieldIndex] === 'number') {
            const datasetKey = `${seriesName} - ${field}`;
            if (!allDataPoints[datasetKey]) {
              allDataPoints[datasetKey] = [];
            }
            allDataPoints[datasetKey].push(row[fieldIndex]);
          }
        });
      });
    });

    // 创建数据集
    Object.keys(allDataPoints).forEach((datasetKey, index) => {
      const color = colors[index % colors.length];
      const isArea = chartType === 'area';
      
      datasets.push({
        label: datasetKey,
        data: allDataPoints[datasetKey],
        borderColor: color,
        backgroundColor: isArea ? `${color}33` : color,
        fill: isArea,
        tension: 0.4
      });
    });

    return {
      labels: timeLabels,
      datasets
    };
  }

  /**
   * 生成饼图数据
   */
  static generatePieData(
    labels: string[],
    data: number[],
    colors: string[] = []
  ): ChartData<'pie'> {
    const defaultColors = [
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#FF6384',
      '#C9CBCF'
    ];

    const backgroundColor = colors.length > 0 
      ? colors 
      : data.map((_, index) => defaultColors[index % defaultColors.length]);

    return {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  }

  /**
   * 获取图表类型建议
   */
  static suggestChartType(rowCount: number, columnCount: number, hasTimeColumn: boolean): {
    type: 'line' | 'bar' | 'pie';
    reason: string;
  } {
    if (columnCount === 2 && rowCount <= 10) {
      return {
        type: 'pie',
        reason: '数据量少，适合饼图展示占比'
      };
    }

    if (hasTimeColumn && rowCount > 1) {
      return {
        type: 'line',
        reason: '包含时间字段，适合折线图展示趋势'
      };
    }

    if (rowCount <= 20) {
      return {
        type: 'bar',
        reason: '数据量适中，适合柱状图对比'
      };
    }

    return {
      type: 'line',
      reason: '默认使用折线图'
    };
  }

  /**
   * 生成图表标题建议
   */
  static generateChartTitle(query: string, database: string): string {
    const queryType = this.detectQueryType(query);
    const timestamp = new Date().toLocaleString();
    
    return `${queryType} - ${database} (${timestamp})`;
  }

  /**
   * 检测查询类型
   */
  private static detectQueryType(query: string): string {
    const upperQuery = query.toUpperCase();
    
    if (upperQuery.includes('COUNT')) {
      return '计数统计';
    } else if (upperQuery.includes('AVG') || upperQuery.includes('MEAN')) {
      return '平均值统计';
    } else if (upperQuery.includes('SUM')) {
      return '求和统计';
    } else if (upperQuery.includes('MAX') || upperQuery.includes('MIN')) {
      return '极值统计';
    } else if (upperQuery.includes('GROUP BY')) {
      return '分组统计';
    } else {
      return '数据查询';
    }
  }

  /**
   * 验证数据是否适合图表展示
   */
  static validateDataForChart(data: ChartData<'line' | 'bar' | 'pie'>): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 检查数据是否为空
    if (!data.datasets || data.datasets.length === 0) {
      issues.push('没有数据集');
      suggestions.push('请确保查询返回了有效的数据');
      return { isValid: false, issues, suggestions };
    }

    // 检查数据点数量
    const dataPoints = data.datasets[0].data.length;
    if (dataPoints === 0) {
      issues.push('数据集为空');
      suggestions.push('请检查查询条件是否正确');
    } else if (dataPoints > 1000) {
      issues.push('数据点过多');
      suggestions.push('考虑添加LIMIT子句限制数据量，或使用时间范围过滤');
    }

    // 检查数据值
    const hasValidValues = data.datasets.some(dataset => 
      dataset.data.some(value => typeof value === 'number' && !isNaN(value))
    );

    if (!hasValidValues) {
      issues.push('没有有效的数值数据');
      suggestions.push('请确保查询包含数值字段用于图表展示');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * 生成图表配置预设
   */
  static getConfigPresets(): Array<{
    name: string;
    type: 'line' | 'bar' | 'pie';
    description: string;
    config: ChartConfig;
  }> {
    return [
      {
        name: '时间序列折线图',
        type: 'line',
        description: '适合展示时间序列数据的趋势变化',
        config: {
          type: 'line',
          title: '时间序列分析',
          xAxis: {
            label: '时间',
            type: 'time'
          },
          yAxis: {
            label: '数值',
            type: 'linear'
          }
        }
      },
      {
        name: '柱状对比图',
        type: 'bar',
        description: '适合对比不同类别的数值',
        config: {
          type: 'bar',
          title: '数据对比分析',
          xAxis: {
            label: '类别',
            type: 'category'
          },
          yAxis: {
            label: '数值',
            type: 'linear'
          }
        }
      },
      {
        name: '面积图',
        type: 'line',
        description: '适合展示数据的累积趋势',
        config: {
          type: 'line',
          title: '面积趋势图',
          xAxis: {
            label: '时间',
            type: 'time'
          },
          yAxis: {
            label: '数值',
            type: 'linear'
          }
        }
      },
      {
        name: '饼图',
        type: 'pie',
        description: '适合展示数据的占比关系',
        config: {
          type: 'pie',
          title: '占比分析'
        }
      }
    ];
  }
}