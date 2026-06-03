/**
 * 检测是否在无界微前端环境中
 */
export function isWujieSubApp(): boolean {
  return !!(window.__POWERED_BY_WUJIE__ || window.__WUJIE__)
}

/**
 * 初始化无界环境
 * 兼容不同的无界版本
 */
export function initWujieEnv(): void {
  if (window.__POWERED_BY_WUJIE__ && !window.__WUJIE__) {
    try {
      const wujie = require('wujie-vue3')
      window.__WUJIE__ = {
        bus: wujie.bus,
        props: window.__WUJIE_PROPS__
      }
    } catch (e) {
      console.warn('[wujie-subapp] Failed to init wujie env:', e)
    }
  }
}

/**
 * 获取无界 Props
 */
export function getWujieProps(): any {
  return window.__WUJIE__?.props || {}
}

/**
 * 获取无界 Bus
 */
export function getWujieBus(): any {
  return window.__WUJIE__?.bus
}
