const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logUtils } = require('../config/logger');
const queue = require('../config/queue');

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', file.fieldname);
    // 确保目录存在
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedTypes = {
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'video': ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
    'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3']
  };

  const fileType = file.fieldname;
  if (allowedTypes[fileType] && allowedTypes[fileType].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // 最多5个文件
  }
});

/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     summary: 上传图片文件
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 图片文件
 *               resize:
 *                 type: string
 *                 description: 是否调整大小 (true/false)
 *               width:
 *                 type: integer
 *                 description: 目标宽度
 *               height:
 *                 type: integer
 *                 description: 目标高度
 *               quality:
 *                 type: integer
 *                 description: 图片质量 (1-100)
 */
router.post('/image',
  authenticate,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '请选择要上传的图片文件'
        });
      }

      const { resize, width, height, quality } = req.body;
      let processedFile = req.file;

      // 如果需要调整大小
      if (resize === 'true' && (width || height)) {
        const targetWidth = width ? parseInt(width) : undefined;
        const targetHeight = height ? parseInt(height) : undefined;
        const targetQuality = quality ? parseInt(quality) : 80;

        const outputPath = path.join(
          path.dirname(req.file.path),
          `resized-${path.basename(req.file.path)}`
        );

        await sharp(req.file.path)
          .resize(targetWidth, targetHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: targetQuality })
          .toFile(outputPath);

        processedFile = {
          ...req.file,
          path: outputPath,
          filename: path.basename(outputPath)
        };

        // 删除原文件
        await fs.unlink(req.file.path);
      }

      // 记录上传日志
      logUtils.logAudit('image_uploaded', req.userId, 'upload', {
        filename: processedFile.filename,
        originalName: req.file.originalname,
        size: processedFile.size,
        mimetype: processedFile.mimetype,
        path: processedFile.path
      });

      // 添加到图片处理队列（可选）
      await queue.addJob('file-processing', {
        type: 'image_optimization',
        filePath: processedFile.path,
        userId: req.userId,
        originalName: req.file.originalname
      });

      res.json({
        success: true,
        message: '图片上传成功',
        data: {
          filename: processedFile.filename,
          originalName: req.file.originalname,
          size: processedFile.size,
          mimetype: processedFile.mimetype,
          url: `/uploads/image/${processedFile.filename}`,
          path: processedFile.path
        }
      });
    } catch (error) {
      // 清理已上传的文件
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('清理文件失败:', unlinkError);
        }
      }

      logUtils.logAudit('image_upload_failed', req.userId, 'upload', { 
        error: error.message, originalName: req.file?.originalname 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/upload/document:
 *   post:
 *     summary: 上传文档文件
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: 文档文件
 */
router.post('/document',
  authenticate,
  upload.single('document'),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '请选择要上传的文档文件'
        });
      }

      // 记录上传日志
      logUtils.logAudit('document_uploaded', req.userId, 'upload', {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      });

      // 添加到文档处理队列
      await queue.addJob('file-processing', {
        type: 'document_processing',
        filePath: req.file.path,
        userId: req.userId,
        originalName: req.file.originalname
      });

      res.json({
        success: true,
        message: '文档上传成功',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: `/uploads/document/${req.file.filename}`,
          path: req.file.path
        }
      });
    } catch (error) {
      // 清理已上传的文件
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('清理文件失败:', unlinkError);
        }
      }

      logUtils.logAudit('document_upload_failed', req.userId, 'upload', { 
        error: error.message, originalName: req.file?.originalname 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/upload/multiple:
 *   post:
 *     summary: 批量上传文件
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 多个文件
 */
router.post('/multiple',
  authenticate,
  upload.array('files', 5),
  asyncHandler(async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请选择要上传的文件'
        });
      }

      const uploadedFiles = [];
      const errors = [];

      for (const file of req.files) {
        try {
          // 记录上传日志
          logUtils.logAudit('file_uploaded', req.userId, 'upload', {
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            path: file.path
          });

          uploadedFiles.push({
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            url: `/uploads/${file.fieldname}/${file.filename}`,
            path: file.path
          });

          // 添加到文件处理队列
          await queue.addJob('file-processing', {
            type: 'file_processing',
            filePath: file.path,
            userId: req.userId,
            originalName: file.originalname,
            fileType: file.fieldname
          });
        } catch (fileError) {
          errors.push({
            originalName: file.originalname,
            error: fileError.message
          });

          // 清理失败的文件
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('清理文件失败:', unlinkError);
          }
        }
      }

      res.json({
        success: true,
        message: `成功上传 ${uploadedFiles.length} 个文件`,
        data: {
          uploaded: uploadedFiles,
          errors: errors,
          total: req.files.length,
          success: uploadedFiles.length,
          failed: errors.length
        }
      });
    } catch (error) {
      // 清理所有已上传的文件
      if (req.files) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('清理文件失败:', unlinkError);
          }
        }
      }

      logUtils.logAudit('multiple_upload_failed', req.userId, 'upload', { 
        error: error.message, fileCount: req.files?.length || 0 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/upload/avatar:
 *   post:
 *     summary: 上传用户头像
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: 头像图片
 */
router.post('/avatar',
  authenticate,
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '请选择要上传的头像文件'
        });
      }

      // 处理头像图片
      const avatarSizes = [
        { suffix: 'large', width: 300, height: 300 },
        { suffix: 'medium', width: 150, height: 150 },
        { suffix: 'small', width: 50, height: 50 }
      ];

      const processedAvatars = [];
      const baseName = path.basename(req.file.filename, path.extname(req.file.filename));

      for (const size of avatarSizes) {
        const outputPath = path.join(
          path.dirname(req.file.path),
          `${baseName}-${size.suffix}${path.extname(req.file.filename)}`
        );

        await sharp(req.file.path)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85 })
          .toFile(outputPath);

        processedAvatars.push({
          size: size.suffix,
          path: outputPath,
          filename: path.basename(outputPath),
          url: `/uploads/avatar/${path.basename(outputPath)}`
        });
      }

      // 删除原文件
      await fs.unlink(req.file.path);

      // 记录上传日志
      logUtils.logAudit('avatar_uploaded', req.userId, 'upload', {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        processedSizes: processedAvatars.map(avatar => avatar.size)
      });

      res.json({
        success: true,
        message: '头像上传成功',
        data: {
          originalName: req.file.originalname,
          avatars: processedAvatars
        }
      });
    } catch (error) {
      // 清理已上传的文件
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('清理文件失败:', unlinkError);
        }
      }

      logUtils.logAudit('avatar_upload_failed', req.userId, 'upload', { 
        error: error.message, originalName: req.file?.originalname 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/upload/delete/{filename}:
 *   delete:
 *     summary: 删除上传的文件
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: 文件名
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [image, document, avatar, video, audio]
 *         description: 文件类型
 */
router.delete('/delete/:filename',
  authenticate,
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const { type } = req.query;

    try {
      if (!type) {
        return res.status(400).json({
          success: false,
          error: '请指定文件类型'
        });
      }

      const filePath = path.join(process.cwd(), 'uploads', type, filename);

      // 检查文件是否存在
      try {
        await fs.access(filePath);
      } catch (accessError) {
        return res.status(404).json({
          success: false,
          error: '文件不存在'
        });
      }

      // 删除文件
      await fs.unlink(filePath);

      // 记录删除日志
      logUtils.logAudit('file_deleted', req.userId, 'upload', {
        filename,
        fileType: type,
        filePath
      });

      res.json({
        success: true,
        message: '文件删除成功',
        data: {
          filename,
          type
        }
      });
    } catch (error) {
      logUtils.logAudit('file_delete_failed', req.userId, 'upload', { 
        filename, type, error: error.message 
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/upload/stats:
 *   get:
 *     summary: 获取上传统计信息
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      const stats = {};

      // 获取各类型文件的统计信息
      const fileTypes = ['image', 'document', 'avatar', 'video', 'audio'];

      for (const type of fileTypes) {
        const typeDir = path.join(uploadDir, type);
        try {
          const files = await fs.readdir(typeDir);
          const fileStats = await Promise.all(
            files.map(async (file) => {
              const filePath = path.join(typeDir, file);
              const stat = await fs.stat(filePath);
              return {
                name: file,
                size: stat.size,
                createdAt: stat.birthtime,
                modifiedAt: stat.mtime
              };
            })
          );

          stats[type] = {
            count: fileStats.length,
            totalSize: fileStats.reduce((sum, file) => sum + file.size, 0),
            files: fileStats
          };
        } catch (dirError) {
          stats[type] = {
            count: 0,
            totalSize: 0,
            files: []
          };
        }
      }

      // 记录访问日志
      logUtils.logAudit('upload_stats_accessed', req.userId, 'upload', {});

      res.json({
        success: true,
        data: {
          stats,
          totalFiles: Object.values(stats).reduce((sum, type) => sum + type.count, 0),
          totalSize: Object.values(stats).reduce((sum, type) => sum + type.totalSize, 0),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logUtils.logAudit('upload_stats_access_failed', req.userId, 'upload', { error: error.message });
      throw error;
    }
  })
);

module.exports = router;
