export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
  INVALID_2FA_CODE = 'INVALID_2FA_CODE',

  // Validation & Input
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Wallet & Financial
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  WITHDRAWAL_LIMIT_EXCEEDED = 'WITHDRAWAL_LIMIT_EXCEEDED',
  KYC_REQUIRED = 'KYC_REQUIRED',

  // Game Engine & Betting
  ROUND_NOT_BETTING = 'ROUND_NOT_BETTING',
  BET_LIMIT_EXCEEDED = 'BET_LIMIT_EXCEEDED',
  BET_BELOW_MINIMUM = 'BET_BELOW_MINIMUM',
  BET_ABOVE_MAXIMUM = 'BET_ABOVE_MAXIMUM',
  OPPOSITE_SIDE_BET_FORBIDDEN = 'OPPOSITE_SIDE_BET_FORBIDDEN',
  BET_CANNOT_BE_CANCELLED = 'BET_CANNOT_BE_CANCELLED',
  TABLE_INACTIVE = 'TABLE_INACTIVE',

  // Merchant & Aggregator
  INVALID_API_KEY = 'INVALID_API_KEY',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  TIMESTAMP_EXPIRED = 'TIMESTAMP_EXPIRED',
  IP_NOT_WHITELISTED = 'IP_NOT_WHITELISTED',

  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
