# 📚 API 接口文档

## 概述

企业级脚手架API提供完整的RESTful接口，支持用户管理、内容管理、文件上传、通知系统等核心功能。

## 🔐 认证

### JWT认证流程

1. **用户注册/登录** - 获取访问令牌和刷新令牌
2. **API调用** - 在请求头中携带访问令牌
3. **令牌刷新** - 当访问令牌过期时，使用刷新令牌获取新的令牌对

### 请求头格式

```http
Authorization: Bearer <access_token>
```

### 令牌类型

- **访问令牌 (Access Token)**: 有效期15分钟，用于API调用
- **刷新令牌 (Refresh Token)**: 有效期7天，用于获取新的访问令牌

## 👥 用户管理

### 用户注册

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "password": "SecurePass123",
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
      "id": "507f1f77bcf86cd799439011",
      "name": "张三",
      "email": "zhangsan@example.com",
      "age": 25,
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 用户登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "zhangsan@example.com",
  "password": "SecurePass123"
}
```

### 获取用户信息

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

### 修改密码

```http
PUT /api/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "SecurePass123",
  "newPassword": "NewSecurePass456"
}
```

## 📝 内容管理

### 获取文章列表

```http
GET /api/posts?page=1&limit=10&status=published&tag=技术
```

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10, 最大: 100)
- `status`: 文章状态 (draft, published, archived)
- `tag`: 标签筛选
- `author`: 作者ID筛选
- `search`: 关键词搜索

**响应示例**:
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "507f1f77bcf86cd799439011",
        "title": "Node.js最佳实践",
        "content": "本文介绍Node.js开发中的最佳实践...",
        "author": {
          "id": "507f1f77bcf86cd799439012",
          "name": "张三"
        },
        "tags": ["Node.js", "最佳实践"],
        "status": "published",
        "viewCount": 150,
        "likeCount": 25,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "totalPages": 15
    }
  }
}
```

### 创建文章

```http
POST /api/posts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "新文章标题",
  "content": "文章内容...",
  "tags": ["标签1", "标签2"],
  "status": "draft"
}
```

### 更新文章

```http
PUT /api/posts/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "更新后的标题",
  "content": "更新后的内容...",
  "tags": ["新标签1", "新标签2"]
}
```

### 删除文章

```http
DELETE /api/posts/:id
Authorization: Bearer <access_token>
```

## 📁 文件上传

### 上传图片

```http
POST /api/upload/image
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

image: [文件]
resize: true
width: 800
height: 600
quality: 85
```

**响应示例**:
```json
{
  "success": true,
  "message": "图片上传成功",
  "data": {
    "filename": "uuid-timestamp.jpg",
    "originalName": "photo.jpg",
    "size": 1024000,
    "mimetype": "image/jpeg",
    "url": "/uploads/image/uuid-timestamp.jpg"
  }
}
```

### 上传文档

```http
POST /api/upload/document
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

document: [文件]
```

### 批量上传

```http
POST /api/upload/multiple
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

files: [文件1, 文件2, 文件3]
```

### 上传头像

```http
POST /api/upload/avatar
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

avatar: [文件]
```

**响应示例**:
```json
{
  "success": true,
  "message": "头像上传成功",
  "data": {
    "originalName": "avatar.jpg",
    "avatars": [
      {
        "size": "large",
        "url": "/uploads/avatar/uuid-large.jpg",
        "width": 300,
        "height": 300
      },
      {
        "size": "medium",
        "url": "/uploads/avatar/uuid-medium.jpg",
        "width": 150,
        "height": 150
      },
      {
        "size": "small",
        "url": "/uploads/avatar/uuid-small.jpg",
        "width": 50,
        "height": 50
      }
    ]
  }
}
```

## 🔔 通知系统

### 获取通知列表

```http
GET /api/notifications?page=1&limit=20&type=info&read=false
```

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)
- `type`: 通知类型 (info, success, warning, error, system)
- `read`: 已读状态 (true, false)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_1234567890",
        "type": "info",
        "title": "系统通知",
        "message": "您的账户已成功激活",
        "read": false,
        "data": {},
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### 获取未读数量

```http
GET /api/notifications/unread
Authorization: Bearer <access_token>
```

### 标记通知已读

```http
PUT /api/notifications/:id/read
Authorization: Bearer <access_token>
```

### 全部标记已读

```http
PUT /api/notifications/read-all
Authorization: Bearer <access_token>
```

### 删除通知

```http
DELETE /api/notifications/:id
Authorization: Bearer <access_token>
```

### 清空通知

```http
DELETE /api/notifications/clear
Authorization: Bearer <access_token>
```

## 🎯 管理功能

### 获取仪表板数据

```http
GET /api/admin/dashboard
Authorization: Bearer <access_token>
```

