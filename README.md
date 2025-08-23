# 🚀 企业级Node.js脚手架

一个功能完整、架构清晰的企业级Node.js项目脚手架，集成了现代Web开发的最佳实践。

## ✨ 功能特性

### 🔐 安全与认证
- **JWT认证系统** - 支持访问令牌和刷新令牌
- **角色权限管理** - 用户、版主、管理员三级权限
- **安全中间件** - Helmet、CORS、请求限流、暴力攻击防护
- **密码加密** - bcrypt加密存储，盐值12轮

### 🗄️ 数据存储
- **MongoDB** - 主数据库，支持连接池和重连机制
- **Redis** - 缓存、会话、任务队列存储
- **数据验证** - express-validator + Joi双重验证
- **索引优化** - 复合索引、文本搜索索引

### 📁 文件管理
- **多类型支持** - 图片、文档、视频、音频
- **图片处理** - 自动压缩、尺寸调整、格式转换
- **批量上传** - 支持多文件同时上传
- **文件统计** - 详细的存储使用统计

### 🔔 通知系统
- **多类型通知** - 信息、成功、警告、错误、系统
- **多渠道推送** - 应用内、邮件、推送通知
- **实时推送** - Redis Pub/Sub实时通知
- **免打扰设置** - 可配置的免打扰时间

### 📊 任务队列
- **异步处理** - 邮件发送、文件处理、数据同步
- **任务调度** - 支持延迟任务和定时任务
- **失败重试** - 智能重试机制，指数退避
- **队列监控** - 实时队列状态监控

### 📝 日志系统
- **结构化日志** - Winston多级别日志记录
- **日志轮转** - 按日期和大小自动轮转
- **分类日志** - 错误、HTTP、审计、性能日志
- **日志分析** - 支持日志查询和统计

### 🎯 管理功能
- **系统仪表板** - 用户、内容、系统状态统计
- **用户管理** - 角色分配、状态控制、批量操作
- **内容审核** - 文章状态管理、特色内容设置
- **系统监控** - 健康检查、性能监控、队列状态

## 🛠️ 技术架构

### 核心技术栈
- **运行时**: Node.js >= 18.0.0
- **Web框架**: Express.js 4.18.2
- **数据库**: MongoDB + Mongoose 8.17.2
- **缓存**: Redis + ioredis 5.3.2
- **任务队列**: Bull 4.12.2
- **日志系统**: Winston 3.11.0
- **认证**: JWT + Passport
- **文档**: Swagger/OpenAPI 3.0

### 架构特点
- **模块化设计** - 清晰的目录结构和职责分离
- **中间件架构** - 可插拔的中间件系统
- **异步处理** - 非阻塞I/O，高并发支持
- **缓存策略** - 多层缓存，性能优化
- **安全防护** - 多层次安全机制

## 📋 系统要求

### 环境要求
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **MongoDB**: >= 5.0
- **Redis**: >= 6.0

### 操作系统
- **macOS**: 10.15+
- **Linux**: Ubuntu 18.04+, CentOS 7+
- **Windows**: Windows 10+ (WSL2推荐)

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd enterprise-scaffold
```

### 2. 安装依赖
```bash
npm install
```

### 3. 环境配置
```bash
# 复制环境变量模板
cp env.example .env

# 编辑环境变量
vim .env
```

### 4. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 5. 访问应用
- **API服务**: http://localhost:3000
- **API文档**: http://localhost:3000/api-docs
- **健康检查**: http://localhost:3000/health

## ⚙️ 环境配置

### 基础配置
```bash
# 应用配置
NODE_ENV=development
PORT=3000
APP_NAME=Enterprise Scaffold

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/enterprise-scaffold
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### 安全配置
```bash
# 安全设置
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=your-session-secret
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# 限流配置
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

### 第三方服务
```bash
# 邮件服务
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 支付服务
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-key

# AWS服务
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

## 📁 项目结构

```
enterprise-scaffold/
├── src/                          # 源代码目录
│   ├── app.js                    # 应用入口文件
│   ├── config/                   # 配置文件
│   │   ├── database.js           # 数据库配置
│   │   ├── redis.js              # Redis配置
│   │   ├── logger.js             # 日志配置
│   │   └── queue.js              # 任务队列配置
│   ├── models/                   # 数据模型
│   │   ├── User.js               # 用户模型
│   │   └── Post.js               # 文章模型
│   ├── routes/                   # 路由文件
│   │   ├── auth.js               # 认证路由
│   │   ├── users.js              # 用户路由
│   │   ├── posts.js              # 文章路由
│   │   ├── admin.js              # 管理路由
│   │   ├── upload.js             # 文件上传路由
│   │   ├── notifications.js      # 通知路由
│   │   └── health.js             # 健康检查路由
│   ├── middleware/               # 中间件
│   │   ├── auth.js               # 认证中间件
│   │   ├── errorHandler.js       # 错误处理中间件
│   │   └── validation.js         # 数据验证中间件
│   └── utils/                    # 工具函数
│       ├── jwt.js                # JWT工具
│       └── seedData.js           # 种子数据
├── scripts/                      # 脚本文件
│   ├── db-manager.js             # 数据库管理脚本
│   └── setup-mongodb.sh          # MongoDB安装脚本
├── logs/                         # 日志文件目录
├── uploads/                      # 上传文件目录
├── package.json                  # 项目配置
├── env.example                   # 环境变量模板
└── README.md                     # 项目文档
```

## 🔧 开发命令

