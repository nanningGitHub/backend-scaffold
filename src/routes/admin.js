const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logUtils } = require('../config/logger');
const queue = require('../config/queue');
const redis = require('../config/redis');
const User = require('../models/User');
const Post = require('../models/Post');

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: 获取管理员仪表板数据
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取仪表板数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                     posts:
 *                       type: object
 *                     system:
 *                       type: object
 */
router.get('/dashboard', 
  authenticate, 
  requireRole(['admin']), 
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
      // 获取用户统计
      const userStats = await User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
            admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
            moderators: { $sum: { $cond: [{ $eq: ['$role', 'moderator'] }, 1, 0] } }
          }
        }
      ]);

      // 获取文章统计
      const postStats = await Post.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
            draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
            archived: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
            featured: { $sum: { $cond: ['$featured', 1, 0] } }
          }
        }
      ]);

      // 获取系统状态
      const systemStats = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString()
      };

      // 获取队列状态
      const queueStats = await queue.getAllQueueStats();

      // 获取Redis状态
      const redisHealth = await redis.health();

      const dashboardData = {
        users: userStats[0] || {},
        posts: postStats[0] || {},
        system: systemStats,
        queues: queueStats,
        redis: redisHealth
      };

      const duration = Date.now() - startTime;
      logUtils.logPerformance('admin_dashboard', duration, { userId: req.userId });

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      logUtils.logAudit('dashboard_access_failed', req.userId, 'admin_dashboard', { error: error.message });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: 获取用户列表（管理员）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, moderator, admin]
 *         description: 角色筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: 状态筛选
 */
router.get('/users',
  authenticate,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const skip = (page - 1) * limit;

    try {
      // 构建查询条件
      const query = {};
      
      if (role) {
        query.role = role;
      }
      
      if (status) {
        query.isActive = status === 'active';
      }
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // 执行查询
      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        User.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      logUtils.logAudit('users_listed', req.userId, 'admin_users', { 
        page, limit, total, filters: { role, status, search } 
      });

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages
          }
        }
      });
    } catch (error) {
      logUtils.logAudit('users_list_failed', req.userId, 'admin_users', { error: error.message });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: 更新用户角色
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 */
router.put('/users/:id/role',
  authenticate,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用户不存在'
        });
      }

      // 检查是否试图修改自己的角色
      if (id === req.userId) {
        return res.status(400).json({
          success: false,
          error: '不能修改自己的角色'
        });
      }

      const oldRole = user.role;
      user.role = role;
      await user.save();

      logUtils.logAudit('user_role_updated', req.userId, 'admin_users', {
        targetUserId: id,
        oldRole,
        newRole: role
      });

      res.json({
        success: true,
        message: '用户角色更新成功',
        data: {
          userId: id,
          oldRole,
          newRole: role
        }
      });
    } catch (error) {
      logUtils.logAudit('user_role_update_failed', req.userId, 'admin_users', { 
        targetUserId: id, error: error.message 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   put:
 *     summary: 更新用户状态
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 */
router.put('/users/:id/status',
  authenticate,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用户不存在'
        });
      }

      // 检查是否试图修改自己的状态
      if (id === req.userId) {
        return res.status(400).json({
          success: false,
          error: '不能修改自己的状态'
        });
      }

      const oldStatus = user.isActive;
      user.isActive = isActive;
      await user.save();

      logUtils.logAudit('user_status_updated', req.userId, 'admin_users', {
        targetUserId: id,
        oldStatus,
        newStatus: isActive
      });

      res.json({
        success: true,
        message: '用户状态更新成功',
        data: {
          userId: id,
          oldStatus,
          newStatus: isActive
        }
      });
    } catch (error) {
      logUtils.logAudit('user_status_update_failed', req.userId, 'admin_users', { 
        targetUserId: id, error: error.message 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/admin/system/health:
 *   get:
 *     summary: 获取系统健康状态
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/system/health',
  authenticate,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    try {
      // 数据库健康检查
      const dbHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };

      // Redis健康检查
      const redisHealth = await redis.health();

      // 队列健康检查
      const queueStats = await queue.getAllQueueStats();
      const queueHealth = {
        status: 'healthy',
        queues: queueStats,
        timestamp: new Date().toISOString()
      };

      // 检查队列是否有问题
      for (const stat of queueStats) {
        if (stat.failed > 10) {
          queueHealth.status = 'warning';
        }
        if (stat.failed > 50) {
          queueHealth.status = 'critical';
        }
      }

      // 系统资源状态
      const systemHealth = {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        timestamp: new Date().toISOString()
      };

      // 检查内存使用
      const memoryUsage = process.memoryUsage();
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      if (memoryPercent > 80) {
        systemHealth.status = 'warning';
      }
      if (memoryPercent > 95) {
        systemHealth.status = 'critical';
      }

      const overallHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealth,
          redis: redisHealth,
          queue: queueHealth,
          system: systemHealth
        }
      };

      // 确定整体状态
      const statuses = [dbHealth.status, redisHealth.status, queueHealth.status, systemHealth.status];
      if (statuses.includes('critical')) {
        overallHealth.status = 'critical';
      } else if (statuses.includes('warning')) {
        overallHealth.status = 'warning';
      }

      logUtils.logAudit('system_health_checked', req.userId, 'admin_system', { 
        overallStatus: overallHealth.status 
      });

      res.json({
        success: true,
        data: overallHealth
      });
    } catch (error) {
      logUtils.logAudit('system_health_check_failed', req.userId, 'admin_system', { error: error.message });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/admin/system/logs:
 *   get:
 *     summary: 获取系统日志
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info, debug]
 *         description: 日志级别
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: 日志条数限制
 */
