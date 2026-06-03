import type { RouteRecordRaw } from 'vue-router'
import type { RouterConfig } from '../types'
import { DEFAULT_ROUTER_CONFIG } from '../types'
import { StorageManager } from '../core/storage'

/**
 * 路由生成器
 */
export class RouteGenerator {
  private config: RouterConfig
  private storageManager: StorageManager
  private cachedRoutes: RouteRecordRaw[] | null = null
  private lastRoutesHash: string = ''

  constructor(config?: RouterConfig, storageManager?: StorageManager) {
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config }
    this.storageManager = storageManager || new StorageManager()
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取配置
   */
  getConfig(): RouterConfig {
    return { ...this.config }
  }

  /**
   * 加载组件
   */
  private loadComponent(componentPath?: string): any {
    if (this.config.loadComponent) {
      return this.config.loadComponent(componentPath)
    }
    
    // 默认实现：返回占位组件
    return this.config.placeholderComponent || (() => null)
  }

  /**
   * 从父应用路由数据生成子应用可用的路由
   */
  generateRoutesFromParentData(parentRoutes: any[]): RouteRecordRaw[] {
    if (!parentRoutes || !Array.isArray(parentRoutes) || parentRoutes.length === 0) {
      return []
    }

    // 检查路由是否有变化
    const routesHash = JSON.stringify(parentRoutes)
    if (this.cachedRoutes && routesHash === this.lastRoutesHash) {
      return this.cachedRoutes
    }

    const result: RouteRecordRaw[] = []

    for (const route of parentRoutes) {
      if (!route || !route.path) {
        continue
      }

      // 跳过隐藏路由和登录相关路由
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
        // 使用配置的 Layout 组件
        newRoute.component = this.config.layoutComponent

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
              component: this.loadComponent(child.component)
            }
          })
          .filter(Boolean) as RouteRecordRaw[]
      } else {
        // 叶子路由直接使用组件
        newRoute.component = this.loadComponent(route.component)
      }

      result.push(newRoute)
    }

    // 更新缓存
    this.cachedRoutes = result
    this.lastRoutesHash = routesHash

    return result
  }

  /**
   * 获取父应用路由数据
   */
  getParentRoutes(): any[] | null {
    return this.storageManager.getItem<any[]>('routesKey')
  }

  /**
   * 合并静态路由和动态路由
   */
  mergeRoutes(staticRoutes: RouteRecordRaw[], dynamicRoutes: RouteRecordRaw[]): RouteRecordRaw[] {
    if (!staticRoutes || !Array.isArray(staticRoutes)) {
      staticRoutes = []
    }
    if (!dynamicRoutes || !Array.isArray(dynamicRoutes)) {
      dynamicRoutes = []
    }

    const mergedRoutes = [...staticRoutes]
    const essentialPaths = this.config.essentialRoutes || []

    // 提取必需的静态路由
    const essentialRoutes = staticRoutes.filter(route => 
      essentialPaths.some(path => 
        route.path === path || 
        route.meta?.hidden || 
        route.path.startsWith('/login') || 
        route.path === '/register'
      )
    )

    // 合并：必需路由 + 动态路由
    return [...essentialRoutes, ...dynamicRoutes]
  }

  /**
   * 生成完整的路由配置
   */
  async generateRoutes(
    staticRoutes: RouteRecordRaw[],
    generateDynamicRoutes?: () => Promise<RouteRecordRaw[]>
  ): Promise<RouteRecordRaw[]> {
    if (!this.config.autoGenerateRoutes) {
      return staticRoutes
    }

    // 尝试从父应用获取路由
    const parentRoutes = this.getParentRoutes()
    if (parentRoutes) {
      const routesFromParent = this.generateRoutesFromParentData(parentRoutes)
      if (routesFromParent.length > 0) {
        return this.mergeRoutes(staticRoutes, routesFromParent)
      }
    }

    // 如果没有父应用路由，尝试通过自定义方法生成
    if (generateDynamicRoutes) {
      try {
        const dynamicRoutes = await generateDynamicRoutes()
        return this.mergeRoutes(staticRoutes, dynamicRoutes)
      } catch (e) {
        console.error('[wujie-subapp] Failed to generate dynamic routes:', e)
      }
    }

    // 回退到静态路由
    return staticRoutes
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cachedRoutes = null
    this.lastRoutesHash = ''
  }
}
