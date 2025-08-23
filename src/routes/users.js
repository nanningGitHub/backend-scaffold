const express = require('express');
const router = express.Router();
const { validateUser, validateId } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const User = require('../models/User');

// 获取所有用户
router.get('/', asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-__v');
  
  res.json({
    success: true,
    data: users,
    count: users.length
  });
}));

// 根据ID获取用户
router.get('/:id', validateId, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-__v');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: '用户不存在'
    });
  }
  
  res.json({
    success: true,
    data: user
  });
}));

// 创建新用户
router.post('/', validateUser, asyncHandler(async (req, res) => {
  const { name, email, age } = req.body;
  
  // 检查邮箱是否已存在
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: '邮箱已存在'
    });
  }
  
  const newUser = new User({
    name,
    email,
    age: parseInt(age)
  });
  
  const savedUser = await newUser.save();
  
  res.status(201).json({
    success: true,
    data: savedUser,
    message: '用户创建成功'
  });
}));

// 更新用户信息
router.put('/:id', validateId, asyncHandler(async (req, res) => {
  const { name, email, age } = req.body;
  
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { name, email, age },
    { new: true, runValidators: true }
  ).select('-__v');
  
  if (!updatedUser) {
    return res.status(404).json({
      success: false,
      error: '用户不存在'
    });
  }
  
  res.json({
    success: true,
    data: updatedUser,
    message: '用户信息更新成功'
  });
}));

// 删除用户
router.delete('/:id', validateId, asyncHandler(async (req, res) => {
  const deletedUser = await User.findByIdAndDelete(req.params.id).select('-__v');
  
  if (!deletedUser) {
    return res.status(404).json({
      success: false,
      error: '用户不存在'
    });
  }
  
  res.json({
    success: true,
    data: deletedUser,
    message: '用户删除成功'
  });
}));

module.exports = router;
