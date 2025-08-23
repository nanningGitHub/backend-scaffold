const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logUtils } = require('../config/logger');
const queue = require('../config/queue');
const redis = require('../config/redis');

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 通知ID
 *         type:
 *           type: string
 *           enum: [info, success, warning, error, system]
 *           description: 通知类型
 *         title:
 *           type: string
 *           description: 通知标题
 *         message:
 *           type: string
 *           description: 通知内容
 *         userId:
 *           type: string
 *           description: 接收用户ID
 *         read:
 *           type: boolean
 *           description: 是否已读
 *         data:
 *           type: object
 *           description: 附加数据
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         readAt:
 *           type: string
 *           format: date-time
 *           description: 阅读时间
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: 获取用户通知列表
 *     tags: [Notifications]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [info, success, warning, error, system]
 *         description: 通知类型筛选
 *       - in: query
 *         name: read
 *         schema:
 *           type: boolean
 *         description: 已读状态筛选
 */
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type, read } = req.query;
    const skip = (page - 1) * limit;

    try {
      // 从Redis获取用户通知
      const notificationKey = `notifications:${req.userId}`;
      let notifications = await redis.hgetall(notificationKey);

      // 转换为数组并排序
      let notificationArray = Object.values(notifications)
        .map(notification => {
          try {
            return JSON.parse(notification);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // 应用筛选
      if (type) {
        notificationArray = notificationArray.filter(n => n.type === type);
      }
      if (read !== undefined) {
        const readStatus = read === 'true';
        notificationArray = notificationArray.filter(n => n.read === readStatus);
      }

      // 分页
      const total = notificationArray.length;
      const paginatedNotifications = notificationArray.slice(skip, skip + parseInt(limit));

      logUtils.logAudit('notifications_listed', req.userId, 'notifications', { 
        page, limit, total, filters: { type, read } 
      });

      res.json({
        success: true,
        data: {
          notifications: paginatedNotifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logUtils.logAudit('notifications_list_failed', req.userId, 'notifications', { error: error.message });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/notifications/unread:
 *   get:
 *     summary: 获取未读通知数量
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/unread',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const notificationKey = `notifications:${req.userId}`;
      const notifications = await redis.hgetall(notificationKey);

      const unreadCount = Object.values(notifications)
        .map(notification => {
          try {
            return JSON.parse(notification);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .filter(n => !n.read).length;

      res.json({
        success: true,
        data: {
          unreadCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logUtils.logAudit('unread_count_failed', req.userId, 'notifications', { error: error.message });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: 标记通知为已读
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 通知ID
 */
router.put('/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const notificationKey = `notifications:${req.userId}`;
      const notification = await redis.hget(notificationKey, id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: '通知不存在'
        });
      }

      const notificationData = JSON.parse(notification);
      notificationData.read = true;
      notificationData.readAt = new Date().toISOString();

      // 更新通知
      await redis.hset(notificationKey, id, JSON.stringify(notificationData));

      logUtils.logAudit('notification_marked_read', req.userId, 'notifications', { 
        notificationId: id 
      });

      res.json({
        success: true,
        message: '通知已标记为已读',
        data: notificationData
      });
    } catch (error) {
      logUtils.logAudit('notification_mark_read_failed', req.userId, 'notifications', { 
        notificationId: id, error: error.message 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: 标记所有通知为已读
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.put('/read-all',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const notificationKey = `notifications:${req.userId}`;
      const notifications = await redis.hgetall(notificationKey);

      let updatedCount = 0;
      const now = new Date().toISOString();

      // 批量更新所有未读通知
      for (const [id, notification] of Object.entries(notifications)) {
        try {
          const notificationData = JSON.parse(notification);
          if (!notificationData.read) {
            notificationData.read = true;
            notificationData.readAt = now;
            await redis.hset(notificationKey, id, JSON.stringify(notificationData));
            updatedCount++;
          }
        } catch (parseError) {
          console.error('解析通知数据失败:', parseError);
        }
      }

      logUtils.logAudit('all_notifications_marked_read', req.userId, 'notifications', { 
        updatedCount 
      });

      res.json({
        success: true,
        message: `已标记 ${updatedCount} 条通知为已读`,
        data: {
          updatedCount,
          timestamp: now
        }
      });
    } catch (error) {
      logUtils.logAudit('mark_all_read_failed', req.userId, 'notifications', { error: error.message });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: 删除通知
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 通知ID
 */
router.delete('/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const notificationKey = `notifications:${req.userId}`;
      const deleted = await redis.hdel(notificationKey, id);

      if (deleted === 0) {
        return res.status(404).json({
          success: false,
          error: '通知不存在'
        });
      }

      logUtils.logAudit('notification_deleted', req.userId, 'notifications', { 
        notificationId: id 
      });

      res.json({
        success: true,
        message: '通知已删除',
        data: {
          notificationId: id,
          deleted: true
        }
      });
    } catch (error) {
      logUtils.logAudit('notification_delete_failed', req.userId, 'notifications', { 
        notificationId: id, error: error.message 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/notifications/clear:
 *   delete:
 *     summary: 清空所有通知
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/clear',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const notificationKey = `notifications:${req.userId}`;
      const notifications = await redis.hgetall(notificationKey);
      const count = Object.keys(notifications).length;

      // 删除所有通知
      await redis.del(notificationKey);

      logUtils.logAudit('all_notifications_cleared', req.userId, 'notifications', { 
        clearedCount: count 
      });

      res.json({
        success: true,
        message: `已清空 ${count} 条通知`,
        data: {
          clearedCount: count,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logUtils.logAudit('clear_notifications_failed', req.userId, 'notifications', { error: error.message });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: 发送通知（内部API）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - type
 *               - title
 *               - message
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 接收用户ID
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error, system]
 *                 description: 通知类型
 *               title:
 *                 type: string
 *                 description: 通知标题
 *               message:
 *                 type: string
 *                 description: 通知内容
 *               data:
 *                 type: object
 *                 description: 附加数据
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *                 description: 通知优先级
 */
router.post('/send',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, type, title, message, data = {}, priority = 'normal' } = req.body;

    try {
      // 验证必需字段
      if (!userId || !type || !title || !message) {
        return res.status(400).json({
          success: false,
          error: '缺少必需字段'
        });
      }

      // 创建通知对象
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        userId,
        read: false,
        data,
        priority,
        createdAt: new Date().toISOString()
      };

      // 保存到Redis
      const notificationKey = `notifications:${userId}`;
      await redis.hset(notificationKey, notification.id, JSON.stringify(notification));

      // 添加到通知队列（用于推送、邮件等）
      await queue.addJob('notifications', {
        type: 'send_notification',
        notification,
        deliveryMethods: ['in_app', 'email', 'push'] // 根据配置决定
      });

      // 发布实时通知（如果用户在线）
      await redis.publish('notifications', JSON.stringify({
        type: 'new_notification',
        userId,
        notification
      }));

      logUtils.logAudit('notification_sent', req.userId, 'notifications', {
        targetUserId: userId,
        notificationType: type,
        priority
      });

      res.json({
        success: true,
        message: '通知发送成功',
        data: {
          notificationId: notification.id,
          sentAt: notification.createdAt
        }
      });
    } catch (error) {
      logUtils.logAudit('notification_send_failed', req.userId, 'notifications', { 
        targetUserId: userId, error: error.message 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/notifications/broadcast:
 *   post:
 *     summary: 广播通知（管理员功能）
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - title
 *               - message
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error, system]
 *                 description: 通知类型
 *               title:
 *                 type: string
 *                 description: 通知标题
 *               message:
 *                 type: string
 *                 description: 通知内容
 *               data:
 *                 type: object
 *                 description: 附加数据
 *               targetRoles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [user, moderator, admin]
 *                 description: 目标角色
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *                 description: 通知优先级
 */
router.post('/broadcast',
  authenticate,
  asyncHandler(async (req, res) => {
    const { type, title, message, data = {}, targetRoles = ['user'], priority = 'normal' } = req.body;

    try {
      // 验证必需字段
      if (!type || !title || !message) {
        return res.status(400).json({
          success: false,
          error: '缺少必需字段'
        });
      }

      // 这里应该根据targetRoles获取目标用户列表
      // 由于没有用户模型，这里提供一个示例结构
      const targetUsers = ['user1', 'user2', 'user3']; // 示例用户ID

      const broadcastResults = {
        total: targetUsers.length,
        success: 0,
        failed: 0,
        notifications: []
      };

      // 为每个目标用户创建通知
      for (const userId of targetUsers) {
        try {
          const notification = {
            id: `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            title,
            message,
            userId,
            read: false,
            data: { ...data, broadcast: true },
            priority,
            createdAt: new Date().toISOString()
          };

          // 保存到Redis
          const notificationKey = `notifications:${userId}`;
          await redis.hset(notificationKey, notification.id, JSON.stringify(notification));

          // 添加到通知队列
          await queue.addJob('notifications', {
            type: 'send_notification',
            notification,
            deliveryMethods: ['in_app', 'email', 'push']
          });

          broadcastResults.success++;
          broadcastResults.notifications.push({
            userId,
            notificationId: notification.id
          });
        } catch (userError) {
          broadcastResults.failed++;
          console.error(`为用户 ${userId} 发送广播通知失败:`, userError);
        }
      }

      // 发布广播事件
      await redis.publish('broadcast', JSON.stringify({
        type: 'broadcast_notification',
        notification: { type, title, message, data, priority },
        targetUsers,
        timestamp: new Date().toISOString()
      }));

      logUtils.logAudit('broadcast_notification_sent', req.userId, 'notifications', {
        notificationType: type,
        targetRoles,
        totalUsers: targetUsers.length,
        successCount: broadcastResults.success,
        failedCount: broadcastResults.failed
      });

      res.json({
        success: true,
        message: '广播通知发送完成',
        data: broadcastResults
      });
    } catch (error) {
      logUtils.logAudit('broadcast_notification_failed', req.userId, 'notifications', { 
        error: error.message 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/notifications/settings:
 *   get:
 *     summary: 获取用户通知设置
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const settingsKey = `notification_settings:${req.userId}`;
      const settings = await redis.hgetall(settingsKey);

      // 默认设置
      const defaultSettings = {
        email: true,
        push: true,
        inApp: true,
        types: {
          info: true,
          success: true,
          warning: true,
          error: true,
          system: true
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        }
      };

      // 合并用户设置和默认设置
      const userSettings = {};
      for (const [key, value] of Object.entries(defaultSettings)) {
        if (settings[key]) {
          try {
            userSettings[key] = JSON.parse(settings[key]);
          } catch {
            userSettings[key] = settings[key];
          }
        } else {
          userSettings[key] = value;
        }
      }

      res.json({
        success: true,
        data: userSettings
      });
    } catch (error) {
      logUtils.logAudit('notification_settings_failed', req.userId, 'notifications', { error: error.message });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/notifications/settings:
 *   put:
 *     summary: 更新用户通知设置
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: boolean
 *                 description: 是否接收邮件通知
 *               push:
 *                 type: boolean
 *                 description: 是否接收推送通知
 *               inApp:
 *                 type: boolean
 *                 description: 是否接收应用内通知
 *               types:
 *                 type: object
 *                 description: 各类型通知开关
 *               quietHours:
 *                 type: object
 *                 description: 免打扰时间设置
 */
router.put('/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    const { email, push, inApp, types, quietHours } = req.body;

    try {
      const settingsKey = `notification_settings:${req.userId}`;
      const updates = {};

      if (email !== undefined) updates.email = email;
      if (push !== undefined) updates.push = push;
      if (inApp !== undefined) updates.inApp = inApp;
      if (types !== undefined) updates.types = types;
      if (quietHours !== undefined) updates.quietHours = quietHours;

      // 更新设置
      for (const [key, value] of Object.entries(updates)) {
        await redis.hset(settingsKey, key, JSON.stringify(value));
      }

      logUtils.logAudit('notification_settings_updated', req.userId, 'notifications', { 
        updatedFields: Object.keys(updates) 
      });

      res.json({
        success: true,
        message: '通知设置更新成功',
        data: {
          updated: Object.keys(updates),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logUtils.logAudit('notification_settings_update_failed', req.userId, 'notifications', { 
        error: error.message 
      });
      throw error;
    }
  })
);

module.exports = router;
