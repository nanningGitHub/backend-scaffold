#!/bin/bash

echo "🚀 MongoDB 安装和配置脚本"
echo "================================"

# 检查操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 检测到 macOS 系统"
    
    # 检查是否已安装 Homebrew
    if ! command -v brew &> /dev/null; then
        echo "📦 安装 Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
        echo "✅ Homebrew 已安装"
    fi
    
    # 检查是否已安装 MongoDB
    if ! command -v mongod &> /dev/null; then
        echo "📦 安装 MongoDB..."
        brew tap mongodb/brew
        brew install mongodb-community
    else
        echo "✅ MongoDB 已安装"
    fi
    
    # 启动 MongoDB 服务
    echo "🔧 启动 MongoDB 服务..."
    brew services start mongodb/brew/mongodb-community
    
    echo "⏳ 等待 MongoDB 启动..."
    sleep 5
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 检测到 Linux 系统"
    
    # 检查是否已安装 MongoDB
    if ! command -v mongod &> /dev/null; then
        echo "📦 安装 MongoDB..."
        
        # 导入 MongoDB 公钥
        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
        
        # 添加 MongoDB 源
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
        
        # 更新包列表并安装
        sudo apt-get update
        sudo apt-get install -y mongodb-org
    else
        echo "✅ MongoDB 已安装"
    fi
    
    # 启动 MongoDB 服务
    echo "🔧 启动 MongoDB 服务..."
    sudo systemctl start mongod
    sudo systemctl enable mongod
    
    echo "⏳ 等待 MongoDB 启动..."
    sleep 5
    
else
    echo "❌ 不支持的操作系统: $OSTYPE"
    echo "请手动安装 MongoDB"
    exit 1
fi

# 检查 MongoDB 是否正在运行
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB 服务已启动"
    echo "🌐 MongoDB 运行在: mongodb://localhost:27017"
    echo "🗄️ 数据库名称: node-cil"
else
    echo "❌ MongoDB 启动失败"
    echo "请检查错误日志并手动启动"
    exit 1
fi

echo ""
echo "🎉 MongoDB 设置完成！"
echo "📝 下一步："
echo "1. 运行 'npm run seed' 创建种子数据"
echo "2. 运行 'npm run dev' 启动应用"
echo "================================"
