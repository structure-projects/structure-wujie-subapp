# @structure/wujie-subapp

通用的无界微前端子应用接入库，让您的项目快速接入无界微前端架构。

---

## 目录

- [为什么需要这个库？](#为什么需要这个库)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [详细配置说明](#详细配置说明)
- [完整使用案例](#完整使用案例)
- [API 参考](#api-参考)
- [常见问题](#常见问题)

---

## 为什么需要这个库？

在开发无界微前端子应用时，您通常需要处理以下问题：

### 1. 数据同步问题
- ✅ Token 从父应用传递到子应用
- ✅ 用户信息同步
- ✅ 组织信息同步
- ✅ 主题、语言等全局状态同步

### 2. 路由管理问题
- ✅ 子应用如何继承父应用的路由
- ✅ 路由守卫如何统一管理
- ✅ 权限验证如何协调

### 3. 状态管理问题
- ✅ Pinia store 如何与父应用数据配合
- ✅ 独立运行和子应用模式如何切换

### 4. 重复代码问题
每个子应用都要写同样的逻辑，维护成本高。

**这个库解决了所有这些问题！**

---

## 快速开始

### 第一步：安装

```bash
npm install @structure/wujie-subapp
```

### 第二步：在 main.ts 中初始化

```typescript
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import { createWujieSubapp } from '@structure/wujie-subapp'

// 创建无界子应用实例
const wujie = createWujieSubapp({
  // 可选配置，后面会详细讲解
  storage: {
    tokenKey: 'accessToken'
  }
})

// 初始化
const data = wujie.init()
console.log('从父应用获取的数据:', data)

// 创建 Vue 应用
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
```

### 第三步：创建用户 Store

```typescript
// src/store/user.ts
import { store } from '@/store'
import { createUserStore } from '@structure/wujie-subapp'
import { 
  loginApi, 
  logoutApi, 
  getOrganizationsApi 
} from '@/api/auth'
import { getUserInfoApi } from '@/api/system/user'

/**
 * 创建用户 Store
 * 
 * 作用：
 * 1. 管理用户信息（用户名、头像、角色等）
 * 2. 处理登录/登出逻辑
 * 3. 管理组织选择
 * 4. 在子应用模式下，从 localStorage 读取父应用同步的数据
 * 5. 在独立模式下，从 API 获取数据
 */
export const useUserStore = createUserStore({
  // API 配置
  getUserInfoApi,      // 获取用户信息的 API
  loginApi,            // 登录 API
  logoutApi,           // 登出 API
  getOrganizationsApi  // 获取组织列表的 API
})

export function useUserStoreHook() {
  return useUserStore(store)
}
```

### 第四步：创建权限 Store

```typescript
// src/store/permission.ts
import { store } from '@/store'
import { createPermissionStore } from '@structure/wujie-subapp'
import { constantRoutes } from '@/router'
import { listRoutesApi } from '@/api/system/menu'
import Layout from '@/layout/index.vue'

// 动态导入所有页面组件
const modules = import.meta.glob('../../views/**/**.vue')

/**
 * 创建权限 Store
 * 
 * 作用：
 * 1. 管理路由配置
 * 2. 根据用户角色过滤路由
 * 3. 在子应用模式下，从父应用继承路由
 * 4. 在独立模式下，从 API 获取路由
 */
export const usePermissionStore = createPermissionStore({
  constantRoutes,  // 静态路由（登录页、404等）
  listRoutesApi,   // 获取动态路由的 API
  modules,         // 组件模块映射
  Layout           // 布局组件
})

export function usePermissionStoreHook() {
  return usePermissionStore(store)
}
```

### 第五步：配置路由守卫

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuard } from '@structure/wujie-subapp'
import { useUserStore } from '@/store/user'
import { usePermissionStore } from '@/store/permission'
import NProgress from '@/utils/nprogress'
import { constantRoutes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_PUBLIC_PATH),
  routes: constantRoutes
})

/**
 * 设置路由守卫
 * 
 * 作用：
 * 1. 检查用户是否登录
 * 2. 检查用户是否有权限访问路由
 * 3. 动态添加路由
 * 4. 处理进度条显示
 */
setupRouterGuard({
  router,
  
  // 获取 Store 的函数
  getUserStore: () => useUserStore(),
  getPermissionStore: () => usePermissionStore(),
  
  // 生成路由的函数
  generateRoutes: async (roles) => {
    const permissionStore = usePermissionStore()
    return permissionStore.generateRoutes(roles)
  },
  
  // 自定义钩子
  onBeforeEach: () => {
    NProgress.start()  // 开始进度条
  },
  onAfterEach: () => {
    NProgress.done()   // 结束进度条
  }
})

export default router
```

**完成！** 现在您的项目已经成功接入无界微前端了。

---

## 核心概念

### 两种运行模式

库会自动检测当前运行模式：

#### 1. 子应用模式（在无界容器中）
- **数据来源**：从父应用的 props 或 event bus 获取
- **路由来源**：从父应用传递的路由数据生成
- **用户信息**：从 localStorage 读取（父应用同步过来的）

#### 2. 独立模式（单独运行）
- **数据来源**：从后端 API 获取
- **路由来源**：从后端 API 获取
- **用户信息**：正常登录流程

### 数据流向

```
父应用
  ↓ (props 或 event bus)
子应用库
  ↓ (localStorage)
Pinia Store
  ↓
Vue 组件
```

### 核心类

| 类名 | 作用 |
|------|------|
| `WujieSubapp` | 主入口，整合所有功能 |
| `StorageManager` | 管理 localStorage 读写 |
| `DataSyncManager` | 管理与父应用的数据同步 |
| `RouteGenerator` | 生成路由配置 |

---

## 详细配置说明

### createWujieSubapp(config) 配置

完整的配置示例：

```typescript
import { createWujieSubapp } from '@structure/wujie-subapp'

const wujie = createWujieSubapp({
  // ============================================
  // 存储配置
  // ============================================
  storage: {
    // Token 的存储键名
    tokenKey: 'accessToken',
    
    // 用户信息的存储键名
    userInfoKey: 'userInfo',
    
    // 组织信息的存储键名
    orgInfoKey: 'orgInfo',
    
    // 主题的存储键名
    themeKey: 'theme',
    
    // 语言的存储键名
    languageKey: 'language',
    
    // 父应用路由的存储键名
    routesKey: 'parentRoutes',
    
    // 无组织用户标识的存储键名
    isOrglessUserKey: 'isOrglessUser',
    
    // 用户角色的存储键名
    userRolesKey: 'userRoles',
    
    // 用户权限的存储键名
    userPermsKey: 'userPerms'
  },
  
  // ============================================
  // 数据同步配置
  // ============================================
  sync: {
    // 是否自动同步到 localStorage（默认 true）
    autoSyncToStorage: true,
    
    // 是否自动从父应用同步数据（默认 true）
    autoSyncFromParent: true,
    
    // 是否启用 event bus 监听（默认 true）
    enableEventBus: true,
    
    // 事件名称（默认 'wujie-data'）
    eventName: 'wujie-data'
  },
  
  // ============================================
  // 路由配置
  // ============================================
  router: {
    // 白名单路由（不需要登录就能访问）
    whiteList: [
      '/login',
      '/login/ram',
      '/login/account',
      '/login/phone',
      '/login/qrcode',
      '/login/org-select',
      '/register'
    ],
    
    // 是否自动生成路由（默认 true）
    autoGenerateRoutes: true,
    
    // 必需的路由（始终保留）
    essentialRoutes: [
      '/login',
      '/register',
      '/redirect',
      '/401',
      '/404'
    ]
  },
  
  // ============================================
  // 自定义数据处理钩子
  // ============================================
  customDataHandlers: {
    /**
     * 收到数据时触发
     * @param data 从父应用收到的数据
     */
    onDataReceived: (data) => {
      console.log('收到父应用数据:', data)
      
      // 可以在这里做一些自定义处理
      if (data.theme) {
        // 例如：应用主题
        document.documentElement.setAttribute('data-theme', data.theme)
      }
      
      if (data.language) {
        // 例如：切换语言
        // i18n.global.locale.value = data.language
      }
    },
    
    /**
     * 数据变化时触发
     * @param oldData 旧数据
     * @param newData 新数据
     */
    onDataChanged: (oldData, newData) => {
      console.log('数据变化:', { oldData, newData })
      
      // 检查 token 是否变化
      if (oldData.token !== newData.token) {
        if (newData.token) {
          console.log('用户已登录')
        } else {
          console.log('用户已登出')
        }
      }
    }
  }
})

// 初始化
wujie.init()
```

### createUserStore(options) 配置

```typescript
import { createUserStore } from '@structure/wujie-subapp'

export const useUserStore = createUserStore({
  // ============================================
  // 存储管理器（可选，通常不需要自定义）
  // ============================================
  storageManager: customStorageManager,
  
  // ============================================
  // API 函数配置
  // ============================================
  
  /**
   * 获取用户信息的 API
   * 必需，除非只在子应用模式下运行
   */
  getUserInfoApi: async () => {
    const response = await axios.get('/api/user/info')
    return response
  },
  
  /**
   * 登录 API
   * 必需，除非只在子应用模式下运行
   */
  loginApi: async (loginData) => {
    // 可以在这里做一些预处理，比如密码加密
    const encryptedData = {
      ...loginData,
      password: md5(loginData.password)
    }
    const response = await axios.post('/api/auth/login', encryptedData)
    return response
  },
  
  /**
   * 登出 API
   * 可选
   */
  logoutApi: async () => {
    await axios.post('/api/auth/logout')
  },
  
  /**
   * 获取组织列表的 API
   * 可选
   */
  getOrganizationsApi: async () => {
    const response = await axios.get('/api/organizations')
    return response
  }
})
```

### createPermissionStore(options) 配置

```typescript
import { createPermissionStore } from '@structure/wujie-subapp'

export const usePermissionStore = createPermissionStore({
  // ============================================
  // 基础配置
  // ============================================
  storageManager: customStorageManager,
  routeGenerator: customRouteGenerator,
  routerConfig: {
    whiteList: ['/login'],
    autoGenerateRoutes: true
  },
  
  // ============================================
  // 路由相关配置
  // ============================================
  
  /**
   * 静态路由
   * 必需，包含登录页、404等基础路由
   */
  constantRoutes: [
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
    }
  ],
  
  /**
   * 获取动态路由的 API
   * 必需，除非只在子应用模式下运行
   */
  listRoutesApi: async () => {
    const response = await axios.get('/api/menu/routes')
    return response
  },
  
  // ============================================
  // 组件相关配置
  // ============================================
  
  /**
   * 组件模块映射
   * 必需，用于动态加载路由组件
   * 
   * 示例格式：
   * {
   *   '../../views/dashboard/index.vue': () => import('...'),
   *   '../../views/user/index.vue': () => import('...')
   * }
   */
  modules: import.meta.glob('../../views/**/**.vue'),
  
  /**
   * 布局组件
   * 必需，用于包裹页面内容
   */
  Layout: () => import('@/layout/index.vue'),
  
  /**
   * 占位组件
   * 可选，当组件加载失败时显示
   */
  PlaceholderComponent: () => import('@/views/placeholder/index.vue'),
  
  // ============================================
  // 自定义权限逻辑
  // ============================================
  
  /**
   * 自定义权限检查函数
   * 可选，默认实现是检查 route.meta.roles 是否包含用户角色
   */
  hasPermission: (roles, route) => {
    if (route.meta && route.meta.roles) {
      // 管理员拥有所有权限
      if (roles.includes('admin')) {
        return true
      }
      // 检查用户是否拥有路由要求的任一角色
      return roles.some(role => route.meta!.roles!.includes(role))
    }
    // 没有配置 roles 的路由默认允许访问
    return true
  },
  
  /**
   * 自定义路由过滤函数
   * 可选，默认实现是递归过滤有权限的路由
   */
  filterAsyncRoutes: (routes, roles) => {
    const asyncRoutes = []
    routes.forEach(route => {
      const tmpRoute = { ...route }
      if (hasPermission(roles, tmpRoute)) {
        if (tmpRoute.children) {
          tmpRoute.children = filterAsyncRoutes(tmpRoute.children, roles)
        }
        asyncRoutes.push(tmpRoute)
      }
    })
    return asyncRoutes
  }
})
```

### setupRouterGuard(options) 配置

```typescript
import { setupRouterGuard } from '@structure/wujie-subapp'

