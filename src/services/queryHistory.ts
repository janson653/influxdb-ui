// import { InfluxDBConnection } from '../types/influxdb';

// 查询历史记录项
export interface QueryHistoryItem {
  id: string;
  title: string;
  query: string;
  database: string;
  connectionId: string;
  createdAt: string;
  lastUsed: string;
  executionCount: number;
  tags: string[];
  description?: string;
  isFavorite: boolean;
  executionTime?: number; // 执行时间（毫秒）
  resultCount?: number;  // 结果数量
  queryType?: 'select' | 'show' | 'create' | 'drop' | 'alter' | 'other';
}

// 查询历史搜索选项
export interface QueryHistorySearchOptions {
  keyword?: string;
  tags?: string[];
  connectionId?: string;
  database?: string;
  queryType?: QueryHistoryItem['queryType'];
  dateRange?: {
    start: string;
    end: string;
  };
  isFavorite?: boolean;
  limit?: number;
  offset?: number;
}

// 查询历史排序选项
export interface QueryHistorySortOptions {
  field: 'createdAt' | 'lastUsed' | 'executionCount' | 'title' | 'executionTime';
  order: 'asc' | 'desc';
}

// 查询历史统计信息
export interface QueryHistoryStats {
  totalQueries: number;
  totalExecutions: number;
  favoriteQueries: number;
  topTags: Array<{ tag: string; count: number }>;
  topConnections: Array<{ connectionId: string; count: number }>;
  recentQueries: QueryHistoryItem[];
}

class QueryHistoryService {
  private readonly STORAGE_KEY = 'influxdb_query_history';
  private readonly MAX_HISTORY_ITEMS = 1000; // 最大历史记录数量
  // private readonly CLEANUP_THRESHOLD = 1200; // 清理阈值

