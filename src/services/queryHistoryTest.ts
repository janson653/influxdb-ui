import { queryHistoryService } from './queryHistory';

/**
 * 查询历史服务测试文件
 * 可以在浏览器控制台中运行这些测试来验证服务功能
 */

export class QueryHistoryTest {
  static async runAllTests() {
    console.group('🧪 查询历史服务测试开始');
    
    try {
      await this.testSaveQuery();
      await this.testSearchQuery();
      await this.testSortQuery();
      await this.testUpdateQuery();
      await this.testDeleteQuery();
      await this.testStats();
      await this.testTags();
      await this.testExportImport();
      
      console.log('✅ 所有测试通过');
    } catch (error) {
      console.error('❌ 测试失败:', error);
    } finally {
      console.groupEnd();
    }
  }

  static async testSaveQuery() {
    console.group('📝 测试保存查询历史');
    
    try {
      const testData = {
        title: '测试查询',
        query: 'SELECT * FROM test',
        database: 'test_db',
        connectionId: 'test_conn',
        tags: ['测试', '单元测试'],
        description: '这是一个测试查询',
        isFavorite: false
      };

      const saved = await queryHistoryService.saveQueryHistory(testData);
      console.log('✅ 保存成功:', saved);
      
      // 验证数据完整性
      if (!saved.id || !saved.createdAt || !saved.lastUsed) {
        throw new Error('保存的数据不完整');
      }
      
      console.groupEnd();
      return saved;
    } catch (error) {
      console.error('❌ 保存测试失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  static async testSearchQuery() {
    console.group('🔍 测试搜索查询历史');
    
    try {
      // 先保存一些测试数据
      const queries = [
        {
          title: 'CPU查询',
          query: 'SELECT mean(cpu) FROM cpu',
          database: 'telegraf',
          connectionId: 'conn1',
          tags: ['CPU', '性能']
        },
        {
          title: '内存查询',
          query: 'SELECT mean(memory) FROM memory',
          database: 'telegraf',
          connectionId: 'conn1',
          tags: ['内存', '性能']
        },
        {
          title: '磁盘查询',
          query: 'SELECT mean(disk) FROM disk',
          database: 'monitoring',
          connectionId: 'conn2',
          tags: ['磁盘', '存储']
        }
      ];

      for (const query of queries) {
        await queryHistoryService.saveQueryHistory(query);
      }

      // 测试关键词搜索
      const keywordResults = await queryHistoryService.searchQueryHistory({
        keyword: 'CPU'
      });
      console.log('关键词搜索结果:', keywordResults.length);

      // 测试标签搜索
      const tagResults = await queryHistoryService.searchQueryHistory({
        tags: ['性能']
      });
      console.log('标签搜索结果:', tagResults.length);

      // 测试连接搜索
      const connResults = await queryHistoryService.searchQueryHistory({
        connectionId: 'conn1'
      });
      console.log('连接搜索结果:', connResults.length);

      // 测试数据库搜索
      const dbResults = await queryHistoryService.searchQueryHistory({
        database: 'telegraf'
      });
      console.log('数据库搜索结果:', dbResults.length);

      // 测试分页
      const pagedResults = await queryHistoryService.searchQueryHistory({
        limit: 2,
        offset: 0
      });
      console.log('分页结果:', pagedResults.length);

      console.log('✅ 搜索测试通过');
      console.groupEnd();
    } catch (error) {
      console.error('❌ 搜索测试失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  static async testSortQuery() {
    console.group('📊 测试排序查询历史');
    
    try {
      let history = await queryHistoryService.getQueryHistory();
      
      // 测试按创建时间排序
      const sortByCreated = await queryHistoryService.sortQueryHistory(history, {
        field: 'createdAt',
        order: 'desc'
      });
      console.log('按创建时间排序:', sortByCreated.length);

      // 测试按执行次数排序
      const sortByCount = await queryHistoryService.sortQueryHistory(history, {
        field: 'executionCount',
        order: 'desc'
      });
      console.log('按执行次数排序:', sortByCount.length);

      // 验证排序是否正确
      if (sortByCount.length > 1) {
        const first = sortByCount[0];
        const second = sortByCount[1];
        if (first.executionCount < second.executionCount) {
          throw new Error('排序不正确');
        }
      }

      console.log('✅ 排序测试通过');
      console.groupEnd();
    } catch (error) {
      console.error('❌ 排序测试失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  static async testUpdateQuery() {
    console.group('✏️ 测试更新查询历史');
    
    try {
      const history = await queryHistoryService.getQueryHistory();
      if (history.length === 0) {
        console.log('⚠️ 没有查询历史可更新，跳过测试');
        console.groupEnd();
        return;
      }

      const firstItem = history[0];
      const updates = {
        title: '更新的标题',
        tags: ['更新', '测试'],
        isFavorite: true
      };

      const updated = await queryHistoryService.updateQueryHistory(firstItem.id, updates);
      
      if (!updated) {
        throw new Error('更新失败');
      }

      console.log('✅ 更新成功:', updated);
      console.groupEnd();
    } catch (error) {
      console.error('❌ 更新测试失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  static async testDeleteQuery() {
    console.group('🗑️ 测试删除查询历史');
    
    try {
      const history = await queryHistoryService.getQueryHistory();
      if (history.length === 0) {
        console.log('⚠️ 没有查询历史可删除，跳过测试');
        console.groupEnd();
        return;
      }

      const firstItem = history[0];
      const success = await queryHistoryService.deleteQueryHistory(firstItem.id);
      
      if (!success) {
        throw new Error('删除失败');
      }

      // 验证删除是否成功
      const newHistory = await queryHistoryService.getQueryHistory();
      const stillExists = newHistory.some(item => item.id === firstItem.id);
      
      if (stillExists) {
        throw new Error('删除验证失败');
      }

      console.log('✅ 删除测试通过');
      console.groupEnd();
    } catch (error) {
      console.error('❌ 删除测试失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  static async testStats() {
    console.group('📈 测试统计信息');
    
    try {
      const stats = await queryHistoryService.getQueryHistoryStats();
      
      console.log('统计信息:', {
        totalQueries: stats.totalQueries,
        totalExecutions: stats.totalExecutions,
        favoriteQueries: stats.favoriteQueries,
        topTags: stats.topTags,
        topConnections: stats.topConnections,
        recentQueries: stats.recentQueries.length
      });

      // 验证统计信息
      if (stats.totalQueries < 0) {
        throw new Error('总查询数不正确');
      }

      console.log('✅ 统计测试通过');
      console.groupEnd();
    } catch (error) {
      console.error('❌ 统计测试失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  static async testTags() {
    console.group('🏷️ 测试标签功能');
    
    try {
      const tags = await queryHistoryService.getAllTags();
      console.log('所有标签:', tags);

      // 验证标签是数组
      if (!Array.isArray(tags)) {
        throw new Error('标签返回格式不正确');
      }

      console.log('✅ 标签测试通过');
      console.groupEnd();
    } catch (error) {
      console.error('❌ 标签测试失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  static async testExportImport() {
    console.group('📤 测试导出导入功能');
    
    try {
      // 导出
      const exportData = await queryHistoryService.exportQueryHistory();
      console.log('导出数据长度:', exportData.length);

      // 清空历史
      await queryHistoryService.clearQueryHistory();

      // 验证清空
      const emptyHistory = await queryHistoryService.getQueryHistory();
      if (emptyHistory.length !== 0) {
        throw new Error('清空失败');
      }

      // 导入
      const importedCount = await queryHistoryService.importQueryHistory(exportData);
      console.log('导入数量:', importedCount);

      // 验证导入
      const importedHistory = await queryHistoryService.getQueryHistory();
      if (importedHistory.length !== importedCount) {
        throw new Error('导入验证失败');
      }

      console.log('✅ 导出导入测试通过');
      console.groupEnd();
    } catch (error) {
      console.error('❌ 导出导入测试失败:', error);
      console.groupEnd();
      throw error;
    }
  }

  static async cleanup() {
    console.group('🧹 清理测试数据');
    
    try {
      await queryHistoryService.clearQueryHistory();
      console.log('✅ 清理完成');
      console.groupEnd();
    } catch (error) {
      console.error('❌ 清理失败:', error);
      console.groupEnd();
    }
  }
}

// 在浏览器控制台中运行测试
if (typeof window !== 'undefined') {
  (window as any).QueryHistoryTest = QueryHistoryTest;
  console.log('🧪 查询历史测试已加载，可以使用 QueryHistoryTest.runAllTests() 运行测试');
}