/**
 * 示例 1：基础使用
 * 
 * 展示如何最简单地集成 @structure/wujie-subapp
 */

import { createWujieSubapp } from '@structure/wujie-subapp';

// ============================================
// 场景 1：最简单的初始化
// ============================================

// 创建并初始化 - 使用默认配置
const wujie = createWujieSubapp();
const initialData = wujie.init();

console.log('初始化数据:', initialData);
console.log('是否在子应用模式:', wujie.isSubApp);

// ============================================
// 场景 2：向父应用发送数据
// ============================================

// 模拟用户操作后需要通知父应用
function handleUserAction() {
  // 向父应用发送数据
  wujie.emitData({
    userAction: 'button-click',
    timestamp: Date.now(),
    customData: {
      message: 'Hello from child app!'
    }
  });
  
  console.log('数据已发送到父应用');
}

// ============================================
// 场景 3：获取和使用存储管理器
// ============================================

// 直接使用存储管理器
const storageManager = wujie.storageManager;

// 存储数据
storageManager.setItem('custom-key', { foo: 'bar' });

// 获取数据
const customData = storageManager.getItem('custom-key');
console.log('自定义数据:', customData);

// ============================================
// 场景 4：清理资源
// ============================================

// 在组件卸载或应用关闭时清理
function cleanup() {
  wujie.destroy();
  console.log('无界子应用已清理');
}

// 导出供其他模块使用
export { wujie };
