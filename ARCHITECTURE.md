
# 🏗️ 项目架构设计文档

## 📋 架构概览

本项目采用**分层架构**设计，遵循**单一职责**、**开闭原则**、**依赖倒置**等设计原则，实现了高内聚、低耦合的代码结构。

## 🏛️ 架构层次

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP 请求层                               │
├─────────────────────────────────────────────────────────────┤
│                    路由层 (Routes)                          │
├─────────────────────────────────────────────────────────────┤
│                   控制器层 (Controllers)                     │
├─────────────────────────────────────────────────────────────┤
│                    服务层 (Services)                        │
├─────────────────────────────────────────────────────────────┤
│                   数据访问层 (Models)                        │
├─────────────────────────────────────────────────────────────┤
│                    数据库层 (MongoDB/Redis)                  │
└─────────────────────────────────────────────────────────────┘
```

## 📁 目录结构

```
src/
├── app.js                    # 🚪 应用入口
├── config/                   # ⚙️ 配置文件
│   ├── database.js          # 数据库配置
│   ├── redis.js             # Redis配置
│   ├── logger.js             # 日志配置
│   └── queue.js              # 任务队列配置
├── controllers/              # 🎮 控制器层
│   ├── UserController.js     # 用户控制器
│   ├── AuthController.js     # 认证控制器
│   └── ...
├── services/                 # 🔧 服务层
│   ├── UserService.js        # 用户服务
│   ├── AuthService.js        # 认证服务
│   └── ...
├── models/                   # 🗃️ 数据模型层
│   ├── User.js              # 用户模型
│   ├── Post.js              # 文章模型
│   └── ...
├── routes/                   # 🛣️ 路由层
│   ├── users.js             # 用户路由
│   ├── auth.js              # 认证路由
│   └── ...
├── middleware/               # 🔌 中间件层
│   ├── index.js             # 中间件工厂
│   ├── auth.js              # 认证中间件
│   ├── validation.js        # 验证中间件
│   └── errorHandler.js      # 错误处理中间件
├── errors/                   # ❌ 错误定义
│   └── AppError.js          # 应用错误类
└── utils/                    # 🛠️ 工具函数
    ├── ResponseHandler.js    # 响应处理工具
    ├── jwt.js               # JWT工具
    └── ...
```

## 🔄 数据流

### 1. **请求处理流程**
```
HTTP请求 → 中间件链 → 路由 → 控制器 → 服务 → 模型 → 数据库
    ↓
