const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

// 数据库连接
const connectDB = require('./config/database');
// Redis连接
const connectRedis = require('./config/redis');
// 日志配置
const logger = require('./config/logger');
// 任务队列
const queue = require('./config/queue');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// 压缩中间件
app.use(compression());

// CORS配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 请求限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试',
    retryAfter: Math.ceil(15 * 60 / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 慢速限流
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15分钟
  delayAfter: 50, // 50个请求后开始延迟
  delayMs: 500 // 每个请求延迟500ms
});

app.use('/api/', limiter, speedLimiter);

// 日志中间件
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '企业级API脚手架',
      version: '1.0.0',
      description: '企业级Node.js项目脚手架API文档',
      contact: {
        name: 'Enterprise Team',
        email: 'team@enterprise.com'
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: '开发环境'
        }
      ]
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 健康检查
app.use('/health', require('./routes/health'));

// API路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/notifications', require('./routes/notifications'));

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '欢迎使用企业级Node.js脚手架API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      docs: '/api-docs',
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      admin: '/api/admin',
      upload: '/api/upload',
      notifications: '/api/notifications'
    },
    timestamp: new Date().toISOString()
  });
});

// 404处理
const { notFound } = require('./middleware/errorHandler');
app.use('*', notFound);

// 错误处理中间件
const { globalErrorHandler } = require('./middleware/errorHandler');
app.use(globalErrorHandler);

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDB();
    logger.info('✅ MongoDB连接成功');
    
    // 连接Redis
    await connectRedis();
    logger.info('✅ Redis连接成功');
    
    // 启动任务队列
    await queue.start();
    logger.info('✅ 任务队列启动成功');
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      logger.info(`🚀 服务器运行在 http://localhost:${PORT}`);
      logger.info(`📚 API文档: http://localhost:${PORT}/api-docs`);
      logger.info(`🗄️ 数据库: MongoDB + Redis`);
      logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
