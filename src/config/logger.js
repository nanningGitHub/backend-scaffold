const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// 日志级别定义
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志颜色定义
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 添加颜色支持
winston.addColors(colors);

// 日志格式定义
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// 文件日志格式（无颜色）
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// 日志目录
const logDir = path.join(process.cwd(), 'logs');

// 创建日志传输器
const transports = [
  // 控制台输出
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: process.env.LOG_LEVEL || 'info'
  }),

  // 错误日志文件
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }),

  // 所有日志文件
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true,
  }),

  // HTTP请求日志
  new DailyRotateFile({
    filename: path.join(logDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '7d',
    zippedArchive: true,
  }),
];

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// 开发环境下的额外配置
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 生产环境下的额外配置
if (process.env.NODE_ENV === 'production') {
  // 生产环境不输出debug日志
  logger.level = 'info';
  
  // 添加错误处理
  logger.on('error', (error) => {
    console.error('Logger error:', error);
  });
}

// 创建HTTP请求日志记录器
const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true,
    })
  ]
});

// 创建审计日志记录器
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      zippedArchive: true,
    })
  ]
});

// 创建性能日志记录器
const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    })
  ]
});

// 日志工具函数
const logUtils = {
  // 记录HTTP请求
  logHttp: (req, res, responseTime) => {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    };
    
    httpLogger.http('HTTP Request', logData);
  },

  // 记录审计日志
  logAudit: (action, userId, resource, details = {}) => {
    const logData = {
      action,
      userId,
      resource,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip || 'unknown'
    };
    
    auditLogger.info('Audit Log', logData);
  },

  // 记录性能日志
  logPerformance: (operation, duration, metadata = {}) => {
    const logData = {
      operation,
      duration: `${duration}ms`,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    performanceLogger.info('Performance Log', logData);
  },

  // 记录安全事件
  logSecurity: (event, details = {}) => {
    const logData = {
      event,
      details,
      timestamp: new Date().toISOString(),
      severity: details.severity || 'medium'
    };
    
    logger.warn('Security Event', logData);
  },

  // 记录业务事件
  logBusiness: (event, userId, details = {}) => {
    const logData = {
      event,
      userId,
      details,
      timestamp: new Date().toISOString()
    };
    
    logger.info('Business Event', logData);
  }
};

// 中间件：请求日志记录
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // 响应完成后记录日志
  res.on('finish', () => {
    const duration = Date.now() - start;
    logUtils.logHttp(req, res, duration);
  });
  
  next();
};

// 中间件：错误日志记录
const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  next(err);
};

// 导出
module.exports = {
  logger,
  httpLogger,
  auditLogger,
  performanceLogger,
  logUtils,
  requestLogger,
  errorLogger
};
