/**
 * 示例 3：用户 Store 使用
 * 
 * 展示如何创建和使用用户 Store
 */

import { createUserStore } from '@structure/wujie-subapp';
import { defineStore } from 'pinia';

// ============================================
// 模拟 API 函数（实际项目中从您的 API 模块导入）
// ============================================

const mockAuthApi = {
  /**
   * 模拟登录 API
   */
  login: async (loginData: { username: string; password: string }) => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      data: {
        accessToken: 'mock-token-12345',
        hasOrganization: true
      }
    };
  },
  
  /**
   * 模拟登出 API
   */
  logout: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: true };
  },
  
  /**
   * 模拟获取组织列表 API
   */
  getOrganizations: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      data: [
        { id: 1, name: '组织 A' },
        { id: 2, name: '组织 B' },
        { id: 3, name: '组织 C' }
      ]
    };
  }
};

const mockUserApi = {
  /**
   * 模拟获取用户信息 API
   */
  getUserInfo: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      data: {
        id: 1,
        username: 'admin',
        nickname: '管理员',
        avatar: 'https://example.com/avatar.png',
        roles: ['admin', 'user'],
        perms: ['read', 'write', 'delete']
      }
    };
  }
};

// ============================================
// 场景 1：基础用户 Store 创建
// ============================================

export const useBasicUserStore = createUserStore({
  getUserInfoApi: mockUserApi.getUserInfo,
  loginApi: mockAuthApi.login,
  logoutApi: mockAuthApi.logout,
  getOrganizationsApi: mockAuthApi.getOrganizations
});

// ============================================
// 场景 2：带自定义处理的用户 Store
// ============================================

export const useCustomUserStore = createUserStore({
  // 自定义登录 API 包装
  loginApi: async (loginData: any) => {
    console.log('开始登录...', loginData.username);
    
    // 可以做一些预处理，比如密码加密
    const encryptedData = {
      ...loginData,
      password: btoa(loginData.password) // 简单的 base64 编码示例
    };
    
    try {
      const response = await mockAuthApi.login(encryptedData);
      console.log('登录成功！');
      return response;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  },
  
  getUserInfoApi: mockUserApi.getUserInfo,
  logoutApi: async () => {
    console.log('正在登出...');
    const response = await mockAuthApi.logout();
    console.log('登出成功');
    return response;
  },
  getOrganizationsApi: mockAuthApi.getOrganizations
});

// ============================================
// 场景 3：在组件中使用用户 Store
// ============================================

/**
 * 模拟在 Vue 组件中使用的示例
 */
function componentUsageExample() {
  // 在 Vue 组件的 setup() 中：
  const userStore = useBasicUserStore();
  
  // ============================================
  // 使用属性
  // ============================================
  
  console.log('用户信息:', userStore.user);
  console.log('组织列表:', userStore.organizations);
  console.log('是否需要选择组织:', userStore.needSelectOrg);
  console.log('选中的组织 ID:', userStore.selectedOrgId);
  console.log('是否是无组织用户:', userStore.isOrglessUser);
  
  // ============================================
  // 使用方法
  // ============================================
  
  // 1. 登录
  async function handleLogin() {
    try {
      const result = await userStore.login({
        username: 'admin',
        password: 'password'
      });
      
      console.log('登录结果:', result);
      
      if (result.needSelectOrg) {
        console.log('需要选择组织');
      }
    } catch (error) {
      console.error('登录失败:', error);
    }
  }
  
  // 2. 获取用户信息
  async function handleGetUserInfo() {
    try {
      const userInfo = await userStore.getUserInfo();
      console.log('用户信息:', userInfo);
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  }
  
  // 3. 选择组织
  function handleSelectOrg(orgId: number) {
    userStore.selectOrg(orgId);
    console.log('已选择组织:', orgId);
  }
  
  // 4. 初始化无组织用户
  async function handleInitOrglessUser() {
    try {
      const userInfo = await userStore.initOrglessUser();
      console.log('无组织用户初始化:', userInfo);
    } catch (error) {
      console.error('初始化失败:', error);
    }
  }
  
  // 5. 登出
  async function handleLogout() {
    try {
      await userStore.logout();
      console.log('已登出');
    } catch (error) {
      console.error('登出失败:', error);
    }
  }
  
  // ============================================
  // 执行示例
  // ============================================
  
  handleLogin();
  // handleGetUserInfo();
  // handleSelectOrg(1);
  // handleInitOrglessUser();
  // handleLogout();
}

// ============================================
// 场景 4：扩展用户 Store
// ============================================

// 您可以基于 createUserStore 创建一个扩展的 Store
export const useExtendedUserStore = (() => {
  // 先创建基础 Store
  const baseStore = createUserStore({
    getUserInfoApi: mockUserApi.getUserInfo,
    loginApi: mockAuthApi.login,
    logoutApi: mockAuthApi.logout
  });
  
  // 然后在它基础上扩展
  return defineStore('extended-user', () => {
    const base = baseStore();
    
    // 添加自定义状态
    const customStatus = ref('idle');
    const lastActivityTime = ref(Date.now());
    
    // 添加自定义方法
    function setCustomStatus(status: string) {
      customStatus.value = status;
      lastActivityTime.value = Date.now();
    }
    
    function resetCustomState() {
      customStatus.value = 'idle';
    }
    
    // 包装原有方法
    async function customLogin(loginData: any) {
      setCustomStatus('logging-in');
      try {
        await base.login(loginData);
        setCustomStatus('logged-in');
      } catch (error) {
        setCustomStatus('error');
        throw error;
      }
    }
    
    return {
      // 展开基础 Store 的所有内容
      ...base,
      // 自定义内容
      customStatus,
      lastActivityTime,
      setCustomStatus,
      resetCustomState,
      customLogin
    };
  });
})();

// 导入 ref 用于上面的示例
import { ref } from 'vue';

// ============================================
// 运行示例
// ============================================

console.log('用户 Store 示例已加载');
// 取消下面的注释来运行示例
// componentUsageExample();
