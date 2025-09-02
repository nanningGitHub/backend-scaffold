const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const compression = require('compression');
const { logger } = require('../config/logger');
const express = require('express');

/**
 * 中间件工厂
 * 统一管理所有中间件配置
 */
class MiddlewareFactory {
  /**
   * 安全中间件
   */
  static security() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https:"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    });
  }

  /**
   * CORS中间件
   */
  static cors() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001'
    ];

    return cors({
      origin: (origin, callback) => {
        // 允许没有origin的请求（如移动应用）
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('不允许的跨域请求'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'X-API-Key',
        'X-Client-Version'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      maxAge: 86400 // 24小时
    });
  }

  /**
   * 限流中间件
   */
  static rateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 限制每个IP 15分钟内最多100个请求
      message: {
        success: false,
        error: {
          message: '请求过于频繁，请稍后再试',
          statusCode: 429,
          retryAfter: Math.ceil(15 * 60 / 1000)
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // 跳过健康检查和API文档
        return req.path === '/health' || req.path.startsWith('/api-docs');
      }
    });
  }

  /**
   * 慢速限流中间件
   */
  static slowDown() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15分钟
      delayAfter: 50, // 50个请求后开始延迟
      delayMs: () => 500, // 每个请求延迟500ms
      maxDelayMs: 20000, // 最大延迟20秒
      skip: (req) => {
        // 跳过健康检查和API文档
        return req.path === '/health' || req.path.startsWith('/api-docs');
      }
    });
  }

  /**
   * 压缩中间件
   */
  static compression() {
    return compression({
      level: 6, // 压缩级别
      threshold: 1024, // 最小压缩大小
      filter: (req, res) => {
        // 只压缩特定类型的响应
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    });
  }

  /**
   * 日志中间件
   */
  static logging() {
    return morgan('combined', { 
      stream: { 
        write: message => logger.info(message.trim()) 
      },
      skip: (req) => {
        // 跳过健康检查的日志
        return req.path === '/health';
      }
    });
  }

  /**
   * 请求体解析中间件
   */
  static bodyParser() {
    return [
      // JSON解析
      (req, res, next) => {
        if (req.headers['content-type'] === 'application/json') {
          express.json({ limit: '10mb' })(req, res, next);
        } else {
          next();
        }
      },
      // URL编码解析
      (req, res, next) => {
        if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
          express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
        } else {
          next();
        }
      }
    ];
  }

  /**
   * 请求ID中间件
   */
  static requestId() {
    return (req, res, next) => {
      req.id = req.headers['x-request-id'] || 
               req.headers['x-correlation-id'] || 
               `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      res.setHeader('X-Request-ID', req.id);
      next();
    };
  }

  /**
   * 响应时间中间件
   */
  static responseTime() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('请求响应时间', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          requestId: req.id
        });
      });
      
      next();
    };
  }

  /**
   * 错误边界中间件
   */
  static errorBoundary() {
    return (err, req, res, next) => {
      // 记录错误
      logger.error('中间件错误:', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        requestId: req.id
      });

      // 如果是CORS错误，返回特定响应
      if (err.message === '不允许的跨域请求') {
        return res.status(403).json({
          success: false,
          error: {
            message: '跨域请求被拒绝',
            statusCode: 403
          }
        });
      }

      next(err);
    };
  }

  /**
   * 获取所有中间件
   */
  static getAll() {
    return [
      this.requestId(),
      this.responseTime(),
      this.security(),
      this.cors(),
      this.compression(),
      this.logging(),
      this.rateLimit(),
      this.slowDown(),
      ...this.bodyParser(),
      this.errorBoundary()
    ];
  }
}

module.exports = MiddlewareFactory;