setupRouterGuard({
  // ============================================
  // 必需配置
  // ============================================
  router,  // Vue Router 实例
  
  // ============================================
  // Store 相关
  // ============================================
  
  /**
   * 获取用户 Store 的函数
   * 必需
   */
  getUserStore: () => useUserStore(),
  
  /**
   * 获取权限 Store 的函数
   * 必需
   */
  getPermissionStore: () => usePermissionStore(),
  
  /**
   * 生成路由的函数
   * 必需
   */
  generateRoutes: async (roles) => {
    const permissionStore = usePermissionStore()
    return permissionStore.generateRoutes(roles)
  },
  
  // ============================================
  // 可选配置
  // ============================================
  config: {
    whiteList: ['/login', '/register'],
    autoGenerateRoutes: true
  },
  
  storageManager: customStorageManager,
  
  // ============================================
  // 生命周期钩子
  // ============================================
  
  /**
   * 路由跳转前触发
   * 可选
   */
  onBeforeEach: (to, from, next) => {
    console.log('准备跳转:', from.path, '→', to.path)
    NProgress.start()
    // 注意：如果提供了这个函数，需要手动调用 next()
    // 或者不提供，让库自动处理
  },
  
  /**
   * 路由跳转后触发
   * 可选
   */
  onAfterEach: (to, from) => {
    console.log('跳转完成:', from.path, '→', to.path)
    NProgress.done()
  }
})
```

---

## 完整使用案例

### 案例 1：最简单的接入（仅子应用模式）

如果您的应用只作为子应用运行，不需要独立运行：

```typescript
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createWujieSubapp } from '@structure/wujie-subapp'

