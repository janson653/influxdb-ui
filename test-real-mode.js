/**
 * 测试真实数据模式功能
 * 验证真实模式下是否正确处理数据隔离
 */

console.log('🔧 真实数据模式测试');

// 测试步骤
console.log(`
📋 浏览器控制台测试步骤：

1. 打开开发者工具控制台
2. 切换到真实数据模式：
   dataModeManager.switchMode('real');
   
3. 尝试获取数据库列表（应该失败并显示错误）：
   try {
     await dataService.getDatabases();
   } catch (error) {
     console.log('✅ 预期错误:', error.message);
   }
   
4. 切换回演示模式验证正常工作：
   dataModeManager.switchMode('demo');
   await dataService.getDatabases(); // 应该返回模拟数据库列表

5. 验证模式状态：
   console.log('当前数据模式:', dataModeManager.getCurrentMode());

预期结果：
- 真实模式：应该抛出错误，不返回模拟数据
- 演示模式：应该正常返回模拟数据库列表
`);

console.log('✅ 测试脚本准备完成，请在浏览器中手动执行测试');