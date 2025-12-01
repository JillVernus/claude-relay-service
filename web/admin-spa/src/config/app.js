/* global __FEAT_VERSION__ */

// 请求日志版本：优先环境变量，其次构建时注入的 FEAT-VERSION 文件，最后回退默认值
const envRequestLogVersion = (import.meta.env.VITE_REQUEST_LOG_VERSION || '').trim()
const buildRequestLogVersion =
  typeof __FEAT_VERSION__ !== 'undefined' && __FEAT_VERSION__ ? __FEAT_VERSION__.trim() : ''

// 应用配置
export const APP_CONFIG = {
  // 应用基础路径
  basePath: import.meta.env.VITE_APP_BASE_URL || (import.meta.env.DEV ? '/admin/' : '/web/admin/'),

  // 应用标题
  title: import.meta.env.VITE_APP_TITLE || 'Claude Relay Service - 管理后台',

  // 是否为开发环境
  isDev: import.meta.env.DEV,

  // API 前缀
  apiPrefix: import.meta.env.DEV ? '/webapi' : '',

  // 请求日志功能版本
  requestLogVersion: envRequestLogVersion || buildRequestLogVersion || 'jill-v1.09'
}

// 获取完整的应用URL
export function getAppUrl(path = '') {
  // 确保路径以 / 开头
  if (path && !path.startsWith('/')) {
    path = '/' + path
  }
  return APP_CONFIG.basePath + (path.startsWith('#') ? path : '#' + path)
}

// 获取登录页面URL
export function getLoginUrl() {
  return getAppUrl('/login')
}