createWujieSubapp().init()

createApp(App).use(router).mount('#app')
```

### 案例 2：完整的企业级应用

```typescript
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createI18n } from 'vue-i18n'
import { createWujieSubapp } from '@structure/wujie-subapp'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import messages from './locales'

// 创建 i18n 实例
const i18n = createI18n({
  legacy: false,
  locale: 'zh-cn',
  fallbackLocale: 'zh-cn',
  messages
})

// 创建无界子应用
const wujie = createWujieSubapp({
  storage: {
    tokenKey: 'accessToken',
    userInfoKey: 'userInfo',
    orgInfoKey: 'orgInfo',
    themeKey: 'theme',
    languageKey: 'language'
  },
  customDataHandlers: {
    onDataReceived: (data) => {
      // 应用主题
      if (data.theme) {
        document.documentElement.setAttribute('data-theme', data.theme)
      }
      // 切换语言
      if (data.language) {
        i18n.global.locale.value = data.language
      }
    },
    onDataChanged: (oldData, newData) => {
      // 监听用户信息变化
      if (JSON.stringify(oldData.userInfo) !== JSON.stringify(newData.userInfo)) {
        console.log('用户信息已更新')
      }
    }
  }
})

// 初始化
const initData = wujie.init()
console.log('初始化数据:', initData)