HTTP响应 ← 控制器 ← 服务 ← 模型 ← 数据库
```

### 2. **错误处理流程**
```
错误发生 → 服务层捕获 → 控制器传递 → 错误处理中间件 → 统一响应
```

## 🧩 核心组件

### 1. **中间件工厂 (MiddlewareFactory)**

**职责**: 统一管理所有中间件配置
**特点**: 
- 模块化配置
- 易于维护和扩展
- 支持条件性应用

```javascript
// 使用示例
const MiddlewareFactory = require('./middleware');
MiddlewareFactory.getAll().forEach(middleware => {
  app.use(middleware);
});
```

**包含的中间件**:
- 安全中间件 (Helmet)
- CORS中间件
- 限流中间件
- 压缩中间件
- 日志中间件
- 请求ID中间件
- 响应时间中间件

### 2. **控制器层 (Controllers)**

**职责**: 处理HTTP请求和响应
**特点**:
- 只负责HTTP层面的逻辑
- 调用服务层处理业务逻辑
- 统一的错误处理

```javascript
class UserController {
  static async getAllUsers(req, res, next) {
    try {
      const result = await UserService.getAllUsers(req.query);
      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### 3. **服务层 (Services)**

**职责**: 处理业务逻辑
**特点**:
- 包含所有业务规则
- 数据验证和转换
- 调用多个模型或外部服务

```javascript
class UserService {
  static async createUser(userData) {
    try {
      // 业务逻辑验证
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new AppError('该邮箱已被注册', 400);
      }

      // 创建用户
      const user = new User(userData);
      const savedUser = await user.save();
      
      return savedUser.getPublicProfile();
    } catch (error) {
      throw new AppError('创建用户失败', 500);
    }
  }
}
```

### 4. **数据模型层 (Models)**

**职责**: 数据结构和数据库操作
**特点**:
- 定义数据模式
- 提供数据验证
- 封装数据库操作

```javascript
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '姓名是必填项'],
    trim: true,
    minlength: [2, '姓名长度不能少于2个字符']
  },
  // ... 其他字段
});

// 实例方法
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};
```

### 5. **错误处理系统**

**职责**: 统一处理所有类型的错误
**特点**:
- 分层错误处理
- 详细的错误分类
- 开发和生产环境差异化

```javascript
// 错误分类
class ValidationError extends AppError {
  constructor(message = '数据验证失败') {
    super(message, 400, true);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(message, 401, true);
    this.name = 'AuthenticationError';
  }
}
```

### 6. **响应处理工具 (ResponseHandler)**

**职责**: 提供标准化的API响应格式
**特点**:
- 统一的响应结构
- 支持多种响应类型
- 易于维护和扩展

```javascript
// 成功响应
ResponseHandler.success(res, data, '操作成功');

// 分页响应
ResponseHandler.paginated(res, data, pagination, '获取成功');

// 错误响应
ResponseHandler.error(res, '操作失败', 400);
```

## 🔐 安全架构

### 1. **认证系统**
- JWT双令牌机制 (访问令牌 + 刷新令牌)
- 基于角色的访问控制 (RBAC)
- 密码加密存储 (bcrypt)

### 2. **安全防护**
- Helmet安全头设置
- CORS跨域控制
- 请求限流和慢速限流
- 输入验证和清理

### 3. **权限控制**
```javascript
// 角色定义
const roles = {
  user: '普通用户',
  moderator: '版主',
  admin: '管理员'
};

// 权限检查
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError('权限不足'));
    }
    next();
  };
};
```

## 📊 性能优化

### 1. **数据库优化**
- 连接池管理
- 索引优化
- 查询优化

### 2. **缓存策略**
- Redis缓存
- 内存缓存
- 缓存失效策略

### 3. **异步处理**
- 任务队列 (Bull)
- 异步操作
- 非阻塞I/O

## 🧪 测试架构

### 1. **测试层次**
- 单元测试 (Services, Controllers)
- 集成测试 (API Endpoints)
- 端到端测试 (完整流程)

### 2. **测试工具**
- Jest测试框架
- Supertest API测试
- 测试数据工厂

## 🚀 部署架构

### 1. **环境配置**
- 多环境支持 (开发、测试、生产)
- 环境变量管理
- 配置文件分离

### 2. **容器化**
- Docker支持
- Docker Compose
- 多阶段构建

### 3. **进程管理**
- PM2进程管理
- 集群模式
- 健康检查

## 🔄 扩展性设计

### 1. **模块化设计**
- 功能模块独立
- 接口标准化
- 插件化架构

### 2. **微服务准备**
- 服务边界清晰
- 接口版本控制
- 服务发现支持

### 3. **水平扩展**
- 无状态设计
- 负载均衡支持
- 数据库分片准备

## 📈 监控和日志

### 1. **日志系统**
- 结构化日志 (Winston)
- 日志分级
- 日志轮转

### 2. **性能监控**
- 请求响应时间
- 内存使用情况
- 数据库性能

### 3. **错误追踪**
- 错误分类统计
- 堆栈跟踪
- 错误上下文

## 🎯 架构优势

### 1. **可维护性**
- 清晰的代码结构
- 单一职责原则
- 易于理解和修改

### 2. **可扩展性**
- 模块化设计
- 接口标准化
- 支持水平扩展

### 3. **可测试性**
- 依赖注入
- 接口抽象
- 单元测试友好

### 4. **性能优化**
- 异步处理
- 缓存策略
- 数据库优化

## 🔮 未来改进方向

### 1. **短期改进**
- 添加Repository模式
- 实现依赖注入容器
- 增加事件驱动架构

### 2. **中期改进**
- GraphQL支持
- 微服务架构
- 实时通信 (WebSocket)

### 3. **长期改进**
- 分布式系统
- 服务网格
- 云原生架构

## 📚 学习要点

### 1. **架构原则**
- 分层架构设计
- 依赖倒置原则
- 接口隔离原则

### 2. **设计模式**
- 工厂模式 (中间件工厂)
- 策略模式 (错误处理)
- 模板方法模式 (响应处理)

### 3. **最佳实践**
- 错误处理策略
- 日志记录规范
- 安全防护措施

---

**🎉 这个架构设计展示了现代Node.js应用的最佳实践，适合学习和生产使用！**
