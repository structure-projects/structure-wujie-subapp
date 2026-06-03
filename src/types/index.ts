import type { Props } from 'wujie-vue3'

/**
 * 无界子应用数据结构
 */
export interface WujieData {
  token?: string
  userInfo?: any
  orgInfo?: any
  theme?: 'light' | 'dark'
  language?: 'zh-cn' | 'en'
  routes?: any[]
  isOrglessUser?: boolean
  [key: string]: any
}

/**
 * 无界子应用 Props
 */
export interface WujieProps extends Props {
  data?: WujieData
  onDataChange?: (data: WujieData) => void
}

/**
 * Storage 配置项
 */
export interface StorageConfig {
  tokenKey?: string
  userInfoKey?: string
  orgInfoKey?: string
  themeKey?: string
  languageKey?: string
  routesKey?: string
  isOrglessUserKey?: string
  userRolesKey?: string
  userPermsKey?: string
  [key: string]: string | undefined
}

/**
 * 数据同步配置
 */
export interface SyncConfig {
  autoSyncToStorage?: boolean
  autoSyncFromParent?: boolean
  enableEventBus?: boolean
  eventName?: string
}

/**
 * 路由配置
 */
export interface RouterConfig {
  whiteList?: string[]
  autoGenerateRoutes?: boolean
  essentialRoutes?: string[]
  loadComponent?: (componentPath?: string) => any
  layoutComponent?: any
  placeholderComponent?: any
}

/**
 * 初始化配置
 */
export interface WujieSubappConfig {
  storage?: StorageConfig
  sync?: SyncConfig
  router?: RouterConfig
  customDataHandlers?: {
    onDataReceived?: (data: WujieData) => void
    onDataChanged?: (oldData: WujieData, newData: WujieData) => void
  }
}

/**
 * 默认配置
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  tokenKey: 'accessToken',
  userInfoKey: 'userInfo',
  orgInfoKey: 'orgInfo',
  themeKey: 'theme',
  languageKey: 'language',
  routesKey: 'parentRoutes',
  isOrglessUserKey: 'isOrglessUser',
  userRolesKey: 'userRoles',
  userPermsKey: 'userPerms'
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  autoSyncToStorage: true,
  autoSyncFromParent: true,
  enableEventBus: true,
  eventName: 'wujie-data'
}

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  whiteList: ['/login', '/login/ram', '/login/account', '/login/phone', '/login/qrcode', '/login/org-select', '/register'],
  autoGenerateRoutes: true,
  essentialRoutes: ['/login', '/register', '/redirect', '/401', '/404']
}
