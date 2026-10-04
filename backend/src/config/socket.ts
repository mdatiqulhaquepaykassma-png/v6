import { ServerOptions } from 'socket.io';
import { config } from './index.js';

export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 10000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e6, // 1 MB
  transports: ['websocket', 'polling'],
};

export const SOCKET_ROOMS = {
  TABLE: (tableId: number | string) => `table:${tableId}`,
  TABLE_REAL: (tableId: number | string) => `table:${tableId}:real`,
  TABLE_DEMO: (tableId: number | string) => `table:${tableId}:demo`,
  USER: (userId: number | string) => `user:${userId}`,
  ADMIN_LIVE: 'admin:live',
} as const;

export const SOCKET_EVENTS = {
  SERVER: {
    ROUND_NEW: 'round:new',
    ROUND_TIMER: 'round:timer',
    ROUND_POOL_UPDATE: 'round:pool_update',
    ROUND_YOUR_BET: 'round:your_bet',
    ROUND_BETTING_CLOSED: 'round:betting_closed',
    ROUND_YOUR_REFUND: 'round:your_refund',
    ROUND_CARD_REVEAL: 'round:card_reveal',
    ROUND_RESULT: 'round:result',
    ROUND_YOUR_RESULT: 'round:your_result',
    ROUND_HISTORY: 'round:history',
    PLAYERS_COUNT: 'players:count',
    BALANCE_UPDATE: 'balance:update',
    TABLES_UPDATE: 'tables:update',
    ANNOUNCEMENT: 'announcement',
    MAINTENANCE: 'maintenance',
    ERROR: 'error',
    ADMIN_DASHBOARD: 'admin:dashboard',
    ADMIN_ROUND_LIVE: 'admin:round_live',
    ADMIN_ALERT: 'admin:alert',
  },
  CLIENT: {
    BET_PLACE: 'bet:place',
    BET_CANCEL: 'bet:cancel',
    BET_REPEAT: 'bet:repeat',
    BET_DOUBLE: 'bet:double',
    TABLE_JOIN: 'table:join',
    TABLE_LEAVE: 'table:leave',
    ROOM_SWITCH: 'room:switch',
    PING: 'ping',
  },
} as const;
