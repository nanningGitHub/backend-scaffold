const Queue = require('bull');
const Redis = require('ioredis');

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 1, // 使用不同的数据库避免冲突
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      keyPrefix: process.env.REDIS_PREFIX || 'enterprise:queue:',
    };
  }

  async start() {
    try {
      // 创建Redis连接
      this.redis = new Redis(this.redisConfig);
      
      // 测试Redis连接
      await this.redis.ping();
      console.log('✅ 任务队列Redis连接成功');
      
      // 初始化默认队列
      await this.initializeDefaultQueues();
      
      // 启动队列监控
      this.startQueueMonitoring();
      
      return true;
    } catch (error) {
      console.error('任务队列启动失败:', error);
      throw error;
    }
  }

  async initializeDefaultQueues() {
    // 邮件队列
    this.createQueue('email', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50
      }
    });

    // 文件处理队列
    this.createQueue('file-processing', {
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 5000
        },
        removeOnComplete: 50,
        removeOnFail: 25
      }
    });

    // 数据同步队列
    this.createQueue('data-sync', {
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 10000
        },
        removeOnComplete: 200,
        removeOnFail: 100
      }
    });

    // 通知队列
    this.createQueue('notifications', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 3000
        },
        removeOnComplete: 100,
        removeOnFail: 50
      }
    });

    // 清理队列
    this.createQueue('cleanup', {
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 1000,
        removeOnFail: 1000
      }
    });

    console.log('✅ 默认队列初始化完成');
  }

  createQueue(name, options = {}) {
    try {
      if (this.queues.has(name)) {
        return this.queues.get(name);
      }

      const queue = new Queue(name, {
        redis: this.redisConfig,
        ...options
      });

      // 队列事件监听
      queue.on('error', (error) => {
        console.error(`队列 ${name} 错误:`, error);
      });

      queue.on('waiting', (jobId) => {
        console.debug(`队列 ${name} 任务等待中: ${jobId}`);
      });

      queue.on('active', (job) => {
        console.debug(`队列 ${name} 任务开始执行: ${job.id}`);
      });

      queue.on('completed', (job, result) => {
        console.log(`队列 ${name} 任务完成: ${job.id}`, { result });
      });

      queue.on('failed', (job, err) => {
        console.error(`队列 ${name} 任务失败: ${job.id}`, { error: err.message });
      });

      queue.on('stalled', (jobId) => {
        console.warn(`队列 ${name} 任务停滞: ${jobId}`);
      });

      // 保存队列引用
      this.queues.set(name, queue);
      
      return queue;
    } catch (error) {
      console.error(`创建队列 ${name} 失败:`, error);
      throw error;
    }
  }

  getQueue(name) {
    return this.queues.get(name);
  }

  async addJob(queueName, data, options = {}) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      const job = await queue.add(data, options);
      console.log(`任务已添加到队列 ${queueName}: ${job.id}`);
      
      return job;
    } catch (error) {
      console.error(`添加任务到队列 ${queueName} 失败:`, error);
      throw error;
    }
  }

  async addJobWithDelay(queueName, data, delay, options = {}) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      const job = await queue.add(data, { delay, ...options });
      console.log(`延迟任务已添加到队列 ${queueName}: ${job.id}, 延迟: ${delay}ms`);
      
      return job;
    } catch (error) {
      console.error(`添加延迟任务到队列 ${queueName} 失败:`, error);
      throw error;
    }
  }

  async addRecurringJob(queueName, data, cronPattern, options = {}) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      const job = await queue.add(data, cronPattern, { 
        repeat: { cron: cronPattern },
        ...options 
      });
      
      console.log(`重复任务已添加到队列 ${queueName}: ${job.id}, 模式: ${cronPattern}`);
      
      return job;
    } catch (error) {
      console.error(`添加重复任务到队列 ${queueName} 失败:`, error);
      throw error;
    }
  }

  async processJob(queueName, processor) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      queue.process(processor);
      console.log(`队列 ${queueName} 处理器已注册`);
      
      return true;
    } catch (error) {
      console.error(`注册队列 ${queueName} 处理器失败:`, error);
      throw error;
    }
  }

  async getJob(queueName, jobId) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      return await queue.getJob(jobId);
    } catch (error) {
      console.error(`获取任务失败:`, error);
      throw error;
    }
  }

  async getJobs(queueName, status = 'waiting', start = 0, end = 100) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      return await queue.getJobs([status], start, end);
    } catch (error) {
      console.error(`获取任务列表失败:`, error);
      throw error;
    }
  }

  async removeJob(queueName, jobId) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        console.log(`任务已从队列 ${queueName} 移除: ${jobId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`移除任务失败:`, error);
      throw error;
    }
  }

  async pauseQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      await queue.pause();
      console.log(`队列 ${queueName} 已暂停`);
      
      return true;
    } catch (error) {
      console.error(`暂停队列 ${queueName} 失败:`, error);
      throw error;
    }
  }

  async resumeQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      await queue.resume();
      console.log(`队列 ${queueName} 已恢复`);
      
      return true;
    } catch (error) {
      console.error(`恢复队列 ${queueName} 失败:`, error);
      throw error;
    }
  }

  async emptyQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      await queue.empty();
      console.log(`队列 ${queueName} 已清空`);
      
      return true;
    } catch (error) {
      console.error(`清空队列 ${queueName} 失败:`, error);
      throw error;
    }
  }

  async getQueueStats(queueName) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      return {
        name: queueName,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`获取队列 ${queueName} 统计信息失败:`, error);
      throw error;
    }
  }

  async getAllQueueStats() {
    try {
      const stats = [];
      for (const [name] of this.queues) {
        const stat = await this.getQueueStats(name);
        stats.push(stat);
      }
      return stats;
    } catch (error) {
      console.error('获取所有队列统计信息失败:', error);
      throw error;
    }
  }

  startQueueMonitoring() {
    // 每5分钟监控一次队列状态
    setInterval(async () => {
      try {
        const stats = await this.getAllQueueStats();
        console.debug('队列状态监控:', stats);
        
        // 检查是否有队列积压
        for (const stat of stats) {
          if (stat.waiting > 100) {
            console.warn(`队列 ${stat.name} 积压严重: ${stat.waiting} 个任务等待中`);
          }
        }
      } catch (error) {
        console.error('队列监控失败:', error);
      }
    }, 5 * 60 * 1000);

    console.log('✅ 队列监控已启动');
  }

  async stop() {
    try {
      // 关闭所有队列
      for (const [name, queue] of this.queues) {
        await queue.close();
        console.log(`队列 ${name} 已关闭`);
      }
      
      // 清空队列映射
      this.queues.clear();
      
      // 关闭Redis连接
      if (this.redis) {
        await this.redis.quit();
        console.log('Redis连接已关闭');
      }
      
      console.log('✅ 任务队列管理器已停止');
    } catch (error) {
      console.error('停止任务队列管理器失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const queueManager = new QueueManager();

module.exports = queueManager;
