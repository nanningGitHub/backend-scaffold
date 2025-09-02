const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const AuthController = require('../controllers/AuthController');

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

// 修改密码验证规则
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度不能少于6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('新密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  handleValidationErrors
];

// 用户注册
router.post('/register', 
  validateRegister, 
  asyncHandler(AuthController.register)
);

// 用户登录
router.post('/login', 
  validateLogin, 
  asyncHandler(AuthController.login)
);

// 刷新令牌
router.post('/refresh', 
  asyncHandler(AuthController.refreshToken)
);

// 获取当前用户信息
router.get('/me', 
  authenticate, 
  asyncHandler(AuthController.getCurrentUser)
);

// 修改密码
router.put('/change-password', 
  authenticate,
  validateChangePassword,
  asyncHandler(AuthController.changePassword)
);

// 用户登出
router.post('/logout', 
  authenticate, 
  asyncHandler(AuthController.logout)
);

module.exports = router;
