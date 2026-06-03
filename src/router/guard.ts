import type { Router, RouteRecordRaw } from 'vue-router'
import type { RouterConfig } from '../types'
import { DEFAULT_ROUTER_CONFIG } from '../types'
import { isWujieSubApp } from '../core/env'
import { StorageManager } from '../core/storage'

/**
 * 路由守卫配置
 */
export interface RouterGuardOptions {
  router: Router
  config?: RouterConfig
  storageManager?: StorageManager
  onBeforeEach?: (to: any, from: any, next: () => void) => void | Promise<void>
  onAfterEach?: (to: any, from: any) => void
  getUserStore?: () => any
  getPermissionStore?: () => any
  generateRoutes?: (roles: string[]) => Promise<RouteRecordRaw[]>
}

/**
 * 设置路由守卫
 */
export function setupRouterGuard(options: RouterGuardOptions): void {
  const {
    router,
    config,
    storageManager,
    onBeforeEach,
    onAfterEach,
    getUserStore,
    getPermissionStore,
    generateRoutes
  } = options

  const routerConfig = { ...DEFAULT_ROUTER_CONFIG, ...config }
  const storage = storageManager || new StorageManager()
  const whiteList = routerConfig.whiteList || []

  router.beforeEach(async (to, from, next) => {
    // 调用自定义前置守卫
    if (onBeforeEach) {
      const customResult = onBeforeEach(to, from, next)
      if (customResult instanceof Promise) {
        await customResult
      }
      return
    }

    const hasToken = !!storage.getItem('tokenKey')
    const hasOrgInfo = !!storage.getItem('orgInfoKey')
    const isSubApp = isWujieSubApp()
    const isOrglessFromStorage = storage.getItem('isOrglessUserKey') === 'true'

    if (hasToken) {
      if (whiteList.includes(to.path)) {
        next({ path: '/' })
        return
      }

      // 如果是子应用，尝试从 storage 恢复用户信息
      if (isSubApp && getUserStore) {
        try {
          const userStore = getUserStore()
          const userInfo = storage.getItem<any>('userInfoKey')
          if (userInfo && userStore) {
            // 尝试初始化用户信息
            if (typeof userStore.initFromLocalStorage === 'function') {
              userStore.initFromLocalStorage()
            } else if (userStore.user && typeof userStore.user === 'object') {
              Object.assign(userStore.user, userInfo)
            }
            
            // 恢复无组织用户状态
            if (isOrglessFromStorage && typeof userStore.restoreOrglessState === 'function') {
              userStore.restoreOrglessState()
            }
          }
        } catch (e) {
          console.error('[wujie-subapp] Failed to init user from storage:', e)
        }
      }

      // 处理路由
      if (getPermissionStore && generateRoutes) {
        try {
          const permissionStore = getPermissionStore()
          const userStore = getUserStore?.()
          
          // 获取用户角色
          let roles: string[] = []
          if (userStore) {
            if (userStore.user?.roles) {
              roles = userStore.user.roles
            } else if (typeof userStore.getUserInfo === 'function') {
              const userInfo = await userStore.getUserInfo()
              roles = userInfo?.roles || []
            }
          }
          
          // 生成路由
          if (roles.length > 0 && !permissionStore.routes?.length) {
            const accessRoutes = await generateRoutes(roles)
            accessRoutes.forEach((route: RouteRecordRaw) => {
              router.addRoute(route)
            })
            next({ ...to, replace: true })
            return
          }
        } catch (e) {
          console.error('[wujie-subapp] Failed to generate routes:', e)
        }
      }

      if (to.matched.length === 0) {
        from.name ? next({ name: from.name }) : next('/404')
      } else {
        next()
      }
    } else {
      if (whiteList.includes(to.path)) {
        next()
      } else {
        next(`/login?redirect=${to.path}`)
      }
    }
  })

  router.afterEach((to, from) => {
    if (onAfterEach) {
      onAfterEach(to, from)
    }
  })
}
