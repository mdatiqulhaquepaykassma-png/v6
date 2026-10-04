import { FastifyReply, FastifyRequest } from 'fastify';
import { AnyZodObject, ZodError } from 'zod';
import { AppError, ErrorCode } from '../utils/errors.js';

export interface ValidationSchemas {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validate(schemas: ValidationSchemas) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    try {
      if (schemas.body && request.body) {
        request.body = await schemas.body.parseAsync(request.body);
      }
      if (schemas.query) {
        request.query = await schemas.query.parseAsync(request.query);
      }
      if (schemas.params) {
        request.params = await schemas.params.parseAsync(request.params);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        throw error;
      }
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Request validation failed',
        400
      );
    }
  };
}
