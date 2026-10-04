import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import { logger } from '../config/logger.js';
import { HelperUtil } from '../utils/helpers.js';

export function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  const startTime = process.hrtime();
  const requestId = (request.headers['x-request-id'] as string) || HelperUtil.uuid();
  request.headers['x-request-id'] = requestId;

  reply.header('x-request-id', requestId);

  reply.raw.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    logger.info(
      {
        requestId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: `${durationMs}ms`,
        ip: request.ip,
      },
      'HTTP request completed'
    );
  });

  done();
}
