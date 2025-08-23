// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

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
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Mongoose 重复键错误
  if (err.code === 11000) {
    const message = '数据重复，请检查输入';
    error = new AppError(message, 400);
  }

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400);
  }

  // Mongoose 无效ID错误
  if (err.name === 'CastError') {
    const message = '无效的ID格式';
    error = new AppError(message, 400);
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的token';
    error = new AppError(message, 401);
  }

  // JWT 过期错误
  if (err.name === 'TokenExpiredError') {
    const message = 'token已过期';
    error = new AppError(message, 401);
  }

  // 默认错误响应
  const statusCode = error.statusCode || 500;
  const message = error.message || '服务器内部错误';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 错误处理
const notFound = (req, res, next) => {
  const error = new AppError(`接口 ${req.originalUrl} 不存在`, 404);
  next(error);
};

module.exports = {
  AppError,
  asyncHandler,
  globalErrorHandler,
  notFound
};
