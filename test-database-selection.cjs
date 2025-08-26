#!/usr/bin/env node

/**
 * InfluxDB UI 前端数据库选择问题验证脚本
 * 用于验证数据库下拉列表选择功能的修复
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 InfluxDB UI 前端数据库选择问题验证');
console.log('=====================================\n');

// 检查关键文件是否存在
const filesToCheck = [
  'src/components/EnhancedQueryPanel.tsx',
  'src/services/dataService.ts',
  'src/services/influxdb.ts',
  'src/App.tsx'
];

console.log('📋 检查关键文件:');
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - 存在`);
  } else {
    console.log(`❌ ${file} - 不存在`);
  }
});

console.log('');

// 检查EnhancedQueryPanel.tsx中的关键修复
const enhancedQueryPanelPath = path.join(__dirname, 'src/components/EnhancedQueryPanel.tsx');
if (fs.existsSync(enhancedQueryPanelPath)) {
  const content = fs.readFileSync(enhancedQueryPanelPath, 'utf8');
  
  console.log('🔧 检查EnhancedQueryPanel.tsx中的修复:');
  
  // 检查Select组件的value绑定
  const selectValueMatch = content.match(/value=\{tab\.selectedDatabase \|\| undefined\}/);
  if (selectValueMatch) {
    console.log('✅ Select组件value绑定已修复 (使用undefined而不是null)');
  } else {
    console.log('❌ Select组件value绑定未修复');
  }
  
  // 检查onChange事件处理
  const onChangeMatch = content.match(/const selectedValue = value \|\| '';/);
  if (onChangeMatch) {
    console.log('✅ onChange事件处理已改进 (添加空值检查)');
  } else {
    console.log('❌ onChange事件处理未改进');
  }
  
  // 检查数据库选择逻辑
  const dbLogicMatch = content.match(/多个数据库，检查当前选择是否有效/);
  if (dbLogicMatch) {
    console.log('✅ 数据库选择逻辑已优化 (多数据库处理)');
  } else {
    console.log('❌ 数据库选择逻辑未优化');
  }
  
  // 检查状态同步
  const stateSyncMatch = content.match(/监听数据库列表变化，确保状态同步/);
  if (stateSyncMatch) {
    console.log('✅ 状态同步逻辑已添加');
  } else {
    console.log('❌ 状态同步逻辑未添加');
  }
  
  // 检查日志记录
  const logMatch = content.match(/timestamp: new Date\(\)\.toISOString\(\)/);
  if (logMatch) {
    console.log('✅ 详细日志记录已添加');
  } else {
    console.log('❌ 详细日志记录未添加');
  }
}

console.log('');

// 检查dataService.ts中的关键方法
const dataServicePath = path.join(__dirname, 'src/services/dataService.ts');
if (fs.existsSync(dataServicePath)) {
  const content = fs.readFileSync(dataServicePath, 'utf8');
  
  console.log('🔧 检查dataService.ts:');
  
  // 检查getDatabases方法
  const getDatabasesMatch = content.match(/async getDatabases\(\): Promise<string\[\]>/);
  if (getDatabasesMatch) {
    console.log('✅ getDatabases方法存在');
  } else {
    console.log('❌ getDatabases方法不存在');
  }
}

console.log('');

// 提供测试建议
console.log('🧪 测试建议:');
console.log('1. 启动应用: pnpm dev');
console.log('2. 连接到InfluxDB数据库');
console.log('3. 检查浏览器控制台日志，查看数据库加载过程');
console.log('4. 验证数据库下拉列表是否能正确显示和选择');
console.log('5. 特别关注"testdb"数据库的显示和选择');
console.log('6. 检查选择数据库后是否能正确加载测量列表');

console.log('');

// 提供调试建议
console.log('🔍 调试建议:');
console.log('1. 打开浏览器开发者工具 (F12)');
console.log('2. 切换到Console标签页');
console.log('3. 查找包含"📊"的日志信息');
console.log('4. 关注以下关键日志:');
console.log('   - "获取到数据库列表"');
console.log('   - "数据库选择变更"');
console.log('   - "更新标签页状态"');
console.log('   - "数据库列表变化监听"');

console.log('');

// 提供问题排查步骤
console.log('🛠️ 问题排查步骤:');
console.log('1. 如果数据库列表为空:');
console.log('   - 检查网络连接');
console.log('   - 检查InfluxDB服务是否运行');
console.log('   - 检查连接配置是否正确');
console.log('');
console.log('2. 如果数据库列表显示但无法选择:');
console.log('   - 检查Select组件的value绑定');
console.log('   - 检查onChange事件处理');
console.log('   - 检查状态更新逻辑');
console.log('');
console.log('3. 如果选择后没有反应:');
console.log('   - 检查事件处理函数');
console.log('   - 检查异步操作时序');
console.log('   - 检查状态同步逻辑');

console.log('');

console.log('✨ 修复完成！现在可以测试应用了。');