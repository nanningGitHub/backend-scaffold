const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidationErrors } = require('../middleware/validation');
const { generateTokenPair, verifyToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');

// 注册验证规则
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('姓名长度必须在2-50个字符之间'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度不能少于6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  body('age')
    .isInt({ min: 1, max: 120 })
    .withMessage('年龄必须是1-120之间的整数'),
  handleValidationErrors
];

// 登录验证规则
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
  handleValidationErrors
];

// 用户注册
router.post('/register', validateRegister, asyncHandler(async (req, res) => {
  const { name, email, password, age } = req.body;

  // 检查邮箱是否已存在
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: '该邮箱已被注册'
    });
  }

  // 创建新用户
  const user = new User({
    name,
    email,
    password,
    age
  });

  const savedUser = await user.save();

  // 生成令牌
  const tokens = generateTokenPair(savedUser);

  res.status(201).json({
    success: true,
    message: '注册成功',
    data: {
      user: savedUser.getPublicProfile(),
      ...tokens
    }
  });
}));

// 用户登录
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 查找用户（包含密码字段）
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: '邮箱或密码错误'
    });
  }

  // 检查用户状态
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      error: '账户已被禁用，请联系管理员'
    });
  }

  // 验证密码
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: '邮箱或密码错误'
    });
  }

  // 生成令牌
  const tokens = generateTokenPair(user);

  res.json({
    success: true,
    message: '登录成功',
    data: {
      user: user.getPublicProfile(),
      ...tokens
    }
  });
}));

// 刷新令牌
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: '刷新令牌不能为空'
    });
  }

  try {
    // 验证刷新令牌
    const decoded = verifyToken(refreshToken);
    
    // 获取用户信息
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: '用户不存在或已被禁用'
      });
    }

    // 生成新的令牌对
    const tokens = generateTokenPair(user);

    res.json({
      success: true,
      message: '令牌刷新成功',
      data: tokens
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: '刷新令牌已过期，请重新登录'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: '无效的刷新令牌'
    });
  }
}));

// 获取当前用户信息
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user.getPublicProfile()
  });
}));

// 修改密码
router.put('/change-password', 
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('当前密码不能为空'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('新密码长度不能少于6个字符')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('新密码必须包含至少一个小写字母、一个大写字母和一个数字'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // 获取用户（包含密码）
    const user = await User.findById(req.userId).select('+password');
    
    // 验证当前密码
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: '当前密码不正确'
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密码修改成功'
    });
  })
);

// 用户登出（客户端处理，服务端记录日志）
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // 在实际应用中，可以将令牌加入黑名单
  console.log(`用户登出: ${req.user.email} at ${new Date().toISOString()}`);
  
  res.json({
    success: true,
    message: '登出成功'
  });
}));

module.exports = router;
