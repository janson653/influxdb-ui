import { queryHistoryService } from './queryHistory';
import { message } from 'antd';
import { QueryHistoryItem } from '../types/influxdb';
import { useState, useEffect } from 'react';

/**
 * 查询历史服务使用示例
 * 这个文件展示了如何在React组件中使用查询历史服务
 */

// 示例1：保存查询历史
export async function saveQueryExample() {
  try {
    const queryItem = {
      title: 'CPU使用率查询',
      query: 'SELECT mean("usage_idle") FROM "cpu" WHERE time > now() - 1h GROUP BY time(10m), "host"',
      database: 'telegraf',
      connectionId: 'conn_123',
      tags: ['性能监控', 'CPU', '系统指标'],
      description: '查询过去1小时的CPU平均使用率',
      isFavorite: true,
      executionTime: 450,
      resultCount: 12
    };

    const savedItem = await queryHistoryService.saveQueryHistory(queryItem);
    message.success('查询历史保存成功');
    return savedItem;
  } catch (error) {
    message.error('保存查询历史失败');
    console.error('保存查询历史失败:', error);
  }
}

// 示例2：搜索查询历史
export async function searchQueryHistoryExample() {
  try {
    const searchOptions = {
      keyword: 'CPU',
      tags: ['性能监控'],
      connectionId: 'conn_123',
      limit: 10,
      offset: 0
    };

    const results = await queryHistoryService.searchQueryHistory(searchOptions);
    console.log('搜索结果:', results);
    return results;
  } catch (error) {
    message.error('搜索查询历史失败');
    console.error('搜索查询历史失败:', error);
  }
}

// 示例3：获取排序后的查询历史
export async function getSortedQueryHistoryExample() {
  try {
    // 获取所有历史记录
    let history = await queryHistoryService.getQueryHistory();
    
    // 按最后使用时间降序排序
    const sortedHistory = await queryHistoryService.sortQueryHistory(history, {
      field: 'lastUsed',
      order: 'desc'
    });

    console.log('排序后的查询历史:', sortedHistory);
    return sortedHistory;
  } catch (error) {
    message.error('获取排序查询历史失败');
    console.error('获取排序查询历史失败:', error);
  }
}

// 示例4：删除查询历史
export async function deleteQueryHistoryExample(id: string) {
  try {
    const success = await queryHistoryService.deleteQueryHistory(id);
    if (success) {
      message.success('查询历史删除成功');
    } else {
      message.warning('未找到要删除的查询历史');
    }
    return success;
  } catch (error) {
    message.error('删除查询历史失败');
    console.error('删除查询历史失败:', error);
  }
}

// 示例5：获取查询历史统计信息
export async function getQueryHistoryStatsExample() {
  try {
    const stats = await queryHistoryService.getQueryHistoryStats();
    console.log('查询历史统计:', stats);
    return stats;
  } catch (error) {
    message.error('获取查询历史统计失败');
    console.error('获取查询历史统计失败:', error);
  }
}

// 示例6：导出查询历史
export async function exportQueryHistoryExample() {
  try {
    const exportData = await queryHistoryService.exportQueryHistory();
    
    // 创建下载链接
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_history_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    message.success('查询历史导出成功');
  } catch (error) {
    message.error('导出查询历史失败');
    console.error('导出查询历史失败:', error);
  }
}

// 示例7：导入查询历史
export async function importQueryHistoryExample(file: File) {
  try {
    const text = await file.text();
    const importedCount = await queryHistoryService.importQueryHistory(text);
    message.success(`成功导入 ${importedCount} 条查询历史记录`);
    return importedCount;
  } catch (error) {
    message.error('导入查询历史失败');
    console.error('导入查询历史失败:', error);
  }
}

// 示例8：React组件中使用查询历史
export function useQueryHistory() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);

  // 加载查询历史
  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await queryHistoryService.getQueryHistory();
      setHistory(data);
    } catch (error) {
      message.error('加载查询历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存查询
  const saveQuery = async (queryData: any) => {
    try {
      const saved = await queryHistoryService.saveQueryHistory(queryData);
      setHistory(prev => [saved, ...prev]);
      message.success('查询保存成功');
      return saved;
    } catch (error) {
      message.error('保存查询失败');
      throw error;
    }
  };

  // 删除查询
  const deleteQuery = async (id: string) => {
    try {
      const success = await queryHistoryService.deleteQueryHistory(id);
      if (success) {
        setHistory(prev => prev.filter(item => item.id !== id));
        message.success('查询删除成功');
      }
    } catch (error) {
      message.error('删除查询失败');
      throw error;
    }
  };

  // 搜索查询
  const searchQueries = async (options: any) => {
    try {
      const results = await queryHistoryService.searchQueryHistory(options);
      return results;
    } catch (error) {
      message.error('搜索查询失败');
      throw error;
    }
  };

  return {
    history,
    loading,
    loadHistory,
    saveQuery,
    deleteQuery,
    searchQueries
  };
}

// 使用示例的Hook
export function useQueryHistoryExample() {
  const { history, saveQuery, deleteQuery, searchQueries } = useQueryHistory();

  // 在组件挂载时加载历史记录
  useEffect(() => {
    loadHistory();
  }, []);

  // 执行查询并保存到历史
  const executeAndSaveQuery = async (query: string, connectionId: string, database: string) => {
    const startTime = Date.now();
    
    try {
      // 执行查询...
      const result = await executeQuery(query, connectionId, database);
      const executionTime = Date.now() - startTime;
      
      // 保存到历史记录
      await saveQuery({
        title: `查询 - ${new Date().toLocaleString()}`,
        query,
        database,
        connectionId,
        tags: ['手动查询'],
        executionTime,
        resultCount: result.length
      });
      
      return result;
    } catch (error) {
      console.error('查询执行失败:', error);
      throw error;
    }
  };

  return {
    history,
    executeAndSaveQuery,
    deleteQuery,
    searchQueries
  };
}