// 创建应用
const app = createApp(App)
const pinia = createPinia()

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用插件
app.use(pinia)
app.use(router)
app.use(i18n)
app.use(ElementPlus, {
  locale: initData.language === 'en' ? en : zhCn
})

// 挂载
app.mount('#app')
```

### 案例 3：在组件中使用

```vue
<template>
  <div class="user-profile">
    <!-- 用户信息 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户信息</span>
          <el-tag v-if="isSubApp" type="success">子应用模式</el-tag>
          <el-tag v-else type="info">独立模式</el-tag>
        </div>
      </template>
      
      <div v-if="userStore.user">
        <p>用户名: {{ userStore.user.username }}</p>
        <p>昵称: {{ userStore.user.nickname }}</p>
        <p>角色: {{ userStore.user.roles?.join(', ') }}</p>
      </div>
      
      <el-button type="primary" @click="handleGetUserInfo">
        刷新用户信息
      </el-button>
    </el-card>
    
    <!-- 组织选择 -->
    <el-card v-if="!userStore.isOrglessUser" style="margin-top: 20px;">
      <template #header>
        <span>组织列表</span>
      </template>
      
      <el-select 
        v-model="selectedOrgId" 
        placeholder="请选择组织"
        @change="handleSelectOrg"
      >
        <el-option
          v-for="org in userStore.organizations"
          :key="org.id"
          :label="org.name"
          :value="org.id"
        />
      </el-select>
    </el-card>
    
    <!-- 登出按钮 -->
    <el-button 
      type="danger" 
      style="margin-top: 20px;"
      @click="handleLogout"
    >
      退出登录
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserStoreHook } from '@/store/user'
import { isWujieSubApp } from '@structure/wujie-subapp'

// 获取用户 Store
const userStore = useUserStoreHook()

// 判断是否在子应用模式
const isSubApp = computed(() => isWujieSubApp())

// 选中的组织 ID
const selectedOrgId = computed({
  get: () => userStore.selectedOrgId,
  set: (value) => userStore.selectOrg(value)
})

