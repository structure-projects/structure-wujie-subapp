# 迁移指南

本文档展示如何将现有的无界微前端子应用迁移到使用 `@structure/wujie-subapp` 库。

## 迁移步骤

### 1. 安装库

```bash
npm install @structure/wujie-subapp
```

### 2. 重构 main.ts

**之前：**

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import router from '@/router'
import { setupStore } from '@/store'
import { setupDirective } from '@/directive'
import { setupElIcons, setupI18n, setupPermission } from '@/plugins'
import axios from 'axios'
import { setupWujie, initWujieCommunication, isWujieSubApp } from '@/utils/wujie'

const initApp = () => {
  const app = createApp(App)
  setupDirective(app)
  setupStore(app)
  setupElIcons(app)
  setupI18n(app)
  setupPermission()
  app.use(ElementPlus)
  app.use(Avue, { axios })
  app.use(router).mount('#app')
}

if (isWujieSubApp()) {
  const wujieData = setupWujie()
  initWujieCommunication(wujieData)
  initApp()
} else {
  initApp()
}

if (window.__POWERED_BY_WUJIE__) {
  const wujie = require('wujie-vue3')
  window.__WUJIE__ = {
    bus: wujie.bus,
    props: window.__WUJIE_PROPS__
  }
}
```

**之后：**

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import router from '@/router'
import { setupStore } from '@/store'
import { setupDirective } from '@/directive'
import { setupElIcons, setupI18n } from '@/plugins'
import axios from 'axios'
import ElementPlus from 'element-plus'
import Avue from '@smallwei/avue'
import { createWujieSubapp } from '@structure/wujie-subapp'

// 初始化无界子应用
const wujie = createWujieSubapp()
wujie.init()

const initApp = () => {
  const app = createApp(App)
  setupDirective(app)
  setupStore(app)
  setupElIcons(app)
  setupI18n(app)
  app.use(ElementPlus)
  app.use(Avue, { axios })
  app.use(router).mount('#app')
}

initApp()
```

### 3. 重构 Store - user.ts

**之前：**

