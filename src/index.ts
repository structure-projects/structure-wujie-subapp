// 类型导出
export type {
  WujieData,
  WujieProps,
  StorageConfig,
  SyncConfig,
  RouterConfig,
  WujieSubappConfig
} from './types'
export {
  DEFAULT_STORAGE_CONFIG,
  DEFAULT_SYNC_CONFIG,
  DEFAULT_ROUTER_CONFIG
} from './types'

// 核心模块导出
export { isWujieSubApp, initWujieEnv, getWujieProps, getWujieBus } from './core/env'
export { StorageManager } from './core/storage'
export { DataSyncManager } from './core/sync'

// 路由模块导出
export { RouteGenerator } from './router/generator'
export { setupRouterGuard } from './router/guard'
export type { RouterGuardOptions } from './router/guard'

// Pinia 模块导出
export { createUserStore } from './pinia/user'
export type { UserStoreOptions } from './pinia/user'
export { createPermissionStore } from './pinia/permission'
export type { PermissionStoreOptions } from './pinia/permission'

// 主入口类
import type { WujieData, WujieSubappConfig } from './types'
import { initWujieEnv, isWujieSubApp } from './core/env'
import { StorageManager } from './core/storage'
import { DataSyncManager } from './core/sync'
import { RouteGenerator } from './router/generator'

/**
 * 无界子应用管理器
 * 整合所有功能，提供统一的使用接口
 */
export class WujieSubapp {
  private config: WujieSubappConfig
  private _storageManager!: StorageManager
  private _dataSyncManager!: DataSyncManager
  private _routeGenerator!: RouteGenerator
  private _initialized = false

  constructor(config: WujieSubappConfig = {}) {
    this.config = config
  }

  /**
   * 初始化无界子应用
   */
  init(): WujieData {
    if (this._initialized) {
      console.warn('[wujie-subapp] Already initialized')
      return this._dataSyncManager.getData()
    }

    // 初始化环境
    initWujieEnv()

    // 创建管理器实例
    this._storageManager = new StorageManager(this.config.storage)
    this._dataSyncManager = new DataSyncManager(
      this.config.sync,
      this._storageManager,
      this.config.customDataHandlers
    )
    this._routeGenerator = new RouteGenerator(
      this.config.router,
      this._storageManager
    )

    // 初始化数据同步
    const data = this._dataSyncManager.init()
    this._initialized = true

    console.log('[wujie-subapp] Initialized successfully')
    return data
  }

  /**
   * 获取 StorageManager
   */
  get storageManager(): StorageManager {
    if (!this._initialized) {
      throw new Error('WujieSubapp not initialized, call init() first')
    }
    return this._storageManager
  }

  /**
   * 获取 DataSyncManager
   */
  get dataSyncManager(): DataSyncManager {
    if (!this._initialized) {
      throw new Error('WujieSubapp not initialized, call init() first')
    }
    return this._dataSyncManager
  }

  /**
   * 获取 RouteGenerator
   */
  get routeGenerator(): RouteGenerator {
    if (!this._initialized) {
      throw new Error('WujieSubapp not initialized, call init() first')
    }
    return this._routeGenerator
  }

  /**
   * 检查是否在无界环境中
   */
  get isSubApp(): boolean {
    return isWujieSubApp()
  }

  /**
   * 获取当前数据
   */
  getData(): WujieData {
    if (!this._initialized) {
      throw new Error('WujieSubapp not initialized, call init() first')
    }
    return this._dataSyncManager.getData()
  }

  /**
   * 向父应用发送数据
   */
  emitData(data: Partial<WujieData>): void {
    if (!this._initialized) {
      throw new Error('WujieSubapp not initialized, call init() first')
    }
    this._dataSyncManager.emitData(data)
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this._dataSyncManager) {
      this._dataSyncManager.cleanup()
    }
    this._initialized = false
    console.log('[wujie-subapp] Destroyed')
  }
}

// 便捷创建函数
export function createWujieSubapp(config?: WujieSubappConfig): WujieSubapp {
  return new WujieSubapp(config)
}
