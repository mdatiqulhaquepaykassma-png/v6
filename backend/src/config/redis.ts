import { Redis, RedisOptions } from 'ioredis';
import { config } from './index.js';
import { logger } from './logger.js';

const redisOptions: RedisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
  reconnectOnError: (err) => {
    logger.warn({ err: err.message }, 'Redis reconnecting on error');
    return true;
  },
  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000);
    logger.info({ retryCount: times, nextDelayMs: delay }, 'Redis reconnect attempt');
    return delay;
  },
};

// 1. Primary Redis Client (Data storage, matching engine Lua execution)
export const redisClient = new Redis(redisOptions);

// 2. Pub/Sub Dedicated Publisher Client
export const redisPublisher = new Redis(redisOptions);

// 3. Pub/Sub Dedicated Subscriber Client
export const redisSubscriber = new Redis(redisOptions);

export async function connectRedis(): Promise<void> {
  try {
    await Promise.all([
      redisClient.connect(),
      redisPublisher.connect(),
      redisSubscriber.connect(),
    ]);
    logger.info('✅ Redis instances (Client, Pub, Sub) connected successfully');
  } catch (error) {
    logger.error({ error }, '❌ Redis connection failed');
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  await Promise.all([
    redisClient.quit(),
    redisPublisher.quit(),
    redisSubscriber.quit(),
  ]);
  logger.info('Redis instances disconnected gracefully');
}