```typescript
import { loginApi, logoutApi, getOrganizationsApi, loginByPhoneApi } from '@/api/auth'
import { resetRouter } from '@/router'
import { store } from '@/store'
import { LoginData } from '@/api/auth/types'
import { UserInfo } from '@/api/system/user/types'
import { getUserInfoApi } from '@/api/system/user'
import { md5 } from '@/utils/crypto'
import { ref } from 'vue'
import { isWujieSubApp } from '@/utils/wujie'
import { defineStore } from 'pinia'

const STORAGE_KEYS = {
  IS_ORGLESS_USER: 'isOrglessUser',
  USER_ROLES: 'userRoles',
  USER_PERMS: 'userPerms'
}

export const useUserStore = defineStore('user', () => {
  const user: UserInfo = {
    roles: [],
    perms: []
  }
  
  const organizations = ref<any[]>([])
  const needSelectOrg = ref(false)
  const selectedOrgId = ref<string | number | null>(null)
  const isOrglessUser = ref(false)

  function initFromLocalStorage() {
    try {
      const userInfoStr = localStorage.getItem('userInfo')
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr)
        Object.assign(user, userInfo)
      }
    } catch (e) {
      console.error('[子应用] 从 localStorage 初始化用户信息失败', e)
    }
  }

  initFromLocalStorage()

  function setToken(token: string) {
    localStorage.setItem('accessToken', 'Bearer ' + token)
  }

  function saveOrglessState() {
    localStorage.setItem(STORAGE_KEYS.IS_ORGLESS_USER, 'true')
    localStorage.setItem(STORAGE_KEYS.USER_ROLES, JSON.stringify(user.roles))
    localStorage.setItem(STORAGE_KEYS.USER_PERMS, JSON.stringify(user.perms))
  }

  function clearOrglessState() {
    localStorage.removeItem(STORAGE_KEYS.IS_ORGLESS_USER)
    localStorage.removeItem(STORAGE_KEYS.USER_ROLES)
    localStorage.removeItem(STORAGE_KEYS.USER_PERMS)
  }

  function restoreOrglessState() {
    const isOrgless = localStorage.getItem(STORAGE_KEYS.IS_ORGLESS_USER) === 'true'
    if (isOrgless) {
      isOrglessUser.value = true
      try {
        const roles = localStorage.getItem(STORAGE_KEYS.USER_ROLES)
        const perms = localStorage.getItem(STORAGE_KEYS.USER_PERMS)
        if (roles) user.roles = JSON.parse(roles)
        if (perms) user.perms = JSON.parse(perms)
      } catch (e) {
        console.error('Failed to restore orgless state', e)
      }
    }
  }

  function clearUserInfo() {
    user.username = ''
    user.nickname = ''
    user.avatar = ''
    user.roles = []
    user.perms = []
    user.phone = ''
    user.email = ''
    user.remark = ''
  }

  function login(loginData: LoginData) {
    return new Promise<{ needSelectOrg: boolean; hasOrganization: boolean }>((resolve, reject) => {
      const encryptedData: LoginData = {
        ...loginData,
        password: md5(loginData.password)
      }
      loginApi(encryptedData)
        .then((response) => {
          const data = response.data as any
          setToken(data.accessToken)
          
          if (data.hasOrganization === false) {
            isOrglessUser.value = true
            needSelectOrg.value = false
            organizations.value = []
            resolve({ needSelectOrg: false, hasOrganization: false })
          } else {
            isOrglessUser.value = false
            clearOrglessState()
            getOrganizationsApi()
              .then((orgRes) => {
                organizations.value = orgRes.data || []
                if (organizations.value.length > 0) {
                  needSelectOrg.value = true
                  resolve({ needSelectOrg: true, hasOrganization: true })
                } else {
                  needSelectOrg.value = false
                  resolve({ needSelectOrg: false, hasOrganization: true })
                }
              })
              .catch(() => {
                needSelectOrg.value = false
                resolve({ needSelectOrg: false, hasOrganization: true })
              })
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  function getUserInfo() {
    return new Promise<UserInfo>((resolve, reject) => {
      if (isWujieSubApp()) {
        try {
          const userInfoStr = localStorage.getItem('userInfo')
          if (userInfoStr) {
            const data = JSON.parse(userInfoStr)
            if (!data.roles || data.roles.length <= 0) {
              reject('getUserInfo: roles must be a non-null array!')
              return
            }
            Object.assign(user, { ...data })
            
            const hasOrgInfo = !!localStorage.getItem('orgInfo')
            const isRootUser = data.roles.includes('ROOT')
            
            if (isRootUser && !hasOrgInfo) {
              isOrglessUser.value = true
              saveOrglessState()
            } else {
              isOrglessUser.value = false
              clearOrglessState()
            }
            
            resolve(data)
            return
          }
        } catch (e) {
          console.error('[子应用] 从 localStorage 获取用户信息失败', e)
        }
      }
      
      getUserInfoApi()
        .then((response) => {
          const data = response.data
          if (!data) {
            reject('Verification failed, please Login again.')
            return
          }
          if (!data.roles || data.roles.length <= 0) {
            reject('getUserInfo: roles must be a non-null array!')
            return
          }
          Object.assign(user, { ...data })
          
          const hasOrgInfo = !!localStorage.getItem('orgInfo')
          const isRootUser = data.roles.includes('ROOT')
          
          if (isRootUser && !hasOrgInfo) {
            isOrglessUser.value = true
            saveOrglessState()
          } else {
            isOrglessUser.value = false
            clearOrglessState()
          }
          
          resolve(data)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  function logout() {
    return new Promise<void>((resolve, reject) => {
      logoutApi()
        .then(() => {
          localStorage.setItem('accessToken', '')
          localStorage.removeItem('selectedOrgId')
          localStorage.removeItem('orgInfo')
          clearOrglessState()
          clearUserInfo()
          organizations.value = []
          needSelectOrg.value = false
          selectedOrgId.value = null
          isOrglessUser.value = false
          location.reload()
          resolve()
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  function resetToken() {
    return new Promise<void>((resolve) => {
      localStorage.setItem('accessToken', '')
      localStorage.removeItem('selectedOrgId')
      localStorage.removeItem('orgInfo')
      clearOrglessState()
      clearUserInfo()
      resetRouter()
      resolve()
    })
  }

  return {
    user,
    organizations,
    needSelectOrg,
    selectedOrgId,
    isOrglessUser,
    restoreOrglessState,
    clearOrglessState,
    clearUserInfo,
    login,
    loginByPhone,
    selectOrg,
    selectOrgAndInit,
    initOrglessUser,
    getUserInfo,
    logout,
    resetToken
  }
})

export function useUserStoreHook() {
  return useUserStore(store)
}
```

**之后：**

