import type { WujieData, SyncConfig, WujieSubappConfig } from '../types'
import { DEFAULT_SYNC_CONFIG, DEFAULT_STORAGE_CONFIG } from '../types'
import { isWujieSubApp, getWujieProps, getWujieBus } from './env'
import { StorageManager } from './storage'

/**
 * 数据同步管理器
 */
export class DataSyncManager {
  private config: SyncConfig
  private storageManager: StorageManager
  private customHandlers?: WujieSubappConfig['customDataHandlers']
  private cachedData: WujieData | null = null
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map()

  constructor(config?: SyncConfig, storageManager?: StorageManager, customHandlers?: WujieSubappConfig['customDataHandlers']) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config }
    this.storageManager = storageManager || new StorageManager(DEFAULT_STORAGE_CONFIG)
    this.customHandlers = customHandlers
  }

  /**
   * 检查数据是否有变化
   */
  private hasDataChanged(oldData: WujieData, newData: WujieData): boolean {
    return JSON.stringify(oldData) !== JSON.stringify(newData)
  }

  /**
   * 获取默认数据
   */
  getDefaultData(): WujieData {
    return {
      token: '',
      userInfo: null,
      orgInfo: null,
      theme: 'light',
      language: 'zh-cn'
    }
  }

  /**
   * 从父应用获取数据
   */
  getDataFromParent(): WujieData {
    const props = getWujieProps()
    return props.data || this.getDefaultData()
  }

  /**
   * 设置数据
   */
  setData(data: WujieData): void {
    const oldData = this.cachedData || this.getDefaultData()
    
    if (this.hasDataChanged(oldData, data)) {
      // 调用自定义数据变化回调
      if (this.customHandlers?.onDataChanged) {
        this.customHandlers.onDataChanged(oldData, data)
      }
      
      // 同步到 storage
      if (this.config.autoSyncToStorage) {
        this.storageManager.syncDataToStorage(data)
      }
      
      // 调用自定义数据接收回调
      if (this.customHandlers?.onDataReceived) {
        this.customHandlers.onDataReceived(data)
      }
      
      this.cachedData = { ...data }
    }
  }

  /**
   * 获取当前数据
   */
  getData(): WujieData {
    if (this.cachedData) {
      return { ...this.cachedData }
    }
    
    if (isWujieSubApp()) {
      const data = this.getDataFromParent()
      this.setData(data)
      return data
    }
    
    return this.storageManager.restoreDataFromStorage() as WujieData
  }

  /**
   * 初始化数据同步
   */
  init(): WujieData {
    let data: WujieData
    
    if (isWujieSubApp() && this.config.autoSyncFromParent) {
      data = this.getDataFromParent()
      this.setData(data)
      
      // 监听父应用数据变化
      if (this.config.enableEventBus) {
        this.listenToParent()
      }
    } else {
      // 从本地 storage 恢复
      data = this.storageManager.restoreDataFromStorage() as WujieData
      this.cachedData = data
    }
    
    return data
  }

  /**
   * 监听父应用数据变化
   */
  private listenToParent(): void {
    const bus = getWujieBus()
    if (!bus) return
    
    const eventName = this.config.eventName || 'wujie-data'
    const handler = (newData: WujieData) => {
      this.setData(newData)
    }
    
    bus.$on(eventName, handler)
    
    // 保存事件处理器以便清理
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, [])
    }
    this.eventHandlers.get(eventName)!.push(handler)
  }

  /**
   * 向父应用发送数据
   */
  emitData(data: Partial<WujieData>): void {
    if (!isWujieSubApp()) return
    
    const bus = getWujieBus()
    if (!bus) return
    
    const eventName = this.config.eventName || 'wujie-data'
    bus.$emit(eventName, data)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 清理事件监听器
   */
  cleanup(): void {
    const bus = getWujieBus()
    if (!bus) return
    
    this.eventHandlers.forEach((handlers, eventName) => {
      handlers.forEach(handler => {
        bus.$off(eventName, handler)
      })
    })
    this.eventHandlers.clear()
  }
}
