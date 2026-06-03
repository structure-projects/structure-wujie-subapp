import type { WujieData, StorageConfig } from '../types'
import { DEFAULT_STORAGE_CONFIG } from '../types'

/**
 * Storage 管理器
 */
export class StorageManager {
  private config: StorageConfig

  constructor(config?: StorageConfig) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取配置
   */
  getConfig(): StorageConfig {
    return { ...this.config }
  }

  /**
   * 保存数据到 localStorage
   */
  setItem(key: string, value: any): void {
    try {
      const storageKey = this.config[key] || key
      if (value === null || value === undefined) {
        localStorage.removeItem(storageKey)
      } else if (typeof value === 'string') {
        localStorage.setItem(storageKey, value)
      } else {
        localStorage.setItem(storageKey, JSON.stringify(value))
      }
    } catch (e) {
      console.error('[wujie-subapp] Failed to set storage item:', e)
    }
  }

  /**
   * 从 localStorage 获取数据
   */
  getItem<T = any>(key: string): T | null {
    try {
      const storageKey = this.config[key] || key
      const value = localStorage.getItem(storageKey)
      if (!value) return null
      
      try {
        return JSON.parse(value) as T
      } catch {
        return value as T
      }
    } catch (e) {
      console.error('[wujie-subapp] Failed to get storage item:', e)
      return null
    }
  }

  /**
   * 移除数据
   */
  removeItem(key: string): void {
    try {
      const storageKey = this.config[key] || key
      localStorage.removeItem(storageKey)
    } catch (e) {
      console.error('[wujie-subapp] Failed to remove storage item:', e)
    }
  }

  /**
   * 同步 WujieData 到 localStorage
   */
  syncDataToStorage(data: WujieData): void {
    if (data.token !== undefined) {
      this.setItem('tokenKey', data.token)
    }
    if (data.userInfo !== undefined) {
      this.setItem('userInfoKey', data.userInfo)
    }
    if (data.orgInfo !== undefined) {
      this.setItem('orgInfoKey', data.orgInfo)
    }
    if (data.theme !== undefined) {
      this.setItem('themeKey', data.theme)
    }
    if (data.language !== undefined) {
      this.setItem('languageKey', data.language)
    }
    if (data.routes !== undefined) {
      this.setItem('routesKey', data.routes)
    }
    if (data.isOrglessUser !== undefined) {
      this.setItem('isOrglessUserKey', data.isOrglessUser ? 'true' : null)
    }
    if (data.userInfo?.roles !== undefined) {
      this.setItem('userRolesKey', data.userInfo.roles)
    }
    if (data.userInfo?.perms !== undefined) {
      this.setItem('userPermsKey', data.userInfo.perms)
    }
  }

  /**
   * 从 localStorage 恢复 WujieData
   */
  restoreDataFromStorage(): Partial<WujieData> {
    const data: Partial<WujieData> = {}
    
    const token = this.getItem<string>('tokenKey')
    if (token) data.token = token
    
    const userInfo = this.getItem<any>('userInfoKey')
    if (userInfo) data.userInfo = userInfo
    
    const orgInfo = this.getItem<any>('orgInfoKey')
    if (orgInfo) data.orgInfo = orgInfo
    
    const theme = this.getItem<'light' | 'dark'>('themeKey')
    if (theme) data.theme = theme
    
    const language = this.getItem<'zh-cn' | 'en'>('languageKey')
    if (language) data.language = language
    
    const routes = this.getItem<any[]>('routesKey')
    if (routes) data.routes = routes
    
    const isOrglessUser = this.getItem<string>('isOrglessUserKey')
    if (isOrglessUser === 'true') data.isOrglessUser = true
    
    return data
  }

  /**
   * 清空所有相关数据
   */
  clearAll(): void {
    Object.values(this.config).forEach(key => {
      if (key) localStorage.removeItem(key)
    })
  }
}