```typescript
import { store } from '@/store'
import { createUserStore } from '@structure/wujie-subapp'
import { loginApi, logoutApi, getOrganizationsApi } from '@/api/auth'
import { getUserInfoApi } from '@/api/system/user'

export const useUserStore = createUserStore({
  getUserInfoApi,
  loginApi: async (loginData) => {
    // 保持原有的密码加密逻辑
    const { md5 } = await import('@/utils/crypto')
    const encryptedData = {
      ...loginData,
      password: md5(loginData.password)
    }
    return loginApi(encryptedData)
  },
  logoutApi,
  getOrganizationsApi
})

export function useUserStoreHook() {
  return useUserStore(store)
}
```

### 4. 重构 Store - permission.ts

**之前（简化）：**

```typescript
import { RouteRecordRaw } from 'vue-router'
import { constantRoutes } from '@/router'
import { store } from '@/store'
import { listRoutesApi } from '@/api/system/menu'
import { isWujieSubApp } from '@/utils/wujie'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const modules = import.meta.glob('../../views/**/**.vue')
const Layout = () => import('@/layout/index.vue')
const PlaceholderComponent = () => import('@/views/placeholder/index.vue')

export const usePermissionStore = defineStore('permission', () => {
  const routes = ref<RouteRecordRaw[]>([])
  
  // ... 大量的路由生成逻辑
  
  return {
    routes,
    generateRoutes,
    // ... 其他方法
  }
})
```

**之后：**

```typescript
import { store } from '@/store'
import { createPermissionStore } from '@structure/wujie-subapp'
import { constantRoutes } from '@/router'
import { listRoutesApi } from '@/api/system/menu'
import Layout from '@/layout/index.vue'

const modules = import.meta.glob('../../views/**/**.vue')

export const usePermissionStore = createPermissionStore({
  constantRoutes,
  listRoutesApi,
  modules,
  Layout
})

export function usePermissionStoreHook() {
  return usePermissionStore(store)
}
```

### 5. 重构路由守卫

**之前：**

```typescript
import router from '@/router'
import { useUserStore, usePermissionStore } from '@/store'
import NProgress from '@/utils/nprogress'
import { RouteRecordRaw } from 'vue-router'
import { isWujieSubApp } from '@/utils/wujie'

const STORAGE_KEYS = {
  IS_ORGLESS_USER: 'isOrglessUser',
  USER_ROLES: 'userRoles',
  USER_PERMS: 'userPerms'
}

function tryInitUserFromLocalStorage(userStore: any) {
  // ... 初始化逻辑
}

export function setupPermission() {
  const whiteList = ['/login', '/login/ram', '/login/account', '/login/phone', '/login/qrcode', '/login/org-select', '/register']

  router.beforeEach(async (to, from, next) => {
    NProgress.start()
    const hasToken = localStorage.getItem('accessToken')
    const hasOrgInfo = localStorage.getItem('orgInfo')
    const switchingOrg = localStorage.getItem('switchingOrg') === 'true'
    const isOrglessFromStorage = localStorage.getItem(STORAGE_KEYS.IS_ORGLESS_USER) === 'true'
    const isSubApp = isWujieSubApp()
    
    // ... 大量的路由守卫逻辑
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
```

**之后：**

```typescript
import router from '@/router'
import { setupRouterGuard } from '@structure/wujie-subapp'
import { useUserStore } from '@/store/user'
import { usePermissionStore } from '@/store/permission'
import NProgress from '@/utils/nprogress'

setupRouterGuard({
  router,
  getUserStore: () => useUserStore(),
  getPermissionStore: () => usePermissionStore(),
  generateRoutes: async (roles) => {
    const permissionStore = usePermissionStore()
    return permissionStore.generateRoutes(roles)
  },
  onBeforeEach: () => {
    NProgress.start()
  },
  onAfterEach: () => {
    NProgress.done()
  }
})
```

### 6. 删除旧文件

可以删除以下不再需要的文件：
- `src/utils/wujie.ts` - 已被库替代
- 旧的 `src/plugins/permission.ts` 中的部分逻辑

## 优势

迁移后您将获得以下优势：

1. **代码量大幅减少** - 减少约 80% 的重复代码
2. **更好的可维护性** - 统一的接口和配置
3. **易于升级** - 库的更新不影响业务代码
4. **类型安全** - 完整的 TypeScript 类型支持
5. **可定制性** - 保持所有原有功能的可定制性

## 渐进式迁移

如果不想一次性全部迁移，可以采用渐进式迁移：

1. 先引入库，保持原有代码不变
2. 逐步替换各个模块
3. 最后删除旧代码
