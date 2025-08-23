const jwt = require('jsonwebtoken');

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * 生成访问令牌
 * @param {Object} payload - 用户信息负载
 * @returns {String} JWT访问令牌
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'node-cil-backend',
    audience: 'node-cil-client'
  });
};

/**
 * 生成刷新令牌
 * @param {Object} payload - 用户信息负载
 * @returns {String} JWT刷新令牌
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'node-cil-backend',
    audience: 'node-cil-client'
  });
};

/**
 * 验证JWT令牌
 * @param {String} token - JWT令牌
 * @returns {Object} 解码后的用户信息
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'node-cil-backend',
    audience: 'node-cil-client'
  });
};

/**
 * 从请求头中提取JWT令牌
 * @param {Object} req - Express请求对象
 * @returns {String|null} JWT令牌或null
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
};

/**
 * 生成令牌对（访问令牌 + 刷新令牌）
 * @param {Object} user - 用户对象
 * @returns {Object} 包含访问令牌和刷新令牌的对象
 */
const generateTokenPair = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role
  };
  
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: JWT_EXPIRES_IN
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractTokenFromHeader,
  generateTokenPair
};
