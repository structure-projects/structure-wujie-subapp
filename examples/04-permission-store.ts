/**
 * 示例 4：权限 Store 使用
 * 
 * 展示如何创建和使用权限 Store
 */

import { createPermissionStore } from '@structure/wujie-subapp';
import { RouteRecordRaw } from 'vue-router';

// ============================================
// 模拟数据和 API
// ============================================

// 静态路由配置
const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { hidden: true }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error-page/404.vue'),
    meta: { hidden: true }
  },
  {
    path: '/401',
    name: 'Unauthorized',
    component: () => import('@/views/error-page/401.vue'),
    meta: { hidden: true }
  }
];

// 模拟动态路由数据
const mockDynamicRoutes = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: '/dashboard/index.vue',
    meta: { title: '仪表盘', icon: 'dashboard', roles: ['admin', 'user'] }
  },
  {
    path: '/system',
    name: 'System',
    component: 'Layout',
    meta: { title: '系统管理', icon: 'system', roles: ['admin'] },
    children: [
      {
        path: 'user',
        name: 'SystemUser',
        component: '/system/user/index.vue',
        meta: { title: '用户管理', icon: 'user', roles: ['admin'] }
      },
      {
        path: 'role',
        name: 'SystemRole',
        component: '/system/role/index.vue',
        meta: { title: '角色管理', icon: 'role', roles: ['admin'] }
      }
    ]
  },
  {
    path: '/profile',
    name: 'Profile',
    component: '/profile/index.vue',
    meta: { title: '个人中心', icon: 'user', roles: ['admin', 'user'] }
  }
];

// 模拟 API
const mockMenuApi = {
  listRoutes: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { data: mockDynamicRoutes };
  }
};

// 模拟组件导入（实际项目中使用 import.meta.glob）
const mockModules = {
  '../../views/dashboard/index.vue': () => import('@/views/dashboard/index.vue'),
  '../../views/system/user/index.vue': () => import('@/views/system/user/index.vue'),
  '../../views/system/role/index.vue': () => import('@/views/system/role/index.vue'),
  '../../views/profile/index.vue': () => import('@/views/profile/index.vue')
};

// 模拟 Layout 组件
const MockLayout = () => import('@/layout/index.vue');
const MockPlaceholder = () => import('@/views/placeholder/index.vue');

// ============================================
// 场景 1：基础权限 Store 创建
// ============================================

export const useBasicPermissionStore = createPermissionStore({
  constantRoutes,
  listRoutesApi: mockMenuApi.listRoutes,
  modules: mockModules,
  Layout: MockLayout,
  PlaceholderComponent: MockPlaceholder
});

// ============================================
// 场景 2：自定义权限检查逻辑
// ============================================

export const useCustomPermissionStore = createPermissionStore({
  constantRoutes,
  listRoutesApi: mockMenuApi.listRoutes,
  modules: mockModules,
  Layout: MockLayout,
  
  // 自定义权限检查函数
  hasPermission: (roles: string[], route: RouteRecordRaw) => {
    console.log('检查权限:', { roles, routePath: route.path });
    
    // 如果路由没有配置角色要求，默认允许访问
    if (!route.meta?.roles) {
      return true;
    }
    
    // 超级管理员拥有所有权限
    if (roles.includes('super-admin')) {
      return true;
    }
    
    // 检查用户是否拥有任一要求的角色
    const hasRole = roles.some(role => 
      route.meta!.roles!.includes(role)
    );
    
    console.log(`路由 ${route.path} 权限检查结果:`, hasRole);
    return hasRole;
  },
  
  // 自定义路由过滤函数
  filterAsyncRoutes: (routes: RouteRecordRaw[], roles: string[]) => {
    console.log('开始过滤路由，用户角色:', roles);
    
    const asyncRoutes: RouteRecordRaw[] = [];
    const hasPermission = (roles: string[], route: RouteRecordRaw) => {
      if (route.meta && route.meta.roles) {
        return roles.some(role => route.meta!.roles!.includes(role));
      }
      return true;
    };
    
    routes.forEach(route => {
      const tmpRoute = { ...route };
      
      if (hasPermission(roles, tmpRoute)) {
        // 递归处理子路由
        if (tmpRoute.children) {
          tmpRoute.children = filterAsyncRoutes(tmpRoute.children, roles);
        }
        asyncRoutes.push(tmpRoute);
      }
    });
    
    console.log('过滤后的路由:', asyncRoutes);
    return asyncRoutes;
  }
});

