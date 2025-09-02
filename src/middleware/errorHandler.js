const { logger } = require('../config/logger');
const { 
  AppError, 
  ValidationError, 
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError
} = require('../errors/AppError');

// 异步错误处理包装器
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 全局错误处理中间件
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  logger.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // 处理不同类型的错误
  if (err.name === 'ValidationError') {
    // Mongoose 验证错误
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ValidationError(message);
  } else if (err.code === 11000) {
    // Mongoose 重复键错误
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} 已存在，请使用其他值`;
    error = new ConflictError(message);
  } else if (err.name === 'CastError') {
    // Mongoose 无效ID错误
    error = new ValidationError('无效的ID格式');
  } else if (err.name === 'JsonWebTokenError') {
    // JWT 错误
    error = new AuthenticationError('无效的访问令牌');
  } else if (err.name === 'TokenExpiredError') {
    // JWT 过期错误
    error = new AuthenticationError('访问令牌已过期');
  } else if (err.name === 'MongoError') {
    // MongoDB 错误
    error = new DatabaseError('数据库操作失败');
  } else if (err.name === 'MongooseServerSelectionError') {
    // MongoDB 连接错误
    error = new DatabaseError('数据库连接失败');
  } else if (err.name === 'RedisError') {
    // Redis 错误
    error = new ExternalServiceError('缓存服务异常');
  } else if (err.name === 'MulterError') {
    // 文件上传错误
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new ValidationError('文件大小超出限制');
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      error = new ValidationError('文件数量超出限制');
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error = new ValidationError('不支持的文件类型');
    } else {
      error = new ValidationError('文件上传失败');
    }
  } else if (err.name === 'RateLimitError') {
    // 限流错误
    error = new RateLimitError(err.message);
  }

  // 设置默认状态码和消息
  const statusCode = error.statusCode || 500;
  const message = error.message || '服务器内部错误';

  // 构建错误响应
  const errorResponse = {
    success: false,
    error: {
      message,
      statusCode,
      status: error.status || 'error'
    }
  };

  // 开发环境添加额外信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.name = err.name;
    errorResponse.error.details = {
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    };
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
};

// 404 错误处理
const notFound = (req, res, next) => {
  const error = new NotFoundError(`接口 ${req.originalUrl} 不存在`);
  next(error);
};

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  logger.error('未捕获的异常:', err);
  process.exit(1);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (err) => {
  logger.error('未处理的Promise拒绝:', err);
  process.exit(1);
});

module.exports = {
  asyncHandler,
  globalErrorHandler,
  notFound
};
