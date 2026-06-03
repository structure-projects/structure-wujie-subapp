/**
 * 示例 5：路由守卫使用
 * 
 * 展示如何设置和使用路由守卫
 */

import { setupRouterGuard } from '@structure/wujie-subapp';
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import NProgress from 'nprogress';

// ============================================
// 模拟 Store（实际项目中从您的 store 模块导入）
// ============================================

// 模拟用户 Store
const mockUserStore = {
  user: {
    roles: ['admin']
  },
  initFromLocalStorage: () => {
    console.log('从 localStorage 初始化用户');
  },
  restoreOrglessState: () => {
    console.log('恢复无组织用户状态');
  },
  getUserInfo: async () => {
    return { roles: ['admin'] };
  },
  resetToken: () => {
    console.log('重置 Token');
  }
};

// 模拟权限 Store
const mockPermissionStore = {
  routes: [],
  generateRoutes: async (roles: string[]) => {
    console.log('为角色生成路由:', roles);
    return [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => null,
        meta: { title: '仪表盘' }
      }
    ];
  }
};

// ============================================
// 创建路由器
// ============================================

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { hidden: true }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/layout/index.vue'),
    redirect: '/dashboard'
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error-page/404.vue'),
    meta: { hidden: true }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_PUBLIC_PATH),
  routes
});

// ============================================
// 场景 1：基础路由守卫设置
// ============================================

function setupBasicRouterGuard() {
  setupRouterGuard({
    router,
    
    // 获取 Store 的函数
    getUserStore: () => mockUserStore as any,
    getPermissionStore: () => mockPermissionStore as any,
    
    // 生成路由的函数
    generateRoutes: async (roles: string[]) => {
      return mockPermissionStore.generateRoutes(roles);
    }
  });
  
  console.log('基础路由守卫已设置');
}

// ============================================
// 场景 2：带进度条的路由守卫
// ============================================

function setupNProgressRouterGuard() {
  setupRouterGuard({
    router,
    
    getUserStore: () => mockUserStore as any,
    getPermissionStore: () => mockPermissionStore as any,
    generateRoutes: async (roles: string[]) => {
      return mockPermissionStore.generateRoutes(roles);
    },
    
    // 自定义路由钩子 - 添加进度条
    onBeforeEach: () => {
      NProgress.start();
      console.log('路由开始跳转');
    },
    
    onAfterEach: () => {
      NProgress.done();
      console.log('路由跳转完成');
    }
  });
  
  console.log('带进度条的路由守卫已设置');
}

// ============================================
// 场景 3：完全自定义路由守卫
// ============================================

function setupCustomRouterGuard() {
  setupRouterGuard({
    router,
    
    getUserStore: () => mockUserStore as any,
    getPermissionStore: () => mockPermissionStore as any,
    generateRoutes: async (roles: string[]) => {
      return mockPermissionStore.generateRoutes(roles);
    },
    
    // 自定义配置
    config: {
      whiteList: ['/login', '/register', '/forgot-password'],
      autoGenerateRoutes: true,
      essentialRoutes: ['/404']
    },
    
    // 自定义前置守卫
    onBeforeEach: (to: any, from: any, next: any) => {
      console.log(`自定义前置守卫: ${from.path} → ${to.path}`);
      
      // 记录路由访问日志
      logRouteAccess(to, from);
      
      // 检查页面标题
      if (to.meta?.title) {
        document.title = `${to.meta.title} - My App`;
      }
      
      // 自定义权限检查
      if (to.meta?.requiresAuth && !hasPermission(to)) {
        next('/401');
        return;
      }
      
      // 继续默认处理（如果不调用 next，就完全由自定义处理）
      // next(); // 如果提供了 onBeforeEach，需要手动调用 next
    },
    
    // 自定义后置守卫
    onAfterEach: (to: any, from: any) => {
      console.log(`自定义后置守卫: ${from.path} → ${to.path}`);
      
      // 发送页面访问分析
      trackPageView(to);
      
      // 滚动到页面顶部
      window.scrollTo(0, 0);
    }
  });
  
  console.log('完全自定义的路由守卫已设置');
}

// ============================================
// 辅助函数
// ============================================

function logRouteAccess(to: any, from: any) {
  const log = {
    timestamp: new Date().toISOString(),
    from: from.path,
    to: to.path,
    userAgent: navigator.userAgent
  };
  console.log('[路由日志]', log);
}

function hasPermission(route: any): boolean {
  // 自定义权限检查逻辑
  return true; // 简化示例
}

function trackPageView(route: any) {
  // 模拟分析跟踪
  const pageView = {
    path: route.path,
    title: route.meta?.title,
    timestamp: Date.now()
  };
  console.log('[Analytics] Page view:', pageView);
}

// ============================================
// 场景 4：渐进式自定义 - 只修改部分行为
// ============================================

function setupPartialCustomGuard() {
  // 使用默认的路由守卫逻辑，只添加一些额外的功能
  setupRouterGuard({
    router,
    
    getUserStore: () => mockUserStore as any,
    getPermissionStore: () => mockPermissionStore as any,
    generateRoutes: async (roles: string[]) => {
      return mockPermissionStore.generateRoutes(roles);
    },
    
    // 只添加后置钩子，前置钩子使用默认逻辑
    onAfterEach: (to: any, from: any) => {
      // 只添加页面标题设置
      if (to.meta?.title) {
        document.title = `${to.meta.title} - My App`;
      }
      
      console.log(`页面已切换: ${to.path}`);
    }
  });
  
  console.log('部分自定义的路由守卫已设置');
}

// ============================================
// 场景 5：配合面包屑导航
// ============================================

function setupBreadcrumbGuard() {
  setupRouterGuard({
    router,
    
    getUserStore: () => mockUserStore as any,
    getPermissionStore: () => mockPermissionStore as any,
    generateRoutes: async (roles: string[]) => {
      return mockPermissionStore.generateRoutes(roles);
    },
    
    onAfterEach: (to: any) => {
      // 生成面包屑
      const breadcrumbs = generateBreadcrumbs(to);
      console.log('面包屑:', breadcrumbs);
      
      // 可以将面包屑存储到 Pinia 中供组件使用
      // breadcrumbStore.setBreadcrumbs(breadcrumbs);
    }
  });
}

function generateBreadcrumbs(route: any): Array<{ title: string; path: string }> {
  // 简化的面包屑生成逻辑
  const breadcrumbs = [
    { title: '首页', path: '/' }
  ];
  
  if (route.meta?.title) {
    breadcrumbs.push({
      title: route.meta.title,
      path: route.path
    });
  }
  
  return breadcrumbs;
}

// ============================================
// 导出路由器供主应用使用
// ============================================

export { router };

// ============================================
// 运行示例
// ============================================

console.log('路由守卫示例已加载');

// 取消下面的注释来运行不同的示例
// setupBasicRouterGuard();
// setupNProgressRouterGuard();
// setupCustomRouterGuard();
// setupPartialCustomGuard();
// setupBreadcrumbGuard();
