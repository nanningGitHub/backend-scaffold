const express = require('express');
const router = express.Router();

// 模拟文章数据存储
let posts = [
  { 
    id: 1, 
    title: 'Node.js入门指南', 
    content: 'Node.js是一个基于Chrome V8引擎的JavaScript运行时...', 
    author: '张三',
    createdAt: '2024-01-15T10:00:00Z',
    tags: ['Node.js', 'JavaScript', '后端']
  },
  { 
    id: 2, 
    title: 'Express框架使用技巧', 
    content: 'Express是一个简洁而灵活的Node.js Web应用框架...', 
    author: '李四',
    createdAt: '2024-01-16T14:30:00Z',
    tags: ['Express', 'Web框架', 'API']
  },
  { 
    id: 3, 
    title: 'RESTful API设计原则', 
    content: 'RESTful API是一种软件架构风格，用于设计网络应用程序...', 
    author: '王五',
    createdAt: '2024-01-17T09:15:00Z',
    tags: ['API设计', 'REST', '最佳实践']
  }
];

// 获取所有文章
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 10, tag, author } = req.query;
    
    let filteredPosts = [...posts];
    
    // 按标签筛选
    if (tag) {
      filteredPosts = filteredPosts.filter(post => 
        post.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
      );
    }
    
    // 按作者筛选
    if (author) {
      filteredPosts = filteredPosts.filter(post => 
        post.author.toLowerCase().includes(author.toLowerCase())
      );
    }
    
    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredPosts.length / limit),
        totalPosts: filteredPosts.length,
        hasNext: endIndex < filteredPosts.length,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取文章列表失败'
    });
  }
});

// 根据ID获取文章
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const post = posts.find(p => p.id === id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: '文章不存在'
      });
    }
    
    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取文章信息失败'
    });
  }
});

// 创建新文章
router.post('/', (req, res) => {
  try {
    const { title, content, author, tags } = req.body;
    
    // 简单验证
    if (!title || !content || !author) {
      return res.status(400).json({
        success: false,
        error: '请提供完整的文章信息'
      });
    }
    
    const newPost = {
      id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
      title,
      content,
      author,
      tags: tags || [],
      createdAt: new Date().toISOString()
    };
    
    posts.push(newPost);
    
    res.status(201).json({
      success: true,
      data: newPost,
      message: '文章创建成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '创建文章失败'
    });
  }
});

// 更新文章
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, content, author, tags } = req.body;
    
    const postIndex = posts.findIndex(p => p.id === id);
    
    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '文章不存在'
      });
    }
    
    // 更新文章信息
    if (title) posts[postIndex].title = title;
    if (content) posts[postIndex].content = content;
    if (author) posts[postIndex].author = author;
    if (tags) posts[postIndex].tags = tags;
    
    res.json({
      success: true,
      data: posts[postIndex],
      message: '文章更新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '更新文章失败'
    });
  }
});

// 删除文章
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const postIndex = posts.findIndex(p => p.id === id);
    
    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '文章不存在'
      });
    }
    
    const deletedPost = posts.splice(postIndex, 1)[0];
    
    res.json({
      success: true,
      data: deletedPost,
      message: '文章删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '删除文章失败'
    });
  }
});

// 搜索文章
router.get('/search/:keyword', (req, res) => {
  try {
    const keyword = req.params.keyword.toLowerCase();
    
    const searchResults = posts.filter(post => 
      post.title.toLowerCase().includes(keyword) ||
      post.content.toLowerCase().includes(keyword) ||
      post.author.toLowerCase().includes(keyword) ||
      post.tags.some(tag => tag.toLowerCase().includes(keyword))
    );
    
    res.json({
      success: true,
      data: searchResults,
      count: searchResults.length,
      keyword
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '搜索文章失败'
    });
  }
});

module.exports = router;
