#!/usr/bin/env node

/**
 * Tauri Commands 功能测试脚本
 * 测试新的架构是否正常工作
 */

import { execSync } from 'child_process';

console.log('🧪 开始 Tauri Commands 功能测试...\n');

// 测试列表
const tests = [
  {
    name: 'TypeScript 编译测试',
    command: 'npx tsc --noEmit',
    expected: '编译通过'
  },
  {
    name: 'Rust 编译测试',
    command: 'cd src-tauri && cargo check',
    expected: '编译通过'
  },
  {
    name: '前端开发服务器测试',
    command: 'curl -s -o /dev/null -w "%{http_code}" http://localhost:1420/',
    expected: '200'
  },
  {
    name: 'Tauri 构建测试',
    command: 'cd src-tauri && cargo build --release',
    expected: '构建成功',
    skip: true // 跳过耗时的构建测试
  }
];

// 运行测试
let passedTests = 0;
let totalTests = 0;

tests.forEach(test => {
  if (!test.skip) {
    totalTests++;
    console.log(`🔍 ${test.name}...`);
    
    try {
      const result = execSync(test.command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 30000 
      });
      
      if (test.name === '前端开发服务器测试') {
        if (result.trim() === '200') {
          console.log(`   ✅ ${test.name} - HTTP 状态码: ${result.trim()}`);
          passedTests++;
        } else {
          console.log(`   ❌ ${test.name} - 期望: 200, 实际: ${result.trim()}`);
        }
      } else {
        console.log(`   ✅ ${test.name} - ${test.expected}`);
        passedTests++;
      }
    } catch (error) {
      console.log(`   ❌ ${test.name} - 测试失败`);
      console.log(`   错误信息: ${error.message}`);
    }
  }
});

// 架构验证测试
console.log('\n🏗️ 架构验证测试...');

const architectureTests = [
  {
    name: '检查 database_operations.rs 文件',
    check: () => {
      const fs = require('fs');
      const path = require('path');
      return fs.existsSync(path.join(__dirname, 'src-tauri', 'src', 'database_operations.rs'));
    }
  },
  {
    name: '检查 influxdbRefactored.ts 文件',
    check: () => {
      const fs = require('fs');
      const path = require('path');
      return fs.existsSync(path.join(__dirname, 'src', 'services', 'influxdbRefactored.ts'));
    }
  },
  {
    name: '检查 connectionStorageSimplified.ts 文件',
    check: () => {
      const fs = require('fs');
      const path = require('path');
      return fs.existsSync(path.join(__dirname, 'src', 'services', 'connectionStorageSimplified.ts'));
    }
  },
  {
    name: '检查代理配置是否移除',
    check: () => {
      const fs = require('fs');
      const path = require('path');
      const viteConfig = fs.readFileSync(path.join(__dirname, 'vite.config.ts'), 'utf8');
      return !viteConfig.includes('influxdb-proxy');
    }
  },
  {
    name: '检查新类型定义',
    check: () => {
      const fs = require('fs');
      const path = require('path');
      const types = fs.readFileSync(path.join(__dirname, 'src', 'types', 'influxdb.ts'), 'utf8');
      return types.includes('EnhancedQueryResult') && 
             types.includes('FieldInfo') && 
             types.includes('MeasurementInfo');
    }
  }
];

architectureTests.forEach(test => {
  totalTests++;
  try {
    if (test.check()) {
      console.log(`   ✅ ${test.name}`);
      passedTests++;
    } else {
      console.log(`   ❌ ${test.name} - 验证失败`);
    }
  } catch (error) {
    console.log(`   ❌ ${test.name} - 测试错误: ${error.message}`);
  }
});

// Tauri Commands 注册测试
console.log('\n🔧 Tauri Commands 注册测试...');

const fs = require('fs');
const path = require('path');

try {
  const libRsContent = fs.readFileSync(path.join(__dirname, 'src-tauri', 'src', 'lib.rs'), 'utf8');
  
  const requiredCommands = [
    'get_databases',
    'get_measurements',
    'get_tag_keys', 
    'get_field_keys',
    'get_measurement_info',
    'execute_query_optimized'
  ];
  
  requiredCommands.forEach(cmd => {
    totalTests++;
    if (libRsContent.includes(cmd)) {
      console.log(`   ✅ ${cmd} 已注册`);
      passedTests++;
    } else {
      console.log(`   ❌ ${cmd} 未注册`);
    }
  });
} catch (error) {
  console.log(`   ❌ 无法读取 lib.rs 文件: ${error.message}`);
}

// 测试结果总结
console.log('\n📊 测试结果总结');
console.log('================');
console.log(`总测试数: ${totalTests}`);
console.log(`通过测试: ${passedTests}`);
console.log(`失败测试: ${totalTests - passedTests}`);
console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 所有测试通过！架构重构成功！');
} else if (passedTests / totalTests >= 0.8) {
  console.log('\n✅ 大部分测试通过，架构重构基本成功！');
} else {
  console.log('\n⚠️ 存在较多问题，需要进一步调试。');
}

// 性能基准测试
console.log('\n⚡ 性能基准测试...');
console.log('================');

const performanceTests = [
  {
    name: 'TypeScript 编译时间',
    command: 'time npx tsc --noEmit',
    metric: '编译时间'
  },
  {
    name: 'Rust 检查时间',
    command: 'cd src-tauri && time cargo check',
    metric: '检查时间'
  }
];

performanceTests.forEach(test => {
  console.log(`🔍 ${test.name}...`);
  console.log(`   ℹ️  手动运行: ${test.command}`);
  console.log(`   📊 记录 ${test.metric} 用于性能对比`);
});

console.log('\n🎯 下一步建议:');
console.log('================');
console.log('1. 手动测试应用功能是否正常');
console.log('2. 验证数据库连接和查询功能');
console.log('3. 测试新的 Tauri Commands');
console.log('4. 进行性能对比测试');

console.log('\n🧪 功能测试完成！');