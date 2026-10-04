export interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "win" | "loss" | "p2p_stake" | "p2p_payout" | "faucet" | "refund" | "commission" | "tie_refund" | "TIE_REFUND";
  amount: number;
  timestamp: string;
  description: string;
  balanceBefore?: number;
  balanceAfter?: number;
  referenceId?: string;
}

export interface TablePerformance {
  slug: "express" | "classic" | "vip";
  tableName: string;
  handsPlayed: number;
  handsWon: number;
  handsLost: number;
  winRate: number; // in percentage, e.g. 65.5
  totalWagered: number;
  profit: number;
}

export interface SidePerformance {
  hands: number;
  wins: number;
  winRate: number;
}

export interface UserStats {
  totalHandsPlayed: number;
  handsWon: number;
  handsLost: number;
  handsTied: number;
  winRate: number; // overall percentage (0-100)
  biggestWin: number;
  tableBreakdown: {
    express: TablePerformance;
    classic: TablePerformance;
    vip: TablePerformance;
  };
  sideBreakdown: {
    dragon: SidePerformance;
    tiger: SidePerformance;
    tie: SidePerformance;
  };
  favoriteTable: string;
  favoriteSide: string;
}

export interface UserCosmetics {
  equippedFrame: string; // e.g. "Newcomer", "10 Hands", "50 Hands", "100 Wins", "Bluff Master", "Tie Survivor", "Voice Veteran", "Diamond"
  equippedCardBack: string; // e.g. "Classic", "Gold Dragon", "Fire Tiger", "Neon", "Royal", "Galaxy", "Master"
  equippedTableTheme: string; // e.g. "Midnight", "Casino Red", "Emerald", "Royal Purple", "Championship"
  equippedTitle: string; // e.g. "Rookie", "Player", "Competitor", "Challenger", "Veteran", "Elite", "Legend", "Master"
  eloRating: number; // default 1000
  eloTier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master";
  unlockedFrames: string[];
  unlockedCardBacks: string[];
  unlockedThemes: string[];
  unlockedTitles: string[];
  unlockedBadges: string[];
  loginDays?: number;
  spectatorFameScore: number;
}

export interface UserWallet {
  userId: string;
  username: string;
  balance: number; // Real or active balance
  demoBalance: number;
  balanceType: "real" | "demo";
  lockedBalance: number;
  totalWon: number;
  totalLost: number;
  gamesPlayed: number;
  kycStatus: "none" | "pending" | "verified";
  status?: "ACTIVE" | "BANNED" | "SUSPENDED";
  transactions: Transaction[];
  stats?: UserStats;
  cosmetics?: UserCosmetics;
}

export interface PlayingCard {
  rank: string;
  suit: string;
  value: number; // 1 (Ace) to 13 (King)
  display: string;
}

export interface TableRound {
  roundId: string;
  roundNumber: number;
  tableSlug: "express" | "classic" | "vip";
  tableName: string;
  status: "BETTING" | "MATCHING" | "DEALING" | "SETTLING" | "COMPLETED";
  secondsRemaining: number;
  totalDuration: number;
  dragonPool: number;
  tigerPool: number;
  matchedAmount: number;
  dragonPlayers: number;
  tigerPlayers: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  serverSeed?: string; // Revealed after settlement
  dragonCard?: PlayingCard;
  tigerCard?: PlayingCard;
  result?: "DRAGON" | "TIGER" | "TIE";
  tieRevenue?: number;
  commission?: number;
}

export interface TableConfig {
  id: string;
  slug: "express" | "classic" | "vip";
  name: string;
  type: "Express" | "Classic" | "VIP";
  minBet: number;
  maxBet: number;
  bettingDuration: number;
  playersOnline: number;
  commissionRate: number;
}

export interface RoadmapItem {
  roundNumber: number;
  result: "DRAGON" | "TIGER" | "TIE";
  dragonCard: PlayingCard;
  tigerCard: PlayingCard;
  timestamp: string;
}

