import { QueueOptions, WorkerOptions } from 'bullmq';
import { config } from './index.js';

export const bullRedisConnection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: null,
};

export const defaultQueueOptions: QueueOptions = {
  connection: bullRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
};

export const defaultWorkerOptions: WorkerOptions = {
  connection: bullRedisConnection,
  concurrency: 5,
};

export const QUEUE_NAMES = {
  WEBHOOKS: 'dragon-tiger-webhooks',
  RECONCILIATION: 'dragon-tiger-reconciliation',
  REPORTS: 'dragon-tiger-reports',
  CLEANUP: 'dragon-tiger-cleanup',
  NOTIFICATIONS: 'dragon-tiger-notifications',
} as const;
