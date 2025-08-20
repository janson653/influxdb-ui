# 查询历史服务 (Query History Service)

## 概述

查询历史服务是一个用于管理InfluxDB查询历史记录的模块，提供了完整的CRUD操作、搜索、排序和统计功能。

## 功能特性

### 核心功能
- ✅ **保存查询历史** - 自动保存查询记录，支持重复查询合并
- ✅ **搜索查询历史** - 支持关键词、标签、连接、数据库等多维度搜索
- ✅ **排序查询历史** - 支持按时间、执行次数、标题等多字段排序
- ✅ **删除查询历史** - 支持单个删除、批量删除和清空操作
- ✅ **统计信息** - 提供查询统计、标签统计、连接统计等
- ✅ **标签管理** - 支持标签分类和标签云统计
- ✅ **导入导出** - 支持JSON格式的数据导入导出

### 高级功能
- 🏷️ **智能标签** - 自动分析查询类型并分类
- ⭐ **收藏功能** - 支持标记重要查询
- 📊 **执行统计** - 记录执行时间、结果数量等指标
- 🧹 **自动清理** - 自动清理超出限制的历史记录
- 🔍 **模糊搜索** - 支持标题、查询内容、描述的模糊搜索

## 快速开始

### 1. 基本使用

```typescript
import { queryHistoryService } from './services/queryHistory';

// 保存查询历史
const savedItem = await queryHistoryService.saveQueryHistory({
  title: 'CPU使用率查询',
  query: 'SELECT mean("usage_idle") FROM "cpu" WHERE time > now() - 1h',
  database: 'telegraf',
  connectionId: 'conn_123',
  tags: ['性能监控', 'CPU'],
  isFavorite: true
});

// 获取查询历史
const history = await queryHistoryService.getQueryHistory();

// 搜索查询历史
const results = await queryHistoryService.searchQueryHistory({
  keyword: 'CPU',
  tags: ['性能监控'],
  limit: 10
});

// 删除查询历史
await queryHistoryService.deleteQueryHistory(savedItem.id);
```

### 2. 搜索和排序

```typescript
// 多条件搜索
const searchResults = await queryHistoryService.searchQueryHistory({
  keyword: 'SELECT',
  tags: ['监控'],
  connectionId: 'conn_123',
  database: 'telegraf',
  queryType: 'select',
  dateRange: {
    start: '2024-01-01T00:00:00Z',
    end: '2024-12-31T23:59:59Z'
  },
  isFavorite: true,
  limit: 20,
  offset: 0
});

// 排序结果
const sortedResults = await queryHistoryService.sortQueryHistory(searchResults, {
  field: 'lastUsed',
  order: 'desc'
});
```

### 3. 统计信息

```typescript
// 获取统计信息
const stats = await queryHistoryService.getQueryHistoryStats();
console.log('总查询数:', stats.totalQueries);
console.log('总执行次数:', stats.totalExecutions);
console.log('收藏查询数:', stats.favoriteQueries);
console.log('热门标签:', stats.topTags);
console.log('热门连接:', stats.topConnections);
```

### 4. 标签管理

```typescript
// 获取所有标签
const allTags = await queryHistoryService.getAllTags();
console.log('所有标签:', allTags);

// 使用标签搜索
const tagResults = await queryHistoryService.searchQueryHistory({
  tags: ['性能监控', 'CPU']
});
```

### 5. 导入导出

```typescript
// 导出查询历史
const exportData = await queryHistoryService.exportQueryHistory();

// 导入查询历史
const importCount = await queryHistoryService.importQueryHistory(exportData);
console.log('导入了', importCount, '条记录');
```

## 数据结构

### QueryHistoryItem

```typescript
interface QueryHistoryItem {
  id: string;                    // 唯一标识符
  title: string;                 // 查询标题
  query: string;                 // 查询语句
  database: string;              // 数据库名称
  connectionId: string;           // 连接ID
  createdAt: string;             // 创建时间
  lastUsed: string;              // 最后使用时间
  executionCount: number;         // 执行次数
  tags: string[];                // 标签数组
  description?: string;          // 描述信息
  isFavorite: boolean;           // 是否收藏
  executionTime?: number;         // 执行时间(毫秒)
  resultCount?: number;          // 结果数量
  queryType?: 'select' | 'show' | 'create' | 'drop' | 'alter' | 'other';
}
```

### QueryHistorySearchOptions

```typescript
interface QueryHistorySearchOptions {
  keyword?: string;              // 关键词搜索
  tags?: string[];               // 标签过滤
  connectionId?: string;         // 连接过滤
  database?: string;             // 数据库过滤
  queryType?: QueryHistoryItem['queryType']; // 查询类型过滤
  dateRange?: {                  // 日期范围过滤
    start: string;
    end: string;
  };
  isFavorite?: boolean;          // 收藏过滤
  limit?: number;                // 限制数量
  offset?: number;               // 偏移量
}
```

### QueryHistoryStats

