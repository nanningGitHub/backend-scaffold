const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '标题是必填项'],
    trim: true,
    minlength: [1, '标题不能为空'],
    maxlength: [200, '标题长度不能超过200个字符']
  },
  content: {
    type: String,
    required: [true, '内容是必填项'],
    trim: true,
    minlength: [10, '内容长度不能少于10个字符'],
    maxlength: [10000, '内容长度不能超过10000个字符']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '作者是必填项']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, '标签长度不能超过20个字符']
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  featured: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：阅读时间估算
postSchema.virtual('readTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(' ').length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// 虚拟字段：摘要
postSchema.virtual('excerpt').get(function() {
  return this.content.substring(0, 150) + '...';
});

// 索引
postSchema.index({ title: 'text', content: 'text' }); // 文本搜索索引
postSchema.index({ author: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ status: 1 });
postSchema.index({ publishedAt: -1 });
postSchema.index({ viewCount: -1 });
postSchema.index({ likeCount: -1 });

// 实例方法
postSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

postSchema.methods.toggleFeatured = function() {
  this.featured = !this.featured;
  return this.save();
};

// 静态方法
postSchema.statics.findPublished = function() {
  return this.find({ status: 'published' });
};

postSchema.statics.findByTag = function(tag) {
  return this.find({ tags: tag, status: 'published' });
};

postSchema.statics.findByAuthor = function(authorId) {
  return this.find({ author: authorId, status: 'published' });
};

postSchema.statics.searchPosts = function(keyword) {
  return this.find({
    $text: { $search: keyword },
    status: 'published'
  }, {
    score: { $meta: 'textScore' }
  }).sort({ score: { $meta: 'textScore' } });
};

// 中间件：保存前处理
postSchema.pre('save', function(next) {
  // 如果状态改为published，更新publishedAt
  if (this.isModified('status') && this.status === 'published') {
    this.publishedAt = new Date();
  }
  next();
});

// 中间件：保存后处理
postSchema.post('save', function(doc) {
  console.log(`文章已保存: ${doc.title} (作者: ${doc.author})`);
});

module.exports = mongoose.model('Post', postSchema);
