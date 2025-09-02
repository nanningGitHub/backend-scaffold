const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../errors/AppError');

// 验证结果处理中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    throw new ValidationError('数据验证失败', validationErrors);
  }
  next();
};

// 用户相关验证规则
const validateUser = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('姓名长度必须在2-50个字符之间')
    .matches(/^[a-zA-Z\u4e00-\u9fa5\s]+$/)
    .withMessage('姓名只能包含字母、中文和空格'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址')
    .isLength({ max: 100 })
    .withMessage('邮箱长度不能超过100个字符'),
  body('age')
    .isInt({ min: 1, max: 120 })
    .withMessage('年龄必须是1-120之间的整数'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('头像必须是有效的URL地址'),
  body('role')
    .optional()
    .isIn(['user', 'admin', 'moderator'])
    .withMessage('角色必须是 user、admin 或 moderator'),
  handleValidationErrors
];

// 用户更新验证规则
const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('姓名长度必须在2-50个字符之间')
    .matches(/^[a-zA-Z\u4e00-\u9fa5\s]+$/)
    .withMessage('姓名只能包含字母、中文和空格'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址')
    .isLength({ max: 100 })
    .withMessage('邮箱长度不能超过100个字符'),
  body('age')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('年龄必须是1-120之间的整数'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('头像必须是有效的URL地址'),
  body('role')
    .optional()
    .isIn(['user', 'admin', 'moderator'])
    .withMessage('角色必须是 user、admin 或 moderator'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive 必须是布尔值'),
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
    .isArray({ min: 0, max: 10 })
    .withMessage('标签必须是数组格式，最多10个标签'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('每个标签长度必须在1-20个字符之间'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('状态必须是 draft、published 或 archived'),
  handleValidationErrors
];

// 认证相关验证规则
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isLength({ min: 6 })
    .withMessage('密码长度不能少于6个字符'),
  handleValidationErrors
];

const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('姓名长度必须在2-50个字符之间')
    .matches(/^[a-zA-Z\u4e00-\u9fa5\s]+$/)
    .withMessage('姓名只能包含字母、中文和空格'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址')
    .isLength({ max: 100 })
    .withMessage('邮箱长度不能超过100个字符'),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('密码长度必须在6-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  body('age')
    .isInt({ min: 1, max: 120 })
    .withMessage('年龄必须是1-120之间的整数'),
  handleValidationErrors
];

// ID参数验证
const validateId = [
  param('id')
    .isMongoId()
    .withMessage('ID必须是有效的MongoDB ObjectId'),
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
  query('sort')
    .optional()
    .isString()
    .trim()
    .matches(/^[a-zA-Z_]+(:(asc|desc))?$/)
    .withMessage('排序格式不正确，应为 field:direction 或 field'),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('搜索关键词长度必须在1-100个字符之间'),
  handleValidationErrors
];

// 文件上传验证
const validateFileUpload = [
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('文件描述不能超过500个字符'),
  body('tags')
    .optional()
    .isArray({ min: 0, max: 10 })
    .withMessage('标签必须是数组格式，最多10个标签'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('每个标签长度必须在1-20个字符之间'),
  handleValidationErrors
];

// 通知验证规则
const validateNotification = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('标题长度必须在1-200个字符之间'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('内容长度必须在1-1000个字符之间'),
  body('type')
    .isIn(['info', 'success', 'warning', 'error', 'system'])
    .withMessage('通知类型必须是 info、success、warning、error 或 system'),
  body('recipients')
    .optional()
    .isArray({ min: 1 })
    .withMessage('接收者必须是数组格式，至少包含一个用户'),
  body('recipients.*')
    .isMongoId()
    .withMessage('接收者ID必须是有效的MongoDB ObjectId'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('优先级必须是 low、normal、high 或 urgent'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateUserUpdate,
  validatePost,
  validateLogin,
  validateRegister,
  validateId,
  validatePagination,
  validateFileUpload,
  validateNotification
};