**权限要求**: admin

**响应示例**:
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 150,
      "active": 145,
      "inactive": 5,
      "admins": 3,
      "moderators": 8
    },
    "posts": {
      "total": 300,
      "published": 280,
      "draft": 15,
      "archived": 5,
      "featured": 10
    },
    "system": {
      "uptime": 86400,
      "memory": {
        "heapUsed": 52428800,
        "heapTotal": 104857600
      },
      "nodeVersion": "v18.17.0"
    },
    "queues": [
      {
        "name": "email",
        "waiting": 5,
        "active": 2,
        "completed": 150,
        "failed": 1
      }
    ],
    "redis": {
      "status": "healthy",
      "latency": "2ms"
    }
  }
}
```

### 用户管理

```http
GET /api/admin/users?page=1&limit=20&role=user&status=active&search=张三
```

**权限要求**: admin

### 更新用户角色

```http
PUT /api/admin/users/:id/role
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role": "moderator"
}
```

**权限要求**: admin

### 更新用户状态

```http
PUT /api/admin/users/:id/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "isActive": false
}
```

**权限要求**: admin

### 系统健康检查

```http
GET /api/admin/system/health
Authorization: Bearer <access_token>
```

**权限要求**: admin

### 队列管理

```http
GET /api/admin/queue/:name/stats
Authorization: Bearer <access_token>
```

**权限要求**: admin

```http
POST /api/admin/queue/:name/pause
Authorization: Bearer <access_token>
```

**权限要求**: admin

```http
POST /api/admin/queue/:name/resume
Authorization: Bearer <access_token>
```

**权限要求**: admin

## 🏥 健康检查

### 基础健康检查

```http
GET /health
```

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

### 详细健康检查

```http
GET /health/detailed
```

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": "5ms"
    },
    "redis": {
      "status": "healthy",
      "responseTime": "2ms"
    },
    "queue": {
      "status": "healthy",
      "activeJobs": 5
    }
  },
  "system": {
    "uptime": 86400,
    "memory": {
      "heapUsed": 52428800,
      "heapTotal": 104857600,
      "external": 1048576
    },
    "cpu": {
      "user": 1000,
      "system": 500
    }
  }
}
```

## 📊 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": {
    "field": "具体错误信息"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 常见HTTP状态码

- `200 OK` - 请求成功
- `201 Created` - 资源创建成功
- `400 Bad Request` - 请求参数错误
- `401 Unauthorized` - 未认证或认证失败
- `403 Forbidden` - 权限不足
- `404 Not Found` - 资源不存在
- `429 Too Many Requests` - 请求频率超限
- `500 Internal Server Error` - 服务器内部错误

### 业务错误码

- `AUTH_FAILED` - 认证失败
- `INVALID_TOKEN` - 无效令牌
- `TOKEN_EXPIRED` - 令牌过期
- `INSUFFICIENT_PERMISSIONS` - 权限不足
- `RESOURCE_NOT_FOUND` - 资源不存在
- `VALIDATION_ERROR` - 数据验证失败
- `RATE_LIMIT_EXCEEDED` - 请求频率超限

## 🔧 开发工具

### Swagger文档

访问 `/api-docs` 获取交互式API文档，支持在线测试API接口。

### 环境变量

所有配置通过环境变量管理，支持多环境部署。

### 日志记录

详细的请求日志和错误日志，便于调试和监控。

## 📝 使用示例

### cURL示例

```bash
# 用户注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","email":"zhangsan@example.com","password":"SecurePass123","age":25}'

# 用户登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"zhangsan@example.com","password":"SecurePass123"}'

# 获取用户信息
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 创建文章
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试文章","content":"这是测试内容","tags":["测试"]}'
```

### JavaScript示例

```javascript
// 用户登录
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'zhangsan@example.com',
    password: 'SecurePass123'
  })
});

const { accessToken } = await loginResponse.json();

// 获取用户信息
const userResponse = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const user = await userResponse.json();
```

### Python示例

```python
import requests

# 用户登录
login_data = {
    "email": "zhangsan@example.com",
    "password": "SecurePass123"
}

response = requests.post('http://localhost:3000/api/auth/login', json=login_data)
access_token = response.json()['data']['accessToken']

# 获取用户信息
headers = {'Authorization': f'Bearer {access_token}'}
user_response = requests.get('http://localhost:3000/api/auth/me', headers=headers)
user = user_response.json()
```

## 📚 更多信息

- **项目地址**: [GitHub Repository](https://github.com/your-org/enterprise-scaffold)
- **问题反馈**: [Issues](https://github.com/your-org/enterprise-scaffold/issues)
- **在线文档**: [Swagger UI](http://localhost:3000/api-docs)
- **技术文档**: [技术架构文档](docs/ARCHITECTURE.md)
