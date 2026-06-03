/**
 * 示例 2：自定义配置
 * 
 * 展示如何使用各种配置选项
 */

import { createWujieSubapp } from '@structure/wujie-subapp';

// ============================================
// 场景 1：自定义存储键名
// ============================================

const wujieWithCustomStorage = createWujieSubapp({
  storage: {
    // 自定义所有存储键名，避免与其他应用冲突
    tokenKey: 'my-app-token',
    userInfoKey: 'my-app-user-info',
    orgInfoKey: 'my-app-org-info',
    themeKey: 'my-app-theme',
    languageKey: 'my-app-language',
    routesKey: 'my-app-parent-routes',
    isOrglessUserKey: 'my-app-is-orgless',
    userRolesKey: 'my-app-user-roles',
    userPermsKey: 'my-app-user-perms'
  }
});

// ============================================
// 场景 2：自定义数据同步行为
// ============================================

const wujieWithCustomSync = createWujieSubapp({
  sync: {
    // 禁用自动同步到 localStorage
    autoSyncToStorage: false,
    // 禁用从父应用自动同步
    autoSyncFromParent: false,
    // 禁用事件总线监听
    enableEventBus: false,
    // 自定义事件名称
    eventName: 'my-custom-event'
  }
});

// ============================================
// 场景 3：自定义路由配置
// ============================================

const wujieWithCustomRouter = createWujieSubapp({
  router: {
    // 自定义白名单路由
    whiteList: [
      '/login',
      '/register',
      '/forgot-password',
      '/public-page'
    ],
    // 自定义必需路由
    essentialRoutes: [
      '/login',
      '/register',
      '/404',
      '/401'
    ],
    // 禁用自动路由生成
    autoGenerateRoutes: false
  }
});

// ============================================
// 场景 4：自定义数据处理钩子
// ============================================

const wujieWithCustomHandlers = createWujieSubapp({
  customDataHandlers: {
    /**
     * 收到数据时的自定义处理
     */
    onDataReceived: (data) => {
      console.log('收到父应用数据:', data);
      
      // 示例：自动应用主题
      if (data.theme) {
        applyTheme(data.theme);
      }
      
      // 示例：自动切换语言
      if (data.language) {
        switchLanguage(data.language);
      }
      
      // 示例：记录分析数据
      trackDataChange('received', data);
    },
    
    /**
     * 数据变化时的自定义处理
     */
    onDataChanged: (oldData, newData) => {
      console.log('数据变化检测:', { oldData, newData });
      
      // 检查 Token 变化
      if (oldData.token !== newData.token) {
        if (newData.token) {
          console.log('用户登录 - Token 已更新');
          onUserLogin();
        } else {
          console.log('用户登出 - Token 已清除');
          onUserLogout();
        }
      }
      
      // 检查用户信息变化
      if (JSON.stringify(oldData.userInfo) !== JSON.stringify(newData.userInfo)) {
        console.log('用户信息已更新');
        onUserInfoChanged(newData.userInfo);
      }
      
      // 记录数据变更
      trackDataChange('changed', { oldData, newData });
    }
  }
});

// ============================================
// 辅助函数示例
// ============================================

function applyTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme);
  console.log(`主题已切换到: ${theme}`);
}

function switchLanguage(language: string) {
  // i18n.global.locale.value = language;
  console.log(`语言已切换到: ${language}`);
}

function trackDataChange(type: string, data: any) {
  // 可以发送到分析服务
  console.log(`[Analytics] Data ${type}:`, data);
}

function onUserLogin() {
  console.log('执行登录后的操作');
  // 可以跳转到首页等
}

function onUserLogout() {
  console.log('执行登出后的操作');
  // 可以清除本地状态等
}

function onUserInfoChanged(userInfo: any) {
  console.log('用户信息更新:', userInfo);
  // 可以更新 UI 等
}

// ============================================
// 场景 5：完整的自定义配置
// ============================================

const fullyCustomizedWujie = createWujieSubapp({
  storage: {
    tokenKey: 'app-token',
    userInfoKey: 'app-user'
  },
  sync: {
    autoSyncToStorage: true,
    eventName: 'app-data-change'
  },
  router: {
    whiteList: ['/login', '/public'],
    essentialRoutes: ['/404']
  },
  customDataHandlers: {
    onDataReceived: (data) => {
      console.log('收到数据:', data);
      // 自定义处理
    },
    onDataChanged: (oldData, newData) => {
      console.log('数据变化:', { oldData, newData });
      // 自定义处理
    }
  }
});

// 初始化
fullyCustomizedWujie.init();
