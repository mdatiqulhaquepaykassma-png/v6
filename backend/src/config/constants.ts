export const APP_CONSTANTS = {
  PLATFORM_NAME: 'Dragon Tiger P2P Arena',
  DECIMAL_PRECISION: 18,
  DECIMAL_SCALE: 2,

  // Matching Engine
  MATCHING: {
    REDIS_PREFIX: 'match',
    KEY_DRAGON_QUEUE: (tableId: number | string, roundId: number | string) =>
      `match:${tableId}:${roundId}:dragon`,
    KEY_TIGER_QUEUE: (tableId: number | string, roundId: number | string) =>
      `match:${tableId}:${roundId}:tiger`,
    KEY_STATE: (tableId: number | string, roundId: number | string) =>
      `match:${tableId}:${roundId}:state`,
    KEY_LOCK: (tableId: number | string, roundId: number | string) =>
      `lock:match:${tableId}:${roundId}`,
  },

  // Game Math & Odds
  GAME: {
    CARDS_PER_SUIT: 13,
    TOTAL_CARDS: 52,
    WIN_PAYOUT_MULTIPLIER: 1.9,
    WIN_PROFIT_MULTIPLIER: 0.9,
    DEFAULT_COMMISSION_RATE: 0.05,
    TIE_REVENUE_RATE: 1.0, // Entire matched pool kept on tie
    PROBABILITY: {
      DRAGON_WIN: 78 / 169, // ~0.46154
      TIGER_WIN: 78 / 169,  // ~0.46154
      TIE: 13 / 169,        // ~0.07692
    },
  },

  // Limits
  LIMITS: {
    MAX_BET_PER_ROUND_PER_USER: 5,
    MAX_SOCKET_EVENTS_PER_SECOND: 20,
    MAX_CONCURRENT_SOCKETS_PER_USER: 3,
    AUTH_MAX_LOGIN_ATTEMPTS: 10,
    AUTH_LOCKOUT_MINUTES: 15,
    OTP_EXPIRY_MINUTES: 5,
    MERCHANT_MAX_TIMESTAMP_DRIFT_MS: 300000, // 5 minutes
  },
} as const;