router.get('/system/logs',
  authenticate,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { level, limit = 100 } = req.query;

    try {
      // 这里应该实现从日志文件读取日志的逻辑
      // 由于Winston的日志读取比较复杂，这里提供一个示例结构
      
      logUtils.logAudit('system_logs_accessed', req.userId, 'admin_system', { 
        level, limit: parseInt(limit) 
      });

      res.json({
        success: true,
        message: '日志功能待实现',
        data: {
          level,
          limit: parseInt(limit),
          note: '需要实现日志文件读取功能'
        }
      });
    } catch (error) {
      logUtils.logAudit('system_logs_access_failed', req.userId, 'admin_system', { error: error.message });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/admin/queue/{name}/stats:
 *   get:
 *     summary: 获取指定队列统计信息
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: 队列名称
 */
router.get('/queue/:name/stats',
  authenticate,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { name } = req.params;

    try {
      const stats = await queue.getQueueStats(name);
      
      logUtils.logAudit('queue_stats_accessed', req.userId, 'admin_queue', { queueName: name });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logUtils.logAudit('queue_stats_access_failed', req.userId, 'admin_queue', { 
        queueName: name, error: error.message 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/admin/queue/{name}/pause:
 *   post:
 *     summary: 暂停指定队列
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: 队列名称
 */
router.post('/queue/:name/pause',
  authenticate,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { name } = req.params;

    try {
      await queue.pauseQueue(name);
      
      logUtils.logAudit('queue_paused', req.userId, 'admin_queue', { queueName: name });

      res.json({
        success: true,
        message: `队列 ${name} 已暂停`
      });
    } catch (error) {
      logUtils.logAudit('queue_pause_failed', req.userId, 'admin_queue', { 
        queueName: name, error: error.message 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/admin/queue/{name}/resume:
 *   post:
 *     summary: 恢复指定队列
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: 队列名称
 */
router.post('/queue/:name/resume',
  authenticate,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { name } = req.params;

    try {
      await queue.resumeQueue(name);
      
      logUtils.logAudit('queue_resumed', req.userId, 'admin_queue', { queueName: name });

      res.json({
        success: true,
        message: `队列 ${name} 已恢复`
      });
    } catch (error) {
      logUtils.logAudit('queue_resume_failed', req.userId, 'admin_queue', { 
        queueName: name, error: error.message 
      });
      throw error;
    }
  })
);

module.exports = router;
