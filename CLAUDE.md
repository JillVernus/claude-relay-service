# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Claude Relay Service 是一个多平台 AI API 中转服务，支持 Claude (官方/Console)、Gemini、OpenAI Responses (Codex)、AWS Bedrock、Azure OpenAI、Droid (Factory.ai)、CCR 等多种账户类型。作为客户端（Claude Code、Gemini CLI、Codex、Droid CLI 等）与 AI API 之间的中间件，提供认证、限流、监控、定价计算、成本统计等功能。

## 常用命令

```bash
# 开发
npm run dev                   # 开发模式（nodemon热重载）
npm start                     # 生产模式（先lint再启动）
npm run lint                  # ESLint检查并自动修复
npm run lint:check            # 仅检查不修复
npm run format                # Prettier格式化所有代码
npm test                      # Jest测试

# 初始化
npm run setup                 # 生成配置和管理员凭据（存储到data/init.json）
npm run install:web           # 安装前端依赖
npm run build:web             # 构建前端

# 服务管理
npm run service:start:daemon  # 后台启动（推荐）
npm run service:status        # 查看服务状态
npm run service:logs          # 查看日志
npm run service:logs:follow   # 实时查看日志
npm run service:restart:daemon # 重启服务
npm run service:stop          # 停止服务

# CLI工具
npm run cli status            # 系统概况
npm run cli keys list         # 列出API Keys
npm run cli keys create -- --name "MyApp" --limit 1000
npm run cli accounts list     # 列出Claude账户

# 数据管理
npm run data:export           # 导出Redis数据
npm run data:import           # 导入数据
npm run data:debug            # 调试Redis键
npm run init:costs            # 初始化成本数据
npm run update:pricing        # 更新模型价格

# Docker
docker-compose up -d
docker-compose --profile monitoring up -d  # 包含监控
```

## 核心架构

### 请求处理流程

1. 客户端使用 API Key（`cr_` 前缀）发送请求到路由（/api、/claude、/gemini、/openai、/droid）
2. `authenticateApiKey` 中间件验证：API Key有效性、速率限制、权限、客户端限制、模型黑名单
3. 统一调度器根据请求模型、会话hash、权限选择最优账户
4. 检查并刷新token（如需要），通过账户代理转发到目标API
5. 流式或非流式返回响应，捕获usage数据，记录统计和成本

### 关键设计模式

- **统一调度**: `unifiedClaudeScheduler.js`、`unifiedGeminiScheduler.js` 等实现跨账户类型智能调度
- **粘性会话**: 基于请求内容hash绑定账户，同一会话使用同一账户
- **数据加密**: 敏感数据（OAuth token、credentials）使用AES加密存储在Redis
- **SSE流式响应**: 实时捕获usage数据，客户端断开时通过AbortController清理资源

### 目录结构

```
src/
├── app.js                    # 入口文件，Express应用配置
├── services/                 # 核心服务
│   ├── *RelayService.js      # 各平台API转发服务
│   ├── *AccountService.js    # 各平台账户管理
│   ├── unified*Scheduler.js  # 统一调度器
│   ├── apiKeyService.js      # API Key管理、验证、限流
│   └── pricingService.js     # 定价和成本计算
├── routes/                   # 路由定义
│   ├── api.js               # Claude主路由
│   ├── geminiRoutes.js      # Gemini路由
│   ├── openaiRoutes.js      # OpenAI兼容路由
│   └── admin/               # 管理后台路由
├── middleware/              # 中间件（auth.js认证）
├── utils/                   # 工具函数
│   ├── logger.js           # Winston日志
│   ├── oauthHelper.js      # OAuth PKCE实现
│   └── proxyHelper.js      # 代理配置
└── models/redis.js          # Redis连接和模型

web/admin-spa/               # Vue 3前端（Tailwind CSS）
├── src/views/              # 页面组件
├── src/components/         # 通用组件
└── src/stores/theme.js     # 主题管理（明/暗模式）

config/config.js             # 主配置文件
data/init.json              # 管理员凭据
logs/                       # 日志目录
```

### Redis数据结构

- `api_key:{id}` / `api_key_hash:{hash}` - API Key及快速映射
- `claude_account:{id}` / `gemini_account:{id}` 等 - 各类型账户（加密存储）
- `sticky_session:{hash}` - 粘性会话绑定
- `usage:daily:{date}:{key}:{model}` - 使用统计
- `rate_limit:{keyId}:{window}` - 速率限制计数
- `concurrency:{accountId}` - 并发控制（Sorted Set）

## 开发指南

### 代码规范

- **必须使用 Prettier 格式化**: `npx prettier --write <file>`
- 前端使用 `prettier-plugin-tailwindcss` 自动排序class
- 提交前运行 `npm run lint` 和 `npm run format:check`

### 前端开发

- **响应式设计**: 使用 Tailwind 响应式前缀（sm:、md:、lg:、xl:）
- **暗黑模式**: 所有组件必须兼容明/暗模式
  - 文本: `text-gray-700 dark:text-gray-200`
  - 背景: `bg-white dark:bg-gray-800`
  - 边框: `border-gray-200 dark:border-gray-700`
- **主题切换**: 使用 `stores/theme.js` 中的 `useThemeStore()`

### 敏感数据处理

- OAuth token、API credentials 必须加密存储
- 参考 `claudeAccountService.js` 中的加密实现
- API Key 使用 SHA-256 哈希存储

### 错误处理

- 529错误自动标记账户过载，配置时长内排除该账户
- SSE流式响应错误发送带时间戳的错误事件
- 客户端断开时清理并发计数和资源

## 环境变量

必须配置:
- `JWT_SECRET` - JWT密钥（32字符以上）
- `ENCRYPTION_KEY` - 数据加密密钥（32字符固定）
- `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`

常用可选:
- `USER_MANAGEMENT_ENABLED` - 启用用户管理系统
- `STICKY_SESSION_TTL_HOURS` - 粘性会话TTL（默认1小时）
- `DEBUG_HTTP_TRAFFIC` - 启用HTTP调试日志
- `METRICS_WINDOW` - 实时指标窗口（分钟，默认5）

## 常见问题

- **Redis连接失败**: 检查 REDIS_HOST/PORT/PASSWORD 配置
- **管理员登录失败**: 运行 `npm run setup` 重新初始化
- **粘性会话失效**: Nginx代理需添加 `underscores_in_headers on;`
- **Token刷新失败**: 检查代理配置和refreshToken有效性

## 重要提醒

- 对现有文件修改前，先检查代码库的现有模式和风格
- 重用现有服务和工具函数，避免重复代码
- 测试后使用 `npm run cli status` 验证功能
