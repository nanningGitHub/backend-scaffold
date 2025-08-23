const Redis = require('ioredis');

class RedisClient {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
  }

  async connect() {
    try {
      // 主客户端
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        keyPrefix: process.env.REDIS_PREFIX || 'enterprise:',
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      // 订阅者客户端
      this.subscriber = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        keyPrefix: process.env.REDIS_PREFIX || 'enterprise:',
      });

      // 发布者客户端
      this.publisher = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        keyPrefix: process.env.REDIS_PREFIX || 'enterprise:',
      });

      // 连接事件监听
      this.client.on('connect', () => {
        console.log('Redis客户端已连接');
      });

      this.client.on('ready', () => {
        console.log('Redis客户端已就绪');
      });

      this.client.on('error', (err) => {
        console.error('Redis客户端错误:', err);
      });

      this.client.on('close', () => {
        console.warn('Redis客户端连接已关闭');
      });

      this.client.on('reconnecting', () => {
        console.log('Redis客户端正在重连...');
      });

      // 测试连接
      await this.client.ping();
      console.log('✅ Redis连接成功');

      return this.client;
    } catch (error) {
      console.error('Redis连接失败:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
      }
      if (this.subscriber) {
        await this.subscriber.quit();
        this.subscriber = null;
      }
      if (this.publisher) {
        await this.publisher.quit();
        this.publisher = null;
      }
      console.log('Redis连接已关闭');
    } catch (error) {
      console.error('Redis关闭连接时出错:', error);
    }
  }

  // 缓存操作
  async set(key, value, ttl = 3600) {
    try {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      await this.client.setex(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Redis SET操作失败:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error('Redis GET操作失败:', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL操作失败:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error('Redis EXISTS操作失败:', error);
      return false;
    }
  }

  async expire(key, ttl) {
    try {
      return await this.client.expire(key, ttl);
    } catch (error) {
      console.error('Redis EXPIRE操作失败:', error);
      return false;
    }
  }

  // 哈希操作
  async hset(key, field, value) {
    try {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      await this.client.hset(key, field, value);
      return true;
    } catch (error) {
      console.error('Redis HSET操作失败:', error);
      return false;
    }
  }

  async hget(key, field) {
    try {
      const value = await this.client.hget(key, field);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error('Redis HGET操作失败:', error);
      return null;
    }
  }

  async hgetall(key) {
    try {
      const result = await this.client.hgetall(key);
      const parsed = {};
      
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      
      return parsed;
    } catch (error) {
      console.error('Redis HGETALL操作失败:', error);
      return {};
    }
  }

  // 列表操作
  async lpush(key, value) {
    try {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      return await this.client.lpush(key, value);
    } catch (error) {
      console.error('Redis LPUSH操作失败:', error);
      return 0;
    }
  }

  async rpop(key) {
    try {
      const value = await this.client.rpop(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error('Redis RPOP操作失败:', error);
      return 0;
    }
  }

  // 集合操作
  async sadd(key, ...members) {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      console.error('Redis SADD操作失败:', error);
      return 0;
    }
  }

  async smembers(key) {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      console.error('Redis SMEMBERS操作失败:', error);
      return [];
    }
  }

  // 发布订阅
  async publish(channel, message) {
    try {
      if (typeof message === 'object') {
        message = JSON.stringify(message);
      }
      return await this.client.publish(channel, message);
    } catch (error) {
      console.error('Redis PUBLISH操作失败:', error);
      return 0;
    }
  }

  async subscribe(channel, callback) {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (chan, message) => {
        if (chan === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch {
            callback(message);
          }
        }
      });
      console.log(`已订阅Redis频道: ${channel}`);
    } catch (error) {
      console.error('Redis订阅失败:', error);
    }
  }

  // 健康检查
  async health() {
    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency: `${latency}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 获取客户端实例
  getClient() {
    return this.client;
  }

  getSubscriber() {
    return this.subscriber;
  }

  getPublisher() {
    return this.publisher;
  }
}

// 创建单例实例
const redisClient = new RedisClient();

module.exports = redisClient;