  /**
   * 保存查询历史记录
   */
  async saveQueryHistory(item: Omit<QueryHistoryItem, 'id' | 'createdAt' | 'lastUsed' | 'executionCount'>): Promise<QueryHistoryItem> {
    try {
      const history = await this.getQueryHistory();
      
      // 检查是否已存在相同的查询
      const existingIndex = history.findIndex(h => 
        h.query === item.query && 
        h.connectionId === item.connectionId && 
        h.database === item.database
      );

      let queryItem: QueryHistoryItem;

      if (existingIndex >= 0) {
        // 更新现有记录
        const existing = history[existingIndex];
        queryItem = {
          ...existing,
          title: item.title || existing.title,
          tags: item.tags || existing.tags,
          description: item.description || existing.description,
          isFavorite: item.isFavorite !== undefined ? item.isFavorite : existing.isFavorite,
          executionTime: item.executionTime || existing.executionTime,
          resultCount: item.resultCount || existing.resultCount,
          lastUsed: new Date().toISOString(),
          executionCount: existing.executionCount + 1
        };
        
        history[existingIndex] = queryItem;
      } else {
        // 创建新记录
        queryItem = {
          id: this.generateId(),
          title: item.title,
          query: item.query,
          database: item.database,
          connectionId: item.connectionId,
          tags: item.tags || [],
          description: item.description,
          isFavorite: item.isFavorite || false,
          executionTime: item.executionTime,
          resultCount: item.resultCount,
          queryType: this.analyzeQueryType(item.query),
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          executionCount: 1
        };
        
        history.unshift(queryItem); // 添加到开头
      }

      // 清理超出限制的记录
      await this.cleanupHistory(history);
      
      // 保存到localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
      
      console.log('✅ 查询历史记录保存成功:', queryItem.id);
      return queryItem;
    } catch (error) {
      console.error('❌ 保存查询历史记录失败:', error);
      throw new Error(`保存查询历史记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取查询历史记录
   */
  async getQueryHistory(): Promise<QueryHistoryItem[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const history = JSON.parse(stored);
      
      // 验证数据格式
      if (!Array.isArray(history)) {
        console.warn('⚠️ 查询历史数据格式不正确，重置存储');
        localStorage.removeItem(this.STORAGE_KEY);
        return [];
      }

      // 过滤无效数据
      const validHistory = history.filter(item => 
        item && 
        typeof item === 'object' && 
        item.id && 
        item.query && 
        item.connectionId && 
        item.database
      );

      if (validHistory.length !== history.length) {
        console.warn('⚠️ 清理了无效的查询历史记录');
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validHistory));
      }

      return validHistory;
    } catch (error) {
      console.error('❌ 获取查询历史记录失败:', error);
      return [];
    }
  }

  /**
   * 搜索查询历史记录
   */
  async searchQueryHistory(options: QueryHistorySearchOptions): Promise<QueryHistoryItem[]> {
    try {
      let history = await this.getQueryHistory();

      // 关键词搜索
      if (options.keyword) {
        const keyword = options.keyword.toLowerCase();
        history = history.filter(item => 
          item.title.toLowerCase().includes(keyword) ||
          item.query.toLowerCase().includes(keyword) ||
          item.description?.toLowerCase().includes(keyword) ||
          item.tags.some(tag => tag.toLowerCase().includes(keyword))
        );
      }

      // 标签过滤
      if (options.tags && options.tags.length > 0) {
        history = history.filter(item => 
          options.tags!.some(tag => item.tags.includes(tag))
        );
      }

      // 连接过滤
      if (options.connectionId) {
        history = history.filter(item => item.connectionId === options.connectionId);
      }

      // 数据库过滤
      if (options.database) {
        history = history.filter(item => item.database === options.database);
      }

      // 查询类型过滤
      if (options.queryType) {
        history = history.filter(item => item.queryType === options.queryType);
      }

      // 收藏过滤
      if (options.isFavorite !== undefined) {
        history = history.filter(item => item.isFavorite === options.isFavorite);
      }

      // 日期范围过滤
      if (options.dateRange) {
        const startDate = new Date(options.dateRange.start);
        const endDate = new Date(options.dateRange.end);
        history = history.filter(item => {
          const itemDate = new Date(item.createdAt);
          return itemDate >= startDate && itemDate <= endDate;
        });
      }

      // 分页
      if (options.offset) {
        history = history.slice(options.offset);
      }
      if (options.limit) {
        history = history.slice(0, options.limit);
      }

      return history;
    } catch (error) {
      console.error('❌ 搜索查询历史记录失败:', error);
      throw new Error(`搜索查询历史记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 排序查询历史记录
   */
  async sortQueryHistory(history: QueryHistoryItem[], options: QueryHistorySortOptions): Promise<QueryHistoryItem[]> {
    try {
      const sorted = [...history];
      
      sorted.sort((a, b) => {
        let aValue: any = a[options.field];
        let bValue: any = b[options.field];

        // 处理日期字段
        if (options.field === 'createdAt' || options.field === 'lastUsed') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        // 处理字符串字段
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (options.order === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      return sorted;
    } catch (error) {
      console.error('❌ 排序查询历史记录失败:', error);
      throw new Error(`排序查询历史记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 删除查询历史记录
   */
  async deleteQueryHistory(id: string): Promise<boolean> {
    try {
      const history = await this.getQueryHistory();
      const initialLength = history.length;
      
      const filtered = history.filter(item => item.id !== id);
      
      if (filtered.length === initialLength) {
        console.warn('⚠️ 未找到要删除的查询历史记录:', id);
        return false;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      console.log('✅ 查询历史记录删除成功:', id);
      return true;
    } catch (error) {
      console.error('❌ 删除查询历史记录失败:', error);
      throw new Error(`删除查询历史记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量删除查询历史记录
   */
  async bulkDeleteQueryHistory(ids: string[]): Promise<number> {
    try {
      const history = await this.getQueryHistory();
      const initialLength = history.length;
      
      const filtered = history.filter(item => !ids.includes(item.id));
      const deletedCount = initialLength - filtered.length;
      
      if (deletedCount === 0) {
        console.warn('⚠️ 未找到要删除的查询历史记录');
        return 0;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      console.log(`✅ 批量删除查询历史记录成功，删除了 ${deletedCount} 条记录`);
      return deletedCount;
    } catch (error) {
      console.error('❌ 批量删除查询历史记录失败:', error);
      throw new Error(`批量删除查询历史记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 清空查询历史记录
   */
  async clearQueryHistory(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('✅ 查询历史记录已清空');
    } catch (error) {
      console.error('❌ 清空查询历史记录失败:', error);
      throw new Error(`清空查询历史记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新查询历史记录
   */
  async updateQueryHistory(id: string, updates: Partial<QueryHistoryItem>): Promise<QueryHistoryItem | null> {
    try {
      const history = await this.getQueryHistory();
      const index = history.findIndex(item => item.id === id);
      
      if (index === -1) {
        console.warn('⚠️ 未找到要更新的查询历史记录:', id);
        return null;
      }

      const updated = {
        ...history[index],
        ...updates,
        id: history[index].id, // 确保ID不被修改
        createdAt: history[index].createdAt, // 确保创建时间不被修改
        lastUsed: updates.lastUsed || new Date().toISOString() // 更新最后使用时间
      };

      history[index] = updated;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
      
      console.log('✅ 查询历史记录更新成功:', id);
      return updated;
    } catch (error) {
      console.error('❌ 更新查询历史记录失败:', error);
      throw new Error(`更新查询历史记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取查询历史统计信息
   */
  async getQueryHistoryStats(): Promise<QueryHistoryStats> {
    try {
      const history = await this.getQueryHistory();
      
      const totalQueries = history.length;
      const totalExecutions = history.reduce((sum, item) => sum + item.executionCount, 0);
      const favoriteQueries = history.filter(item => item.isFavorite).length;

      // 统计标签使用频率
      const tagCounts: Record<string, number> = {};
      history.forEach(item => {
        item.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      const topTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // 统计连接使用频率
      const connectionCounts: Record<string, number> = {};
      history.forEach(item => {
        connectionCounts[item.connectionId] = (connectionCounts[item.connectionId] || 0) + 1;
      });
      const topConnections = Object.entries(connectionCounts)
        .map(([connectionId, count]) => ({ connectionId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // 获取最近的查询
      const recentQueries = history
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
        .slice(0, 10);

      return {
        totalQueries,
        totalExecutions,
        favoriteQueries,
        topTags,
        topConnections,
        recentQueries
      };
    } catch (error) {
      console.error('❌ 获取查询历史统计信息失败:', error);
      throw new Error(`获取查询历史统计信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取所有标签
   */
  async getAllTags(): Promise<string[]> {
    try {
      const history = await this.getQueryHistory();
      const tagSet = new Set<string>();
      
      history.forEach(item => {
        item.tags.forEach(tag => tagSet.add(tag));
      });

      return Array.from(tagSet).sort();
    } catch (error) {
      console.error('❌ 获取标签失败:', error);
      return [];
    }
  }

  /**
   * 导出查询历史记录
   */
  async exportQueryHistory(): Promise<string> {
    try {
      const history = await this.getQueryHistory();
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        totalItems: history.length,
        items: history
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ 导出查询历史记录失败:', error);
      throw new Error(`导出查询历史记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 导入查询历史记录
   */
  async importQueryHistory(jsonData: string): Promise<number> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.items || !Array.isArray(importData.items)) {
        throw new Error('导入数据格式不正确');
      }

      const existingHistory = await this.getQueryHistory();
      const importedItems: QueryHistoryItem[] = [];
      
      importData.items.forEach((item: any) => {
        // 验证数据格式
        if (item && item.id && item.query && item.connectionId && item.database) {
          // 生成新的ID以避免冲突
          const newItem = {
            ...item,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
          };
          importedItems.push(newItem);
        }
      });

      // 合并历史记录
      const mergedHistory = [...importedItems, ...existingHistory];
      
      // 清理超出限制的记录
      await this.cleanupHistory(mergedHistory);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mergedHistory));
      
      console.log(`✅ 导入查询历史记录成功，导入了 ${importedItems.length} 条记录`);
      return importedItems.length;
    } catch (error) {
      console.error('❌ 导入查询历史记录失败:', error);
      throw new Error(`导入查询历史记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 私有方法

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 分析查询类型
   */
  private analyzeQueryType(query: string): QueryHistoryItem['queryType'] {
    const trimmedQuery = query.trim().toUpperCase();
    
    if (trimmedQuery.startsWith('SELECT')) return 'select';
    if (trimmedQuery.startsWith('SHOW')) return 'show';
    if (trimmedQuery.startsWith('CREATE')) return 'create';
    if (trimmedQuery.startsWith('DROP')) return 'drop';
    if (trimmedQuery.startsWith('ALTER')) return 'alter';
    return 'other';
  }

  /**
   * 清理历史记录
   */
  private async cleanupHistory(history: QueryHistoryItem[]): Promise<void> {
    if (history.length <= this.MAX_HISTORY_ITEMS) {
      return;
    }

    // 按最后使用时间排序，保留最近使用的记录
    history.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
    
    // 保留最新的记录
    const keepCount = this.MAX_HISTORY_ITEMS;
    const cleaned = history.slice(0, keepCount);
    
    // 替换原数组
    history.length = 0;
    history.push(...cleaned);
    
    console.log(`🧹 清理了 ${history.length - keepCount} 条旧的历史记录`);
  }
}

// 导出单例实例
export const queryHistoryService = new QueryHistoryService();

// 导出类型（已在上面定义过interface，无需重复导出）
// export type {
//   QueryHistoryItem,
//   QueryHistorySearchOptions,
//   QueryHistorySortOptions,
//   QueryHistoryStats
// };