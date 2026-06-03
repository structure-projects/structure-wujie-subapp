import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { RouteGenerator } from '../router/generator'
import { StorageManager } from '../core/storage'
import { isWujieSubApp } from '../core/env'
import type { RouterConfig } from '../types'

/**
 * 权限 Store 配置选项
 */
export interface PermissionStoreOptions {
  storageManager?: StorageManager
  routeGenerator?: RouteGenerator
  routerConfig?: RouterConfig
  listRoutesApi?: () => Promise<any>
  hasPermission?: (roles: string[], route: RouteRecordRaw) => boolean
  filterAsyncRoutes?: (routes: RouteRecordRaw[], roles: string[]) => RouteRecordRaw[]
  constantRoutes?: RouteRecordRaw[]
  modules?: Record<string, any>
  Layout?: any
  PlaceholderComponent?: any
}

/**
 * 创建可复用的权限 Store
 */
export function createPermissionStore(options: PermissionStoreOptions = {}) {
  const {
    storageManager,
    routeGenerator,
    routerConfig,
    listRoutesApi,
    hasPermission: customHasPermission,
    filterAsyncRoutes: customFilterAsyncRoutes,
    constantRoutes = [],
    modules = {},
    Layout,
    PlaceholderComponent
  } = options

  const storage = storageManager || new StorageManager()
  const generator = routeGenerator || new RouteGenerator(routerConfig, storage)

  // 路由缓存
  let cachedRoutes: RouteRecordRaw[] | null = null
  let lastRoutesHash = ''

  /**
   * 动态加载组件
   */
  function loadComponent(componentPath?: string): any {
    if (!componentPath) {
      return PlaceholderComponent || (() => null)
    }

    let normalizedPath = componentPath

    if (normalizedPath.startsWith('@/')) {
      normalizedPath = normalizedPath.replace('@/', '')
    }

    if (modules[normalizedPath]) {
      return modules[normalizedPath]
    }

    if (modules[`../../views/${normalizedPath}`]) {
      return modules[`../../views/${normalizedPath}`]
    }

    if (!normalizedPath.endsWith('.vue')) {
      const withExt = `${normalizedPath}.vue`
      if (modules[withExt]) {
        return modules[withExt]
      }
      if (modules[`../../views/${withExt}`]) {
        return modules[`../../views/${withExt}`]
      }
    }

    return PlaceholderComponent || (() => null)
  }

  /**
   * 默认权限检查
   */
  function defaultHasPermission(roles: string[], route: RouteRecordRaw): boolean {
    if (route.meta && route.meta.roles) {
      if (roles.includes('ROOT')) {
        return true
      }
      return roles.some((role) => {
        if (route.meta?.roles) {
          return route.meta.roles.includes(role)
        }
        return false
      })
    }
    return true
  }

  /**
   * 默认过滤异步路由
   */
  function defaultFilterAsyncRoutes(routes: RouteRecordRaw[], roles: string[]): RouteRecordRaw[] {
    const hasPermission = customHasPermission || defaultHasPermission
    const asyncRoutes: RouteRecordRaw[] = []

    routes.forEach((route) => {
      const tmpRoute = { ...route }
      if (!route.name) {
        tmpRoute.name = route.path
      }
      if (hasPermission(roles, tmpRoute)) {
        if (tmpRoute.component?.toString() === 'Layout' && Layout) {
          tmpRoute.component = Layout
        } else if (typeof tmpRoute.component === 'string') {
          tmpRoute.component = loadComponent(tmpRoute.component as string)
        }

        if (tmpRoute.children) {
          tmpRoute.children = defaultFilterAsyncRoutes(tmpRoute.children, roles)
        }

        asyncRoutes.push(tmpRoute)
      }
    })

    return asyncRoutes
  }

  return defineStore('wujie-permission', () => {
    const routes = ref<RouteRecordRaw[]>([])
    const mixLeftMenus = ref<RouteRecordRaw[]>([])

    /**
     * 设置路由
     */
    function setRoutes(newRoutes: RouteRecordRaw[]): void {
      routes.value = newRoutes
    }

    /**
     * 从父应用路由数据生成
     */
    function generateRoutesFromParentData(parentRoutes: any[]): RouteRecordRaw[] {
      if (!parentRoutes || !Array.isArray(parentRoutes) || parentRoutes.length === 0) {
        return []
      }

      const routesHash = JSON.stringify(parentRoutes)
      if (cachedRoutes && routesHash === lastRoutesHash) {
        return cachedRoutes
      }

      const result: RouteRecordRaw[] = []

      for (const route of parentRoutes) {
        if (!route || !route.path) {
          continue
        }

        if (route.meta?.hidden || route.path.startsWith('/login') || route.path === '/register') {
          continue
        }

        const hasChildren = route.children && Array.isArray(route.children) && route.children.length > 0

        const newRoute: RouteRecordRaw = {
          path: route.path,
          name: route.name,
          meta: {
            ...(route.meta || {}),
            alwaysShow: hasChildren && route.children.length > 1
          },
          redirect: route.redirect
        }

        if (hasChildren) {
          newRoute.component = Layout

          const firstVisibleChild = route.children.find((c: any) => c && !c.meta?.hidden)
          if (firstVisibleChild) {
            if (route.path.endsWith('/')) {
              newRoute.redirect = `${route.path}${firstVisibleChild.path}`
            } else {
              newRoute.redirect = `${route.path}/${firstVisibleChild.path}`
            }
          }

          newRoute.children = route.children
            .map((child: any) => {
              if (!child || !child.path) {
                return null
              }

              if (child.meta?.hidden) {
                return null
              }

              return {
                path: child.path,
                name: child.name,
                meta: child.meta || {},
                redirect: child.redirect,
                component: loadComponent(child.component)
              }
            })
            .filter(Boolean) as RouteRecordRaw[]
        } else {
          newRoute.component = loadComponent(route.component)
        }

        result.push(newRoute)
      }

      cachedRoutes = result
      lastRoutesHash = routesHash

      return result
    }

    /**
     * 生成路由
     */
    async function generateRoutes(roles: string[]): Promise<RouteRecordRaw[]> {
      if (isWujieSubApp()) {
        try {
          const parentRoutes = storage.getItem<any[]>('routesKey')
          if (parentRoutes) {
            const routesFromParent = generateRoutesFromParentData(parentRoutes)

            if (routesFromParent.length > 0) {
              const essentialRoutes = constantRoutes.filter((route) =>
                route.meta?.hidden ||
                route.path.startsWith('/login') ||
                route.path === '/register' ||
                route.path === '/redirect' ||
                route.path === '/401' ||
                route.path === '/404'
              )

              const finalRoutes = [...essentialRoutes, ...routesFromParent]
              setRoutes(finalRoutes)
              return finalRoutes
            }
          }
        } catch (e) {
          console.error('[wujie-subapp] Failed to parse parent routes:', e)
        }

        setRoutes(constantRoutes)
        return constantRoutes
      }

      if (listRoutesApi) {
        try {
          const response = await listRoutesApi()
          const asyncRoutes = response.data || []
          const filterFn = customFilterAsyncRoutes || defaultFilterAsyncRoutes
          const accessedRoutes = filterFn(asyncRoutes, roles)
          const mergedRoutes = mergeRoutes(constantRoutes, accessedRoutes)

          setRoutes(mergedRoutes)
          return mergedRoutes
        } catch (e) {
          console.error('[wujie-subapp] Failed to get routes from API:', e)
        }
      }

      setRoutes(constantRoutes)
      return constantRoutes
    }

    /**
     * 合并路由
     */
    function mergeRoutes(staticRoutes: RouteRecordRaw[], dynamicRoutes: RouteRecordRaw[]): RouteRecordRaw[] {
      if (!staticRoutes || !Array.isArray(staticRoutes)) {
        staticRoutes = []
      }
      if (!dynamicRoutes || !Array.isArray(dynamicRoutes)) {
        dynamicRoutes = []
      }

      const mergedRoutes = [...staticRoutes]

      dynamicRoutes.forEach((dynamicRoute) => {
        if (!dynamicRoute || !dynamicRoute.path) {
          return
        }

        const existingRouteIndex = mergedRoutes.findIndex(
          (route) => route && route.path === dynamicRoute.path
        )

        if (existingRouteIndex !== -1) {
          const existingRoute = mergedRoutes[existingRouteIndex]
          if (!existingRoute) {
            return
          }

          const mergedChildren: RouteRecordRaw[] = [...(existingRoute.children || [])]

          if (dynamicRoute.children && Array.isArray(dynamicRoute.children)) {
            dynamicRoute.children.forEach((dynamicChild) => {
              if (!dynamicChild || !dynamicChild.path) {
                return
              }
              const childExists = mergedChildren.some(
                (child) => child && child.path === dynamicChild.path
              )
              if (!childExists) {
                mergedChildren.push(dynamicChild)
              }
            })
          }

          mergedRoutes[existingRouteIndex] = {
            ...existingRoute,
            children: mergedChildren
          }
        } else {
          mergedRoutes.push(dynamicRoute)
        }
      })

      return mergedRoutes
    }

    /**
     * 设置混合左侧菜单
     */
    function setMixLeftMenus(topMenuPath: string): void {
      const matchedItem = routes.value.find((item) => item.path === topMenuPath)
      if (matchedItem && matchedItem.children) {
        mixLeftMenus.value = matchedItem.children
      }
    }

    return {
      routes,
      mixLeftMenus,
      setRoutes,
      generateRoutes,
      generateRoutesFromParentData,
      mergeRoutes,
      setMixLeftMenus
    }
  })
}