export interface LiveBetRecord {
  id: string;
  userId: string;
  username: string;
  vipTier: string;
  side: "DRAGON" | "TIGER" | "TIE" | "DRAGON_EVEN" | "DRAGON_ODD" | "DRAGON_SML" | "DRAGON_BIG" | "TIGER_BIG" | "TIGER_SML" | "TIGER_ODD" | "TIGER_EVEN" | "EVEN" | "ODD" | "SML" | "BIG" | string;
  amount: number;
  balanceType: "real" | "demo";
  timestamp: string;
  roundNumber: number;
  tableSlug: string;
  status: "ACTIVE" | "WON" | "LOST" | "PUSH" | "REFUNDED" | "TIE_REFUND";
  payout?: number;
  matchedAmount?: number;
  unmatchedAmount?: number;
  tkReturnStatus?: "IN_ESCROW" | "RETURNED_WIN" | "RETURNED_REFUND" | "NO_RETURN";
  returnedAmount?: number;
}

export interface P2PRoom {
  id: string;
  creatorId: string;
  creatorName: string;
  amount: number; // Creator stake
  choice: "dragon" | "tiger";
  odds: number; // Challenge odds multiplier (e.g., 1.5, 2.0, 3.0)
  acceptorAmount: number; // Required stake for challenger: Math.round(amount * (odds - 1))
  status: "open" | "matched" | "completed";
  acceptorId?: string;
  acceptorName?: string;
  winner?: "dragon" | "tiger" | "tie";
  dragonCard?: PlayingCard;
  tigerCard?: PlayingCard;
  createdAt: string;
  // 1v1 Duel Social & Cosmetic Metadata
  creatorElo?: number;
  creatorTitle?: string;
  creatorFrame?: string;
  acceptorElo?: number;
  acceptorTitle?: string;
  acceptorFrame?: string;
  spectatorCount?: number;
  bettingRound?: number;
  lastAction?: string;
  totalPot?: number;
  companyFee?: number;
  isPrivate?: boolean;
  password?: string;
  minStake?: number;
  maxStake?: number;
  // Enhanced P2P Room Features
  invitedUsername?: string;
  activityScore?: number; // 0 (cool blue) to 100 (hot red)
  lastActiveAt?: string;
  isFastAction?: boolean; // rounds conclude in under 30s
  isHotRoom?: boolean; // high betting activity or > 75% capacity
  tags?: string[]; // e.g. "Newbie Friendly", "High Roller", "Fast Action", "1v1 Duel"
  autoCloseSecondsRemaining?: number; // 5-minute auto close timer
  capacityPercent?: number;
  recentBetActionsCount?: number;
  isSingleRoundQuickChallenge?: boolean; // 1v1 quick challenge
}

export interface PlayerNote {
  targetUserId: string;
  targetUsername: string;
  note: string;
  tags?: string[];
  updatedAt: string;
}

export interface PlayerReport {
  id: string;
  reporterUserId: string;
  reporterUsername: string;
  reportedUserId: string;
  reportedUsername: string;
  reason: "Cheating" | "Harassment" | "Spam" | "Botting" | "Other";
  details: string;
  timestamp: string;
  status: "PENDING" | "INVESTIGATED" | "RESOLVED";
}

export interface RoundDispute {
  id: string;
  userId: string;
  username: string;
  roundNumber?: number;
  tableSlug?: string;
  tableName?: string;
  roomId?: string;
  betAmount?: number;
  side?: string;
  issueType: "Result Dispute" | "Unmatched Bet Refund" | "Lag / Disconnect" | "Provably Fair Verification" | "Payout Error" | "Other";
  description: string;
  status: "PENDING" | "UNDER_REVIEW" | "RESOLVED_VALID" | "RESOLVED_REJECTED" | "REFUNDED";
  adminNotes?: string;
  refundedAmount?: number;
  timestamp: string;
  resolvedAt?: string;
  roundDetails?: {
    dragonCard?: string;
    tigerCard?: string;
    result?: string;
    serverSeedHash?: string;
  };
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: "round_start" | "friend_joined" | "challenge_invite" | "ping" | "system";
  timestamp: string;
  roomId?: string;
  read: boolean;
  actionUrl?: string;
}

