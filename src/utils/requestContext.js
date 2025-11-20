const { AsyncLocalStorage } = require('async_hooks')

const storage = new AsyncLocalStorage()

/**
 * 将当前请求放入 AsyncLocalStorage，便于在异步流程中获取 req
 */
const withRequestContext = (req, callback) => {
  storage.run({ req }, callback)
}

/**
 * 获取当前异步上下文中的 req
 */
const getRequest = () => {
  const store = storage.getStore()
  return store ? store.req : null
}

module.exports = {
  withRequestContext,
  getRequest
}
