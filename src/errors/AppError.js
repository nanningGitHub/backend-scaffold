class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    
    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }
}

// 具体的错误类型
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

class AuthorizationError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, true);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404, true);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409, true);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = '请求过于频繁') {
    super(message, 429, true);
    this.name = 'RateLimitError';
  }
}

class DatabaseError extends AppError {
  constructor(message = '数据库操作失败') {
    super(message, 500, false);
    this.name = 'DatabaseError';
  }
}

class ExternalServiceError extends AppError {
  constructor(message = '外部服务调用失败') {
    super(message, 502, false);
    this.name = 'ExternalServiceError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError
};
