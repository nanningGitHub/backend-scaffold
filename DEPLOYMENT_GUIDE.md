# 🚀 部署指南

## 📋 概述

本指南详细介绍了如何将企业级Node.js脚手架项目部署到不同的环境中，包括开发环境、测试环境和生产环境。

## 🛠️ 环境准备

### 系统要求
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **MongoDB**: >= 5.0
- **Redis**: >= 6.0
- **内存**: >= 2GB
- **磁盘**: >= 10GB

### 依赖服务
```bash
# 安装MongoDB
brew install mongodb-community
brew services start mongodb-community

# 安装Redis
brew install redis
brew services start redis

# 验证服务状态
mongod --version
redis-server --version
```

## 🔧 环境配置

### 1. 开发环境

**配置文件**: `.env`
```bash
# 服务器配置
PORT=3000
NODE_ENV=development

# CORS配置
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/node-cil

# JWT密钥
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# 日志配置
LOG_LEVEL=debug
```

**启动命令**:
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问应用
# API服务: http://localhost:3000
# API文档: http://localhost:3000/api-docs
```

### 2. 测试环境

**配置文件**: `.env.test`
```bash
# 服务器配置
PORT=3001
NODE_ENV=test

# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/node-cil-test

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

# 日志配置
LOG_LEVEL=info
```

**启动命令**:
```bash
# 运行测试
npm test

# 运行测试覆盖率
npm run test:coverage

# 运行端到端测试
npm run test:e2e
```

### 3. 生产环境

**配置文件**: `.env.production`
```bash
# 服务器配置
PORT=3000
NODE_ENV=production

# CORS配置
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# MongoDB配置
MONGODB_URI=mongodb://username:password@your-mongodb-host:27017/node-cil?authSource=admin

# JWT密钥（必须更改）
JWT_SECRET=your-production-secret-key-very-long-and-secure
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Redis配置
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# 日志配置
LOG_LEVEL=warn

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

## 🐳 Docker部署

### 1. 创建Dockerfile
```dockerfile
# 使用官方Node.js镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 更改文件所有权
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["npm", "start"]
```

### 2. 创建docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/node-cil
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - mongo
      - redis
    restart: unless-stopped
    networks:
      - app-network

  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:6.2-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network

volumes:
  mongo_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### 3. 创建nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        # 重定向到HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        # SSL配置
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # 安全头
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # 代理配置
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 4. 部署命令
```bash
# 构建和启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down

# 重新构建
docker-compose up -d --build
```

## ☁️ 云平台部署

### 1. AWS部署

**使用AWS ECS**:
```bash
# 创建ECS集群
aws ecs create-cluster --cluster-name node-app-cluster

# 创建任务定义
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 创建服务
aws ecs create-service --cluster node-app-cluster --service-name node-app-service --task-definition node-app:1 --desired-count 2
```

**使用AWS Elastic Beanstalk**:
```bash
# 安装EB CLI
pip install awsebcli

# 初始化应用
eb init

# 创建环境
eb create production

# 部署应用
eb deploy
```

### 2. Google Cloud部署

**使用Cloud Run**:
```bash
# 构建镜像
gcloud builds submit --tag gcr.io/PROJECT-ID/node-app

# 部署到Cloud Run
gcloud run deploy --image gcr.io/PROJECT-ID/node-app --platform managed --region us-central1
```

### 3. Azure部署

**使用Azure Container Instances**:
```bash
# 创建资源组
az group create --name myResourceGroup --location eastus

# 部署容器
az container create --resource-group myResourceGroup --name node-app --image your-registry/node-app --dns-name-label node-app --ports 3000
```

## 🔄 PM2进程管理

### 1. 安装PM2
```bash
npm install -g pm2
```

### 2. 创建ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'node-app',
    script: 'src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### 3. PM2命令
```bash
# 启动应用
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart node-app

# 停止应用
pm2 stop node-app

# 删除应用
pm2 delete node-app

# 监控
pm2 monit
```

## 📊 监控和日志

### 1. 应用监控
```bash
# 安装监控工具
npm install -g clinic

# 性能分析
clinic doctor -- node src/app.js

# 内存分析
clinic heapprofiler -- node src/app.js
```

### 2. 日志管理
```bash
# 查看应用日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log

# 日志轮转
pm2 install pm2-logrotate
```

### 3. 健康检查
```bash
# 检查应用状态
curl -f http://localhost:3000/health

# 检查数据库连接
curl -f http://localhost:3000/health/database

# 检查Redis连接
curl -f http://localhost:3000/health/redis
```

## 🔒 安全配置

### 1. 防火墙配置
```bash
# 只允许必要端口
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### 2. SSL证书配置
```bash
# 使用Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 3. 环境变量安全
```bash
# 使用密钥管理服务
# AWS Secrets Manager
# Azure Key Vault
# Google Secret Manager
```

## 🚨 故障排除

### 常见问题

**1. 应用无法启动**
```bash
# 检查端口占用
lsof -i :3000

# 检查环境变量
env | grep NODE_ENV

# 检查日志
pm2 logs
```

**2. 数据库连接失败**
```bash
# 检查MongoDB状态
systemctl status mongod

# 检查连接字符串
echo $MONGODB_URI

# 测试连接
mongo $MONGODB_URI
```

**3. Redis连接失败**
```bash
# 检查Redis状态
systemctl status redis

# 测试连接
redis-cli ping
```

**4. 内存不足**
```bash
# 检查内存使用
free -h

# 检查进程内存
ps aux --sort=-%mem | head

# 重启应用
pm2 restart node-app
```

## 📈 性能优化

### 1. 应用优化
```bash
# 启用集群模式
pm2 start ecosystem.config.js --instances max

# 启用压缩
npm install compression

# 启用缓存
npm install redis
```

### 2. 数据库优化
```bash
# 创建索引
db.users.createIndex({ email: 1 })
db.users.createIndex({ createdAt: -1 })

# 连接池配置
mongoose.connect(uri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### 3. 负载均衡
```nginx
upstream app {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}
```

## 🔄 持续集成/持续部署

### 1. GitHub Actions
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        run: |
          # 部署脚本
          echo "Deploying to production..."
```

### 2. 部署脚本
```bash
#!/bin/bash
# deploy.sh

echo "开始部署..."

# 拉取最新代码
git pull origin main

# 安装依赖
npm ci --only=production

# 运行测试
npm test

# 重启应用
pm2 restart node-app

echo "部署完成!"
```

## 📚 最佳实践

### 1. 部署前检查
- [ ] 代码测试通过
- [ ] 环境变量配置正确
- [ ] 数据库迁移完成
- [ ] SSL证书有效
- [ ] 监控配置完成

### 2. 部署后验证
- [ ] 应用启动成功
- [ ] 健康检查通过
- [ ] API接口正常
- [ ] 数据库连接正常
- [ ] 日志记录正常

### 3. 回滚策略
```bash
# 快速回滚
pm2 restart node-app --update-env

# 代码回滚
git revert HEAD
git push origin main
```

---

**💡 提示**: 建议在生产环境部署前，先在测试环境进行充分测试，确保所有功能正常。
