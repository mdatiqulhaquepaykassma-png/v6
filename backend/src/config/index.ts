import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  env: string;
  isProduction: boolean;
  port: number;
  host: string;
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  security: {
    seedEncryptionKey: string;
    sensitiveDataEncryptionKey: string;
    merchantSignatureExpiryMs: number;
  };
  game: {
    defaultCommissionRate: number;
    defaultReferralCommissionRate: number;
    defaultClientSeed: string;
  };
  cors: {
    origin: string;
  };
  logger: {
    level: string;
  };
}

export const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dragontiger?schema=public',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default_jwt_access_secret_key_32_bytes_long_min',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret_key_32_bytes_long_min',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  security: {
    seedEncryptionKey: process.env.SEED_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    sensitiveDataEncryptionKey: process.env.SENSITIVE_DATA_ENCRYPTION_KEY || 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    merchantSignatureExpiryMs: parseInt(process.env.MERCHANT_SIGNATURE_EXPIRY_MS || '300000', 10),
  },
  game: {
    defaultCommissionRate: parseFloat(process.env.COMMISSION_RATE || '0.05'),
    defaultReferralCommissionRate: parseFloat(process.env.REFERRAL_COMMISSION_RATE || '0.01'),
    defaultClientSeed: process.env.DEFAULT_CLIENT_SEED || 'dragon_tiger_provably_fair_master_seed_2026',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
