const { body, param, query, validationResult } = require('express-validator');

// 验证结果处理中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: '数据验证失败',
      details: errors.array()
    });
  }
  next();
};

// 用户相关验证规则
const validateUser = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('姓名长度必须在2-50个字符之间'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址'),
  body('age')
    .isInt({ min: 1, max: 120 })
    .withMessage('年龄必须是1-120之间的整数'),
  handleValidationErrors
];

// 文章相关验证规则
const validatePost = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('标题长度必须在1-200个字符之间'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 10000 })
    .withMessage('内容长度必须在10-10000个字符之间'),
  body('author')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('作者姓名长度必须在2-50个字符之间'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组格式'),
  handleValidationErrors
];

// ID参数验证
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数'),
  handleValidationErrors
];

// 分页查询验证
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
  handleValidationErrors
];

module.exports = {
  validateUser,
  validatePost,
  validateId,
  validatePagination,
  handleValidationErrors
};
