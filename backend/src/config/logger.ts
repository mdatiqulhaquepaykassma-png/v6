import pino from 'pino';
import { config } from './index.js';

export const logger = pino({
  level: config.logger.level,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-signature"]',
      'password',
      'passwordHash',
      'refreshToken',
      'serverSeed',
      'accountDetails',
      'documentNumber',
      'apiKey',
      'apiSecret',
    ],
    censor: '[REDACTED]',
  },
  transport:
    config.env === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  base: {
    service: 'dragon-tiger-backend',
    env: config.env,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