### 基础命令
```bash
# 启动开发服务器
npm run dev

# 启动生产服务器
npm start

# 运行测试
npm test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

### 数据库命令
```bash
# 数据库统计
npm run db:stats

# 数据库迁移
npm run db:migrate

# 数据库备份
npm run db:backup

# 种子数据
npm run seed
```

### 部署命令
```bash
# 构建项目
npm run build

# Docker构建
npm run docker:build

# Docker运行
npm run docker:run

# PM2启动
npm run pm2:start

# PM2监控
npm run pm2:monit
```

### 文档命令
```bash
# 生成API文档
npm run docs:generate

# 启动文档服务
npm run docs:serve
```

## 📚 API接口

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新令牌
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/change-password` - 修改密码
- `POST /api/auth/logout` - 用户登出

### 用户管理
- `GET /api/users` - 获取用户列表
- `GET /api/users/:id` - 获取用户详情
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户信息
- `DELETE /api/users/:id` - 删除用户

### 内容管理
- `GET /api/posts` - 获取文章列表
- `GET /api/posts/:id` - 获取文章详情
- `POST /api/posts` - 创建文章
- `PUT /api/posts/:id` - 更新文章
- `DELETE /api/posts/:id` - 删除文章
- `GET /api/posts/search/:keyword` - 搜索文章

### 文件上传
- `POST /api/upload/image` - 上传图片
- `POST /api/upload/document` - 上传文档
- `POST /api/upload/avatar` - 上传头像
- `POST /api/upload/multiple` - 批量上传
- `DELETE /api/upload/delete/:filename` - 删除文件
- `GET /api/upload/stats` - 上传统计

### 通知系统
- `GET /api/notifications` - 获取通知列表
- `GET /api/notifications/unread` - 获取未读数量
- `PUT /api/notifications/:id/read` - 标记已读
- `PUT /api/notifications/read-all` - 全部标记已读
- `DELETE /api/notifications/:id` - 删除通知
- `DELETE /api/notifications/clear` - 清空通知

### 管理接口
- `GET /api/admin/dashboard` - 管理仪表板
- `GET /api/admin/users` - 用户管理
- `PUT /api/admin/users/:id/role` - 更新用户角色
- `PUT /api/admin/users/:id/status` - 更新用户状态
- `GET /api/admin/system/health` - 系统健康检查
- `GET /api/admin/queue/:name/stats` - 队列统计

## 🔒 安全特性

### 认证安全
- JWT令牌过期机制
- 刷新令牌轮换
- 密码强度验证
- 账户锁定保护

### 访问控制
- 基于角色的权限控制
- API访问频率限制
- 慢速请求防护
- 暴力攻击防护

### 数据安全
- 输入数据验证
- SQL注入防护
- XSS攻击防护
- CSRF攻击防护

### 传输安全
- HTTPS强制
- 安全HTTP头
- CORS策略控制
- 敏感信息脱敏

## 📊 性能优化

### 缓存策略
- Redis内存缓存
- 数据库查询缓存
- 静态资源缓存
- 会话数据缓存

### 异步处理
- 任务队列处理
- 非阻塞I/O
- 并发控制
- 资源池管理

### 数据库优化
- 索引优化
- 查询优化
- 连接池管理
- 读写分离

### 响应优化
- 响应压缩
- 分页查询
- 懒加载
- 预加载

## 🧪 测试

### 测试框架
- **Jest** - 单元测试框架
- **Supertest** - HTTP断言库
- **Faker** - 测试数据生成

### 测试命令
```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 端到端测试
npm run test:e2e
```

### 测试结构
```
tests/
├── unit/              # 单元测试
├── integration/       # 集成测试
├── e2e/              # 端到端测试
└── fixtures/          # 测试数据
```

## 🚀 部署

### 环境部署
```bash
# 生产环境
NODE_ENV=production
PORT=3000

# 启动服务
npm start
```

### PM2部署
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 监控应用
pm2 monit

# 查看日志
pm2 logs
```

### Docker部署
```bash
# 构建镜像
docker build -t enterprise-scaffold .

# 运行容器
docker run -p 3000:3000 enterprise-scaffold

# Docker Compose
docker-compose up -d
```

### Kubernetes部署
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enterprise-scaffold
spec:
  replicas: 3
  selector:
    matchLabels:
      app: enterprise-scaffold
  template:
    metadata:
      labels:
        app: enterprise-scaffold
    spec:
      containers:
      - name: app
        image: enterprise-scaffold:latest
        ports:
        - containerPort: 3000
```

## 📈 监控与日志

### 系统监控
- 应用性能监控
- 数据库性能监控
- 队列状态监控
- 系统资源监控

### 日志管理
- 结构化日志记录
- 日志级别控制
- 日志轮转管理
- 日志查询分析

### 健康检查
- 服务健康状态
- 依赖服务检查
- 性能指标收集
- 告警通知机制

## 🤝 贡献指南

### 开发流程
1. Fork项目
2. 创建功能分支
3. 提交代码
4. 创建Pull Request

### 代码规范
- 使用ESLint进行代码检查
- 使用Prettier进行代码格式化
- 遵循约定式提交规范
- 编写完整的测试用例

### 提交规范
```bash
# 提交类型
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

## 📞 联系方式

- **项目维护者**: Enterprise Team
- **邮箱**: team@enterprise.com
- **项目地址**: [GitHub Repository](https://github.com/your-org/enterprise-scaffold)
- **问题反馈**: [Issues](https://github.com/your-org/enterprise-scaffold/issues)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和开源社区。

---

**⭐ 如果这个项目对您有帮助，请给我们一个星标！**
