const User = require('../models/User');
const { AppError } = require('../errors/AppError');

class UserService {
  /**
   * 获取所有用户
   */
  static async getAllUsers(options = {}) {
    try {
      const { page = 1, limit = 10, sort = '-createdAt', filter = {} } = options;
      
      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-__v -password')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter)
      ]);

      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new AppError('获取用户列表失败', 500);
    }
  }

  /**
   * 根据ID获取用户
   */
  static async getUserById(id) {
    try {
      const user = await User.findById(id).select('-__v -password');
      if (!user) {
        throw new AppError('用户不存在', 404);
      }
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('获取用户信息失败', 500);
    }
  }

  /**
   * 根据邮箱获取用户
   */
  static async getUserByEmail(email) {
    try {
      return await User.findOne({ email: email.toLowerCase() });
    } catch (error) {
      throw new AppError('根据邮箱查找用户失败', 500);
    }
  }

  /**
   * 创建新用户
   */
  static async createUser(userData) {
    try {
      // 检查邮箱是否已存在
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new AppError('该邮箱已被注册', 400);
      }

      const user = new User(userData);
      const savedUser = await user.save();
      
      return savedUser.getPublicProfile();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('创建用户失败', 500);
    }
  }

  /**
   * 更新用户信息
   */
  static async updateUser(id, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).select('-__v -password');

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('更新用户信息失败', 500);
    }
  }

  /**
   * 删除用户
   */
  static async deleteUser(id) {
    try {
      const user = await User.findByIdAndDelete(id).select('-__v -password');
      if (!user) {
        throw new AppError('用户不存在', 404);
      }
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('删除用户失败', 500);
    }
  }

  /**
   * 更新用户密码
   */
  static async updatePassword(id, currentPassword, newPassword) {
    try {
      const user = await User.findById(id).select('+password');
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

      return { message: '密码更新成功' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('更新密码失败', 500);
    }
  }

  /**
   * 搜索用户
   */
  static async searchUsers(query, options = {}) {
    try {
      const { page = 1, limit = 10, sort = '-createdAt' } = options;
      const skip = (page - 1) * limit;

      const searchRegex = new RegExp(query, 'i');
      const filter = {
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      };

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-__v -password')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter)
      ]);

      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new AppError('搜索用户失败', 500);
    }
  }
}

module.exports = UserService;
