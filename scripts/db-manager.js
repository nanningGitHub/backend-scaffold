#!/usr/bin/env node

const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 数据库连接
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/node-cil', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('🗄️ MongoDB连接成功');
    return true;
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message);
    return false;
  }
};

// 显示数据库统计信息
const showDatabaseStats = async () => {
  try {
    const db = mongoose.connection.db;
    
    // 获取数据库统计
    const stats = await db.stats();
    console.log('\n📊 数据库统计信息:');
    console.log('========================');
    console.log(`数据库名称: ${stats.db}`);
    console.log(`集合数量: ${stats.collections}`);
    console.log(`数据大小: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`存储大小: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`索引大小: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`文档数量: ${stats.objects}`);
    
    // 获取集合列表
    const collections = await db.listCollections().toArray();
    console.log('\n📁 集合列表:');
    console.log('========================');
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      const size = await db.collection(collection.name).stats();
      console.log(`${collection.name}: ${count} 文档, ${(size.size / 1024).toFixed(2)} KB`);
    }
    
  } catch (error) {
    console.error('❌ 获取统计信息失败:', error.message);
  }
};

// 显示用户数据
const showUsers = async () => {
  try {
    const User = require('../src/models/User');
    const users = await User.find({}).select('-__v');
    
    console.log('\n👥 用户数据:');
    console.log('========================');
    
    if (users.length === 0) {
      console.log('暂无用户数据');
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   角色: ${user.role}, 年龄: ${user.age}, 状态: ${user.isActive ? '活跃' : '禁用'}`);
      console.log(`   创建时间: ${user.createdAt.toLocaleString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 获取用户数据失败:', error.message);
  }
};

// 显示文章数据
const showPosts = async () => {
  try {
    const Post = require('../src/models/Post');
    const posts = await Post.find({}).populate('author', 'name email').select('-__v');
    
    console.log('\n📝 文章数据:');
    console.log('========================');
    
    if (posts.length === 0) {
      console.log('暂无文章数据');
      return;
    }
    
    posts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`);
      console.log(`   作者: ${post.author ? post.author.name : '未知'}`);
      console.log(`   状态: ${post.status}, 特色: ${post.featured ? '是' : '否'}`);
      console.log(`   标签: ${post.tags.join(', ')}`);
      console.log(`   创建时间: ${post.createdAt.toLocaleString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 获取文章数据失败:', error.message);
  }
};

// 清理数据库
const clearDatabase = async () => {
  try {
    const User = require('../src/models/User');
    const Post = require('../src/models/Post');
    
    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();
    
    if (userCount === 0 && postCount === 0) {
      console.log('✅ 数据库已经是空的');
      return;
    }
    
    console.log(`⚠️  即将删除 ${userCount} 个用户和 ${postCount} 篇文章`);
    
    rl.question('确认删除所有数据？(输入 "yes" 确认): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        await User.deleteMany({});
        await Post.deleteMany({});
        console.log('✅ 数据库已清空');
      } else {
        console.log('❌ 操作已取消');
      }
      rl.close();
    });
    
  } catch (error) {
    console.error('❌ 清理数据库失败:', error.message);
  }
};

// 显示主菜单
const showMenu = () => {
  console.log('\n🗄️ 数据库管理工具');
  console.log('========================');
  console.log('1. 显示数据库统计');
  console.log('2. 显示用户数据');
  console.log('3. 显示文章数据');
  console.log('4. 清理数据库');
  console.log('5. 退出');
  console.log('========================');
};

// 主程序
const main = async () => {
  console.log('🚀 启动数据库管理工具...');
  
  const connected = await connectDB();
  if (!connected) {
    console.log('❌ 无法连接到数据库，程序退出');
    process.exit(1);
  }
  
  const runMenu = () => {
    showMenu();
    rl.question('请选择操作 (1-5): ', async (choice) => {
      switch (choice) {
        case '1':
          await showDatabaseStats();
          runMenu();
          break;
        case '2':
          await showUsers();
          runMenu();
          break;
        case '3':
          await showPosts();
          runMenu();
          break;
        case '4':
          await clearDatabase();
          break;
        case '5':
          console.log('👋 再见！');
          await mongoose.connection.close();
          rl.close();
          process.exit(0);
          break;
        default:
          console.log('❌ 无效选择，请重试');
          runMenu();
      }
    });
  };
  
  runMenu();
};

// 错误处理
process.on('SIGINT', async () => {
  console.log('\n👋 正在退出...');
  await mongoose.connection.close();
  rl.close();
  process.exit(0);
});

// 启动程序
main().catch(console.error);
