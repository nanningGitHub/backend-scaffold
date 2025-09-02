const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

// 导入中间件工厂
const MiddlewareFactory = require('./middleware');

// 数据库连接
const connectDB = require('./config/database');
// Redis连接
const redisClient = require('./config/redis');
// 日志配置
const { logger } = require('./config/logger');
// 任务队列
const queue = require('./config/queue');

const app = express();
const PORT = process.env.PORT || 3000;

// 应用中间件工厂
MiddlewareFactory.getAll().forEach(middleware => {
  app.use(middleware);
});

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
  apis: ['./src/routes/*.js', './src/controllers/*.js']
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
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

// 404处理
const { notFound } = require('./middleware/errorHandler');
app.use('*', notFound);

// 错误处理中间件
const { globalErrorHandler } = require('./middleware/errorHandler');
app.use(globalErrorHandler);

// 优雅关闭
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    // 关闭任务队列
    if (queue && typeof queue.stop === 'function') {
      await queue.stop();
      logger.info('任务队列已关闭');
    }
    
    // 关闭数据库连接
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('数据库连接已关闭');
    }
    
    // 关闭Redis连接
    if (redisClient && typeof redisClient.disconnect === 'function') {
      await redisClient.disconnect();
      logger.info('Redis连接已关闭');
    }
    
    logger.info('所有连接已关闭，进程退出');
    process.exit(0);
  } catch (error) {
    logger.error('优雅关闭过程中发生错误:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDB();
    logger.info('✅ MongoDB连接成功');
    
    // 连接Redis
    await redisClient.connect();
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
      logger.info(`🔧 架构: 分层架构 + 中间件工厂`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
