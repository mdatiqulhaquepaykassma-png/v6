import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { HelperUtil } from '../utils/helpers.js';

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const requestId = (request.headers['x-request-id'] as string) || HelperUtil.uuid();
  const timestamp = HelperUtil.nowISO();

  // 1. Custom Application Error
  if (error instanceof AppError) {
    logger.warn(
      {
        requestId,
        code: error.code,
        message: error.message,
        details: error.details,
        path: request.url,
      },
      'Application handled error'
    );

    reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      requestId,
      timestamp,
    });
    return;
  }

  // 2. Zod Validation Error
  if (error instanceof ZodError) {
    const issues = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn({ requestId, issues, path: request.url }, 'Zod validation error');

    reply.status(400).send({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid request payload or parameters',
        details: { issues },
      },
      requestId,
      timestamp,
    });
    return;
  }

  // 3. Fastify Native Rate Limit / Schema Errors
  if ('statusCode' in error && error.statusCode) {
    const statusCode = error.statusCode;
    const code =
      statusCode === 429 ? ErrorCode.RATE_LIMIT_EXCEEDED : ErrorCode.BAD_REQUEST;

    reply.status(statusCode).send({
      success: false,
      error: {
        code,
        message: error.message,
      },
      requestId,
      timestamp,
    });
    return;
  }

  // 4. Unhandled / Fatal Errors (Never leak stack trace or internal DB details)
  logger.error(
    {
      requestId,
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      path: request.url,
      method: request.method,
    },
    'Unhandled fatal exception'
  );

  reply.status(500).send({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An internal financial system error occurred. Please try again.',
    },
    requestId,
    timestamp,
  });
}