export interface CapacityTrendPoint {
  time: string;
  players: number;
  capacityPct: number;
  activeRooms: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  balance: number;
  profit: number;
  winRate: number;
  gamesPlayed: number;
  vipTier: string;
  // Zero-Cost Prestige
  eloRating?: number;
  eloTier?: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master";
  equippedFrame?: string;
  equippedTitle?: string;
  spectatorFameScore?: number;
}

export interface AdminStats {
  onlinePlayers: number;
  todayRevenue: number;
  todayMatchedVolume: number;
  todayCommission: number;
  todayTieRevenue: number;
  totalRoundsToday: number;
  pendingWithdrawals: number;
  systemHealth: string;
}

export interface UserBalanceRecord {
  userId: string;
  username: string;
  vipTier: string;
  balance: number;
  demoBalance: number;
  lockedBalance: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
  gamesPlayed: number;
  kycStatus: "none" | "pending" | "verified";
  isOnline: boolean;
  status: "ACTIVE" | "IN_GAME" | "IDLE";
  lastActive: string;
}

export interface HighLoadTelemetry {
  totalActivePlayers: number;
  tableActivePlayers?: {
    express: number;
    classic: number;
    vip: number;
  };
  tableLimits?: {
    express: { minBet: number; maxBet: number };
    classic: { minBet: number; maxBet: number };
    vip: { minBet: number; maxBet: number };
  };
  tps: number;
  latencyMs: number;
  activeNode: string;
  shoeRemainingCards: number;
  shoeTotalCards: number;
  burnCardsCount: number;
  dealerName: string;
  dealerTableCode: string;
  betsPerSecond: number;
  todayGlobalTurnover: number;
}

export interface SiteLiquidityData {
  totalSiteLiquidity: number;
  totalRealBalance: number;
  totalDemoBalance: number;
  totalEscrowLocked: number;
  totalUsersCount: number;
  activeOnlineCount: number;
  todayMatchedVolume: number;
  todayCommission: number;
  todayTieRevenue: number;
  telemetry?: HighLoadTelemetry;
  tableLiquidity: {
    express: { pool: number; matched: number; players: number };
    classic: { pool: number; matched: number; players: number };
    vip: { pool: number; matched: number; players: number };
  };
  users: UserBalanceRecord[];
  timestamp: string;
}

export interface UserBetHistoryItem {
  id: string;
  roundNumber: number;
  tableSlug: "express" | "classic" | "vip";
  tableName: string;
  side: "DRAGON" | "TIGER" | "TIE" | string;
  amount: number;
  matchedAmount: number;
  unmatchedAmount: number;
  returnedAmount: number;
  tkReturnStatus?: "NONE" | "RETURNED_REFUND" | "RETURNED_WIN" | "NO_RETURN";
  balanceType: "real" | "demo";
  status: "WON" | "LOST" | "REFUNDED" | "ACTIVE" | "TIE_REFUND";
  payout: number;
  netPnL: number;
  dragonCard?: PlayingCard;
  tigerCard?: PlayingCard;
  result?: "DRAGON" | "TIGER" | "TIE";
  timestamp: string;
  serverSeedHash?: string;
  serverSeed?: string;
}

export interface UserBetHistoryResponse {
  userId: string;
  username: string;
  totalWagered: number;
  totalMatched: number;
  totalReturned: number;
  totalWon: number;
  totalLost: number;
  netPnL: number;
  winRate: number;
  totalBetsCount: number;
  bets: UserBetHistoryItem[];
}

export interface AdminGrant {
  id: string;
  userId: string;
  username: string;
  amount: number;
  tag: string; // e.g., "Manual Deposit Verification", "Compensation", "VIP Reward", "Tournament Prize", "System Adjustment"
  reason: string;
  adminUsername: string;
  timestamp: string;
  isDemo?: boolean;
}

export interface TagFolderSummary {
  tag: string;
  totalAmount: number;
  userCount: number;
  grantsCount: number;
  grants: AdminGrant[];
}

export interface UserActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