// 获取用户信息
const handleGetUserInfo = async () => {
  try {
    await userStore.getUserInfo()
    console.log('用户信息:', userStore.user)
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

// 选择组织
const handleSelectOrg = async (orgId: string | number) => {
  userStore.selectOrg(orgId)
  // 选择组织后可能需要重新获取用户信息
  await userStore.getUserInfo()
}

// 登出
const handleLogout = async () => {
  try {
    await userStore.logout()
    // 跳转到登录页
    window.location.href = '/login'
  } catch (error) {
    console.error('登出失败:', error)
  }
}

// 组件挂载时初始化
onMounted(() => {
  // 如果用户信息不存在，尝试获取
  if (!userStore.user.username) {
    handleGetUserInfo()
  }
})
</script>
```

### 案例 4：父应用如何传递数据

如果您在开发父应用，需要这样传递数据给子应用：

```vue
<template>
  <div class="main-app">
    <!-- 使用 wujie-vue3 组件加载子应用 -->
    <wujie-vue3
      name="structure-iam"
      :url="subAppUrl"
      :props="wujieProps"
      @data-change="handleDataChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import WujieVue3 from 'wujie-vue3'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

// 子应用地址
const subAppUrl = ref('http://localhost:5173')

// 传递给子应用的数据
const wujieProps = computed(() => ({
  data: {
    // Token
    token: userStore.token,
    
    // 用户信息
    userInfo: userStore.user,
    
    // 组织信息
    orgInfo: userStore.orgInfo,
    
    // 主题
    theme: 'light',
    
    // 语言
    language: 'zh-cn',
    
    // 路由（可选，如果需要子应用继承父应用的路由）
    routes: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: '/dashboard/index.vue',
        meta: { title: '仪表盘', icon: 'dashboard' }
      }
    ],
    
    // 是否是无组织用户
    isOrglessUser: userStore.isOrglessUser
  },
  
  // 子应用数据变化回调
  onDataChange: (data: any) => {
    console.log('子应用数据变化:', data)
  }
}))

// 监听数据变化，通过 event bus 通知子应用
watch(wujieProps, (newProps) => {
  if (window.__WUJIE?.bus) {
    window.__WUJIE.bus.$emit('wujie-data', newProps.data)
  }
}, { deep: true })

// 处理子应用的数据变化
const handleDataChange = (data: any) => {
  console.log('收到子应用数据:', data)
  // 可以在这里更新父应用的状态
}
</script>
```

---

## API 参考

### WujieSubapp 类

```typescript
class WujieSubapp {
  constructor(config?: WujieSubappConfig)
  
  /**
   * 初始化子应用
   * @returns 从父应用获取的初始数据
   */
  init(): WujieData
  
  /**
   * 获取当前数据
   */
  getData(): WujieData
  
  /**
   * 向父应用发送数据
   */
  emitData(data: Partial<WujieData>): void
  
  /**
   * 销毁实例，清理事件监听器
   */
  destroy(): void
  
  /**
   * 是否在子应用模式
   */
  get isSubApp(): boolean
  
  /**
   * 存储管理器
   */
  get storageManager(): StorageManager
  
  /**
   * 数据同步管理器
   */
  get dataSyncManager(): DataSyncManager
  
  /**
   * 路由生成器
   */
  get routeGenerator(): RouteGenerator
}
```

### StorageManager 类

```typescript
class StorageManager {
  constructor(config?: StorageConfig)
  
  /**
   * 存储数据
   */
  setItem(key: string, value: any): void
  
  /**
   * 获取数据
   */
  getItem<T = any>(key: string): T | null
  
  /**
   * 删除数据
   */
  removeItem(key: string): void
  
  /**
   * 同步 WujieData 到 localStorage
   */
  syncDataToStorage(data: WujieData): void
  
  /**
   * 从 localStorage 恢复 WujieData
   */
  restoreDataFromStorage(): Partial<WujieData>
  
  /**
   * 清空所有相关数据
   */
  clearAll(): void
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<StorageConfig>): void
  
  /**
   * 获取当前配置
   */
  getConfig(): StorageConfig
}
```

### useUserStore 的属性和方法

```typescript
const userStore = useUserStore()

// 属性
userStore.user              // 用户信息对象
userStore.organizations     // 组织列表
userStore.needSelectOrg     // 是否需要选择组织
userStore.selectedOrgId     // 选中的组织 ID
userStore.isOrglessUser     // 是否是无组织用户

