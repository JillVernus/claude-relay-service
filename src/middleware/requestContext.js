const { withRequestContext } = require('../utils/requestContext')

// 为每个请求创建异步上下文，便于在服务层获取 req（用于日志聚合等）
const requestContextMiddleware = (req, _res, next) => {
  withRequestContext(req, next)
}

module.exports = {
  requestContextMiddleware
}
