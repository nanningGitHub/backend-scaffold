const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '姓名是必填项'],
    trim: true,
    minlength: [2, '姓名长度不能少于2个字符'],
    maxlength: [50, '姓名长度不能超过50个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱是必填项'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请提供有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码是必填项'],
    minlength: [6, '密码长度不能少于6个字符'],
    select: false // 默认查询时不返回密码字段
  },
  age: {
    type: Number,
    required: [true, '年龄是必填项'],
    min: [1, '年龄不能小于1'],
    max: [120, '年龄不能超过120']
  },
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：用户全名
userSchema.virtual('fullName').get(function() {
  return `${this.name} (${this.email})`;
});

// 索引（email字段已有unique索引，不需要重复创建）
userSchema.index({ name: 1 });
userSchema.index({ createdAt: -1 });

// 实例方法
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.__v;
  delete userObject.password;
  return userObject;
};

// 密码比较方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 生成密码哈希
userSchema.methods.generatePasswordHash = async function(password) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

// 静态方法
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true });
};

// 中间件：保存前处理
userSchema.pre('save', async function(next) {
  // 邮箱转小写
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  // 密码哈希处理
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  next();
});

// 中间件：保存后处理
userSchema.post('save', function(doc) {
  console.log(`用户已保存: ${doc.name} (${doc.email})`);
});

module.exports = mongoose.model('User', userSchema);