// 方法
userStore.initFromLocalStorage()           // 从 localStorage 初始化
userStore.setToken(token: string)          // 设置 Token
userStore.saveOrglessState()               // 保存无组织用户状态
userStore.clearOrglessState()              // 清除无组织用户状态
userStore.restoreOrglessState()            // 恢复无组织用户状态
userStore.clearUserInfo()                  // 清除用户信息
userStore.login(loginData)                 // 登录
userStore.selectOrg(orgId)                 // 选择组织
userStore.initOrglessUser()                // 初始化为无组织用户
userStore.getUserInfo()                    // 获取用户信息
userStore.logout()                         // 登出
userStore.resetToken()                     // 重置 Token
```

### usePermissionStore 的属性和方法

```typescript
const permissionStore = usePermissionStore()

// 属性
permissionStore.routes           // 路由列表
permissionStore.mixLeftMenus     // 混合模式左侧菜单

// 方法
permissionStore.setRoutes(newRoutes)                    // 设置路由
permissionStore.generateRoutes(roles)                   // 生成路由
permissionStore.generateRoutesFromParentData(routes)    // 从父应用数据生成路由
permissionStore.mergeRoutes(staticRoutes, dynamicRoutes) // 合并路由
permissionStore.setMixLeftMenus(topMenuPath)            // 设置混合模式左侧菜单
```

### 工具函数

```typescript
import {
  isWujieSubApp,        // 检查是否在子应用模式
  initWujieEnv,         // 初始化无界环境
  getWujieProps,        // 获取无界 props
  getWujieBus,          // 获取无界 event bus
  createWujieSubapp     // 创建 WujieSubapp 实例
} from '@structure/wujie-subapp'
```

---

## 常见问题

### Q1: 如何判断当前是否在子应用模式？

```typescript
import { isWujieSubApp } from '@structure/wujie-subapp'

if (isWujieSubApp()) {
  console.log('在子应用模式下运行')
} else {
  console.log('在独立模式下运行')
}
```

### Q2: 子应用如何向父应用发送数据？

```typescript
import { createWujieSubapp } from '@structure/wujie-subapp'

const wujie = createWujieSubapp()

// 发送数据
wujie.emitData({
  // 您想传递的数据
  someData: 'value'
})
```

### Q3: 如何自定义组件加载逻辑？

```typescript
import { createPermissionStore } from '@structure/wujie-subapp'

// 在创建 permission store 时配置
export const usePermissionStore = createPermissionStore({
  // ... 其他配置
  routerConfig: {
    loadComponent: (componentPath?: string) => {
      if (!componentPath) {
        return () => import('@/views/placeholder/index.vue')
      }
      
      // 自定义加载逻辑
      try {
        return modules[`../../views/${componentPath}.vue`]
      } catch {
        return () => import('@/views/error-page/404.vue')
      }
    }
  }
})
```

### Q4: Token 过期怎么办？

库本身不处理 Token 刷新逻辑，建议：

1. 在 axios 拦截器中处理 Token 过期
2. 检测到 Token 过期时，调用 `userStore.resetToken()` 清除状态
3. 跳转到登录页（子应用模式下由父应用处理）

```typescript
// axios 拦截器示例
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const userStore = useUserStoreHook()
      userStore.resetToken()
      
      if (!isWujieSubApp()) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
```

### Q5: 如何调试数据同步？

```typescript
const wujie = createWujieSubapp({
  customDataHandlers: {
    onDataReceived: (data) => {
      console.log('[调试] 收到数据:', data)
      debugger  // 可以在这里断点调试
    },
    onDataChanged: (oldData, newData) => {
      console.log('[调试] 数据变化:', { oldData, newData })
    }
  }
})
```

### Q6: 可以同时使用多个子应用吗？

可以，每个子应用独立使用库即可。只需确保：
- 每个子应用有不同的 `name`
- localStorage 的键名如果有冲突，可以通过配置修改

### Q7: 如何清理所有数据？

```typescript
const wujie = createWujieSubapp()
// 清理存储
wujie.storageManager.clearAll()
// 清理事件监听器
wujie.destroy()
```

---

## 项目迁移指南

如果您已有一个项目想迁移到这个库，请查看 [MIGRATION.md](./MIGRATION.md) 文档。

---

## 技术支持

如有问题，请：
1. 查看本文档的常见问题部分
2. 查看源代码中的类型定义（有详细注释）
3. 提交 Issue

---

## License

MIT
