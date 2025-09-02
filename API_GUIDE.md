# 📖 API接口文档指南

## 🎯 概述

本文档详细介绍了企业级Node.js脚手架项目的所有API接口，包括请求格式、响应格式、错误处理等。

## 🔗 基础信息

- **Base URL**: `http://localhost:3000`
- **API版本**: v1.0.0
- **认证方式**: JWT Bearer Token
- **响应格式**: JSON

## 🔐 认证系统

### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "测试用户",
  "email": "test@example.com",
  "password": "Test123456",
  "age": 25
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "_id": "68b690bee8f58fdbf5ba143f",
      "name": "测试用户",
      "email": "test@example.com",
      "age": 25,
      "avatar": null,
      "isActive": true,
      "role": "user",
      "createdAt": "2025-09-02T06:37:50.771Z",
      "updatedAt": "2025-09-02T06:37:50.771Z",
      "fullName": "测试用户 (test@example.com)",
      "id": "68b690bee8f58fdbf5ba143f"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123456"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "_id": "68b690bee8f58fdbf5ba143f",
      "name": "测试用户",
      "email": "test@example.com",
      "age": 25,
      "avatar": null,
      "isActive": true,
      "role": "user",
      "createdAt": "2025-09-02T06:37:50.771Z",
      "updatedAt": "2025-09-02T06:37:50.771Z",
      "fullName": "测试用户 (test@example.com)",
      "id": "68b690bee8f58fdbf5ba143f"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

### 刷新令牌
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 获取当前用户信息
```http
GET /api/auth/me
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 修改密码
```http
PUT /api/auth/change-password
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

### 用户登出
```http
POST /api/auth/logout
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 👥 用户管理

### 获取用户列表
```http
GET /api/users?page=1&limit=10&sort=-createdAt
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10, 最大: 100)
- `sort`: 排序字段 (默认: -createdAt)
- `search`: 搜索关键词

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "68b690bee8f58fdbf5ba143f",
      "name": "测试用户",
      "email": "test@example.com",
      "age": 25,
      "avatar": null,
      "isActive": true,
      "role": "user",
      "createdAt": "2025-09-02T06:37:50.771Z",
      "updatedAt": "2025-09-02T06:37:50.771Z",
      "fullName": "测试用户 (test@example.com)",
      "id": "68b690bee8f58fdbf5ba143f"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### 搜索用户
```http
GET /api/users/search?q=测试&page=1&limit=10
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 获取单个用户
```http
GET /api/users/:id
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 创建用户
```http
POST /api/users
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "新用户",
  "email": "newuser@example.com",
  "age": 30
}
```

### 更新用户
```http
PUT /api/users/:id
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "更新后的用户名",
  "age": 31
}
```

### 删除用户
```http
DELETE /api/users/:id
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 📝 文章管理

### 获取文章列表
```http
GET /api/posts?page=1&limit=10&status=published
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 创建文章
```http
POST /api/posts
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "文章标题",
  "content": "文章内容",
  "tags": ["标签1", "标签2"],
  "status": "draft"
}
```

### 更新文章
```http
PUT /api/posts/:id
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "更新后的标题",
  "content": "更新后的内容"
}
```

### 删除文章
```http
DELETE /api/posts/:id
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 📁 文件上传

### 上传文件
```http
POST /api/upload
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data

file: [文件]
description: "文件描述"
tags: ["标签1", "标签2"]
```

**响应示例**:
```json
{
  "success": true,
  "message": "文件上传成功",
  "data": {
    "filename": "upload_1234567890.jpg",
    "originalname": "image.jpg",
    "mimetype": "image/jpeg",
    "size": 1024000,
    "url": "/uploads/upload_1234567890.jpg"
  }
}
```

## 🔔 通知系统

### 获取通知列表
```http
GET /api/notifications?page=1&limit=10
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 创建通知
```http
POST /api/notifications
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "通知标题",
  "content": "通知内容",
  "type": "info",
  "recipients": ["user_id_1", "user_id_2"],
  "priority": "normal"
}
```

### 标记通知为已读
```http
PUT /api/notifications/:id/read
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 🛠️ 管理功能

### 获取系统统计
```http
GET /api/admin/stats
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 获取用户统计
```http
GET /api/admin/users/stats
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 获取系统日志
```http
GET /api/admin/logs?page=1&limit=50
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 🏥 健康检查

### 系统健康状态
```http
GET /health
```

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-02T06:37:40.543Z",
  "uptime": 19.285375711,
  "memory": {
    "rss": 88907776,
    "heapTotal": 37351424,
    "heapUsed": 34375576,
    "external": 20758269,
    "arrayBuffers": 18306753
  },
  "version": "v22.18.0",
  "platform": "darwin"
}
```

## 📊 响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... },
  "timestamp": "2025-09-02T06:37:40.543Z"
}
```

### 分页响应
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "message": "错误描述",
    "statusCode": 400,
    "timestamp": "2025-09-02T06:37:40.543Z"
  }
}
```

## ❌ 错误码说明

| 状态码 | 说明 | 示例 |
|--------|------|------|
| 200 | 请求成功 | 获取数据成功 |
| 201 | 创建成功 | 用户注册成功 |
| 400 | 请求参数错误 | 数据验证失败 |
| 401 | 未授权 | 令牌无效或过期 |
| 403 | 权限不足 | 需要管理员权限 |
| 404 | 资源不存在 | 用户不存在 |
| 409 | 资源冲突 | 邮箱已存在 |
| 429 | 请求过于频繁 | 触发限流 |
| 500 | 服务器内部错误 | 数据库连接失败 |

## 🔒 权限说明

### 角色定义
- **user**: 普通用户
- **moderator**: 版主
- **admin**: 管理员

### 权限矩阵
| 功能 | user | moderator | admin |
|------|------|-----------|-------|
| 用户注册 | ✅ | ✅ | ✅ |
| 用户登录 | ✅ | ✅ | ✅ |
| 查看个人信息 | ✅ | ✅ | ✅ |
| 修改个人信息 | ✅ | ✅ | ✅ |
| 查看用户列表 | ❌ | ✅ | ✅ |
| 创建用户 | ❌ | ❌ | ✅ |
| 删除用户 | ❌ | ❌ | ✅ |
| 系统管理 | ❌ | ❌ | ✅ |

## 🧪 测试示例

### 使用curl测试
```bash
# 用户注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"测试用户","email":"test@example.com","password":"Test123456","age":25}'

# 用户登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'

# 获取用户列表
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 使用Postman测试
1. 导入API集合
2. 设置环境变量
3. 配置认证令牌
4. 运行测试用例

## 📚 更多资源

- **Swagger文档**: http://localhost:3000/api-docs
- **架构文档**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **学习指南**: [LEARNING_GUIDE.md](./LEARNING_GUIDE.md)
- **GitHub仓库**: [项目地址]

---

**💡 提示**: 建议先阅读架构文档和学习指南，理解项目整体结构后再使用API接口。
