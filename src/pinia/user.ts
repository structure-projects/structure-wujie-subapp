import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WujieData } from '../types'
import { StorageManager } from '../core/storage'
import { isWujieSubApp } from '../core/env'

/**
 * 用户 Store 配置选项
 */
export interface UserStoreOptions {
  storageManager?: StorageManager
  getUserInfoApi?: () => Promise<any>
  loginApi?: (data: any) => Promise<any>
  logoutApi?: () => Promise<any>
  getOrganizationsApi?: () => Promise<any>
}

/**
 * 创建可复用的用户 Store
 */
export function createUserStore(options: UserStoreOptions = {}) {
  const {
    storageManager,
    getUserInfoApi,
    loginApi,
    logoutApi,
    getOrganizationsApi
  } = options

  const storage = storageManager || new StorageManager()

  return defineStore('wujie-user', () => {
    const user = ref<any>({
      roles: [],
      perms: []
    })
    const organizations = ref<any[]>([])
    const needSelectOrg = ref(false)
    const selectedOrgId = ref<string | number | null>(null)
    const isOrglessUser = ref(false)

    /**
     * 从 localStorage 初始化用户信息
     */
    function initFromLocalStorage(): void {
      try {
        const userInfo = storage.getItem<any>('userInfoKey')
        if (userInfo) {
          Object.assign(user.value, userInfo)
        }
      } catch (e) {
        console.error('[wujie-subapp] Failed to init user from storage:', e)
      }
    }

    /**
     * 保存无组织用户状态
     */
    function saveOrglessState(): void {
      storage.setItem('isOrglessUserKey', 'true')
      storage.setItem('userRolesKey', user.value.roles)
      storage.setItem('userPermsKey', user.value.perms)
    }

    /**
     * 清除无组织用户状态
     */
    function clearOrglessState(): void {
      storage.removeItem('isOrglessUserKey')
      storage.removeItem('userRolesKey')
      storage.removeItem('userPermsKey')
    }

    /**
     * 恢复无组织用户状态
     */
    function restoreOrglessState(): void {
      const isOrgless = storage.getItem('isOrglessUserKey') === 'true'
      if (isOrgless) {
        isOrglessUser.value = true
        try {
          const roles = storage.getItem<string[]>('userRolesKey')
          const perms = storage.getItem<string[]>('userPermsKey')
          if (roles) user.value.roles = roles
          if (perms) user.value.perms = perms
        } catch (e) {
          console.error('[wujie-subapp] Failed to restore orgless state:', e)
        }
      }
    }

    /**
     * 清除用户信息
     */
    function clearUserInfo(): void {
      user.value = {
        roles: [],
        perms: []
      }
    }

    /**
     * 设置 Token
     */
    function setToken(token: string): void {
      storage.setItem('tokenKey', token)
    }

    /**
     * 登录
     */
    async function login(loginData: any): Promise<{ needSelectOrg: boolean; hasOrganization: boolean }> {
      if (!loginApi) {
        throw new Error('loginApi is not provided')
      }

      const response = await loginApi(loginData)
      const data = response.data

      if (data.accessToken) {
        setToken(data.accessToken)
      }

      if (data.hasOrganization === false) {
        isOrglessUser.value = true
        needSelectOrg.value = false
        organizations.value = []
        return { needSelectOrg: false, hasOrganization: false }
      } else {
        isOrglessUser.value = false
        clearOrglessState()

        if (getOrganizationsApi) {
          try {
            const orgRes = await getOrganizationsApi()
            organizations.value = orgRes.data || []
            if (organizations.value.length > 0) {
              needSelectOrg.value = true
              return { needSelectOrg: true, hasOrganization: true }
            }
          } catch (e) {
            console.error('[wujie-subapp] Failed to get organizations:', e)
          }
        }

        needSelectOrg.value = false
        return { needSelectOrg: false, hasOrganization: true }
      }
    }

    /**
     * 选择组织
     */
    function selectOrg(orgId: string | number): void {
      selectedOrgId.value = orgId
      needSelectOrg.value = false
      isOrglessUser.value = false
      clearOrglessState()
      if (orgId) {
        storage.setItem('selectedOrgId', String(orgId))
      }
    }

    /**
     * 初始化无组织用户
     */
    async function initOrglessUser(): Promise<any> {
      isOrglessUser.value = true
      needSelectOrg.value = false
      return getUserInfo()
    }

    /**
     * 获取用户信息
     */
    async function getUserInfo(): Promise<any> {
      // 如果是子应用，优先从 storage 获取
      if (isWujieSubApp()) {
        try {
          const userInfo = storage.getItem<any>('userInfoKey')
          if (userInfo) {
            if (!userInfo.roles || userInfo.roles.length <= 0) {
              throw new Error('roles must be a non-null array')
            }
            Object.assign(user.value, { ...userInfo })

            const hasOrgInfo = !!storage.getItem('orgInfoKey')
            const isRootUser = userInfo.roles.includes('ROOT')

            if (isRootUser && !hasOrgInfo) {
              isOrglessUser.value = true
              saveOrglessState()
            } else {
              isOrglessUser.value = false
              clearOrglessState()
            }

            return userInfo
          }
        } catch (e) {
          console.error('[wujie-subapp] Failed to get user info from storage:', e)
        }
      }

      // 从 API 获取
      if (!getUserInfoApi) {
        throw new Error('getUserInfoApi is not provided')
      }

      const response = await getUserInfoApi()
      const data = response.data

      if (!data) {
        throw new Error('Verification failed, please Login again')
      }
      if (!data.roles || data.roles.length <= 0) {
        throw new Error('getUserInfo: roles must be a non-null array')
      }

      Object.assign(user.value, { ...data })

      const hasOrgInfo = !!storage.getItem('orgInfoKey')
      const isRootUser = data.roles.includes('ROOT')

      if (isRootUser && !hasOrgInfo) {
        isOrglessUser.value = true
        saveOrglessState()
      } else {
        isOrglessUser.value = false
        clearOrglessState()
      }

      return data
    }

    /**
     * 登出
     */
    async function logout(): Promise<void> {
      if (logoutApi) {
        try {
          await logoutApi()
        } catch (e) {
          console.error('[wujie-subapp] Failed to logout:', e)
        }
      }

      storage.setItem('tokenKey', '')
      storage.removeItem('selectedOrgId')
      storage.removeItem('orgInfoKey')
      clearOrglessState()
      clearUserInfo()
      organizations.value = []
      needSelectOrg.value = false
      selectedOrgId.value = null
      isOrglessUser.value = false
    }

    /**
     * 重置 Token
     */
    function resetToken(): void {
      storage.setItem('tokenKey', '')
      storage.removeItem('selectedOrgId')
      storage.removeItem('orgInfoKey')
      clearOrglessState()
      clearUserInfo()
    }

    // 初始化时尝试从 storage 恢复
    initFromLocalStorage()

    return {
      user,
      organizations,
      needSelectOrg,
      selectedOrgId,
      isOrglessUser,
      initFromLocalStorage,
      saveOrglessState,
      clearOrglessState,
      restoreOrglessState,
      clearUserInfo,
      setToken,
      login,
      selectOrg,
      initOrglessUser,
      getUserInfo,
      logout,
      resetToken
    }
  })
}
