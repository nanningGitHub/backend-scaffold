const express = require('express');
const router = express.Router();
const { validateUser, validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const UserController = require('../controllers/UserController');

// 获取所有用户 (支持分页和搜索)
router.get('/', 
  validatePagination,
  asyncHandler(UserController.getAllUsers)
);

// 搜索用户
router.get('/search', 
  validatePagination,
  asyncHandler(UserController.searchUsers)
);

// 根据ID获取用户
router.get('/:id', 
  validateId, 
  asyncHandler(UserController.getUserById)
);

// 创建新用户 (需要管理员权限)
router.post('/', 
  authenticate,
  authorize(['admin']),
  validateUser, 
  asyncHandler(UserController.createUser)
);

// 更新用户信息 (需要管理员权限或用户本人)
router.put('/:id', 
  authenticate,
  authorize(['admin']),
  validateId,
  validateUser, 
  asyncHandler(UserController.updateUser)
);

// 删除用户 (需要管理员权限)
router.delete('/:id', 
  authenticate,
  authorize(['admin']),
  validateId, 
  asyncHandler(UserController.deleteUser)
);

module.exports = router;
