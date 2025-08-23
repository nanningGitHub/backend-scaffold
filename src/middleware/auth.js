const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const { AppError } = require('./errorHandler');
const User = require('../models/User');

/**
 * JWT认证中间件
 */
const authenticate = async (req, res, next) => {
  try {
    // 提取令牌
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      return next(new AppError('访问令牌缺失，请先登录', 401));
    }

    // 验证令牌
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('访问令牌已过期，请重新登录', 401));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(new AppError('无效的访问令牌', 401));
      }
      return next(new AppError('令牌验证失败', 401));
    }

    // 获取用户信息
    const user = await User.findById(decoded.id).select('-__v');
    if (!user) {
      return next(new AppError('用户不存在或已被删除', 401));
    }

    // 检查用户状态
    if (!user.isActive) {
      return next(new AppError('用户账户已被禁用', 401));
    }

    // 将用户信息添加到请求对象
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    next(new AppError('认证过程出现错误', 500));
  }
};

/**
 * 角色权限验证中间件
 * @param  {...string} roles - 允许的角色列表
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('请先通过身份验证', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('权限不足，无法访问此资源', 403));
    }

    next();
  };
};

/**
 * requireRole 是 authorize 的别名，保持向后兼容性
 */
const requireRole = authorize;

/**
 * 可选认证中间件（不强制要求登录）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id).select('-__v');
        
        if (user && user.isActive) {
          req.user = user;
          req.userId = user._id;
        }
      } catch (error) {
        // 可选认证失败时不抛出错误，继续执行
        console.warn('可选认证失败:', error.message);
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

/**
 * 检查是否为资源所有者或管理员
 */
const checkResourceOwnership = (resourceUserIdField = 'author') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('请先通过身份验证', 401));
    }

    // 管理员可以访问所有资源
    if (req.user.role === 'admin') {
      return next();
    }

    // 检查资源所有权
    const resourceUserId = req.resource ? req.resource[resourceUserIdField] : null;
    
    if (!resourceUserId) {
      return next(new AppError('无法确定资源所有权', 400));
    }

    if (resourceUserId.toString() !== req.userId.toString()) {
      return next(new AppError('只能操作自己的资源', 403));
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requireRole,
  optionalAuth,
  checkResourceOwnership
};