```typescript
interface QueryHistoryStats {
  totalQueries: number;          // 总查询数
  totalExecutions: number;       // 总执行次数
  favoriteQueries: number;       // 收藏查询数
  topTags: Array<{               // 热门标签
    tag: string;
    count: number;
  }>;
  topConnections: Array<{        // 热门连接
    connectionId: string;
    count: number;
  }>;
  recentQueries: QueryHistoryItem[]; // 最近查询
}
```

## React Hook 使用

```typescript
import { useQueryHistory } from './services/queryHistoryExample';

function QueryHistoryComponent() {
  const { history, loading, saveQuery, deleteQuery, searchQueries } = useQueryHistory();

  const handleSaveQuery = async (queryData) => {
    await saveQuery({
      title: queryData.title,
      query: queryData.query,
      database: queryData.database,
      connectionId: queryData.connectionId,
      tags: queryData.tags,
      isFavorite: false
    });
  };

  const handleSearch = async (keyword) => {
    const results = await searchQueries({
      keyword: keyword,
      limit: 10
    });
    return results;
  };

  return (
    <div>
      {/* 组件内容 */}
    </div>
  );
}
```

## 测试

### 运行测试

在浏览器控制台中运行：

```javascript
// 运行所有测试
QueryHistoryTest.runAllTests();

// 运行特定测试
QueryHistoryTest.testSaveQuery();
QueryHistoryTest.testSearchQuery();
QueryHistoryTest.testDeleteQuery();

// 清理测试数据
QueryHistoryTest.cleanup();
```

### 测试覆盖

- ✅ 保存查询历史
- ✅ 搜索查询历史
- ✅ 排序查询历史
- ✅ 更新查询历史
- ✅ 删除查询历史
- ✅ 统计信息
- ✅ 标签功能
- ✅ 导入导出功能

## 配置选项

### 存储配置

```typescript
// 最大历史记录数量
private readonly MAX_HISTORY_ITEMS = 1000;

// 清理阈值
private readonly CLEANUP_THRESHOLD = 1200;

// 存储键名
private readonly STORAGE_KEY = 'influxdb_query_history';
```

### 自动清理

服务会自动清理超出限制的历史记录，保留最近使用的记录：

1. 当记录数量超过 `MAX_HISTORY_ITEMS` 时触发清理
2. 按最后使用时间排序，保留最新的记录
3. 自动删除超出限制的旧记录

## 错误处理

所有方法都包含完整的错误处理：

```typescript
try {
  const result = await queryHistoryService.saveQueryHistory(queryData);
  console.log('保存成功:', result);
} catch (error) {
  console.error('保存失败:', error);
  // 显示错误提示
}
```

## 最佳实践

### 1. 保存查询

```typescript
// 在查询执行成功后保存
const executeQuery = async (query, connectionId, database) => {
  const startTime = Date.now();
  
  try {
    const result = await influxdbService.query(query, connectionId, database);
    const executionTime = Date.now() - startTime;
    
    // 保存到历史记录
    await queryHistoryService.saveQueryHistory({
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
```

### 2. 搜索优化

```typescript
// 使用防抖优化搜索
const debouncedSearch = debounce(async (keyword) => {
  const results = await queryHistoryService.searchQueryHistory({
    keyword: keyword,
    limit: 10
  });
  return results;
}, 300);
```

### 3. 标签管理

```typescript
// 自动生成标签
const generateTags = (query: string): string[] => {
  const tags: string[] = [];
  const upperQuery = query.toUpperCase();
  
  if (upperQuery.includes('CPU')) tags.push('CPU');
  if (upperQuery.includes('MEMORY')) tags.push('内存');
  if (upperQuery.includes('DISK')) tags.push('磁盘');
  if (upperQuery.includes('NETWORK')) tags.push('网络');
  
  return tags;
};
```

## 性能优化

### 1. 本地存储优化

- 使用 `localStorage` 进行持久化存储
- 自动压缩和清理历史记录
- 支持增量更新和批量操作

### 2. 搜索优化

- 内存中进行搜索，无需网络请求
- 支持多条件组合搜索
- 自动缓存搜索结果

### 3. 数据验证

- 自动验证数据格式
- 清理无效数据
- 防止数据损坏

## 注意事项

1. **存储限制**: `localStorage` 有大小限制（通常5-10MB），请合理控制历史记录数量
2. **数据安全**: 查询历史包含敏感信息，请确保在安全的环境中使用
3. **性能考虑**: 大量历史记录可能影响搜索性能，建议定期清理
4. **浏览器兼容性**: 需要 `localStorage` 支持的现代浏览器

## 版本历史

- **v1.0.0**: 初始版本，支持基本的CRUD操作
- **v1.1.0**: 添加搜索、排序、统计功能
- **v1.2.0**: 添加标签管理、导入导出功能
- **v1.3.0**: 添加React Hook支持，优化性能

## 贡献指南

欢迎提交问题和改进建议！请遵循以下规范：

1. 代码风格保持一致
2. 添加适当的测试用例
3. 更新相关文档
4. 确保向后兼容性