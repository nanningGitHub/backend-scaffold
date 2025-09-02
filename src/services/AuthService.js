const User = require('../models/User');
const { generateTokenPair, verifyToken } = require('../utils/jwt');
const { AppError } = require('../errors/AppError');

class AuthService {
  /**
   * 用户注册
   */
  static async register(userData) {
    try {
      const { name, email, password, age } = userData;

      // 检查邮箱是否已存在
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new AppError('该邮箱已被注册', 400);
      }

      // 创建新用户
      const user = new User({
        name,
        email,
        password,
        age
      });

      const savedUser = await user.save();

      // 生成令牌
      const tokens = generateTokenPair(savedUser);

      return {
        user: savedUser.getPublicProfile(),
        ...tokens
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('用户注册失败', 500);
    }
  }

  /**
   * 用户登录
   */
  static async login(credentials) {
    try {
      const { email, password } = credentials;

      // 查找用户（包含密码字段）
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      
      if (!user) {
        throw new AppError('邮箱或密码错误', 401);
      }

      // 检查用户状态
      if (!user.isActive) {
        throw new AppError('账户已被禁用，请联系管理员', 401);
      }

      // 验证密码
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError('邮箱或密码错误', 401);
      }

      // 生成令牌
      const tokens = generateTokenPair(user);

      return {
        user: user.getPublicProfile(),
        ...tokens
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('用户登录失败', 500);
    }
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new AppError('刷新令牌不能为空', 400);
      }

      // 验证刷新令牌
      const decoded = verifyToken(refreshToken);
      
      // 获取用户信息
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new AppError('用户不存在或已被禁用', 401);
      }

      // 生成新的令牌对
      const tokens = generateTokenPair(user);

      return tokens;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      if (error.name === 'TokenExpiredError') {
        throw new AppError('刷新令牌已过期，请重新登录', 401);
      }
      
      throw new AppError('无效的刷新令牌', 401);
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      // 获取用户（包含密码）
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      // 验证当前密码
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new AppError('当前密码不正确', 400);
      }

      // 更新密码
      user.password = newPassword;
      await user.save();

      return { message: '密码修改成功' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('密码修改失败', 500);
    }
  }

  /**
   * 验证令牌
   */
  static async verifyToken(token) {
    try {
      if (!token) {
        throw new AppError('访问令牌不能为空', 401);
      }

      const decoded = verifyToken(token);
      
      // 获取用户信息
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new AppError('用户不存在或已被禁用', 401);
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      if (error.name === 'TokenExpiredError') {
        throw new AppError('访问令牌已过期', 401);
      }
      
      throw new AppError('无效的访问令牌', 401);
    }
  }

  /**
   * 用户登出
   */
  static async logout(userId) {
    try {
      // 在实际应用中，可以将令牌加入黑名单
      // 这里只是记录日志
      const user = await User.findById(userId);
      if (user) {
        console.log(`用户登出: ${user.email} at ${new Date().toISOString()}`);
      }
      
      return { message: '登出成功' };
    } catch (error) {
      throw new AppError('登出失败', 500);
    }
  }
}

module.exports = AuthService;
