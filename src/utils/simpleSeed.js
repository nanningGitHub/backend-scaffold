const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/node-cil', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('🗄️ MongoDB连接成功');
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    process.exit(1);
  }
};

// 简单的种子数据
const seedData = async () => {
  try {
    console.log('🌱 开始创建种子数据...');
    
    // 获取模型
    const User = require('../models/User');
    const Post = require('../models/Post');
    
    // 清空现有数据
    await User.deleteMany({});
    await Post.deleteMany({});
    console.log('🗑️ 数据库已清空');
    
    // 创建用户
    const user = new User({
      name: '张三',
      email: 'zhangsan@example.com',
      password: 'Admin123',
      age: 25,
      role: 'admin'
    });
    
    const savedUser = await user.save();
    console.log('✅ 用户创建成功:', savedUser.name);
    
    // 创建文章
    const post = new Post({
      title: 'Node.js入门指南',
      content: 'Node.js是一个基于Chrome V8引擎的JavaScript运行时，它使用了一个事件驱动、非阻塞式I/O的模型，使其轻量又高效。',
      author: savedUser._id,
      tags: ['Node.js', 'JavaScript', '后端'],
      status: 'published'
    });
    
    const savedPost = await post.save();
    console.log('✅ 文章创建成功:', savedPost.title);
    
    console.log('🎉 种子数据创建完成！');
    
    // 关闭连接
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 种子数据创建失败:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// 运行种子数据
const runSeed = async () => {
  await connectDB();
  await seedData();
};

runSeed();