// 为了让自定义过滤函数能递归调用自己
function filterAsyncRoutes(routes: RouteRecordRaw[], roles: string[]): RouteRecordRaw[] {
  return routes; // 简化版，实际会递归处理
}

// ============================================
// 场景 3：在应用中使用权限 Store
// ============================================

function applicationUsageExample() {
  const permissionStore = useBasicPermissionStore();
  
  // ============================================
  // 生成路由
  // ============================================
  
  async function setupRoutes() {
    try {
      // 根据用户角色生成路由
      const roles = ['admin', 'user']; // 通常从 userStore 获取
      const accessRoutes = await permissionStore.generateRoutes(roles);
      
      console.log('生成的路由:', accessRoutes);
      
      // 将路由添加到 Vue Router（实际项目中）
      // accessRoutes.forEach(route => {
      //   router.addRoute(route);
      // });
      
      // 设置侧边栏菜单等
      console.log('侧边栏菜单:', permissionStore.routes);
      
    } catch (error) {
      console.error('生成路由失败:', error);
    }
  }
  
  // ============================================
  // 手动设置路由
  // ============================================
  
  function manualSetRoutes() {
    const customRoutes: RouteRecordRaw[] = [
      {
        path: '/custom',
        name: 'Custom',
        component: () => import('@/views/custom/index.vue'),
        meta: { title: '自定义页面' }
      }
    ];
    
    permissionStore.setRoutes(customRoutes);
    console.log('手动设置的路由:', permissionStore.routes);
  }
  
  // ============================================
  // 设置混合模式左侧菜单
  // ============================================
  
  function setMixMenus() {
    // 当点击顶部菜单时，设置对应的左侧菜单
    permissionStore.setMixLeftMenus('/system');
    console.log('混合模式左侧菜单:', permissionStore.mixLeftMenus);
  }
  
  // ============================================
  // 从父应用路由数据生成
  // ============================================
  
  function generateFromParent() {
    const parentRoutesData = [
      {
        path: '/parent-dashboard',
        name: 'ParentDashboard',
        component: '/dashboard/index.vue',
        meta: { title: '父应用仪表盘' }
      }
    ];
    
    const routes = permissionStore.generateRoutesFromParentData(parentRoutesData);
    console.log('从父应用数据生成的路由:', routes);
  }
  
  // ============================================
  // 合并路由
  // ============================================
  
  function mergeRoutesExample() {
    const staticRoutes: RouteRecordRaw[] = [
      { path: '/static', name: 'Static', component: () => null }
    ];
    
    const dynamicRoutes: RouteRecordRaw[] = [
      { path: '/dynamic', name: 'Dynamic', component: () => null }
    ];
    
    const merged = permissionStore.mergeRoutes(staticRoutes, dynamicRoutes);
    console.log('合并后的路由:', merged);
  }
  
  // ============================================
  // 运行示例
  // ============================================
  
  // setupRoutes();
  // manualSetRoutes();
  // setMixMenus();
  // generateFromParent();
  // mergeRoutesExample();
}

// ============================================
// 场景 4：与用户 Store 配合使用
// ============================================

function combinedUsageExample() {
  // 假设已经有 userStore
  // const userStore = useUserStore();
  const permissionStore = useBasicPermissionStore();
  
  async function initApp() {
    try {
      // 1. 获取用户信息和角色
      // await userStore.getUserInfo();
      // const roles = userStore.user.roles;
      
      const roles = ['admin']; // 模拟
      
      // 2. 根据角色生成路由
      const accessRoutes = await permissionStore.generateRoutes(roles);
      
      // 3. 添加到路由器
      // accessRoutes.forEach(route => router.addRoute(route));
      
      console.log('应用初始化完成，路由已加载');
      
    } catch (error) {
      console.error('应用初始化失败:', error);
    }
  }
  
  // initApp();
}

console.log('权限 Store 示例已加载');
