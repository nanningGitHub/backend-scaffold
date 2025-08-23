# 🚀 部署指南

## 概述

本指南将帮助您将企业级脚手架项目部署到各种环境中，包括开发、测试和生产环境。

## 📋 部署前准备

### 系统要求

- **操作系统**: Linux (推荐 Ubuntu 20.04+), macOS, Windows
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **MongoDB**: >= 5.0
- **Redis**: >= 6.0
- **内存**: 最少 2GB RAM
- **磁盘**: 最少 10GB 可用空间

### 环境检查

```bash
# 检查Node.js版本
node --version

# 检查npm版本
npm --version

# 检查MongoDB版本
mongod --version

# 检查Redis版本
redis-server --version
```

## 🏗️ 本地开发环境

### 1. 克隆项目

```bash
git clone <repository-url>
cd enterprise-scaffold
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

```bash
# 复制环境变量模板
cp env.example .env

# 编辑环境变量
vim .env
```

### 4. 启动服务

```bash
# 启动MongoDB
mongod --dbpath /path/to/data/db

# 启动Redis
redis-server

# 启动应用
npm run dev
```

### 5. 验证部署

```bash
# 检查应用状态
curl http://localhost:3000/health

# 检查API文档
open http://localhost:3000/api-docs
```

## 🐳 Docker部署

### 1. 创建Dockerfile

```dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建必要的目录
RUN mkdir -p logs uploads

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["npm", "start"]
```

### 2. 创建.dockerignore

```
node_modules
npm-debug.log
logs
uploads
.env
.git
.gitignore
README.md
docs
tests
```

### 3. 构建镜像

```bash
# 构建镜像
docker build -t enterprise-scaffold .

# 查看镜像
docker images
```

### 4. 运行容器

```bash
# 运行容器
docker run -d \
  --name enterprise-scaffold \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/enterprise-scaffold \
  -e REDIS_HOST=host.docker.internal \
  -e REDIS_PORT=6379 \
  enterprise-scaffold

# 查看容器状态
docker ps

# 查看日志
docker logs enterprise-scaffold
```

### 5. Docker Compose部署

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/enterprise-scaffold
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - mongo
      - redis
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7.0-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
```

启动服务:

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## ☁️ 云服务器部署

### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# 安装Redis
sudo apt install -y redis-server

# 启动服务
sudo systemctl start mongod
sudo systemctl start redis-server
sudo systemctl enable mongod
sudo systemctl enable redis-server
```

### 2. 项目部署

```bash
# 创建应用目录
sudo mkdir -p /var/www/enterprise-scaffold
sudo chown $USER:$USER /var/www/enterprise-scaffold

# 克隆项目
cd /var/www/enterprise-scaffold
git clone <repository-url> .

# 安装依赖
npm install --production

# 创建环境配置
cp env.example .env
vim .env
```

### 3. 环境配置

```bash
# 生产环境配置
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/enterprise-scaffold
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-production-secret-key
```

### 4. 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'enterprise-scaffold',
    script: 'src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
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
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
```

### 5. Nginx反向代理

安装Nginx:

```bash
sudo apt install -y nginx
```

创建Nginx配置:

```bash
sudo vim /etc/nginx/sites-available/enterprise-scaffold
```

配置内容:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # 日志
    access_log /var/log/nginx/enterprise-scaffold.access.log;
    error_log /var/log/nginx/enterprise-scaffold.error.log;

    # 反向代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # 静态文件
    location /uploads/ {
        alias /var/www/enterprise-scaffold/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

启用配置:

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/enterprise-scaffold /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

## ☸️ Kubernetes部署

### 1. 创建命名空间

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: enterprise-scaffold
```

### 2. 创建ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: enterprise-scaffold
data:
  NODE_ENV: "production"
  PORT: "3000"
  MONGODB_URI: "mongodb://mongo-service:27017/enterprise-scaffold"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
```

### 3. 创建Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: enterprise-scaffold
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  MONGODB_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
```

### 4. 创建Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enterprise-scaffold
  namespace: enterprise-scaffold
spec:
  replicas: 3
  selector:
    matchLabels:
      app: enterprise-scaffold
  template:
    metadata:
      labels:
        app: enterprise-scaffold
    spec:
      containers:
      - name: app
        image: enterprise-scaffold:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: uploads
          mountPath: /app/uploads
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: uploads
        persistentVolumeClaim:
          claimName: uploads-pvc
      - name: logs
        persistentVolumeClaim:
          claimName: logs-pvc
```

### 5. 创建Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: enterprise-scaffold-service
  namespace: enterprise-scaffold
spec:
  selector:
    app: enterprise-scaffold
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### 6. 创建Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: enterprise-scaffold-ingress
  namespace: enterprise-scaffold
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: tls-secret
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: enterprise-scaffold-service
            port:
              number: 80
```

## 🔒 SSL证书配置

### 使用Let's Encrypt

```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 监控和日志

### 1. 应用监控

```bash
# PM2监控
pm2 monit

# 查看应用状态
pm2 status

# 查看日志
pm2 logs
```

### 2. 系统监控

```bash
# 系统资源监控
htop
iotop
nethogs

# 磁盘使用
df -h
du -sh /var/www/enterprise-scaffold/*

# 内存使用
free -h
```

### 3. 日志管理

```bash
# 查看应用日志
tail -f logs/combined-*.log
tail -f logs/error-*.log

# 查看Nginx日志
sudo tail -f /var/log/nginx/enterprise-scaffold.access.log
sudo tail -f /var/log/nginx/enterprise-scaffold.error.log

# 查看系统日志
sudo journalctl -u nginx -f
sudo journalctl -u mongod -f
```

## 🚨 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 查看端口占用
   sudo netstat -tlnp | grep :3000
   
   # 杀死进程
   sudo kill -9 <PID>
   ```

2. **权限问题**
   ```bash
   # 修复文件权限
   sudo chown -R $USER:$USER /var/www/enterprise-scaffold
   sudo chmod -R 755 /var/www/enterprise-scaffold
   ```

3. **内存不足**
   ```bash
   # 增加swap空间
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

4. **数据库连接失败**
   ```bash
   # 检查MongoDB状态
   sudo systemctl status mongod
   
   # 检查Redis状态
   sudo systemctl status redis-server
   ```

### 性能优化

1. **启用Gzip压缩**
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_min_length 1024;
   gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
   ```

2. **缓存静态文件**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **负载均衡**
   ```nginx
   upstream app_servers {
       server 127.0.0.1:3000;
       server 127.0.0.1:3001;
       server 127.0.0.1:3002;
   }
   ```

## 📚 更多资源

- [Node.js部署最佳实践](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [PM2官方文档](https://pm2.keymetrics.io/docs/)
- [Nginx配置指南](https://nginx.org/en/docs/)
- [Kubernetes部署指南](https://kubernetes.io/docs/tasks/run-application/)
- [Docker最佳实践](https://docs.docker.com/develop/dev-best-practices/)
