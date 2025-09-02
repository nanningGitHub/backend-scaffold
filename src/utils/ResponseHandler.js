/**
 * 统一响应处理工具
 * 提供标准化的API响应格式
 */
class ResponseHandler {
  /**
   * 成功响应
   */
  static success(res, data = null, message = '操作成功', statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    res.status(statusCode).json(response);
  }

  /**
   * 创建成功响应
   */
  static created(res, data, message = '创建成功') {
    this.success(res, data, message, 201);
  }

  /**
   * 无内容响应
   */
  static noContent(res) {
    res.status(204).send();
  }

  /**
   * 分页响应
   */
  static paginated(res, data, pagination, message = '获取成功') {
    const response = {
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  /**
   * 列表响应
   */
  static list(res, data, total = null, message = '获取成功') {
    const response = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    if (total !== null) {
      response.total = total;
    }

    res.json(response);
  }

  /**
   * 错误响应
   */
  static error(res, message = '操作失败', statusCode = 400, details = null) {
    const response = {
      success: false,
      error: {
        message,
        statusCode,
        timestamp: new Date().toISOString()
      }
    };

    if (details) {
      response.error.details = details;
    }

    res.status(statusCode).json(response);
  }

  /**
   * 验证错误响应
   */
  static validationError(res, errors, message = '数据验证失败') {
    this.error(res, message, 400, errors);
  }

  /**
   * 认证错误响应
   */
  static authenticationError(res, message = '认证失败') {
    this.error(res, message, 401);
  }

  /**
   * 权限错误响应
   */
  static authorizationError(res, message = '权限不足') {
    this.error(res, message, 403);
  }

  /**
   * 资源不存在响应
   */
  static notFound(res, message = '资源不存在') {
    this.error(res, message, 404);
  }

  /**
   * 冲突错误响应
   */
  static conflict(res, message = '资源冲突') {
    this.error(res, message, 409);
  }

  /**
   * 限流错误响应
   */
  static rateLimit(res, message = '请求过于频繁', retryAfter = null) {
    const response = {
      success: false,
      error: {
        message,
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    };

    if (retryAfter) {
      response.error.retryAfter = retryAfter;
    }

    res.status(429).json(response);
  }

  /**
   * 服务器错误响应
   */
  static serverError(res, message = '服务器内部错误') {
    this.error(res, message, 500);
  }

  /**
   * 外部服务错误响应
   */
  static externalServiceError(res, message = '外部服务调用失败') {
    this.error(res, message, 502);
  }

  /**
   * 文件上传响应
   */
  static fileUpload(res, file, message = '文件上传成功') {
    const response = {
      success: true,
      message,
      data: {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: file.path || file.filename
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  /**
   * 批量操作响应
   */
  static batchOperation(res, results, message = '批量操作完成') {
    const response = {
      success: true,
      message,
      data: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }
}

module.exports = ResponseHandler;
