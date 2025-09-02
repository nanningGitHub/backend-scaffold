const UserService = require('../services/UserService');
const { AppError } = require('../errors/AppError');

class UserController {
  /**
   * 获取所有用户
   */
  static async getAllUsers(req, res, next) {
    try {
      const { page, limit, sort, search } = req.query;
      
      let options = { page, limit, sort };
      
      // 如果有搜索参数，使用搜索方法
      if (search) {
        const result = await UserService.searchUsers(search, options);
        return res.json({
          success: true,
          data: result.users,
          pagination: result.pagination
        });
      }
      
      // 否则获取所有用户
      const result = await UserService.getAllUsers(options);
      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 根据ID获取用户
   */
  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建新用户
   */
  static async createUser(req, res, next) {
    try {
      const { name, email, age } = req.body;
      
      const user = await UserService.createUser({
        name,
        email,
        age: parseInt(age)
      });
      
      res.status(201).json({
        success: true,
        data: user,
        message: '用户创建成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新用户信息
   */
  static async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { name, email, age } = req.body;
      
      const user = await UserService.updateUser(id, {
        name,
        email,
        age: parseInt(age)
      });
      
      res.json({
        success: true,
        data: user,
        message: '用户信息更新成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除用户
   */
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await UserService.deleteUser(id);
      
      res.json({
        success: true,
        data: user,
        message: '用户删除成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 搜索用户
   */
  static async searchUsers(req, res, next) {
    try {
      const { q, page, limit, sort } = req.query;
      
      if (!q) {
        throw new AppError('搜索关键词不能为空', 400);
      }
      
      const result = await UserService.searchUsers(q, { page, limit, sort });
      
      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
