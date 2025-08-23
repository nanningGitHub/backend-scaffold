const User = require('../models/User');
const Post = require('../models/Post');

// 种子数据
const seedUsers = [
  {
    name: '张三',
    email: 'zhangsan@example.com',
    age: 25,
    role: 'admin'
  },
  {
    name: '李四',
    email: 'lisi@example.com',
    age: 30,
    role: 'moderator'
  },
  {
    name: '王五',
    email: 'wangwu@example.com',
    age: 28,
    role: 'user'
  }
];

const seedPosts = [
  {
    title: 'Node.js入门指南',
    content: 'Node.js是一个基于Chrome V8引擎的JavaScript运行时，它使用了一个事件驱动、非阻塞式I/O的模型，使其轻量又高效。Node.js的包管理器npm，是全球最大的开源库生态系统。',
    tags: ['Node.js', 'JavaScript', '后端'],
    status: 'published',
    featured: true
  },
  {
    title: 'Express框架使用技巧',
    content: 'Express是一个简洁而灵活的Node.js Web应用框架，提供了一系列强大特性帮助你创建各种Web应用。Express不对Node.js已有的特性进行二次抽象，我们只是在它之上扩展了Web应用所需的基本功能。',
    tags: ['Express', 'Web框架', 'API'],
    status: 'published',
    featured: false
  },
  {
    title: 'MongoDB数据库操作',
    content: 'MongoDB是一个基于分布式文件存储的数据库。由C++语言编写。旨在为WEB应用提供可扩展的高性能数据存储解决方案。MongoDB是一个介于关系数据库和非关系数据库之间的产品，是非关系数据库当中功能最丰富，最像关系数据库的。',
    tags: ['MongoDB', '数据库', 'NoSQL'],
    status: 'published',
    featured: true
  }
];

// 清空数据库并插入种子数据
const seedDatabase = async () => {
  try {
    console.log('🌱 开始清空数据库...');
    
    // 清空现有数据
    await User.deleteMany({});
    await Post.deleteMany({});
    
    console.log('🗑️ 数据库已清空');
    
    // 创建用户
    console.log('👥 创建用户数据...');
    const createdUsers = await User.insertMany(seedUsers);
    console.log(`✅ 已创建 ${createdUsers.length} 个用户`);
    
    // 创建文章（关联到第一个用户）
    console.log('📝 创建文章数据...');
    const postsWithAuthors = seedPosts.map(post => ({
      ...post,
      author: createdUsers[0]._id
    }));
    
    const createdPosts = await Post.insertMany(postsWithAuthors);
    console.log(`✅ 已创建 ${createdPosts.length} 篇文章`);
    
    console.log('🎉 数据库种子数据创建完成！');
    
    return {
      users: createdUsers,
      posts: createdPosts
    };
    
  } catch (error) {
    console.error('❌ 种子数据创建失败:', error);
    throw error;
  }
};

// 检查数据库是否为空
const isDatabaseEmpty = async () => {
  const userCount = await User.countDocuments();
  const postCount = await Post.countDocuments();
  return userCount === 0 && postCount === 0;
};

module.exports = {
  seedDatabase,
  isDatabaseEmpty
};
