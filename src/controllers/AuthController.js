const AuthService = require('../services/AuthService');

class AuthController {
  /**
   * 用户注册
   */
  static async register(req, res, next) {
    try {
      const { name, email, password, age } = req.body;
      
      const result = await AuthService.register({
        name,
        email,
        password,
        age
      });
      
      res.status(201).json({
        success: true,
        message: '注册成功',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 用户登录
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      const result = await AuthService.login({
        email,
        password
      });
      
      res.json({
        success: true,
        message: '登录成功',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      const tokens = await AuthService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        message: '令牌刷新成功',
        data: tokens
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(req, res, next) {
    try {
      // 用户信息已经在认证中间件中设置到 req.user
      res.json({
        success: true,
        data: req.user.getPublicProfile()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      
      const result = await AuthService.changePassword(
        userId,
        currentPassword,
        newPassword
      );
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 用户登出
   */
  static async logout(req, res, next) {
    try {
      const userId = req.user.id;
      
      const result = await AuthService.logout(userId);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
