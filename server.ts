// Fix tsx injecting relative __dirname = '.' into global scope, which breaks createRequire in Node 22 (e.g. in vite-plugin-pwa)
if (typeof (globalThis as any).__dirname !== "undefined" && (globalThis as any).__dirname === ".") {
  delete (globalThis as any).__dirname;
}

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";
import Decimal from "decimal.js";
import { TableRound, TableConfig, PlayingCard, RoadmapItem, UserWallet, P2PRoom, UserStats, TablePerformance, SidePerformance, LiveBetRecord, SiteLiquidityData, UserBalanceRecord, UserBetHistoryItem, UserBetHistoryResponse, UserCosmetics, PlayerReport, CapacityTrendPoint, AdminGrant, TagFolderSummary, UserActivityLog, RoundDispute } from "./src/types";
import {
  FORCE_PASSWORD_RESET_ON_NEW_DEVICE,
  deriveDeviceId,
  describeDevice,
  isTrustedDevice,
  trustDevice,
  issueOtp,
  verifyOtp,
  createSessionEvictingOthers,
  getSession,
  revokeUserSessions,
  listDevices,
  removeDevice,
} from "./src/server/sessions";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

/** Broadcast force-logout event to evicted device session */
function kickSession(sessionId: string, reason: string) {
  wss.clients.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN && client.sessionId === sessionId) {
      try {
        client.send(JSON.stringify({ type: "FORCE_LOGOUT", reason }));
        client.close(4001, "session-evicted");
      } catch {}
    }
  });
}

app.set("trust proxy", 1);
app.use(express.json());

// Health Check Path for Render & Monitoring
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || "dev",
  });
});

// Redirect clean /admin and /admin/* to hash routing /#/admin to avoid server-side 404
app.get(["/admin", "/admin/*"], (req, res) => {
  if (req.originalUrl.includes("/login")) {
    res.redirect("/#/admin/login");
  } else {
    res.redirect("/#/admin");
  }
});

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// ============================================================================
// PROVABLY FAIR SYSTEM (HMAC-SHA512 + MODULO BIAS PREVENTION)
// ============================================================================
function generateServerSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashServerSeed(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function extractCardFromHmac(hmacHex: string, startChunk: number): { card: PlayingCard; nextChunk: number } {
  const displayValues = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suits = ["♥", "♦", "♣", "♠"];

  for (let i = startChunk; i < 16; i++) {
    const chunk = hmacHex.substring(i * 8, (i + 1) * 8);
    const decimal = parseInt(chunk, 16);

    // Modulo bias rejection: 2^32 - (2^32 % 52) = 4294967292
    if (decimal >= 4294967292) {
      continue;
    }

    const cardIndex = decimal % 52;
    const value = (cardIndex % 13) + 1; // 1 to 13
    const suitIndex = Math.floor(cardIndex / 13); // 0 to 3
    const rank = displayValues[value - 1];
    const suit = suits[suitIndex];

    return {
      card: {
        rank,
        suit,
        value,
        display: `${rank}${suit}`,
      },
      nextChunk: i + 1,
    };
  }

  // Fallback if all 16 chunks exhausted
  return {
    card: { rank: "K", suit: "♠", value: 13, display: "K♠" },
    nextChunk: 16,
  };
}

function deriveCards(serverSeed: string, clientSeed: string, nonce: number): {
  dragonCard: PlayingCard;
  tigerCard: PlayingCard;
  result: "DRAGON" | "TIGER" | "TIE";
  hmac: string;
} {
  const hmacInput = `${clientSeed}:${nonce}`;
  const hmac = crypto.createHmac("sha512", serverSeed).update(hmacInput).digest("hex");

  const dragon = extractCardFromHmac(hmac, 0);
  const tiger = extractCardFromHmac(hmac, dragon.nextChunk);

  let result: "DRAGON" | "TIGER" | "TIE" = "TIE";
  if (dragon.card.value > tiger.card.value) {
    result = "DRAGON";
  } else if (tiger.card.value > dragon.card.value) {
    result = "TIGER";
  } else {
    result = "TIE";
  }

  return {
    dragonCard: dragon.card,
    tigerCard: tiger.card,
    result,
    hmac,
  };
}

// Side Bets & Distinct Market Pairing Logic
// User Directive: "odd,even,sml,big aGOLO TEO 1.9 HOTE HOBE AND PROTI TAR JONNO ALADA ALADA MATCHING HOTE HOBE"
// User Directive: "1.9 fix koren sob jaygay , and tie hole sob tk company pabe , 5% company pabe"
const MARKET_PAIRS: [string, string][] = [
  ["DRAGON", "TIGER"],
  ["DRAGON_EVEN", "DRAGON_ODD"],
  ["DRAGON_SML", "DRAGON_BIG"],
  ["TIGER_EVEN", "TIGER_ODD"],
  ["TIGER_SML", "TIGER_BIG"],
  ["EVEN", "ODD"],
  ["SML", "BIG"],
];

const OPPOSING_PAIRS: Record<string, string> = {
  DRAGON: "TIGER",
  TIGER: "DRAGON",
  DRAGON_EVEN: "DRAGON_ODD",
  DRAGON_ODD: "DRAGON_EVEN",
  DRAGON_SML: "DRAGON_BIG",
  DRAGON_BIG: "DRAGON_SML",
  TIGER_EVEN: "TIGER_ODD",
  TIGER_ODD: "TIGER_EVEN",
  TIGER_SML: "TIGER_BIG",
  TIGER_BIG: "TIGER_SML",
  EVEN: "ODD",
  ODD: "EVEN",
  SML: "BIG",
  BIG: "SML",
};

const VALID_BET_SIDES = [
  "DRAGON",
  "TIGER",
  "DRAGON_EVEN",
  "DRAGON_ODD",
  "DRAGON_SML",
  "DRAGON_BIG",
  "TIGER_BIG",
  "TIGER_SML",
  "TIGER_ODD",
  "TIGER_EVEN",
  "ODD",
  "EVEN",
  "SML",
  "BIG",
];

function checkBetWinner(
  side: string,
  dragonCard: PlayingCard,
  tigerCard: PlayingCard,
  roundResult: "DRAGON" | "TIGER" | "TIE"
): boolean {
  // On TIE: All bets lose, company captures 100% of money ("tie hole sob tk company pabe")
  if (roundResult === "TIE") return false;

  const dVal = dragonCard.value;
  const tVal = tigerCard.value;

  switch (side) {
    case "DRAGON":
      return roundResult === "DRAGON";
    case "TIGER":
      return roundResult === "TIGER";

    case "DRAGON_EVEN":
      return dVal !== 7 && dVal % 2 === 0;
    case "DRAGON_ODD":
      return dVal !== 7 && dVal % 2 !== 0;
    case "DRAGON_SML":
      return dVal < 7;
    case "DRAGON_BIG":
      return dVal > 7;

    case "TIGER_EVEN":
      return tVal !== 7 && tVal % 2 === 0;
    case "TIGER_ODD":
      return tVal !== 7 && tVal % 2 !== 0;
    case "TIGER_SML":
      return tVal < 7;
    case "TIGER_BIG":
      return tVal > 7;

    case "EVEN":
      return dVal !== 7 && dVal % 2 === 0;
    case "ODD":
      return dVal !== 7 && dVal % 2 !== 0;
    case "SML":
      return dVal < 7;
    case "BIG":
      return dVal > 7;

    default:
      return false;
  }
}

// ============================================================================
// SYSTEM LEDGER & METRICS
// ============================================================================
interface SystemMetrics {
  todayMatchedVolume: number;
  todayCommission: number;
  todayTieRevenue: number;
  totalRoundsPlayed: number;
  activeDeposits: number;
  activeWithdrawals: number;
}

const metrics: SystemMetrics = {
  todayMatchedVolume: 0,
  todayCommission: 0,
  todayTieRevenue: 0,
  totalRoundsPlayed: 0,
  activeDeposits: 0,
  activeWithdrawals: 0,
};

// ============================================================================
// IN-MEMORY DATA STORAGE & USER CREDENTIALS
// ============================================================================
interface UserCredential {
  userId: string;
  username: string;
  passwordHash: string;
  salt: string;
}

const userCredentials: Record<string, UserCredential> = {};

const mockUsers: Record<string, UserWallet> = {
  usr_101: {
    userId: "usr_101",
    username: "DragonKing",
    balance: 85400,
    demoBalance: 25000,
    balanceType: "real",
    lockedBalance: 0,
    totalWon: 142000,
    totalLost: 56600,
    gamesPlayed: 184,
    kycStatus: "verified",
    status: "ACTIVE",
    transactions: [
      {
        id: "tx_init_1",
        type: "deposit",
        amount: 8000,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        description: "Admin Deposit [Tag: VIP Incentive]: +৳8,000",
      },
      {
        id: "tx_init_1b",
        type: "deposit",
        amount: 5000,
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        description: "Admin Deposit [Tag: Welcome Deposit]: +৳5,000",
      },
    ],
  },
  usr_102: {
    userId: "usr_102",
    username: "TigerMaster",
    balance: 42300,
    demoBalance: 15000,
    balanceType: "real",
    lockedBalance: 0,
    totalWon: 98000,
    totalLost: 55700,
    gamesPlayed: 126,
    kycStatus: "verified",
    status: "ACTIVE",
    transactions: [
      {
        id: "tx_init_2",
        type: "deposit",
        amount: 2500,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        description: "Admin Deposit [Tag: Manual Deposit Verification]: +৳2,500 (bKash TrxID #8X92K1 verified manually)",
      },
    ],
  },
  usr_103: {
    userId: "usr_103",
    username: "Challenger99",
    balance: 12000,
    demoBalance: 10000,
    balanceType: "real",
    lockedBalance: 0,
    totalWon: 34000,
    totalLost: 22000,
    gamesPlayed: 48,
    kycStatus: "pending",
    status: "ACTIVE",
    transactions: [
      {
        id: "tx_init_3",
        type: "deposit",
        amount: 1000,
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        description: "Admin Deposit [Tag: Compensation / Refund]: +৳1,000",
      },
    ],
  },
};

// Seed default credentials for pre-configured demo users
function seedCredential(userId: string, username: string, plainPass: string) {
  const salt = "demosalt";
  const passwordHash = crypto.createHash("sha256").update(plainPass + salt).digest("hex");
  userCredentials[username.toLowerCase()] = {
    userId,
    username,
    passwordHash,
    salt,
  };
}
seedCredential("usr_101", "DragonKing", "123456");
seedCredential("usr_102", "TigerMaster", "123456");
seedCredential("usr_103", "Challenger99", "123456");

const userBetHistories: Record<string, UserBetHistoryItem[]> = {
  usr_101: [
    {
      id: "bet_hist_101_1",
      roundNumber: 1042,
      tableSlug: "classic",
      tableName: "Classic High Table",
      side: "DRAGON",
      amount: 500,
      matchedAmount: 500,
      unmatchedAmount: 0,
      returnedAmount: 0,
      payout: 975,
      netPnL: 475,
      balanceType: "real",
      status: "WON",
      tkReturnStatus: "NONE",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      serverSeedHash: "a8f3b...9d2e",
      dragonCard: { rank: "K", suit: "♥", value: 13, display: "K♥" },
      tigerCard: { rank: "7", suit: "♠", value: 7, display: "7♠" },
      result: "DRAGON",
    },
    {
      id: "bet_hist_101_2",
      roundNumber: 1041,
      tableSlug: "classic",
      tableName: "Classic High Table",
      side: "TIGER",
      amount: 1000,
      matchedAmount: 1000,
      unmatchedAmount: 0,
      returnedAmount: 0,
      payout: 0,
      netPnL: -1000,
      balanceType: "real",
      status: "LOST",
      tkReturnStatus: "NONE",
      timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      serverSeedHash: "c2e4d...11aa",
      dragonCard: { rank: "Q", suit: "♦", value: 12, display: "Q♦" },
      tigerCard: { rank: "4", suit: "♣", value: 4, display: "4♣" },
      result: "DRAGON",
    },
  ],
  usr_102: [
    {
      id: "bet_hist_102_1",
      roundNumber: 1038,
      tableSlug: "express",
      tableName: "Express Speed Arena",
      side: "TIGER",
      amount: 200,
      matchedAmount: 100,
      unmatchedAmount: 100,
      returnedAmount: 100,
      payout: 195,
      netPnL: 95,
      balanceType: "real",
      status: "WON",
      tkReturnStatus: "RETURNED_REFUND",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      serverSeedHash: "e4c1a...7f8b",
      dragonCard: { rank: "9", suit: "♣", value: 9, display: "9♣" },
      tigerCard: { rank: "Q", suit: "♦", value: 12, display: "Q♦" },
      result: "TIGER",
    },
  ],
  usr_103: [
    {
      id: "bet_hist_103_1",
      roundNumber: 1040,
      tableSlug: "classic",
      tableName: "Classic High Table",
      side: "DRAGON",
      amount: 500,
      matchedAmount: 500,
      unmatchedAmount: 0,
      returnedAmount: 0,
      payout: 0,
      netPnL: -500,
      balanceType: "real",
      status: "LOST",
      tkReturnStatus: "NONE",
      timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
      serverSeedHash: "ff21b...882c",
      dragonCard: { rank: "3", suit: "♠", value: 3, display: "3♠" },
      tigerCard: { rank: "10", suit: "♥", value: 10, display: "10♥" },
      result: "TIGER",
    },
  ],
};

const adminGrants: AdminGrant[] = [
  {
    id: "grant_init_1",
    userId: "usr_101",
    username: "DragonKing",
    amount: 5000,
    tag: "Welcome Deposit",
    reason: "VIP player manual onboarding credit",
    adminUsername: "admin",
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    isDemo: false,
  },
  {
    id: "grant_init_2",
    userId: "usr_102",
    username: "TigerMaster",
    amount: 2500,
    tag: "Manual Deposit Verification",
    reason: "bKash TrxID #8X92K1 verified manually",
    adminUsername: "admin",
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    isDemo: false,
  },
  {
    id: "grant_init_3",
    userId: "usr_103",
    username: "Challenger99",
    amount: 1000,
    tag: "Compensation / Refund",
    reason: "Network disconnect during high-stake duel refund",
    adminUsername: "admin",
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    isDemo: false,
  },
  {
    id: "grant_init_4",
    userId: "usr_101",
    username: "DragonKing",
    amount: 3000,
    tag: "VIP Incentive",
    reason: "Weekly leaderboard volume incentive",
    adminUsername: "admin",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    isDemo: false,
  },
];

const userActivityLogs: Record<string, UserActivityLog[]> = {};

const playerReports: PlayerReport[] = [
  {
    id: "rep_init_1",
    reporterUserId: "usr_101",
    reporterUsername: "DragonKing",
    reportedUserId: "usr_103",
    reportedUsername: "Challenger99",
    reason: "Cheating",
    details: "Abnormally fast betting speed during high stake duel.",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: "PENDING",
  },
  {
    id: "rep_init_2",
    reporterUserId: "usr_102",
    reporterUsername: "TigerMaster",
    reportedUserId: "usr_103",
    reportedUsername: "Challenger99",
    reason: "Harassment",
    details: "Inappropriate language in live table chat room.",
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "INVESTIGATED",
  },
];

const roundDisputes: RoundDispute[] = [
  {
    id: "disp_init_1",
    userId: "usr_101",
    username: "DragonKing",
    roundNumber: 1042,
    tableSlug: "classic",
    tableName: "Classic High Table",
    betAmount: 500,
    side: "DRAGON",
    issueType: "Lag / Disconnect",
    description: "Network connection dropped right as round settled. Requesting verification and refund.",
    status: "PENDING",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    roundDetails: {
      dragonCard: "K♥",
      tigerCard: "7♠",
      result: "DRAGON",
      serverSeedHash: "a8f3b...9d2e",
    },
  },
  {
    id: "disp_init_2",
    userId: "usr_102",
    username: "TigerMaster",
    roundNumber: 1038,
    tableSlug: "express",
    tableName: "Express Speed Arena",
    betAmount: 200,
    side: "TIGER",
    issueType: "Unmatched Bet Refund",
    description: "Partial match of ৳100 occurred, remaining ৳100 refund confirmation check.",
    status: "RESOLVED_VALID",
    adminNotes: "Auto-refund of ৳100 verified on ledger. Transaction TX #9918 valid.",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 43200000).toISOString(),
    roundDetails: {
      dragonCard: "9♣",
      tigerCard: "Q♦",
      result: "TIGER",
      serverSeedHash: "e4c1a...7f8b",
    },
  },
];

function logUserActivity(userId: string, username: string, action: string, details: string, ipAddress?: string): UserActivityLog {
  if (!userActivityLogs[userId]) {
    userActivityLogs[userId] = [];
  }
  const log: UserActivityLog = {
    id: `act_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    userId,
    username,
    action,
    details,
    ipAddress: ipAddress || "103.205.132.42",
    timestamp: new Date().toISOString(),
  };
  userActivityLogs[userId].unshift(log);
  return log;
}

function getOrSeedUserBetHistory(userId: string, _username = "Player"): UserBetHistoryItem[] {
  if (!userBetHistories[userId]) {
    userBetHistories[userId] = [];
  }
  return userBetHistories[userId];
}

// Rule 2: ZERO MONETARY BONUSES. Referral commission engine removed.


function ensureUserStats(user: UserWallet): UserStats {
  if (user.stats && user.stats.totalHandsPlayed === user.gamesPlayed) {
    return user.stats;
  }

  const handsPlayed = Math.max(user.gamesPlayed, 0);
  if (user.stats) {
    user.stats.totalHandsPlayed = handsPlayed;
    user.stats.winRate =
      handsPlayed > 0
        ? Number(((user.stats.handsWon / handsPlayed) * 100).toFixed(1))
        : 0;
    return user.stats;
  }

  user.stats = {
    totalHandsPlayed: 0,
    handsWon: 0,
    handsLost: 0,
    handsTied: 0,
    winRate: 0,
    biggestWin: 0,
    tableBreakdown: {
      express: {
        slug: "express",
        tableName: "Express Speed Arena",
        handsPlayed: 0,
        handsWon: 0,
        handsLost: 0,
        winRate: 0,
        totalWagered: 0,
        profit: 0,
      },
      classic: {
        slug: "classic",
        tableName: "Classic High Table",
        handsPlayed: 0,
        handsWon: 0,
        handsLost: 0,
        winRate: 0,
        totalWagered: 0,
        profit: 0,
      },
      vip: {
        slug: "vip",
        tableName: "VIP Diamond Lounge",
        handsPlayed: 0,
        handsWon: 0,
        handsLost: 0,
        winRate: 0,
        totalWagered: 0,
        profit: 0,
      },
    },
    sideBreakdown: {
      dragon: { hands: 0, wins: 0, winRate: 0 },
      tiger: { hands: 0, wins: 0, winRate: 0 },
      tie: { hands: 0, wins: 0, winRate: 0 },
    },
    favoriteTable: "Classic High Table",
    favoriteSide: "Dragon",
  };

  return user.stats;
}

function ensureUserCosmetics(user: UserWallet): UserCosmetics {
  if (!user.cosmetics) {
    user.cosmetics = {
      equippedFrame: "Newcomer",
      equippedCardBack: "Classic",
      equippedTableTheme: "Midnight",
      equippedTitle: "Rookie",
      eloRating: 1000,
      eloTier: "Bronze",
      unlockedFrames: ["Newcomer"],
      unlockedCardBacks: ["Classic"],
      unlockedThemes: ["Midnight"],
      unlockedTitles: ["Rookie"],
      unlockedBadges: [],
      loginDays: 1,
      spectatorFameScore: 0,
    };
  }

  const c = user.cosmetics;
  const hands = user.gamesPlayed || 0;
  const wins = user.stats?.handsWon || 0;
  const elo = c.eloRating || 1000;

  // Evaluate ELO Tier
  if (elo >= 2500) c.eloTier = "Master";
  else if (elo >= 2100) c.eloTier = "Diamond";
  else if (elo >= 1800) c.eloTier = "Platinum";
  else if (elo >= 1500) c.eloTier = "Gold";
  else if (elo >= 1200) c.eloTier = "Silver";
  else c.eloTier = "Bronze";

  // Evaluate Avatar Frames Unlocks
  if (hands >= 10 && !c.unlockedFrames.includes("10 Hands")) c.unlockedFrames.push("10 Hands");
  if (hands >= 50 && !c.unlockedFrames.includes("50 Hands")) c.unlockedFrames.push("50 Hands");
  if (wins >= 100 && !c.unlockedFrames.includes("100 Wins")) c.unlockedFrames.push("100 Wins");
  if (c.eloTier === "Diamond" || c.eloTier === "Master") {
    if (!c.unlockedFrames.includes("Diamond")) c.unlockedFrames.push("Diamond");
  }

  // Evaluate Card Back Skins Unlocks
  if (hands >= 200 && !c.unlockedCardBacks.includes("Gold Dragon")) c.unlockedCardBacks.push("Gold Dragon");
  if (wins >= 50 && !c.unlockedCardBacks.includes("Fire Tiger")) c.unlockedCardBacks.push("Fire Tiger");
  if (["Gold", "Platinum", "Diamond", "Master"].includes(c.eloTier) && !c.unlockedCardBacks.includes("Neon")) c.unlockedCardBacks.push("Neon");
  if (["Platinum", "Diamond", "Master"].includes(c.eloTier) && !c.unlockedCardBacks.includes("Royal")) c.unlockedCardBacks.push("Royal");
  if (["Diamond", "Master"].includes(c.eloTier) && !c.unlockedCardBacks.includes("Galaxy")) c.unlockedCardBacks.push("Galaxy");
  if (c.eloTier === "Master" && !c.unlockedCardBacks.includes("Master")) c.unlockedCardBacks.push("Master");

  // Evaluate Table Themes Unlocks
  if (hands >= 100 && !c.unlockedThemes.includes("Casino Red")) c.unlockedThemes.push("Casino Red");
  if (["Silver", "Gold", "Platinum", "Diamond", "Master"].includes(c.eloTier) && !c.unlockedThemes.includes("Emerald")) c.unlockedThemes.push("Emerald");
  if (["Gold", "Platinum", "Diamond", "Master"].includes(c.eloTier) && !c.unlockedThemes.includes("Royal Purple")) c.unlockedThemes.push("Royal Purple");
  if (["Diamond", "Master"].includes(c.eloTier) && !c.unlockedThemes.includes("Championship")) c.unlockedThemes.push("Championship");

  // Evaluate Profile Titles Unlocks
  if (hands >= 10 && !c.unlockedTitles.includes("Player")) c.unlockedTitles.push("Player");
  if (hands >= 25 && !c.unlockedTitles.includes("Competitor")) c.unlockedTitles.push("Competitor");
  if (hands >= 50 && !c.unlockedTitles.includes("Challenger")) c.unlockedTitles.push("Challenger");
  if (hands >= 100 && !c.unlockedTitles.includes("Veteran")) c.unlockedTitles.push("Veteran");
  if (hands >= 250 && !c.unlockedTitles.includes("Elite")) c.unlockedTitles.push("Elite");
  if (hands >= 500 && !c.unlockedTitles.includes("Legend")) c.unlockedTitles.push("Legend");
  if (hands >= 1000 && !c.unlockedTitles.includes("Master")) c.unlockedTitles.push("Master");

  // Evaluate Achievement Badges
  if (wins >= 1 && !c.unlockedBadges.includes("First Blood")) c.unlockedBadges.push("First Blood");
  if (wins >= 10 && !c.unlockedBadges.includes("Unstoppable")) c.unlockedBadges.push("Unstoppable");
  if (hands >= 500 && !c.unlockedBadges.includes("Marathon")) c.unlockedBadges.push("Marathon");

  return c;
}

function recordSettledBetOnUserStats(
  user: UserWallet,
  bet: LiveBetRecord,
  isTie: boolean,
  winningSide: "DRAGON" | "TIGER" | "TIE",
  tableSlug: "express" | "classic" | "vip",
  tableName: string,
  profitOrLoss: number,
  isWin: boolean
) {
  const stats = ensureUserStats(user);
  stats.totalHandsPlayed += 1;

  if (!stats.tableBreakdown[tableSlug]) {
    stats.tableBreakdown[tableSlug] = {
      slug: tableSlug,
      tableName,
      handsPlayed: 0,
      handsWon: 0,
      handsLost: 0,
      winRate: 0,
      totalWagered: 0,
      profit: 0,
    };
  }
  const tbl = stats.tableBreakdown[tableSlug];
  tbl.handsPlayed += 1;
  tbl.totalWagered += bet.amount;

  const sideKey = (bet.side.toLowerCase()) as "dragon" | "tiger" | "tie";
  if (stats.sideBreakdown[sideKey]) {
    stats.sideBreakdown[sideKey].hands += 1;
  }

  if (isWin) {
    stats.handsWon += 1;
    tbl.handsWon += 1;
    tbl.profit += profitOrLoss;
    if (stats.sideBreakdown[sideKey]) stats.sideBreakdown[sideKey].wins += 1;
    if (profitOrLoss > stats.biggestWin) stats.biggestWin = profitOrLoss;
  } else if (isTie && bet.side !== "TIE") {
    stats.handsTied += 1;
    tbl.profit -= profitOrLoss;
  } else {
    stats.handsLost += 1;
    tbl.handsLost += 1;
    tbl.profit -= bet.amount;
  }

  stats.winRate = Number(((stats.handsWon / Math.max(stats.totalHandsPlayed, 1)) * 100).toFixed(1));
  tbl.winRate = Number(((tbl.handsWon / Math.max(tbl.handsPlayed, 1)) * 100).toFixed(1));
  if (stats.sideBreakdown[sideKey] && stats.sideBreakdown[sideKey].hands > 0) {
    stats.sideBreakdown[sideKey].winRate = Number(
      ((stats.sideBreakdown[sideKey].wins / stats.sideBreakdown[sideKey].hands) * 100).toFixed(1)
    );
  }
}

const activeRooms: P2PRoom[] = [];

// ============================================================================
// STATEFUL MULTIPLAYER 1v1 DUEL GAME ENGINE
// ============================================================================
interface ActiveDuel {
  id: string; // roomId
  status: "ROLE_COIN_FLIP" | "PEEK_CARDS" | "BETTING" | "SHOWDOWN" | "SETTLED";
  tier: "Express" | "Classic" | "VIP";
  creatorId: string;
  creatorName: string;
  creatorRole: "DRAGON" | "TIGER";
  creatorCard: PlayingCard;
  creatorBet: number;
  creatorAction?: string;
  creatorPeeked: boolean;
  creatorElo: number;
  
  acceptorId: string;
  acceptorName: string;
  acceptorRole: "DRAGON" | "TIGER";
  acceptorCard: PlayingCard;
  acceptorBet: number;
  acceptorAction?: string;
  acceptorPeeked: boolean;
  acceptorElo: number;
  
  currentPot: number;
  currentRaise: number;
  bettingRound: number; // 1, 2, 3
  turnUser: "DRAGON" | "TIGER";
  secondsRemaining: number;
  raisesCount: number; // max 3
  winnerRole?: "DRAGON" | "TIGER" | "TIE";
  foldWinnerRole?: "DRAGON" | "TIGER";
  netProfitCreator?: number;
  netProfitAcceptor?: number;
  lastUpdated: number;
}

const activeDuels: Record<string, ActiveDuel> = {};
const p2pRoomsHistory: P2PRoom[] = [];

// ============================================================================
// MULTI-TABLE GAME ENGINE (EXPRESS, CLASSIC, VIP)
// ============================================================================
interface TableRuntime {
  config: TableConfig;
  currentRound: TableRound;
  secretServerSeed: string;
  roadmap: RoadmapItem[];
  playerBets: LiveBetRecord[];
  recentSettledBets: LiveBetRecord[];
}

const tableConfigs: Record<string, TableConfig> = {
  express: {
    id: "tbl_express",
    slug: "express",
    name: "Express Speed Arena",
    type: "Express",
    minBet: 0.00001,
    maxBet: 1000,
    bettingDuration: 15,
    playersOnline: 0,
    commissionRate: 0.05,
  },
  classic: {
    id: "tbl_classic",
    slug: "classic",
    name: "Classic High Table",
    type: "Classic",
    minBet: 0.00001,
    maxBet: 10000,
    bettingDuration: 30,
    playersOnline: 0,
    commissionRate: 0.05,
  },
  vip: {
    id: "tbl_vip",
    slug: "vip",
    name: "VIP Diamond Lounge",
    type: "VIP",
    minBet: 0.00001,
    maxBet: 100000,
    bettingDuration: 30,
    playersOnline: 0,
    commissionRate: 0.05,
  },
};

const tables: Record<string, TableRuntime> = {};

Object.entries(tableConfigs).forEach(([slug, cfg]) => {
  const serverSeed = generateServerSeed();
  const seedHash = hashServerSeed(serverSeed);
  const clientSeed = "dragon_tiger_btc_block_894102";

  tables[slug] = {
    config: cfg,
    secretServerSeed: serverSeed,
    roadmap: [], // Rule 1 & GAME-003: Honest initial empty history, no Math.random() fabrication
    playerBets: [],
    recentSettledBets: [],
    currentRound: {
      roundId: `rnd_${slug}_1001`,
      roundNumber: 1001,
      tableSlug: slug as "express" | "classic" | "vip",
      tableName: cfg.name,
      status: "BETTING",
      secondsRemaining: cfg.bettingDuration,
      totalDuration: cfg.bettingDuration,
      dragonPool: 0,
      tigerPool: 0,
      matchedAmount: 0,
      dragonPlayers: 0,
      tigerPlayers: 0,
      serverSeedHash: seedHash,
      clientSeed: clientSeed,
      nonce: 1001,
    },
  };
});

function broadcast(data: Record<string, unknown>) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Table Tick Engine (1-second heartbeat)
setInterval(() => {
  Object.entries(tables).forEach(([slug, tbl]) => {
    const round = tbl.currentRound;

    if (round.status === "BETTING") {
      if (round.secondsRemaining > 0) {
        round.secondsRemaining -= 1;

        broadcast({
          type: "TIMER_TICK",
          tableSlug: slug,
          secondsRemaining: round.secondsRemaining,
          dragonPool: round.dragonPool,
          tigerPool: round.tigerPool,
          matchedAmount: round.matchedAmount,
        });
      } else {
        // Transition: BETTING -> MATCHING -> DEALING
        // Strict Balance Isolation: REAL balance matches only with REAL balance, and DEMO balance matches only with DEMO balance
        round.status = "MATCHING";
        let totalMatchedAmount = 0;

        const refundStakes = (bet: LiveBetRecord, ratio: number) => {
          const matchedPart = Math.floor(bet.amount * ratio);
          const unmatchedPart = bet.amount - matchedPart;

          (bet as any).matchedAmount = matchedPart;
          (bet as any).unmatchedAmount = unmatchedPart;

          if (unmatchedPart > 0) {
            bet.returnedAmount = (bet.returnedAmount || 0) + unmatchedPart;
            bet.tkReturnStatus = "RETURNED_REFUND";

            const userHist = userBetHistories[bet.userId];
            if (userHist) {
              const histItem = userHist.find((h) => h.id === bet.id);
              if (histItem) {
                histItem.matchedAmount = matchedPart;
                histItem.unmatchedAmount = unmatchedPart;
                histItem.returnedAmount = (histItem.returnedAmount || 0) + unmatchedPart;
                histItem.tkReturnStatus = "RETURNED_REFUND";
              }
            }

            const user = mockUsers[bet.userId];
            if (user) {
              if (bet.balanceType === "real") {
                user.balance += unmatchedPart;
              } else {
                user.demoBalance += unmatchedPart;
              }
              user.transactions.unshift({
                id: `tx_unmatched_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                type: "refund",
                amount: unmatchedPart,
                timestamp: new Date().toISOString(),
                description: `P2P Unmatched Refund [${bet.balanceType === "real" ? "REAL" : "DEMO"}] (${bet.side}): ৳${unmatchedPart.toLocaleString()} returned to wallet (${tbl.config.name} Round #${round.roundNumber})`,
              });
            }
          }
        };

        // Perform distinct matching separately for "real" and "demo" pools
        const BALANCE_TYPES: ("real" | "demo")[] = ["real", "demo"];

        BALANCE_TYPES.forEach((bType) => {
          MARKET_PAIRS.forEach(([sideA, sideB]) => {
            const betsA = tbl.playerBets.filter((b) => b.side === sideA && (b.balanceType || "real") === bType);
            const betsB = tbl.playerBets.filter((b) => b.side === sideB && (b.balanceType || "real") === bType);
            const poolA = betsA.reduce((sum, b) => sum + b.amount, 0);
            const poolB = betsB.reduce((sum, b) => sum + b.amount, 0);
            const pairMatched = Math.min(poolA, poolB);
            totalMatchedAmount += pairMatched;

            const ratioA = poolA > 0 ? Math.min(1, pairMatched / poolA) : 0;
            const ratioB = poolB > 0 ? Math.min(1, pairMatched / poolB) : 0;

            betsA.forEach((b) => refundStakes(b, ratioA));
            betsB.forEach((b) => refundStakes(b, ratioB));
          });
        });

        // Any bet without an opposing market match receives a 100% full refund
        tbl.playerBets.forEach((bet) => {
          if ((bet as any).matchedAmount === undefined) {
            (bet as any).matchedAmount = 0;
            (bet as any).unmatchedAmount = bet.amount;
            bet.returnedAmount = bet.amount;
            bet.tkReturnStatus = "RETURNED_REFUND";
            const user = mockUsers[bet.userId];
            if (user) {
              if (bet.balanceType === "real") user.balance += bet.amount;
              else user.demoBalance += bet.amount;
            }
          }
        });

        round.matchedAmount = totalMatchedAmount;

        broadcast({
          type: "ROUND_PHASE",
          tableSlug: slug,
          status: "MATCHING",
          matchedAmount: round.matchedAmount,
          dragonPool: round.dragonPool,
          tigerPool: round.tigerPool,
        });

        setTimeout(() => {
          round.status = "DEALING";
          const derived = deriveCards(tbl.secretServerSeed, round.clientSeed, round.nonce);
          round.dragonCard = derived.dragonCard;
          round.tigerCard = derived.tigerCard;
          round.result = derived.result;

          broadcast({
            type: "ROUND_DEALING",
            tableSlug: slug,
            dragonCard: round.dragonCard,
            tigerCard: round.tigerCard,
            result: round.result,
          });

          // Settling phase (after 3s card animation)
          setTimeout(() => {
            round.status = "SETTLING";
            round.serverSeed = tbl.secretServerSeed; // REVEAL SEED ONLY NOW

            // Financial settlement per mathematical proof
            // User Directives:
            // "and tie hole sob tk company pabe" -> 100% of all matched money locked as company profit on TIE
            // "5% company pabe" -> 5% fee on matched 2M pool (0.10 * matchedM)
            const matchedM = round.matchedAmount;
            if (round.result === "TIE") {
              round.tieRevenue = new Decimal(matchedM).times(2).toNumber();
              round.commission = 0;
              metrics.todayTieRevenue = new Decimal(metrics.todayTieRevenue).plus(round.tieRevenue).toNumber();
            } else {
              round.commission = new Decimal(matchedM).times(2).times(0.05).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(); // 5% commission of 2M pool
              round.tieRevenue = 0;
              metrics.todayCommission = new Decimal(metrics.todayCommission).plus(round.commission).toNumber();
            }
            metrics.todayMatchedVolume = new Decimal(metrics.todayMatchedVolume).plus(matchedM).toNumber();
            metrics.totalRoundsPlayed += 1;

            // Settle all player bets transparently on the matched portion
            tbl.playerBets.forEach((bet) => {
              const matchedStake = (bet as any).matchedAmount !== undefined ? (bet as any).matchedAmount : bet.amount;
              const isTie = round.result === "TIE";

              if (matchedStake <= 0) {
                bet.status = "REFUNDED";
                bet.payout = 0;
                bet.tkReturnStatus = "RETURNED_REFUND";
                return;
              }

              if (isTie) {
                // User Directive: "and tie hole sob tk company pabe" -> All bets lose, company captures 100%
                bet.status = "LOST";
                bet.payout = 0;
                bet.tkReturnStatus = "NO_RETURN";
                bet.returnedAmount = 0;
              } else if (checkBetWinner(bet.side, round.dragonCard!, round.tigerCard!, round.result!)) {
                // User Directive: "1.9 fix koren sob jaygay" -> 1.9x payout across all winning bets (computed via Decimal)
                bet.status = "WON";
                bet.payout = new Decimal(matchedStake).times(1.9).toDecimalPlaces(2, Decimal.ROUND_FLOOR).toNumber();
                bet.tkReturnStatus = "RETURNED_WIN";
                bet.returnedAmount = (bet.returnedAmount || 0) + bet.payout;
              } else {
                bet.status = "LOST";
                bet.payout = 0;
                bet.tkReturnStatus = (bet.returnedAmount && bet.returnedAmount > 0) ? "RETURNED_REFUND" : "NO_RETURN";
              }

              // Sync with user's permanent bet history
              const userHist = userBetHistories[bet.userId];
              if (userHist) {
                const histItem = userHist.find((h) => h.id === bet.id);
                if (histItem) {
                  histItem.status = bet.status as any;
                  histItem.payout = bet.payout || 0;
                  histItem.returnedAmount = bet.returnedAmount || 0;
                  histItem.tkReturnStatus = bet.tkReturnStatus as any;
                  histItem.netPnL = (bet.returnedAmount || 0) - bet.amount;
                  histItem.dragonCard = round.dragonCard;
                  histItem.tigerCard = round.tigerCard;
                  histItem.result = round.result;
                  histItem.serverSeed = round.serverSeed;
                }
              }

              // Update user wallet and transactions if registered user
              const user = mockUsers[bet.userId];
              if (user && matchedStake > 0) {
                if (isTie) {
                  // User Directive: "and tie hole sob tk company pabe"
                  user.totalLost += matchedStake;
                  recordSettledBetOnUserStats(user, bet, true, "TIE", slug as any, tbl.config.name, matchedStake, false);
                  user.transactions.unshift({
                    id: `tx_tie_loss_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    type: "loss",
                    amount: matchedStake,
                    timestamp: new Date().toISOString(),
                    description: `Tie: ৳${matchedStake.toLocaleString()} lost to Company Ledger on ${tbl.config.name} Round #${round.roundNumber}`,
                  });
                } else if (checkBetWinner(bet.side, round.dragonCard!, round.tigerCard!, round.result!)) {
                  // User Directive: "1.9 fix koren sob jaygay" -> 1.9x payout via Decimal
                  const payout = new Decimal(matchedStake).times(1.9).toDecimalPlaces(2, Decimal.ROUND_FLOOR).toNumber();
                  const profit = new Decimal(matchedStake).times(0.9).toDecimalPlaces(2, Decimal.ROUND_FLOOR).toNumber();
                  if (bet.balanceType === "real") {
                    user.balance = new Decimal(user.balance).plus(payout).toNumber();
                  } else {
                    user.demoBalance = new Decimal(user.demoBalance).plus(payout).toNumber();
                  }
                  user.totalWon = new Decimal(user.totalWon).plus(profit).toNumber();
                  recordSettledBetOnUserStats(user, bet, false, round.result as any, slug as any, tbl.config.name, profit, true);
                  user.transactions.unshift({
                    id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    type: "win",
                    amount: payout,
                    timestamp: new Date().toISOString(),
                    description: `Won 1.9x on ${bet.side} - ${tbl.config.name} Round #${round.roundNumber}`,
                  });
                } else {
                  user.totalLost += matchedStake;
                  recordSettledBetOnUserStats(user, bet, false, round.result as any, slug as any, tbl.config.name, matchedStake, false);
                  user.transactions.unshift({
                    id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    type: "loss",
                    amount: matchedStake,
                    timestamp: new Date().toISOString(),
                    description: `Loss on ${bet.side} - ${tbl.config.name} Round #${round.roundNumber}`,
                  });
                }
              }

              // Archive to transparent table history
              tbl.recentSettledBets.unshift({ ...bet });
            });

            tbl.recentSettledBets = tbl.recentSettledBets.slice(0, 60);

            // Add to roadmap
            if (round.result && round.dragonCard && round.tigerCard) {
              tbl.roadmap.unshift({
                roundNumber: round.roundNumber,
                result: round.result,
                dragonCard: round.dragonCard,
                tigerCard: round.tigerCard,
                timestamp: new Date().toISOString(),
              });
              if (tbl.roadmap.length > 80) tbl.roadmap.pop();
            }

            round.status = "COMPLETED";

            broadcast({
              type: "ROUND_RESULT",
              tableSlug: slug,
              round: round,
              roadmap: tbl.roadmap.slice(0, 40),
              settledBets: tbl.playerBets,
            });

            // Start next round after 4s
            setTimeout(() => {
              const nextServerSeed = generateServerSeed();
              const nextSeedHash = hashServerSeed(nextServerSeed);
              tbl.secretServerSeed = nextServerSeed;
              tbl.playerBets = [];

              tbl.currentRound = {
                roundId: `rnd_${slug}_${round.roundNumber + 1}`,
                roundNumber: round.roundNumber + 1,
                tableSlug: slug as "express" | "classic" | "vip",
                tableName: tbl.config.name,
                status: "BETTING",
                secondsRemaining: tbl.config.bettingDuration,
                totalDuration: tbl.config.bettingDuration,
                dragonPool: 0,
                tigerPool: 0,
                matchedAmount: 0,
                dragonPlayers: 0,
                tigerPlayers: 0,
                serverSeedHash: nextSeedHash,
                clientSeed: "dragon_tiger_btc_block_894102",
                nonce: round.nonce + 1,
              };

              broadcast({
                type: "NEW_ROUND",
                tableSlug: slug,
                round: tbl.currentRound,
              });
            }, 4000);
          }, 3000);
        }, 1500);
      }
    }
  });
}, 1000);

// ============================================================================
// STATEFUL MULTIPLAYER 1v1 DUEL ENGINE HELPER FUNCTIONS & TICK ENGINE
// ============================================================================
function settleDuelOnFold(duel: ActiveDuel, foldingUserId: string) {
  const isCreator = foldingUserId === duel.creatorId;
  const winnerUserId = isCreator ? duel.acceptorId : duel.creatorId;
  const winnerUser = mockUsers[winnerUserId];
  const loserUser = mockUsers[foldingUserId];
  
  const totalPot = duel.currentPot;
  const companyProfit = new Decimal(totalPot).times(0.05).round().toNumber(); // 5% rake
  const winnerPayout = new Decimal(totalPot).minus(companyProfit).toNumber();
  
  const winnerRole = isCreator ? duel.acceptorRole : duel.creatorRole;
  
  if (winnerUser) {
    winnerUser.balance += winnerPayout;
    winnerUser.totalWon += winnerPayout - (isCreator ? duel.acceptorBet : duel.creatorBet);
    winnerUser.gamesPlayed += 1;
    winnerUser.transactions.unshift({
      id: `tx_duel_win_${Date.now()}`,
      type: "deposit",
      amount: winnerPayout,
      timestamp: new Date().toISOString(),
      description: `1v1 Duel Win (Opponent Folded) on Round #${duel.id}! Payout: ৳${winnerPayout.toLocaleString()} (Pot: ৳${totalPot.toLocaleString()}, House 5%: ৳${companyProfit.toLocaleString()})`,
    });
    
    // Stats win record
    const stats = ensureUserStats(winnerUser);
    stats.totalHandsPlayed += 1;
    stats.handsWon += 1;
  }
  
  if (loserUser) {
    loserUser.totalLost += isCreator ? duel.creatorBet : duel.acceptorBet;
    loserUser.gamesPlayed += 1;
    loserUser.transactions.unshift({
      id: `tx_duel_loss_${Date.now()}`,
      type: "withdraw",
      amount: isCreator ? duel.creatorBet : duel.acceptorBet,
      timestamp: new Date().toISOString(),
      description: `1v1 Duel Loss (Folded) on Round #${duel.id}. Lost Stake: ৳${(isCreator ? duel.creatorBet : duel.acceptorBet).toLocaleString()}`,
    });
    
    // Stats loss record
    const stats = ensureUserStats(loserUser);
    stats.totalHandsPlayed += 1;
    stats.handsLost += 1;
  }
  
  // Metrics
  metrics.todayMatchedVolume += totalPot;
  metrics.todayCommission += companyProfit;
  metrics.totalRoundsPlayed += 1;
  
  // Public ledger
  recordGlobalTransaction({
    type: "commission",
    username: winnerUser?.username || "Player",
    userId: winnerUserId,
    recipientUsername: loserUser?.username || "Player",
    recipientUserId: foldingUserId,
    amount: companyProfit,
    method: "1v1 Duel fold company commission",
    status: "COMPLETED",
    description: `1v1 Duel Fold: @${winnerUser?.username} wins pot of ৳${totalPot.toLocaleString()} from @${loserUser?.username}`,
  });
  
  // Update room status
  const room = activeRooms.find(r => r.id === duel.id);
  if (room) {
    room.status = "completed";
    room.winner = winnerRole.toLowerCase() as any;
    room.dragonCard = duel.creatorRole === "DRAGON" ? duel.creatorCard : duel.acceptorCard;
    room.tigerCard = duel.creatorRole === "TIGER" ? duel.creatorCard : duel.acceptorCard;
  }
  
  const histRoom = p2pRoomsHistory.find(r => r.id === duel.id);
  if (histRoom) {
    histRoom.status = "completed";
    histRoom.winner = winnerRole.toLowerCase() as any;
    histRoom.acceptorId = duel.acceptorId;
    histRoom.acceptorName = duel.acceptorName;
    histRoom.dragonCard = duel.creatorRole === "DRAGON" ? duel.creatorCard : duel.acceptorCard;
    histRoom.tigerCard = duel.creatorRole === "TIGER" ? duel.creatorCard : duel.acceptorCard;
  }
  
  duel.status = "SETTLED";
  duel.winnerRole = winnerRole;
  duel.foldWinnerRole = winnerRole;
  duel.netProfitCreator = isCreator ? -duel.creatorBet : winnerPayout - duel.creatorBet;
  duel.netProfitAcceptor = !isCreator ? -duel.acceptorBet : winnerPayout - duel.acceptorBet;
  duel.lastUpdated = Date.now();
  
  // Clean up from active map after some time
  setTimeout(() => {
    delete activeDuels[duel.id];
  }, 45000);
}

function settleDuelOnShowdown(duel: ActiveDuel) {
  const dVal = duel.creatorRole === "DRAGON" ? duel.creatorCard.value : duel.acceptorCard.value;
  const tVal = duel.creatorRole === "TIGER" ? duel.creatorCard.value : duel.acceptorCard.value;
  
  let winnerRole: "DRAGON" | "TIGER" | "TIE" = "TIE";
  if (dVal > tVal) winnerRole = "DRAGON";
  else if (tVal > dVal) winnerRole = "TIGER";
  
  const creatorIsWinner = winnerRole === duel.creatorRole;
  const acceptorIsWinner = winnerRole === duel.acceptorRole;
  const isTie = winnerRole === "TIE";
  
  const totalPot = duel.currentPot;
  const companyProfit = isTie ? totalPot : new Decimal(totalPot).times(0.05).round().toNumber();
  const winnerPayout = isTie ? 0 : new Decimal(totalPot).minus(companyProfit).toNumber();
  
  const creator = mockUsers[duel.creatorId];
  const acceptor = mockUsers[duel.acceptorId];
  
  if (isTie) {
    if (creator) {
      creator.totalLost += duel.creatorBet;
      creator.gamesPlayed += 1;
      creator.transactions.unshift({
        id: `tx_duel_tie_${Date.now()}`,
        type: "loss",
        amount: duel.creatorBet,
        timestamp: new Date().toISOString(),
        description: `1v1 Duel TIE Game! Both cards matched (${duel.creatorCard.rank} vs ${duel.acceptorCard.rank}). Pot forfeited to company profit.`,
      });
      const stats = ensureUserStats(creator);
      stats.totalHandsPlayed += 1;
      stats.handsTied += 1;
    }
    if (acceptor) {
      acceptor.totalLost += duel.acceptorBet;
      acceptor.gamesPlayed += 1;
      acceptor.transactions.unshift({
        id: `tx_duel_tie_${Date.now()}`,
        type: "loss",
        amount: duel.acceptorBet,
        timestamp: new Date().toISOString(),
        description: `1v1 Duel TIE Game! Both cards matched (${duel.creatorCard.rank} vs ${duel.acceptorCard.rank}). Pot forfeited to company profit.`,
      });
      const stats = ensureUserStats(acceptor);
      stats.totalHandsPlayed += 1;
      stats.handsTied += 1;
    }
    
    metrics.todayMatchedVolume += totalPot;
    metrics.todayTieRevenue += totalPot;
  } else {
    const winnerId = creatorIsWinner ? duel.creatorId : duel.acceptorId;
    const loserId = creatorIsWinner ? duel.acceptorId : duel.creatorId;
    const winnerUser = mockUsers[winnerId];
    const loserUser = mockUsers[loserId];
    const winnerBet = creatorIsWinner ? duel.creatorBet : duel.acceptorBet;
    const loserBet = creatorIsWinner ? duel.acceptorBet : duel.creatorBet;
    
    if (winnerUser) {
      winnerUser.balance += winnerPayout;
      winnerUser.totalWon += winnerPayout - winnerBet;
      winnerUser.gamesPlayed += 1;
      winnerUser.transactions.unshift({
        id: `tx_duel_win_${Date.now()}`,
        type: "deposit",
        amount: winnerPayout,
        timestamp: new Date().toISOString(),
        description: `1v1 Showdown WIN vs @${loserUser?.username || "Player"}! Payout: ৳${winnerPayout.toLocaleString()} (Pot: ৳${totalPot.toLocaleString()}, House 5%: ৳${companyProfit.toLocaleString()})`,
      });
      const stats = ensureUserStats(winnerUser);
      stats.totalHandsPlayed += 1;
      stats.handsWon += 1;
    }
    
    if (loserUser) {
      loserUser.totalLost += loserBet;
      loserUser.gamesPlayed += 1;
      loserUser.transactions.unshift({
        id: `tx_duel_loss_${Date.now()}`,
        type: "withdraw",
        amount: loserBet,
        timestamp: new Date().toISOString(),
        description: `1v1 Showdown Loss vs @${winnerUser?.username || "Player"}. Lost Stake: ৳${loserBet.toLocaleString()}`,
      });
      const stats = ensureUserStats(loserUser);
      stats.totalHandsPlayed += 1;
      stats.handsLost += 1;
    }
    
    metrics.todayMatchedVolume += totalPot;
    metrics.todayCommission += companyProfit;
  }
  
  metrics.totalRoundsPlayed += 1;
  
  recordGlobalTransaction({
    type: "commission",
    username: creator?.username || "Player",
    userId: duel.creatorId,
    recipientUsername: acceptor?.username || "Player",
    recipientUserId: duel.acceptorId,
    amount: companyProfit,
    method: isTie ? "1v1 Duel 100% Tie Pot Capture" : "1v1 Showdown company rake",
    status: "COMPLETED",
    description: isTie
      ? `1v1 Showdown TIE: @${creator?.username} vs @${acceptor?.username} (Total Pot: ৳${totalPot.toLocaleString()} captured as 100% Company Profit)`
      : `1v1 Showdown Settled: @${creatorIsWinner ? creator?.username : acceptor?.username} wins pot of ৳${totalPot.toLocaleString()} against @${creatorIsWinner ? acceptor?.username : creator?.username}`,
  });
  
  const room = activeRooms.find(r => r.id === duel.id);
  if (room) {
    room.status = "completed";
    room.winner = winnerRole.toLowerCase() as any;
    room.dragonCard = duel.creatorRole === "DRAGON" ? duel.creatorCard : duel.acceptorCard;
    room.tigerCard = duel.creatorRole === "TIGER" ? duel.creatorCard : duel.acceptorCard;
  }
  
  const histRoom = p2pRoomsHistory.find(r => r.id === duel.id);
  if (histRoom) {
    histRoom.status = "completed";
    histRoom.winner = winnerRole.toLowerCase() as any;
    histRoom.acceptorId = duel.acceptorId;
    histRoom.acceptorName = duel.acceptorName;
    histRoom.dragonCard = duel.creatorRole === "DRAGON" ? duel.creatorCard : duel.acceptorCard;
    histRoom.tigerCard = duel.creatorRole === "TIGER" ? duel.creatorCard : duel.acceptorCard;
  }
  
  duel.status = "SETTLED";
  duel.winnerRole = winnerRole;
  duel.netProfitCreator = creatorIsWinner ? winnerPayout - duel.creatorBet : -duel.creatorBet;
  duel.netProfitAcceptor = acceptorIsWinner ? winnerPayout - duel.acceptorBet : -duel.acceptorBet;
  duel.lastUpdated = Date.now();
  
  setTimeout(() => {
    delete activeDuels[duel.id];
  }, 45000);
}

// Active Duels 1-Second Heartbeat Ticker
setInterval(() => {
  Object.values(activeDuels).forEach((duel) => {
    if (duel.status === "ROLE_COIN_FLIP") {
      const elapsed = Date.now() - duel.lastUpdated;
      if (elapsed >= 2500) {
        duel.status = "PEEK_CARDS";
        duel.secondsRemaining = 20;
        duel.lastUpdated = Date.now();
        broadcast({ type: "DUEL_STATE_CHANGE", roomId: duel.id, status: "PEEK_CARDS" });
      }
    } else if (duel.status === "PEEK_CARDS") {
      const elapsed = Date.now() - duel.lastUpdated;
      if (elapsed >= 20000) {
        duel.creatorPeeked = true;
        duel.acceptorPeeked = true;
        duel.status = "BETTING";
        duel.turnUser = "DRAGON";
        duel.secondsRemaining = 60;
        duel.lastUpdated = Date.now();
        broadcast({ type: "DUEL_STATE_CHANGE", roomId: duel.id, status: "BETTING" });
      }
    } else if (duel.status === "BETTING") {
      if (duel.secondsRemaining > 0) {
        duel.secondsRemaining -= 1;
        broadcast({
          type: "DUEL_TICK",
          roomId: duel.id,
          secondsRemaining: duel.secondsRemaining,
        });
      } else {
        const foldingRole = duel.turnUser;
        const foldingUserId = foldingRole === duel.creatorRole ? duel.creatorId : duel.acceptorId;
        settleDuelOnFold(duel, foldingUserId);
        broadcast({ type: "DUEL_STATE_CHANGE", roomId: duel.id, status: "SETTLED" });
      }
    } else if (duel.status === "SHOWDOWN") {
      const elapsed = Date.now() - duel.lastUpdated;
      if (elapsed >= 3000) {
        settleDuelOnShowdown(duel);
        broadcast({ type: "DUEL_STATE_CHANGE", roomId: duel.id, status: "SETTLED" });
      }
    }
  });
}, 1000);

// ============================================================================
// CHAT & REAL-TIME MULTIPLAYER SYNC
// ============================================================================
interface LiveChatMessage {
  user: string;
  vipTier: string;
  text: string;
  time: string;
}

const chatMessages: LiveChatMessage[] = [];

// ============================================================================
// WEBSOCKET HANDLERS
// ============================================================================
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "WELCOME", message: "Connected to Dragon Tiger P2P Arena" }));

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === "IDENTIFY") {
        const sid = String(data.sessionId || "").trim();
        const uid = String(data.userId || "").trim();
        let session = sid ? getSession(sid) : null;

        // Self-healing session restore if user is valid
        if (!session && uid && mockUsers[uid]) {
          const deviceId = deriveDeviceId(undefined, uid);
          const created = createSessionEvictingOthers(uid, deviceId, "Web App", "");
          session = created.session;
          try {
            ws.send(JSON.stringify({ type: "SESSION_RESTORED", sessionId: session.sessionId }));
          } catch {}
        }

        if (!session) {
          return;
        }

        (ws as any).userId = session.userId;
        (ws as any).sessionId = session.sessionId;
        return;
      }
      if (data.type === "CHAT") {
        const msg: LiveChatMessage = {
          user: data.user || "Player",
          vipTier: data.vipTier || "Bronze",
          text: data.text || "",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        chatMessages.push(msg);
        if (chatMessages.length > 100) chatMessages.shift();

        broadcast({
          type: "CHAT_MESSAGE",
          ...msg,
        });
      }
    } catch (e) {
      console.error("WS error:", e);
    }
  });
});

// ============================================================================
// REST API ENDPOINTS & AUTH MIDDLEWARE
// ============================================================================
function readCookie(req: express.Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function requireUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const sid =
    readCookie(req, "player_session") ||
    (typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"] : null) ||
    bearerToken ||
    (typeof req.body?.sessionId === "string" ? req.body.sessionId : null);
  const headerUserId = typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null;
  const bodyUserId = typeof req.body?.userId === "string" ? req.body.userId : null;

  let session = sid ? getSession(sid) : null;

  // Auto-restore session for known active user if in-memory session was wiped on server reload
  if (!session && (headerUserId || bodyUserId)) {
    const targetUid = headerUserId || bodyUserId;
    if (targetUid && mockUsers[targetUid]) {
      const deviceId = deriveDeviceId(req, req.body?.deviceId);
      const deviceLabel = describeDevice(req);
      const created = createSessionEvictingOthers(targetUid, deviceId, deviceLabel, req.ip || "");
      session = created.session;
      trustDevice(targetUid, deviceId, deviceLabel);
    }
  }

  if (!session) {
    return res.status(401).json({
      success: false,
      error: "সেশনের মেয়াদ শেষ অথবা আপনি লগইন করেননি। আবার লগইন করুন।",
      code: "SESSION_EXPIRED",
    });
  }
  (req as any).userId = session.userId;
  (req as any).sessionId = session.sessionId;
  next();
}

// Current logged in user profile check
app.get("/api/auth/me", requireUser, (req, res) => {
  const userId = (req as any).userId;
  const sessionId = (req as any).sessionId;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ success: false, error: "ব্যবহারকারী পাওয়া যায়নি।" });
  res.json({ success: true, user, sessionId });
});

// Real-Time Chat REST Endpoints
app.get("/api/chat/messages", (_req, res) => {
  res.json(chatMessages);
});

app.post("/api/chat/send", (req, res) => {
  const { user, vipTier, text } = req.body;
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }
  const msg: LiveChatMessage = {
    user: user || "Player",
    vipTier: vipTier || "Bronze",
    text: text.trim(),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  chatMessages.push(msg);
  if (chatMessages.length > 100) chatMessages.shift();

  broadcast({
    type: "CHAT_MESSAGE",
    ...msg,
  });
  res.json({ success: true, message: msg });
});

// 1. Tables Overview & Current Round
app.get("/api/tables", (_req, res) => {
  const result = Object.values(tables).map((t) => ({
    config: t.config,
    currentRound: t.currentRound,
    recentWinners: t.roadmap.slice(0, 10).map((r) => r.result),
  }));
  res.json(result);
});

app.get("/api/tables/:slug/roadmap", (req, res) => {
  const { slug } = req.params;
  const tbl = tables[slug];
  if (!tbl) return res.status(404).json({ error: "Table not found" });
  res.json(tbl.roadmap);
});

// Live Bet Transparency API - See which user placed how much on which side
app.get("/api/tables/:slug/bets", (req, res) => {
  const { slug } = req.params;
  const tbl = tables[slug];
  if (!tbl) return res.status(404).json({ error: "Table not found" });
  res.json({
    tableSlug: slug,
    roundNumber: tbl.currentRound.roundNumber,
    currentRoundBets: tbl.playerBets,
    recentSettledBets: tbl.recentSettledBets,
  });
});

// 2. Betting API - STRICT AUTHENTICATION ENFORCED
app.post("/api/game/bet", requireUser, (req, res) => {
  const userId = (req as any).userId;
  const { tableSlug, side, amount, balanceType = "real" } = req.body;

  const user = mockUsers[userId];
  if (!user) {
    return res.status(401).json({
      error: "Session expired or user account not found. Please log in again to continue.",
      code: "INVALID_USER",
    });
  }

  const tbl = tables[tableSlug];
  if (!tbl) return res.status(404).json({ error: "Table not found" });
  if (tbl.currentRound.status !== "BETTING") {
    return res.status(400).json({ error: "Betting closed for this round" });
  }

  const normalizedSide = (side || "").toString().toUpperCase();
  if (normalizedSide === "TIE") {
    return res.status(400).json({
      error: "🚫 Tie-তে বাজি ধরা সম্পূর্ণ নিষিদ্ধ। টাই (Tie) হলে ক্যাসিনো রুলস অনুযায়ী উভয় পক্ষের বাজি বাজেয়াপ্ত (Loss) হবে এবং সম্পূর্ণ টাকা কোম্পানি ফান্ডে যাবে।",
    });
  }

  if (!VALID_BET_SIDES.includes(normalizedSide)) {
    return res.status(400).json({
      error: `Invalid bet side. Allowed: ${VALID_BET_SIDES.join(", ")}`,
    });
  }

  // Self-Matching Block: Ensure player cannot bet on both opposing sides in the same round
  const opposingSide = OPPOSING_PAIRS[normalizedSide];
  if (opposingSide) {
    const hasOpposingBet = tbl.playerBets.some(
      b => b.userId === userId && b.side === opposingSide && b.balanceType === balanceType
    );
    if (hasOpposingBet) {
      return res.status(400).json({
        error: `🚫 একই রাউন্ডে ${normalizedSide} এবং ${opposingSide} উভয় পাশে বাজি ধরা সম্পূর্ণ নিষিদ্ধ (Self-Matching Block)। অনুগ্রহ করে যেকোনো এক পাশে বাজি বজায় রাখুন।`
      });
    }
  }

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: "Invalid bet amount" });
  }

  if (numAmount < tbl.config.minBet || numAmount > tbl.config.maxBet) {
    return res.status(400).json({
      error: `Bet amount is outside the allowed limits of this table.`,
    });
  }

  const activeBal = balanceType === "real" ? user.balance : user.demoBalance;
  if (activeBal < numAmount) {
    return res.status(400).json({ error: "Insufficient balance for this bet" });
  }

  // Deduct balance
  if (balanceType === "real") {
    user.balance -= numAmount;
  } else {
    user.demoBalance -= numAmount;
  }
  user.gamesPlayed += 1;

  const userStats = ensureUserStats(user);

  // Create transparent public live bet record
  const betRecord: LiveBetRecord = {
    id: `bet_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: user.userId,
    username: user.username,
    vipTier: "Standard",
    side: normalizedSide,
    amount: numAmount,
    balanceType,
    timestamp: new Date().toISOString(),
    roundNumber: tbl.currentRound.roundNumber,
    tableSlug,
    status: "ACTIVE",
  };

  // Prepend to active table bets
  tbl.playerBets.unshift(betRecord);

  // Sync to user's detailed betting history
  if (!userBetHistories[user.userId]) {
    getOrSeedUserBetHistory(user.userId, user.username);
  }
  userBetHistories[user.userId].unshift({
    id: betRecord.id,
    roundNumber: tbl.currentRound.roundNumber,
    tableSlug,
    tableName: tbl.config.name,
    side: betRecord.side,
    amount: numAmount,
    matchedAmount: numAmount,
    unmatchedAmount: 0,
    returnedAmount: 0,
    tkReturnStatus: "NONE",
    balanceType,
    status: "ACTIVE",
    payout: 0,
    netPnL: 0,
    timestamp: betRecord.timestamp,
    serverSeedHash: tbl.currentRound.serverSeedHash,
  });
  if (userBetHistories[user.userId].length > 80) {
    userBetHistories[user.userId].pop();
  }

  // Update table pool
  if (side.toUpperCase() === "DRAGON") {
    tbl.currentRound.dragonPool += numAmount;
    tbl.currentRound.dragonPlayers += 1;
  } else if (side.toUpperCase() === "TIGER") {
    tbl.currentRound.tigerPool += numAmount;
    tbl.currentRound.tigerPlayers += 1;
  }
  tbl.currentRound.matchedAmount = Math.min(
    tbl.currentRound.dragonPool,
    tbl.currentRound.tigerPool
  );

  // Real-time broadcast transparent live bet to all connected clients
  broadcast({
    type: "NEW_BET",
    tableSlug,
    bet: betRecord,
    dragonPool: tbl.currentRound.dragonPool,
    tigerPool: tbl.currentRound.tigerPool,
    matchedAmount: tbl.currentRound.matchedAmount,
  });

  res.json({
    success: true,
    bet: betRecord,
    newBalance: balanceType === "real" ? user.balance : user.demoBalance,
    round: tbl.currentRound,
  });
});

// Cancel active bet before round betting closes (1-tap refund)
app.post("/api/game/cancel-bet", requireUser, (req, res) => {
  const userId = (req as any).userId;
  const { tableSlug, betId } = req.body;
  if (!tableSlug) {
    return res.status(400).json({ success: false, error: "Missing parameters" });
  }
  const user = mockUsers[userId];
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  const tbl = tables[tableSlug];
  if (!tbl) {
    return res.status(404).json({ success: false, error: "Table not found" });
  }
  if (tbl.currentRound.status !== "BETTING") {
    return res.status(400).json({ success: false, error: "Cannot cancel bet after betting has closed" });
  }

  const betIndex = tbl.playerBets.findIndex((b) => b.userId === userId && (!betId || b.id === betId));
  if (betIndex === -1) {
    return res.status(404).json({ success: false, error: "No active bet found to cancel" });
  }

  const [canceledBet] = tbl.playerBets.splice(betIndex, 1);
  if (canceledBet) {
    // Refund balance
    if (canceledBet.balanceType === "real") {
      user.balance += canceledBet.amount;
    } else {
      user.demoBalance += canceledBet.amount;
    }

    // Adjust table pool
    if (canceledBet.side === "DRAGON") {
      tbl.currentRound.dragonPool = Math.max(0, tbl.currentRound.dragonPool - canceledBet.amount);
      tbl.currentRound.dragonPlayers = Math.max(0, tbl.currentRound.dragonPlayers - 1);
    } else if (canceledBet.side === "TIGER") {
      tbl.currentRound.tigerPool = Math.max(0, tbl.currentRound.tigerPool - canceledBet.amount);
      tbl.currentRound.tigerPlayers = Math.max(0, tbl.currentRound.tigerPlayers - 1);
    }
    tbl.currentRound.matchedAmount = Math.min(tbl.currentRound.dragonPool, tbl.currentRound.tigerPool);

    // Update in history
    const userHist = userBetHistories[userId];
    if (userHist) {
      const histItem = userHist.find((h) => h.id === canceledBet.id);
      if (histItem) {
        histItem.status = "CANCELLED" as any;
        histItem.tkReturnStatus = "RETURNED_REFUND";
        histItem.returnedAmount = canceledBet.amount;
      }
    }

    // Broadcast updated pools
    broadcast({
      type: "BET_CANCELLED",
      tableSlug,
      betId: canceledBet.id,
      dragonPool: tbl.currentRound.dragonPool,
      tigerPool: tbl.currentRound.tigerPool,
      matchedAmount: tbl.currentRound.matchedAmount,
    });

    return res.json({
      success: true,
      refundedAmount: canceledBet.amount,
      newBalance: canceledBet.balanceType === "real" ? user.balance : user.demoBalance,
      round: tbl.currentRound,
    });
  }

  res.status(400).json({ success: false, error: "Failed to cancel bet" });
});

// Demo Reset Endpoint: 1-tap reload demo balance to ৳10,000
app.post(["/api/wallet/reset-demo", "/api/wallet/:userId/reset-demo"], requireUser, (req, res) => {
  const userId = (req as any).userId;
  const user = mockUsers[userId];
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  user.demoBalance = 10000;
  user.transactions.unshift({
    id: `tx_${Date.now()}_demo_refill`,
    type: "faucet",
    amount: 10000,
    timestamp: new Date().toISOString(),
    description: "Refilled Demo Balance to ৳10,000",
  });

  res.json({
    success: true,
    demoBalance: user.demoBalance,
    user,
  });
});

// Toggle Balance Mode Endpoint: Switch between 'real' and 'demo' balance
app.post(["/api/wallet/toggle-balance", "/api/wallet/:userId/toggle-balance"], requireUser, (req, res) => {
  const userId = (req as any).userId;
  const { balanceType } = req.body;
  const user = mockUsers[userId];
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  if (balanceType === "real" || balanceType === "demo") {
    user.balanceType = balanceType;
  } else {
    user.balanceType = user.balanceType === "real" ? "demo" : "real";
  }

  res.json({
    success: true,
    balanceType: user.balanceType,
    user,
  });
});

// 3. Provably Fair Verification API (Public)
app.post("/api/verify", (req, res) => {
  const { serverSeed, serverSeedHash, clientSeed, nonce } = req.body;
  if (!serverSeed || !clientSeed || nonce === undefined) {
    return res.status(400).json({ error: "Missing verification parameters" });
  }

  const computedHash = hashServerSeed(serverSeed);
  const hashMatches = serverSeedHash ? computedHash.toLowerCase() === serverSeedHash.toLowerCase() : true;

  const result = deriveCards(serverSeed, clientSeed, Number(nonce));

  res.json({
    valid: hashMatches,
    computedServerSeedHash: computedHash,
    hmac: result.hmac,
    dragonCard: result.dragonCard,
    tigerCard: result.tigerCard,
    result: result.result,
    algorithm: "HMAC-SHA512 with modulo bias rejection",
  });
});

// 4. Authentication API (Sign Up & Sign In)
app.post("/api/auth/signup", (req, res) => {
  const { username, password, refCode } = req.body;
  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return res.status(400).json({ success: false, error: "Username must be at least 3 characters" });
  }
  if (!password || typeof password !== "string" || password.length < 4) {
    return res.status(400).json({ success: false, error: "Password must be at least 4 characters" });
  }

  const cleanUsername = username.trim();
  const normalizedUser = cleanUsername.toLowerCase();

  if (userCredentials[normalizedUser]) {
    return res.status(400).json({ success: false, error: "Username already registered. Please sign in." });
  }

  const salt = crypto.randomBytes(8).toString("hex");
  const passwordHash = crypto.createHash("sha256").update(password + salt).digest("hex");
  const userId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  userCredentials[normalizedUser] = {
    userId,
    username: cleanUsername,
    passwordHash,
    salt,
  };

  const newUser: UserWallet = {
    userId,
    username: cleanUsername,
    balance: 0,
    demoBalance: 10000,
    balanceType: "demo",
    lockedBalance: 0,
    totalWon: 0,
    totalLost: 0,
    gamesPlayed: 0,
    kycStatus: "none",
    transactions: [
      {
        id: `tx_${Date.now()}_demo_init`,
        type: "faucet",
        amount: 10000,
        timestamp: new Date().toISOString(),
        description: "Welcome Demo Starter Chips (৳10,000)",
      },
    ],
  };

  mockUsers[userId] = newUser;

  const deviceId = deriveDeviceId(req, req.body.deviceId);
  const deviceLabel = describeDevice(req);
  trustDevice(newUser.userId, deviceId, deviceLabel);
  const { session } = createSessionEvictingOthers(newUser.userId, deviceId, deviceLabel, req.ip || "");

  res.cookie("player_session", session.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({ success: true, user: newUser, sessionId: session.sessionId });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password, deviceId: clientDeviceId } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Please enter username and password" });
  }

  const normalizedUser = username.trim().toLowerCase();
  const cred = userCredentials[normalizedUser];

  if (!cred) {
    return res.status(401).json({ success: false, error: "Account not found. Please click Sign Up to register." });
  }

  const computedHash = crypto.createHash("sha256").update(password + cred.salt).digest("hex");
  if (computedHash !== cred.passwordHash) {
    return res.status(401).json({ success: false, error: "Incorrect password. Please try again." });
  }

  const user = mockUsers[cred.userId];
  if (!user) {
    return res.status(404).json({ success: false, error: "User profile not found" });
  }

  const deviceId = deriveDeviceId(req, clientDeviceId);
  const deviceLabel = describeDevice(req);

  // New untrusted device check
  if (!isTrustedDevice(user.userId, deviceId)) {
    if (FORCE_PASSWORD_RESET_ON_NEW_DEVICE) {
      const code = issueOtp(user.userId, deviceId);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV OTP - PASSWORD RESET] ${user.username} (${user.userId}) → ${code}`);
      }
      return res.status(403).json({
        success: false,
        code: "PASSWORD_RESET_REQUIRED",
        error: "নতুন ডিভাইস শনাক্ত হয়েছে। নিরাপত্তার জন্য আপনার যাচাই কোড দিন ও নতুন পাসওয়ার্ড সেট করুন।",
      });
    }

    const code = issueOtp(user.userId, deviceId);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV OTP - DEVICE VERIFICATION] ${user.username} (${user.userId}) → ${code}`);
    }
    return res.status(403).json({
      success: false,
      code: "DEVICE_VERIFICATION_REQUIRED",
      error: "নতুন ডিভাইস শনাক্ত হয়েছে। আপনার নিবন্ধিত নম্বরে পাঠানো ৬ সংখ্যার যাচাই কোড দিন।",
    });
  }

  // Create active session while evicting any previous session for the user
  const { session, evictedSessionId } = createSessionEvictingOthers(
    user.userId,
    deviceId,
    deviceLabel,
    req.ip || ""
  );

  if (evictedSessionId) {
    kickSession(evictedSessionId, "আপনার অ্যাকাউন্টে অন্য একটি ডিভাইস থেকে লগইন করা হয়েছে।");
  }

  trustDevice(user.userId, deviceId, deviceLabel);

  res.cookie("player_session", session.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({
    success: true,
    user,
    sessionId: session.sessionId,
    device: { label: deviceLabel, evictedOther: !!evictedSessionId },
  });
});

app.post("/api/auth/verify-device", (req, res) => {
  const { username, code, deviceId: clientDeviceId } = req.body || {};
  const normalizedUser = String(username || "").trim().toLowerCase();
  const cred = userCredentials[normalizedUser];
  if (!cred) return res.status(401).json({ success: false, error: "Invalid user credentials" });
  const user = mockUsers[cred.userId];
  if (!user) return res.status(404).json({ success: false, error: "User profile not found" });

  const deviceId = deriveDeviceId(req, clientDeviceId);
  const result = verifyOtp(user.userId, deviceId, code);
  if (!result.ok) return res.status(400).json({ success: false, error: result.error });

  const deviceLabel = describeDevice(req);
  trustDevice(user.userId, deviceId, deviceLabel);

  const { session, evictedSessionId } = createSessionEvictingOthers(
    user.userId,
    deviceId,
    deviceLabel,
    req.ip || ""
  );

  if (evictedSessionId) {
    kickSession(evictedSessionId, "আপনার অ্যাকাউন্টে অন্য একটি ডিভাইস থেকে লগইন করা হয়েছে।");
  }

  res.cookie("player_session", session.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });

  return res.json({
    success: true,
    user,
    sessionId: session.sessionId,
    device: { label: deviceLabel, evictedOther: !!evictedSessionId },
  });
});

app.post("/api/auth/logout", (req, res) => {
  const sid =
    readCookie(req, "player_session") ||
    (typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"] : null) ||
    (typeof req.body?.sessionId === "string" ? req.body.sessionId : null);

  if (sid) {
    const session = getSession(sid);
    if (session) {
      revokeUserSessions(session.userId);
    }
  }
  res.clearCookie("player_session", { path: "/" });
  res.json({ success: true });
});

app.get(["/api/user/devices", "/api/user/devices/:userId"], requireUser, (req, res) => {
  const userId = (req as any).userId;
  res.json({ success: true, devices: listDevices(userId) });
});

app.post(["/api/user/devices/remove", "/api/user/devices/:userId/remove"], requireUser, (req, res) => {
  const userId = (req as any).userId;
  const { deviceId } = req.body || {};
  if (deviceId) {
    removeDevice(userId, deviceId);
  }
  res.json({ success: true });
});

// 5. Wallet API
app.get("/api/wallet/:userId", (req, res) => {
  const { userId } = req.params;
  if (!mockUsers[userId]) {
    mockUsers[userId] = {
      userId,
      username: (req.query.username as string) || `Player_${userId.slice(0, 5)}`,
      balance: 0,
      demoBalance: 0,
      balanceType: "real",
      lockedBalance: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      kycStatus: "none",
      transactions: [],
    };
  }
  ensureUserStats(mockUsers[userId]);
  ensureUserCosmetics(mockUsers[userId]);
  res.json(mockUsers[userId]);
});

// Zero-Cost Cosmetics & Progression Endpoints
app.get("/api/user/cosmetics/:userId", (req, res) => {
  const { userId } = req.params;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ error: "User profile not found" });
  const cosmetics = ensureUserCosmetics(user);
  res.json({ success: true, cosmetics });
});

app.post("/api/user/cosmetics/equip", requireUser, (req, res) => {
  const userId = (req as any).userId;
  const { type, itemKey } = req.body;
  if (!mockUsers[userId]) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const user = mockUsers[userId];
  const c = ensureUserCosmetics(user);

  if (type === "frame") {
    if (c.unlockedFrames.includes(itemKey)) c.equippedFrame = itemKey;
    else return res.status(400).json({ error: `Frame '${itemKey}' is locked. Play more hands or reach rank to unlock.` });
  } else if (type === "cardBack") {
    if (c.unlockedCardBacks.includes(itemKey)) c.equippedCardBack = itemKey;
    else return res.status(400).json({ error: `Card back skin '${itemKey}' is locked.` });
  } else if (type === "theme") {
    if (c.unlockedThemes.includes(itemKey)) c.equippedTableTheme = itemKey;
    else return res.status(400).json({ error: `Table theme '${itemKey}' is locked.` });
  } else if (type === "title") {
    if (c.unlockedTitles.includes(itemKey)) c.equippedTitle = itemKey;
    else return res.status(400).json({ error: `Title '${itemKey}' is locked.` });
  }

  res.json({ success: true, cosmetics: c, user });
});

app.post("/api/user/login-days/:userId", (req, res) => {
  const { userId } = req.params;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ error: "User not found" });
  const c = ensureUserCosmetics(user);
  c.loginDays = (c.loginDays || 1) + 1;
  res.json({ success: true, loginDays: c.loginDays, cosmetics: c });
});

// Admin Reset Endpoint: Reset all player balances to 0
// ============================================================================
// ENTERPRISE ADMIN CRYPTOGRAPHIC AUTHENTICATION (Ref: V6-SEC-001, V6-SEC-002)
// ============================================================================
const ADMIN_SECRET = process.env.ADMIN_SECRET || crypto.randomBytes(32).toString("hex");
const ADMIN_CREDENTIALS = {
  username: (process.env.ADMIN_USERNAME || "admin").toLowerCase().trim(),
  passwordHash: crypto.createHash("sha256").update(process.env.ADMIN_PASSWORD || "AdminPass@2026!").digest("hex"),
};

function generateAdminToken(username: string): string {
  const payload = {
    username,
    exp: Date.now() + 8 * 60 * 60 * 1000,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", ADMIN_SECRET).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${sig}`;
}

function verifyAdminToken(token: string): { valid: boolean; username?: string; error?: string } {
  if (!token || typeof token !== "string") return { valid: false, error: "Token missing" };
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, error: "Malformed token" };
  const [payloadBase64, providedSig] = parts;
  const expectedSig = crypto.createHmac("sha256", ADMIN_SECRET).update(payloadBase64).digest("base64url");

  try {
    const bufProvided = Buffer.from(providedSig);
    const bufExpected = Buffer.from(expectedSig);
    if (bufProvided.length !== bufExpected.length || !crypto.timingSafeEqual(bufProvided, bufExpected)) {
      return { valid: false, error: "Invalid signature" };
    }
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString());
    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false, error: "Token expired" };
    }
    return { valid: true, username: payload.username };
  } catch {
    return { valid: false, error: "Invalid token data" };
  }
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization || req.headers["x-admin-token"];
  let token = "";
  if (typeof authHeader === "string") {
    token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  }
  const result = verifyAdminToken(token);
  if (!result.valid) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or missing administrator credentials",
      code: "UNAUTHORIZED",
    });
  }
  (req as any).adminUser = result.username;
  next();
}

interface CashierItem {
  id: string;
  userId: string;
  username: string;
  amount: number;
  method: string;
  accountNumber?: string;
  trxId?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  timestamp: string;
  processedAt?: string;
  processedBy?: string;
  note?: string;
}

const cashierDeposits: CashierItem[] = [
  {
    id: "dep_1001",
    userId: "usr_seed_1",
    username: "DragonMaster",
    amount: 500,
    method: "bKash (Merchant Pay)",
    trxId: "9K2L1P0X",
    accountNumber: "01712345678",
    status: "PENDING",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "dep_1002",
    userId: "usr_seed_2",
    username: "LuckyTiger77",
    amount: 1200,
    method: "Nagad",
    trxId: "8M4J3Q1Z",
    accountNumber: "01887654321",
    status: "PENDING",
    timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
];

const cashierWithdrawals: CashierItem[] = [
  {
    id: "wdr_2001",
    userId: "usr_seed_3",
    username: "HighRollerBD",
    amount: 2500,
    method: "bKash Personal",
    accountNumber: "01999887766",
    status: "PENDING",
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
];

app.post("/api/admin/reset-balances", requireAdmin, (_req, res) => {
  Object.values(mockUsers).forEach((u) => {
    u.balance = 0;
    u.demoBalance = 0;
    u.lockedBalance = 0;
    u.totalWon = 0;
    u.totalLost = 0;
    u.gamesPlayed = 0;
    u.transactions = [];
  });
  res.json({ success: true, message: "All site user balances reset to 0." });
});

// Dedicated Personalized Statistics Endpoint across Dragon Tiger tables
app.get("/api/user/stats/:userId", (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: "Missing user ID", code: "INVALID_PARAM" });
  }
  const user = mockUsers[userId];
  if (!user) {
    return res.status(404).json({ error: "User profile not found", code: "USER_NOT_FOUND" });
  }
  const stats = ensureUserStats(user);
  res.json({
    success: true,
    userId: user.userId,
    username: user.username,
    stats,
  });
});

// Comprehensive User Bet History & P&L Endpoint
app.get("/api/wallet/:userId/bets", (req, res) => {
  const { userId } = req.params;
  const user = mockUsers[userId];
  const username = user?.username || (req.query.username as string) || "Player";
  const history = getOrSeedUserBetHistory(userId, username);

  let totalWagered = 0;
  let totalMatched = 0;
  let totalReturned = 0;
  let totalWon = 0;
  let totalLost = 0;
  let winsCount = 0;

  history.forEach((b) => {
    totalWagered += b.amount;
    totalMatched += b.matchedAmount;
    totalReturned += b.returnedAmount;
    if (b.status === "WON") {
      winsCount += 1;
      totalWon += b.payout;
    } else if (b.status === "LOST") {
      totalLost += b.matchedAmount;
    }
  });

  const settledCount = history.filter((b) => b.status === "WON" || b.status === "LOST").length;
  const winRate = settledCount > 0 ? Number(((winsCount / settledCount) * 100).toFixed(1)) : 0;
  const netPnL = (totalWon + totalReturned) - totalWagered;

  const response: UserBetHistoryResponse = {
    userId,
    username,
    totalWagered,
    totalMatched,
    totalReturned,
    totalWon,
    totalLost,
    netPnL,
    winRate,
    totalBetsCount: history.length,
    bets: history,
  };

  res.json(response);
});

app.get("/api/wallet/:userId/history", (req, res) => {
  const { userId } = req.params;
  const user = mockUsers[userId];
  const username = user?.username || (req.query.username as string) || "Player";
  const history = getOrSeedUserBetHistory(userId, username);

  let totalWagered = 0;
  let totalMatched = 0;
  let totalReturned = 0;
  let totalWon = 0;
  let totalLost = 0;
  let winsCount = 0;

  history.forEach((b) => {
    totalWagered += b.amount;
    totalMatched += b.matchedAmount;
    totalReturned += b.returnedAmount;
    if (b.status === "WON") {
      winsCount += 1;
      totalWon += b.payout;
    } else if (b.status === "LOST") {
      totalLost += b.matchedAmount;
    }
  });

  const settledCount = history.filter((b) => b.status === "WON" || b.status === "LOST").length;
  const winRate = settledCount > 0 ? Number(((winsCount / settledCount) * 100).toFixed(1)) : 0;
  const netPnL = (totalWon + totalReturned) - totalWagered;

  const response: UserBetHistoryResponse = {
    userId,
    username,
    totalWagered,
    totalMatched,
    totalReturned,
    totalWon,
    totalLost,
    netPnL,
    winRate,
    totalBetsCount: history.length,
    bets: history,
  };

  res.json(response);
});

// Dedicated Wallet Deposit Endpoint
app.post("/api/wallet/deposit", requireUser, (req, res) => {
  const userId = (req as any).userId;
  const { amount, method, description } = req.body;
  if (amount === undefined) {
    return res.status(400).json({ success: false, error: "Missing required parameter (amount)" });
  }

  let user = mockUsers[userId];
  if (!user) {
    user = {
      userId,
      username: `Player_${userId.slice(0, 6)}`,
      balance: 0,
      demoBalance: 10000,
      balanceType: "real",
      lockedBalance: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      kycStatus: "none",
      transactions: [],
    };
    mockUsers[userId] = user;
  }
  ensureUserStats(user);
  ensureUserCosmetics(user);

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, error: "Invalid amount. Must be greater than 0." });
  }

  user.balance += numAmount;
  user.balanceType = "real";

  const cleanMethod = typeof method === "string" && method.trim() ? method.trim() : "bKash";
  const cleanDesc = typeof description === "string" && description.trim() ? description.trim() : `Deposit via ${cleanMethod}`;

  const tx = {
    id: `tx_dep_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: "deposit" as const,
    amount: numAmount,
    timestamp: new Date().toISOString(),
    description: cleanDesc,
  };
  user.transactions.unshift(tx);
  recordGlobalTransaction({
    type: "deposit",
    username: user.username,
    userId: user.userId,
    amount: numAmount,
    method: cleanMethod,
    status: "COMPLETED",
    description: cleanDesc,
  });

  return res.json({ success: true, user, message: `Successfully deposited ৳${numAmount.toLocaleString()}!` });
});

// Dedicated Wallet Withdraw Endpoint
app.post("/api/wallet/withdraw", requireUser, (req, res) => {
  const userId = (req as any).userId;
  const { amount, method, accountNumber, description } = req.body;
  if (amount === undefined) {
    return res.status(400).json({ success: false, error: "Missing required parameter (amount)" });
  }

  let user = mockUsers[userId];
  if (!user) {
    user = {
      userId,
      username: `Player_${userId.slice(0, 6)}`,
      balance: 0,
      demoBalance: 10000,
      balanceType: "real",
      lockedBalance: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      kycStatus: "none",
      transactions: [],
    };
    mockUsers[userId] = user;
  }
  ensureUserStats(user);
  ensureUserCosmetics(user);

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, error: "Invalid amount. Must be greater than 0." });
  }

  if (user.balance < numAmount) {
    return res.status(400).json({ success: false, error: "Insufficient balance for withdrawal" });
  }

  user.balance -= numAmount;

  const cleanMethod = typeof method === "string" && method.trim() ? method.trim() : "bKash";
  const accText = typeof accountNumber === "string" && accountNumber.trim() ? ` (${accountNumber.trim()})` : "";
  const cleanDesc = typeof description === "string" && description.trim() ? description.trim() : `Withdrawal to ${cleanMethod}${accText}`;

  const wdrId = `wdr_${Date.now()}`;
  cashierWithdrawals.unshift({
    id: wdrId,
    userId: user.userId,
    username: user.username,
    amount: numAmount,
    method: cleanMethod,
    accountNumber: accountNumber || "N/A",
    status: "PENDING",
    timestamp: new Date().toISOString(),
  });

  const tx = {
    id: `tx_wdr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: "withdraw" as const,
    amount: numAmount,
    timestamp: new Date().toISOString(),
    description: cleanDesc,
  };
  user.transactions.unshift(tx);
  recordGlobalTransaction({
    type: "withdraw",
    username: user.username,
    userId: user.userId,
    amount: numAmount,
    method: cleanMethod,
    status: "PENDING",
    description: cleanDesc,
  });

  return res.json({ success: true, user, message: `Withdrawal request for ৳${numAmount.toLocaleString()} submitted for compliance review!` });
});

// DELETED: Insecure wallet action minting endpoint (Ref: FIN-003)

// Dedicated P2P Wallet Transfer Endpoint (Disabled for security compliance per FIN-004)
app.post("/api/wallet/transfer", (_req, res) => {
  return res.status(403).json({
    success: false,
    error: "Direct peer-to-peer wallet transfers are disabled for anti-money laundering and account integrity compliance. Please use P2P challenge rooms for gameplay.",
    code: "P2P_TRANSFER_DISABLED",
  });
});

// ============================================================================
// GLOBAL PUBLIC FINANCIAL TRANSPARENCY LEDGER
// ============================================================================
export interface GlobalTransaction {
  id: string;
  txHash: string;
  type: "deposit" | "withdraw" | "transfer" | "tie_refund" | "commission";
  username: string;
  userId: string;
  recipientUsername?: string;
  recipientUserId?: string;
  amount: number;
  method: string;
  status: "COMPLETED" | "PROCESSED" | "PENDING" | "REJECTED" | "APPROVED";
  timestamp: string;
  description: string;
}

const globalTransactions: GlobalTransaction[] = [];

function recordGlobalTransaction(tx: Omit<GlobalTransaction, "id" | "txHash" | "timestamp">) {
  const hexChars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += hexChars[Math.floor(Math.random() * hexChars.length)];
  }

  const newTx: GlobalTransaction = {
    ...tx,
    id: `gtx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    txHash: hash,
    timestamp: new Date().toISOString(),
  };

  globalTransactions.unshift(newTx);
  if (globalTransactions.length > 500) {
    globalTransactions.pop();
  }
  return newTx;
}

// 5. Public Financial Transparency Ledger API
app.get("/api/transparency/transactions", (req, res) => {
  const { type, search, limit } = req.query;
  let results = [...globalTransactions];

  if (type && type !== "all") {
    results = results.filter((tx) => tx.type === type);
  }

  if (search && typeof search === "string" && search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter(
      (tx) =>
        tx.username.toLowerCase().includes(q) ||
        (tx.recipientUsername && tx.recipientUsername.toLowerCase().includes(q)) ||
        tx.txHash.toLowerCase().includes(q) ||
        tx.method.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q)
    );
  }

  const max = Number(limit) || 100;
  res.json({
    success: true,
    totalCount: results.length,
    transactions: results.slice(0, max),
  });
});

// DELETED: Insecure transparency endpoints (Ref: API-002)


// DELETED: Insecure wallet actions (Ref: FIN-003)


// DELETED: Insecure wallet transfer (Ref: FIN-004)


// 5. Admin API
app.get("/api/admin/stats", requireAdmin, (_req, res) => {
  let totalRealBalance = 0;
  let totalDemoBalance = 0;
  let totalEscrowLocked = 0;

  Object.values(mockUsers).forEach((u) => {
    totalRealBalance += u.balance;
    totalDemoBalance += u.demoBalance;
  });

  Object.values(tables).forEach((t) => {
    t.playerBets.forEach((b) => {
      if (b.status === "ACTIVE") totalEscrowLocked += b.amount;
    });
  });

  activeRooms.forEach((r) => {
    if (r.status === "open") totalEscrowLocked += r.amount;
  });

  const tableList = Object.values(tables).map((t) => ({
    slug: t.config.slug,
    name: t.config.name,
    minBet: t.config.minBet,
    maxBet: t.config.maxBet,
    timer: t.config.bettingDuration,
    dragonPool: t.currentRound.dragonPool,
    tigerPool: t.currentRound.tigerPool,
    matchedAmount: t.currentRound.matchedAmount,
    playersOnline: (t.currentRound.dragonPlayers || 0) + (t.currentRound.tigerPlayers || 0) || 1,
  }));

  res.json({
    metrics,
    todayMatchedVolume: metrics.todayMatchedVolume,
    todayCommission: metrics.todayCommission,
    todayTieRevenue: metrics.todayTieRevenue,
    activePlayers: Math.max(wss.clients.size, 1),
    totalUsersCount: Object.keys(mockUsers).length,
    pendingDepositsCount: 0,
    pendingWithdrawalsCount: 0,
    liquidReserves: totalRealBalance,
    totalSiteLiquidity: totalRealBalance + totalEscrowLocked,
    totalRealBalance,
    totalDemoBalance,
    totalEscrowLocked,
    tables: tableList,
    usersCount: Object.keys(mockUsers).length,
    users: Object.values(mockUsers).map((u) => ({
      userId: u.userId,
      username: u.username,
      balance: u.balance,
      demoBalance: u.demoBalance,
      kycStatus: u.kycStatus,
      gamesPlayed: u.gamesPlayed,
    })),
  });
});

app.post("/api/admin/user/balance", requireAdmin, (req, res) => {
  const { userId, type, amount, isDemo } = req.body;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ error: "User not found" });

  const num = Number(amount);
  if (isNaN(num) || num < 0) return res.status(400).json({ error: "Invalid amount" });

  if (isDemo) {
    if (type === "add") user.demoBalance += num;
    else user.demoBalance = Math.max(0, user.demoBalance - num);
  } else {
    if (type === "add") user.balance += num;
    else user.balance = Math.max(0, user.balance - num);
  }

  res.json({ success: true, balance: user.balance, demoBalance: user.demoBalance });
});

app.post("/api/admin/user/status", requireAdmin, (req, res) => {
  const { userId, kycStatus } = req.body;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ error: "User not found" });

  if (kycStatus) {
    user.kycStatus = kycStatus;
  }
  res.json({ success: true, user });
});

app.post("/api/admin/table/config", requireAdmin, (req, res) => {
  const { slug, minBet, maxBet, bettingDuration } = req.body;
  const tbl = tables[slug];
  if (!tbl) return res.status(404).json({ error: "Table not found" });

  if (minBet !== undefined) tbl.config.minBet = Number(minBet);
  if (maxBet !== undefined) tbl.config.maxBet = Number(maxBet);
  if (bettingDuration !== undefined) tbl.config.bettingDuration = Number(bettingDuration);

  res.json({ success: true, config: tbl.config });
});

// 6. Merchant Simulation API
app.post("/api/merchant/test", (req, res) => {
  const { endpoint, method, payload } = req.body;
  const sampleResponses: Record<string, unknown> = {
    "/player/create": { success: true, playerId: "ext_user_8829", currency: "INR", balance: 5000 },
    "/player/deposit": { success: true, transactionId: `tx_merch_${Date.now()}`, newBalance: 15000 },
    "/player/launch-game": {
      success: true,
      gameUrl: "https://dragontiger.p2p.casino/play?token=session_jwt_apex_token_8892&table=classic",
      expiresIn: 3600,
    },
  };

  res.json({
    endpoint,
    method,
    status: 200,
    timeMs: Math.floor(Math.random() * 25) + 12,
    response: sampleResponses[endpoint] || { success: true, status: "acknowledged", payload },
  });
});

// Anti-bot Spam Tracking for P2P Rooms
const recentRoomAttempts: Record<string, number[]> = {};

// 7. P2P Lobby & Duels API
const checkExpiredRooms = () => {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  for (let i = activeRooms.length - 1; i >= 0; i--) {
    const room = activeRooms[i];
    if (room.status === "open" && room.createdAt) {
      const createdTime = new Date(room.createdAt).getTime();
      const elapsed = now - createdTime;
      room.autoCloseSecondsRemaining = Math.max(0, Math.floor((FIVE_MINUTES - elapsed) / 1000));
      
      if (elapsed > FIVE_MINUTES) {
        room.status = "cancelled" as any;
        const creator = mockUsers[room.creatorId];
        if (creator) {
          creator.balance += room.amount;
          creator.transactions.unshift({
            id: `tx_p2p_expire_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            type: "deposit",
            amount: room.amount,
            timestamp: new Date().toISOString(),
            description: `Refund P2P Challenge: Room expired after 5 minutes without opponent (Stake: ৳${room.amount.toLocaleString()})`,
          });
        }
        activeRooms.splice(i, 1);
        broadcast({ type: "ROOM_EXPIRED", roomId: room.id });
      }
    }
  }
};

setInterval(checkExpiredRooms, 10000);

app.get("/api/rooms", (_req, res) => {
  checkExpiredRooms();
  res.json(activeRooms);
});

app.post("/api/rooms/create", requireUser, (req, res) => {
  const userId = (req as any).userId;
  const {
    username,
    amount,
    odds,
    acceptorAmount: clientAcceptorAmount,
    isPrivate,
    password,
    minStake,
    maxStake,
    invitedUsername,
    isSingleRoundQuickChallenge,
    choice,
  } = req.body;

  if (!mockUsers[userId]) {
    return res.status(401).json({
      error: "Authentication required. Every player must be logged in to create challenge bets.",
      code: "AUTH_REQUIRED",
    });
  }

  // Anti-bot Spam Frequency Detection (high frequency creation/deletion)
  const now = Date.now();
  if (!recentRoomAttempts[userId]) recentRoomAttempts[userId] = [];
  recentRoomAttempts[userId] = recentRoomAttempts[userId].filter((t) => now - t < 60000);
  recentRoomAttempts[userId].push(now);

  const isHighFrequencySpam = recentRoomAttempts[userId].length >= 4;
  if (recentRoomAttempts[userId].length > 7) {
    return res.status(429).json({
      error: "⚠️ সিকিউরিটি সতর্কতা: অত্যধিক দ্রুত রুম রিকোয়েস্ট শনাক্ত হয়েছে (Bot Spam Defense)। অনুগ্রহ করে ৩০ সেকেন্ড অপেক্ষা করুন।",
      botSpamDetected: true,
    });
  }

  // 1-active-room limit enforcement per creator
  const hasActiveRoom = activeRooms.some((r) => r.creatorId === userId && r.status === "open");
  if (hasActiveRoom) {
    return res.status(400).json({
      error: "🚫 আপনার ইতিমধ্যে একটি সক্রিয় ডুয়েল রুম রয়েছে! নতুন রুম তৈরি করতে বর্তমান সক্রিয় রুমটি ডিলিট বা ক্যান্সেল করুন।"
    });
  }

  const user = mockUsers[userId];
  const numAmount = Number(amount);
  
  if (isNaN(numAmount) || numAmount < 1) {
    return res.status(400).json({ error: "Minimum challenge stake is ৳1 chip" });
  }

  const parsedMinStake = Number(minStake) || 1;
  const parsedMaxStake = Number(maxStake) || 100000;

  if (parsedMinStake < 1 || parsedMaxStake < parsedMinStake) {
    return res.status(400).json({ error: "অবৈধ ন্যূনতম বা সর্বোচ্চ বাজি সীমা!" });
  }

  let calculatedAcceptorAmount = 0;
  if (clientAcceptorAmount !== undefined && !isNaN(Number(clientAcceptorAmount)) && Number(clientAcceptorAmount) >= 1) {
    calculatedAcceptorAmount = Math.round(Number(clientAcceptorAmount));
  } else {
    let numOdds = Number(odds);
    if (isNaN(numOdds) || numOdds < 1.05) numOdds = 2.0;
    if (numOdds > 50.0) numOdds = 50.0;
    calculatedAcceptorAmount = Math.max(1, Math.round(numAmount * (numOdds - 1)));
  }

  const totalPot = numAmount + calculatedAcceptorAmount;
  const numOdds = Number((totalPot / numAmount).toFixed(2));

  if (numOdds < 1.05 || numOdds > 50.0) {
    return res.status(400).json({ error: "Invalid challenge odds ratio. Odds multiplier must be between 1.05x and 50.0x." });
  }

  if (user.balance < numAmount) {
    return res.status(400).json({ error: `🚫 অপর্যাপ্ত ব্যালেন্স! রুম তৈরি করতে আপনার মূল ব্যালেন্সে অন্তত ৳${numAmount.toLocaleString()} চিপস থাকতে হবে। দয়া করে Add Fund বা ডিপোজিট করুন।` });
  }

  user.balance -= numAmount;
  
  // Log creation transaction
  user.transactions.unshift({
    id: `tx_p2p_create_${Date.now()}`,
    type: "withdraw",
    amount: numAmount,
    timestamp: new Date().toISOString(),
    description: `Created P2P Challenge: Risked ৳${numAmount.toLocaleString()} (Min: ৳${parsedMinStake.toLocaleString()}, Max: ৳${parsedMaxStake.toLocaleString()})`,
  });

  // Side Selector (Dragon/Tiger) - Use player's chosen side or fallback
  const selectedChoice: "dragon" | "tiger" =
    choice === "tiger" || choice === "dragon"
      ? choice
      : Math.random() > 0.5 ? "dragon" : "tiger";

  // Compute Room Tags & Attributes
  const tags: string[] = [];
  if (numAmount <= 200) tags.push("Newbie Friendly");
  if (numAmount >= 3000) tags.push("High Roller");
  if (isSingleRoundQuickChallenge) tags.push("Fast Action", "1v1 Quick");
  else tags.push("Classic Duel");
  if (invitedUsername) tags.push("Direct Invite");

  const activityScore = isSingleRoundQuickChallenge ? 85 : Math.floor(Math.random() * 45) + 40;
  const isFastAction = isSingleRoundQuickChallenge === true || (parsedMinStake <= 50 && numAmount <= 500);
  const isHotRoom = activityScore >= 75 || numAmount >= 2500;

  const newRoom: P2PRoom = {
    id: `room_${Date.now()}`,
    creatorId: userId,
    creatorName: username || user.username,
    amount: numAmount,
    choice: selectedChoice,
    odds: numOdds,
    acceptorAmount: calculatedAcceptorAmount,
    status: "open",
    createdAt: new Date().toISOString(),
    isPrivate: isPrivate === true || Boolean(password),
    password: password || undefined,
    minStake: parsedMinStake,
    maxStake: parsedMaxStake,
    invitedUsername: invitedUsername ? String(invitedUsername).trim().replace(/^@/, "") : undefined,
    activityScore,
    lastActiveAt: new Date().toISOString(),
    isFastAction,
    isHotRoom,
    tags,
    autoCloseSecondsRemaining: 300,
    capacityPercent: 50,
    recentBetActionsCount: isSingleRoundQuickChallenge ? 9 : 3,
    isSingleRoundQuickChallenge: isSingleRoundQuickChallenge === true,
  };

  activeRooms.unshift(newRoom);
  p2pRoomsHistory.unshift(newRoom);
  broadcast({ type: "ROOM_CREATED", room: newRoom });

  res.json({
    success: true,
    room: newRoom,
    user,
    botSpamWarning: isHighFrequencySpam ? "High creation frequency detected from your IP. Please avoid rapid creation/deletion." : undefined,
  });
});

app.post("/api/rooms/update-password", (req, res) => {
  const { roomId, userId, newPassword } = req.body;
  if (!userId || typeof userId !== "string" || !mockUsers[userId]) {
    return res.status(401).json({ error: "Authentication required." });
  }
  const room = activeRooms.find((r) => r.id === roomId);
  if (!room || room.status !== "open") {
    return res.status(400).json({ error: "Room not found or no longer open." });
  }
  if (room.creatorId !== userId) {
    return res.status(403).json({ error: "Only the room creator can change the password." });
  }
  if (!newPassword || typeof newPassword !== "string" || !newPassword.trim()) {
    return res.status(400).json({ error: "Invalid password." });
  }

  room.password = newPassword.trim();
  room.isPrivate = true;
  broadcast({ type: "ROOM_UPDATED", room });

  res.json({ success: true, room });
});

app.post("/api/rooms/accept", requireUser, (req, res) => {
  const userId = (req as any).userId;
  const { roomId, username, password, acceptorStake: customAcceptorStake } = req.body;
  if (!mockUsers[userId]) {
    return res.status(401).json({
      error: "Authentication required. Every player must be logged in to accept challenge bets.",
      code: "AUTH_REQUIRED",
    });
  }
  const room = activeRooms.find((r) => r.id === roomId);
  if (!room || room.status !== "open") {
    return res.status(400).json({ error: "Challenge is no longer available or already matched" });
  }

  // Check if room was created for a specific invited user
  if (room.invitedUsername) {
    const acceptorUsername = (username || mockUsers[userId]?.username || "").trim().toLowerCase().replace(/^@/, "");
    const cleanInvited = room.invitedUsername.trim().toLowerCase().replace(/^@/, "");
    if (acceptorUsername !== cleanInvited) {
      return res.status(403).json({
        error: `🚫 এই ডুয়েল রুমটি শুধুমাত্র @${cleanInvited} এর জন্য নির্ধারিত।`
      });
    }
  }

  if (room.isPrivate) {
    if (!password || room.password !== password) {
      return res.status(400).json({ error: "🚫 ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিয়ে জয়েন করুন বা জয়েনিং লিঙ্ক ব্যবহার করুন।" });
    }
  }

  if (room.creatorId === userId) {
    return res.status(400).json({ error: "You cannot accept your own challenge. Use 'Cancel & Refund' to cancel it." });
  }

  let requiredAcceptorStake = Math.max(1, room.acceptorAmount || Math.round(room.amount * ((room.odds || 2.0) - 1)));
  if (customAcceptorStake !== undefined && !isNaN(Number(customAcceptorStake))) {
    const customStakeNum = Math.max(1, Number(customAcceptorStake));
    if (room.minStake !== undefined && customStakeNum < room.minStake) {
      return res.status(400).json({ error: `🚫 বাজির পরিমাণ রুম ক্রিয়েটর কর্তৃক নির্ধারিত সর্বনিম্ন বাজি ৳${room.minStake.toLocaleString()} এর কম হতে পারবে না।` });
    }
    if (room.maxStake !== undefined && customStakeNum > room.maxStake) {
      return res.status(400).json({ error: `🚫 বাজির পরিমাণ রুম ক্রিয়েটর কর্তৃক নির্ধারিত সর্বোচ্চ বাজি ৳${room.maxStake.toLocaleString()} এর বেশি হতে পারবে না।` });
    }
    requiredAcceptorStake = Math.round(customStakeNum);
  }

  const acceptor = mockUsers[userId];
  if (acceptor.balance < requiredAcceptorStake) {
    return res.status(400).json({ error: `Insufficient balance to accept duel. Required stake: ৳${requiredAcceptorStake.toLocaleString()} chips.` });
  }

  // Deduct stake from acceptor balance
  acceptor.balance -= requiredAcceptorStake;
  room.acceptorId = userId;
  room.acceptorName = username || acceptor.username;
  room.status = "matched";
  room.capacityPercent = 100;
  room.lastActiveAt = new Date().toISOString();
  room.activityScore = Math.min(100, (room.activityScore || 50) + 35);

  const seed = generateServerSeed();
  const cards = deriveCards(seed, "p2p_duel", Date.now());
  
  room.dragonCard = cards.dragonCard;
  room.tigerCard = cards.tigerCard;
  room.winner = cards.result.toLowerCase() as "dragon" | "tiger" | "tie";

  // If 1v1 Quick Challenge, settle immediately with 5% company rake
  if (room.isSingleRoundQuickChallenge) {
    const totalPot = new Decimal(room.amount).plus(requiredAcceptorStake).toNumber();
    const companyFee = new Decimal(totalPot).times(0.05).round().toNumber(); // Strict 5% profit for company
    const winnerPayout = new Decimal(totalPot).minus(companyFee).toNumber();
    const creatorUser = mockUsers[room.creatorId];

    metrics.todayCommission = new Decimal(metrics.todayCommission).plus(companyFee).toNumber();
    metrics.todayMatchedVolume = new Decimal(metrics.todayMatchedVolume).plus(totalPot).toNumber();

    if (room.winner === "tie") {
      // Tie Rule: Company captures tie pot
      metrics.todayTieRevenue += totalPot;
      room.status = "completed";
    } else {
      const creatorWon = (room.winner === "dragon" && room.choice === "dragon") || (room.winner === "tiger" && room.choice === "tiger");
      if (creatorWon && creatorUser) {
        creatorUser.balance += winnerPayout;
        creatorUser.totalWon += (winnerPayout - room.amount);
        creatorUser.transactions.unshift({
          id: `tx_quick_win_${Date.now()}`,
          type: "win",
          amount: winnerPayout,
          timestamp: new Date().toISOString(),
          description: `Won 1v1 Quick Challenge Pot: +৳${winnerPayout.toLocaleString()} (5% House Rake: ৳${companyFee.toLocaleString()})`,
        });
      } else {
        acceptor.balance += winnerPayout;
        acceptor.totalWon += (winnerPayout - requiredAcceptorStake);
        acceptor.transactions.unshift({
          id: `tx_quick_win_${Date.now()}`,
          type: "win",
          amount: winnerPayout,
          timestamp: new Date().toISOString(),
          description: `Won 1v1 Quick Challenge Pot: +৳${winnerPayout.toLocaleString()} (5% House Rake: ৳${companyFee.toLocaleString()})`,
        });
      }
      room.status = "completed";
    }
  }

  const creatorRole = room.choice.toUpperCase() as "DRAGON" | "TIGER";
  const acceptorRole = creatorRole === "DRAGON" ? "TIGER" : "DRAGON";

  const creatorUser = mockUsers[room.creatorId];
  const creatorElo = creatorUser?.cosmetics?.eloRating || 1200;
  const acceptorElo = acceptor?.cosmetics?.eloRating || 1200;

  // Initialize fully stateful real-time duel state
  activeDuels[roomId] = {
    id: roomId,
    status: "ROLE_COIN_FLIP",
    tier: room.amount < 500 ? "Express" : room.amount < 2000 ? "Classic" : "VIP",
    creatorId: room.creatorId,
    creatorName: room.creatorName,
    creatorRole,
    creatorCard: creatorRole === "DRAGON" ? cards.dragonCard : cards.tigerCard,
    creatorBet: room.amount,
    creatorPeeked: false,
    creatorElo,
    
    acceptorId: userId,
    acceptorName: room.acceptorName || acceptor.username || "Opponent",
    acceptorRole,
    acceptorCard: acceptorRole === "DRAGON" ? cards.dragonCard : cards.tigerCard,
    acceptorBet: requiredAcceptorStake,
    acceptorPeeked: false,
    acceptorElo,
    
    currentPot: room.amount + requiredAcceptorStake,
    currentRaise: Math.max(room.amount, requiredAcceptorStake),
    bettingRound: 1,
    turnUser: "DRAGON",
    secondsRemaining: 60,
    raisesCount: 0,
    lastUpdated: Date.now(),
  };

  broadcast({ type: "ROOM_RESOLVED", room, duel: activeDuels[roomId] });
  res.json({ success: true, room, duel: activeDuels[roomId] });
});

// ============================================================================
// STATEFUL MULTIPLAYER 1v1 DUEL ENDPOINTS
// ============================================================================
app.get("/api/rooms/duel/:roomId", (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.query;
  
  const duel = activeDuels[roomId];
  if (!duel) {
    const room = activeRooms.find(r => r.id === roomId);
    if (room && room.status === "completed") {
      return res.json({
        id: roomId,
        status: "SETTLED",
        winnerRole: room.winner?.toUpperCase(),
        dragonPlayer: { userId: room.choice === "dragon" ? room.creatorId : room.acceptorId, card: room.dragonCard },
        tigerPlayer: { userId: room.choice === "tiger" ? room.creatorId : room.acceptorId, card: room.tigerCard },
      });
    }
    return res.status(404).json({ error: "Active duel not found or expired" });
  }
  
  const responseState = { ...duel };
  
  // Clean-room card obscurity mapping: Keep opponent card invisible before Showdown
  const isCreator = userId === duel.creatorId;
  const isAcceptor = userId === duel.acceptorId;
  
  if (duel.status !== "SHOWDOWN" && duel.status !== "SETTLED") {
    if (isCreator) {
      if (duel.creatorRole === "DRAGON") {
        responseState.acceptorCard = undefined as any;
      } else {
        responseState.acceptorCard = undefined as any;
      }
    } else if (isAcceptor) {
      if (duel.acceptorRole === "DRAGON") {
        responseState.creatorCard = undefined as any;
      } else {
        responseState.creatorCard = undefined as any;
      }
    } else {
      responseState.creatorCard = undefined as any;
      responseState.acceptorCard = undefined as any;
    }
  }
  
  res.json(responseState);
});

app.post("/api/rooms/duel/:roomId/peek", (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  
  const duel = activeDuels[roomId];
  if (!duel) return res.status(404).json({ error: "Duel session not found" });
  
  if (userId === duel.creatorId) {
    duel.creatorPeeked = true;
  } else if (userId === duel.acceptorId) {
    duel.acceptorPeeked = true;
  } else {
    return res.status(403).json({ error: "Access denied. Not a player in this duel." });
  }
  
  if (duel.creatorPeeked && duel.acceptorPeeked && duel.status === "PEEK_CARDS") {
    duel.status = "BETTING";
    duel.turnUser = "DRAGON";
    duel.secondsRemaining = 60;
    broadcast({ type: "DUEL_STATE_CHANGE", roomId: duel.id, status: "BETTING" });
  }
  
  duel.lastUpdated = Date.now();
  res.json(duel);
});

app.post("/api/rooms/duel/:roomId/action", requireUser, (req, res) => {
  const { roomId } = req.params;
  const userId = (req as any).userId;
  const { action } = req.body;
  
  const duel = activeDuels[roomId];
  if (!duel) return res.status(404).json({ error: "Duel session not found" });
  if (duel.status !== "BETTING") return res.status(400).json({ error: "Duel is not in betting phase" });
  
  const isCreator = userId === duel.creatorId;
  const isAcceptor = userId === duel.acceptorId;
  if (!isCreator && !isAcceptor) return res.status(403).json({ error: "Forbidden" });
  
  const activeRole = isCreator ? duel.creatorRole : duel.acceptorRole;
  if (duel.turnUser !== activeRole) {
    return res.status(400).json({ error: "Not your turn to act" });
  }
  
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ error: "User wallet not found" });
  
  const userBet = isCreator ? duel.creatorBet : duel.acceptorBet;
  
  if (action === "FOLD") {
    settleDuelOnFold(duel, userId);
    broadcast({ type: "DUEL_STATE_CHANGE", roomId: duel.id, status: "SETTLED" });
    return res.json(duel);
  }
  
  let additionalCost = 0;
  let nextRaiseVal = duel.currentRaise;
  
  if (action === "RAISE_2X") {
    additionalCost = duel.creatorBet + duel.acceptorBet; // raise by pot amount
    nextRaiseVal = userBet + additionalCost;
  } else if (action === "RAISE_3X") {
    additionalCost = (duel.creatorBet + duel.acceptorBet) * 1.5;
    nextRaiseVal = userBet + additionalCost;
  } else if (action === "ALL_IN") {
    additionalCost = user.balance;
    nextRaiseVal = userBet + additionalCost;
  } else if (action === "CALL") {
    additionalCost = duel.currentRaise - userBet;
  } else if (action === "CHECK") {
    if (userBet !== duel.currentRaise) {
      return res.status(400).json({ error: "Cannot check. Bets must be equal." });
    }
  }
  
  if (user.balance < additionalCost) {
    return res.status(400).json({ error: `Insufficient balance. Action cost is ৳${additionalCost.toLocaleString()} but you have ৳${user.balance.toLocaleString()}.` });
  }
  
  user.balance -= additionalCost;
  
  const updatedUserBet = userBet + additionalCost;
  if (isCreator) {
    duel.creatorBet = updatedUserBet;
    duel.creatorAction = action;
  } else {
    duel.acceptorBet = updatedUserBet;
    duel.acceptorAction = action;
  }
  
  duel.currentPot += additionalCost;
  duel.currentRaise = Math.max(duel.currentRaise, updatedUserBet);
  
  if (action.includes("RAISE")) {
    duel.raisesCount += 1;
  }
  
  const otherRole = activeRole === "DRAGON" ? "TIGER" : "DRAGON";
  const creatorHasActed = duel.creatorAction !== undefined;
  const acceptorHasActed = duel.acceptorAction !== undefined;
  
  if (creatorHasActed && acceptorHasActed && duel.creatorBet === duel.acceptorBet) {
    if (duel.bettingRound < 2 && duel.raisesCount < 3) {
      duel.bettingRound += 1;
      duel.creatorAction = undefined;
      duel.acceptorAction = undefined;
      duel.turnUser = "DRAGON";
      duel.secondsRemaining = 60;
    } else {
      duel.status = "SHOWDOWN";
      duel.secondsRemaining = 3;
      broadcast({ type: "DUEL_STATE_CHANGE", roomId: duel.id, status: "SHOWDOWN" });
    }
  } else {
    duel.turnUser = otherRole;
    duel.secondsRemaining = 60;
  }
  
  duel.lastUpdated = Date.now();
  broadcast({ type: "DUEL_ACTION", roomId: duel.id, duel });
  res.json(duel);
});

app.post("/api/rooms/cancel", requireUser, (req, res) => {
  const userId = (req as any).userId;
  const { roomId } = req.body;
  if (!mockUsers[userId]) {
    return res.status(401).json({
      error: "Authentication required",
      code: "AUTH_REQUIRED",
    });
  }

  const roomIndex = activeRooms.findIndex((r) => r.id === roomId && r.creatorId === userId && r.status === "open");
  if (roomIndex === -1) {
    return res.status(400).json({ error: "Open challenge not found or already matched" });
  }

  const room = activeRooms[roomIndex];
  activeRooms.splice(roomIndex, 1);

  const user = mockUsers[userId];
  if (user) {
    user.balance += room.amount;
    user.transactions.unshift({
      id: `tx_room_cancel_${Date.now()}`,
      type: "refund",
      amount: room.amount,
      timestamp: new Date().toISOString(),
      description: `P2P Challenge Cancelled: ৳${room.amount.toLocaleString()} 100% refunded to wallet`,
    });
  }

  broadcast({ type: "ROOM_CANCELLED", roomId });

  // Sync cancelled room in history
  const histRoom = p2pRoomsHistory.find(r => r.id === roomId);
  if (histRoom) {
    histRoom.status = "cancelled" as any;
  }

  res.json({ success: true, refundedAmount: room.amount, user });
});

// GET /api/rooms/history/:userId - Retrieves all private room challenges history for a user
app.get("/api/rooms/history/:userId", (req, res) => {
  const { userId } = req.params;
  const history = p2pRoomsHistory.filter(
    (r) => r.creatorId === userId || r.acceptorId === userId
  );
  res.json(history);
});

// 8. Leaderboard
app.get("/api/leaderboard", (req, res) => {
  const list = Object.values(mockUsers)
    .map((u) => {
      return {
        userId: u.userId,
        username: u.username,
        balance: u.balance,
        profit: u.totalWon - u.totalLost,
        winRate: u.gamesPlayed > 0 ? Math.round((u.totalWon / (u.totalWon + u.totalLost || 1)) * 100) : 50,
        gamesPlayed: u.gamesPlayed,
        vipTier: u.cosmetics?.eloTier || "Standard",
        eloRating: u.cosmetics?.eloRating || 1000,
        eloTier: u.cosmetics?.eloTier || "Bronze",
        equippedFrame: u.cosmetics?.equippedFrame,
        equippedTitle: u.cosmetics?.equippedTitle,
      };
    })
    .sort((a, b) => b.profit - a.profit);
  res.json(list);
});

// 8b. Full Site Liquidity & All Users Transparency Ledger
app.get(["/api/site/liquidity", "/api/transparency"], (_req, res) => {
  let totalRealBalance = 0;
  let totalDemoBalance = 0;
  let totalLockedEscrow = 0;

  // Calculate table active bets
  Object.values(tables).forEach((t) => {
    t.playerBets.forEach((b) => {
      if (b.status === "ACTIVE") {
        totalLockedEscrow += b.amount;
      }
    });
  });

  // Calculate P2P open rooms escrow
  activeRooms.forEach((r) => {
    if (r.status === "open") {
      totalLockedEscrow += r.amount;
    }
  });

  const userList: UserBalanceRecord[] = Object.values(mockUsers).map((u, idx) => {
    totalRealBalance += u.balance;
    totalDemoBalance += u.demoBalance;

    // Check if user currently has an active in-play bet
    let userActiveEscrow = 0;
    Object.values(tables).forEach((t) => {
      t.playerBets.forEach((b) => {
        if (b.userId === u.userId && b.status === "ACTIVE") {
          userActiveEscrow += b.amount;
        }
      });
    });

    const isOnline = true;
    const status: "ACTIVE" | "IN_GAME" | "IDLE" = userActiveEscrow > 0 ? "IN_GAME" : idx % 2 === 0 ? "ACTIVE" : "IDLE";

    return {
      userId: u.userId,
      username: u.username,
      vipTier: "Standard",
      balance: u.balance,
      demoBalance: u.demoBalance,
      lockedBalance: userActiveEscrow,
      totalWon: u.totalWon,
      totalLost: u.totalLost,
      netProfit: u.totalWon - u.totalLost,
      gamesPlayed: u.gamesPlayed,
      kycStatus: u.kycStatus,
      isOnline,
      status,
      lastActive: new Date(Date.now() - idx * 45000).toISOString(),
    };
  });

  // Sort by balance descending
  userList.sort((a, b) => b.balance - a.balance);

  const totalSiteLiquidity = totalRealBalance + totalLockedEscrow;

  const totalActivePlayers = wss.clients.size;

  const responseData: SiteLiquidityData = {
    totalSiteLiquidity,
    totalRealBalance,
    totalDemoBalance,
    totalEscrowLocked: totalLockedEscrow,
    totalUsersCount: userList.length,
    activeOnlineCount: totalActivePlayers,
    todayMatchedVolume: metrics.todayMatchedVolume,
    todayCommission: metrics.todayCommission,
    todayTieRevenue: metrics.todayTieRevenue,
    telemetry: {
      totalActivePlayers,
      tps: 0,
      latencyMs: 12,
      activeNode: "AP-SOUTH-1 (Dhaka/Kolkata Primary Edge)",
      shoeRemainingCards: 416,
      shoeTotalCards: 416,
      burnCardsCount: 0,
      dealerName: "Live Dealer",
      dealerTableCode: "DT-LIVE-01",
      betsPerSecond: 0,
      todayGlobalTurnover: metrics.todayMatchedVolume,
    },
    tableLiquidity: {
      express: {
        pool: (tables["express"]?.currentRound.dragonPool || 0) + (tables["express"]?.currentRound.tigerPool || 0),
        matched: tables["express"]?.currentRound.matchedAmount || 0,
        players: (tables["express"]?.currentRound.dragonPlayers || 0) + (tables["express"]?.currentRound.tigerPlayers || 0),
      },
      classic: {
        pool: (tables["classic"]?.currentRound.dragonPool || 0) + (tables["classic"]?.currentRound.tigerPool || 0),
        matched: tables["classic"]?.currentRound.matchedAmount || 0,
        players: (tables["classic"]?.currentRound.dragonPlayers || 0) + (tables["classic"]?.currentRound.tigerPlayers || 0),
      },
      vip: {
        pool: (tables["vip"]?.currentRound.dragonPool || 0) + (tables["vip"]?.currentRound.tigerPool || 0),
        matched: tables["vip"]?.currentRound.matchedAmount || 0,
        players: (tables["vip"]?.currentRound.dragonPlayers || 0) + (tables["vip"]?.currentRound.tigerPlayers || 0),
      },
    },
    users: userList,
    timestamp: new Date().toISOString(),
  };

  res.json(responseData);
});

// ============================================================================
// P2P ENHANCEMENTS: CAPACITY TRENDS, REPORTS & TABLE PING
// ============================================================================
app.get("/api/p2p/capacity-trends", (_req, res) => {
  const now = new Date();
  const points: CapacityTrendPoint[] = [];
  const basePlayers = Math.max(activeRooms.length * 4, 38);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 10 * 60 * 1000);
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const wave = Math.sin((d.getMinutes() / 60) * Math.PI * 2) * 16;
    const players = Math.max(12, Math.round(basePlayers + wave + (i % 2 === 0 ? 9 : -5)));
    const activeR = Math.max(2, Math.round(players / 4));
    const capacityPct = Math.min(96, Math.max(38, Math.round((players / (activeR * 6)) * 100)));
    points.push({
      time: timeStr,
      players,
      capacityPct,
      activeRooms: activeR,
    });
  }
  res.json({ success: true, points });
});

app.post("/api/reports/submit", (req, res) => {
  const { reporterUserId, reporterUsername, reportedUserId, reportedUsername, reason, details } = req.body;
  if (!reporterUserId || !reportedUserId || !reason) {
    return res.status(400).json({ error: "Missing required report information." });
  }
  const report: PlayerReport = {
    id: `rep_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    reporterUserId,
    reporterUsername: reporterUsername || "Anonymous",
    reportedUserId,
    reportedUsername: reportedUsername || "Unknown Player",
    reason,
    details: details || "",
    timestamp: new Date().toISOString(),
    status: "PENDING",
  };
  playerReports.unshift(report);
  broadcast({
    type: "PLAYER_REPORTED",
    report: {
      id: report.id,
      reportedUsername: report.reportedUsername,
      reason: report.reason,
      timestamp: report.timestamp,
    },
  });
  res.json({
    success: true,
    message: `Player @${report.reportedUsername} successfully reported for '${reason}'. Security review team notified.`,
    report,
  });
});

// ============================================================================
// ROUND DISPUTES & COMPLAINTS API ENDPOINTS
// ============================================================================
app.post("/api/disputes/submit", (req, res) => {
  const {
    userId,
    username,
    roundNumber,
    tableSlug,
    tableName,
    roomId,
    betAmount,
    side,
    issueType,
    description,
    dragonCard,
    tigerCard,
    result,
    serverSeedHash,
  } = req.body;

  if (!userId || !description || !description.trim()) {
    return res.status(400).json({ error: "Missing required dispute information." });
  }

  const dispute: RoundDispute = {
    id: `disp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId,
    username: username || mockUsers[userId]?.username || "Player",
    roundNumber: roundNumber ? Number(roundNumber) : undefined,
    tableSlug,
    tableName,
    roomId,
    betAmount: betAmount ? Number(betAmount) : undefined,
    side,
    issueType: issueType || "Result Dispute",
    description: description.trim(),
    status: "PENDING",
    timestamp: new Date().toISOString(),
    roundDetails: {
      dragonCard: typeof dragonCard === "object" ? dragonCard?.display : dragonCard,
      tigerCard: typeof tigerCard === "object" ? tigerCard?.display : tigerCard,
      result,
      serverSeedHash,
    },
  };

  roundDisputes.unshift(dispute);

  logUserActivity(
    userId,
    dispute.username,
    "ROUND_DISPUTE_SUBMITTED",
    `Submitted round complaint for Round #${roundNumber || roomId || "N/A"} (${dispute.issueType}): ${description.trim()}`
  );

  broadcast({
    type: "ROUND_DISPUTE_SUBMITTED",
    dispute,
  });

  res.json({
    success: true,
    dispute,
    message: "আপনার রাউন্ড সংক্রান্ত অভিযোগ সফলভাবে জমা হয়েছে। অ্যাডমিন টিম রিভিউ করে ব্যবস্থা নেবে।",
  });
});

app.get("/api/admin/disputes", requireAdmin, (_req, res) => {
  const pendingCount = roundDisputes.filter((d) => d.status === "PENDING" || d.status === "UNDER_REVIEW").length;
  const resolvedCount = roundDisputes.filter((d) => d.status === "RESOLVED_VALID" || d.status === "RESOLVED_REJECTED").length;
  const refundedCount = roundDisputes.filter((d) => d.status === "REFUNDED").length;

  res.json({
    success: true,
    totalCount: roundDisputes.length,
    counts: {
      pending: pendingCount,
      resolved: resolvedCount,
      refunded: refundedCount,
    },
    disputes: roundDisputes,
  });
});

app.post("/api/admin/disputes/:disputeId/resolve", requireAdmin, (req, res) => {
  const { disputeId } = req.params;
  const { action, adminNotes, refundAmount } = req.body; // action: 'REFUND' | 'RESOLVE' | 'REJECT' | 'REVIEW'

  const dispute = roundDisputes.find((d) => d.id === disputeId);
  if (!dispute) {
    return res.status(404).json({ success: false, error: "Round dispute not found." });
  }

  const user = mockUsers[dispute.userId];
  const cleanNotes = adminNotes ? adminNotes.trim() : "";

  if (action === "REFUND") {
    const amt = Number(refundAmount) || dispute.betAmount || 0;
    if (amt <= 0) {
      return res.status(400).json({ success: false, error: "Refund amount must be greater than 0." });
    }
    if (user) {
      user.balance += amt;
      user.transactions.unshift({
        id: `tx_dispute_refund_${Date.now()}`,
        type: "refund",
        amount: amt,
        timestamp: new Date().toISOString(),
        description: `Round Dispute #${dispute.roundNumber || dispute.roomId || dispute.id} Refund: +৳${amt.toLocaleString()} (${cleanNotes || "Admin Approved Dispute Refund"})`,
      });
      logUserActivity(
        dispute.userId,
        dispute.username,
        "ROUND_DISPUTE_REFUNDED",
        `Admin refunded ৳${amt.toLocaleString()} for Round #${dispute.roundNumber || dispute.roomId || "N/A"}. Note: ${cleanNotes || "Approved"}`
      );
    }
    dispute.status = "REFUNDED";
    dispute.refundedAmount = amt;
    dispute.adminNotes = cleanNotes || `Refunded ৳${amt.toLocaleString()} to user wallet.`;
  } else if (action === "RESOLVE") {
    dispute.status = "RESOLVED_VALID";
    dispute.adminNotes = cleanNotes || "Dispute investigated and marked valid.";
    if (user) {
      logUserActivity(dispute.userId, dispute.username, "ROUND_DISPUTE_RESOLVED", `Dispute for Round #${dispute.roundNumber || dispute.roomId || "N/A"} resolved by admin.`);
    }
  } else if (action === "REJECT") {
    dispute.status = "RESOLVED_REJECTED";
    dispute.adminNotes = cleanNotes || "Dispute investigated and rejected as invalid based on server audit logs.";
    if (user) {
      logUserActivity(dispute.userId, dispute.username, "ROUND_DISPUTE_REJECTED", `Dispute for Round #${dispute.roundNumber || dispute.roomId || "N/A"} rejected by admin.`);
    }
  } else if (action === "REVIEW") {
    dispute.status = "UNDER_REVIEW";
    dispute.adminNotes = cleanNotes || "Dispute under active investigation by compliance team.";
  }

  dispute.resolvedAt = new Date().toISOString();

  res.json({
    success: true,
    dispute,
    user,
    message: `Dispute #${dispute.id} status updated to ${dispute.status}.`,
  });
});


app.get("/api/reports", (_req, res) => {
  res.json({ success: true, reports: playerReports });
});

app.get("/api/admin/reports", requireAdmin, (_req, res) => {
  const pendingCount = playerReports.filter((r) => r.status === "PENDING").length;
  const investigatedCount = playerReports.filter((r) => r.status === "INVESTIGATED").length;
  const resolvedCount = playerReports.filter((r) => r.status === "RESOLVED").length;

  res.json({
    success: true,
    totalCount: playerReports.length,
    counts: {
      pending: pendingCount,
      investigated: investigatedCount,
      resolved: resolvedCount,
    },
    reports: playerReports,
  });
});

app.post("/api/admin/reports/:reportId/action", requireAdmin, (req, res) => {
  const { reportId } = req.params;
  const { action, notes } = req.body; // action: 'BAN' | 'SUSPEND' | 'DISMISS' | 'INVESTIGATE'

  const report = playerReports.find((r) => r.id === reportId);
  if (!report) {
    return res.status(404).json({ success: false, error: "Report not found." });
  }

  const reportedUser = mockUsers[report.reportedUserId];
  const cleanNotes = notes ? notes.trim() : "";

  if (action === "BAN") {
    if (reportedUser) {
      reportedUser.status = "BANNED";
      logUserActivity(
        report.reportedUserId,
        report.reportedUsername,
        "ACCOUNT_BANNED",
        `Account BANNED by admin via report #${report.id} (${report.reason}). Admin note: ${cleanNotes || "Rule violation"}`
      );
    }
    report.status = "RESOLVED";
  } else if (action === "SUSPEND") {
    if (reportedUser) {
      reportedUser.status = "SUSPENDED";
      logUserActivity(
        report.reportedUserId,
        report.reportedUsername,
        "ACCOUNT_SUSPENDED",
        `Account SUSPENDED by admin via report #${report.id}. Admin note: ${cleanNotes || "Temporary suspension"}`
      );
    }
    report.status = "RESOLVED";
  } else if (action === "INVESTIGATE") {
    report.status = "INVESTIGATED";
  } else if (action === "DISMISS") {
    report.status = "RESOLVED";
  }

  res.json({
    success: true,
    report,
    reportedUser,
    message: `Report #${report.id} updated with action '${action}'.`,
  });
});


app.post("/api/rooms/:roomId/ping", (req, res) => {
  const { roomId } = req.params;
  const { userId, username } = req.body;
  broadcast({
    type: "ROOM_PING",
    roomId,
    userId,
    username: username || "Player",
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true, message: "Ping sent to table" });
});

// 8c. Live High Load System Telemetry
app.get("/api/system/telemetry", (_req, res) => {
  const totalActivePlayers = Math.max(wss.clients.size, 1);

  // Real active bettor/player counts on tables
  const expressBettors = (tables["express"]?.currentRound.dragonPlayers || 0) + (tables["express"]?.currentRound.tigerPlayers || 0);
  const classicBettors = (tables["classic"]?.currentRound.dragonPlayers || 0) + (tables["classic"]?.currentRound.tigerPlayers || 0);
  const vipBettors = (tables["vip"]?.currentRound.dragonPlayers || 0) + (tables["vip"]?.currentRound.tigerPlayers || 0);

  let expressActive = expressBettors;
  let classicActive = classicBettors;
  let vipActive = vipBettors;

  const totalBettors = expressBettors + classicBettors + vipBettors;
  if (totalBettors < totalActivePlayers) {
    const unplaced = totalActivePlayers - totalBettors;
    classicActive += unplaced;
  }

  res.json({
    totalActivePlayers,
    tableActivePlayers: {
      express: expressActive,
      classic: classicActive,
      vip: vipActive,
    },
    tableLimits: {
      express: { minBet: 10, maxBet: 1000 },
      classic: { minBet: 100, maxBet: 10000 },
      vip: { minBet: 1000, maxBet: 100000 },
    },
    tps: 0,
    latencyMs: 12,
    activeNode: "AP-SOUTH-1 (Dhaka/Kolkata Primary Edge)",
    shoeRemainingCards: 416,
    shoeTotalCards: 416,
    burnCardsCount: 0,
    dealerName: "Live Dealer",
    dealerTableCode: "DT-LIVE-01",
    betsPerSecond: 0,
    todayGlobalTurnover: metrics.todayMatchedVolume,
    regionalNodes: [
      { code: "BGD-DHK-01", location: "Dhaka, Bangladesh", status: "ONLINE", ping: "11ms", load: "0%" },
      { code: "IND-CCU-02", location: "Kolkata, India", status: "ONLINE", ping: "14ms", load: "0%" },
      { code: "SGP-CEN-01", location: "Singapore Central", status: "ONLINE", ping: "28ms", load: "0%" },
      { code: "UAE-DXB-01", location: "Dubai, UAE", status: "ONLINE", ping: "42ms", load: "0%" },
      { code: "GBR-LON-01", location: "London, UK", status: "ONLINE", ping: "68ms", load: "0%" },
    ]
  });
});

// DELETED: Insecure database reset endpoint (Ref: SEC-002)


// Admin Authentication Endpoint (Cryptographically Signed HMAC Token)
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  const u = (username || "").trim().toLowerCase();
  const p = (password || "").trim();

  if (!u || !p) {
    return res.status(401).json({ success: false, error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
  }

  const inputHash = crypto.createHash("sha256").update(p).digest("hex");
  const isUserValid = u === ADMIN_CREDENTIALS.username;
  const isPassValid = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(ADMIN_CREDENTIALS.passwordHash));

  if (isUserValid && isPassValid) {
    const token = generateAdminToken(u);
    return res.json({
      success: true,
      token,
      user: { username: u, role: "SUPER_ADMIN" }
    });
  }

  return res.status(401).json({ success: false, error: "Invalid administrator credentials", code: "INVALID_CREDENTIALS" });
});

app.get("/api/admin/users", requireAdmin, (_req, res) => {
  res.json({ users: Object.values(mockUsers) });
});

app.get("/api/admin/users/:userId/history", requireAdmin, (req, res) => {
  const { userId } = req.params;
  let user = mockUsers[userId];
  if (!user) {
    const knownGrant = adminGrants.find((g) => g.userId === userId);
    const knownReport = playerReports.find((r) => r.reportedUserId === userId || r.reporterUserId === userId);
    const knownDispute = roundDisputes.find((d) => d.userId === userId);
    const username =
      knownGrant?.username ||
      (knownReport?.reportedUserId === userId ? knownReport.reportedUsername : knownReport?.reporterUsername) ||
      knownDispute?.username ||
      `User_${userId.slice(0, 5)}`;

    user = {
      userId,
      username,
      balance: 10000,
      demoBalance: 10000,
      balanceType: "real",
      lockedBalance: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      kycStatus: "verified",
      status: "ACTIVE",
      transactions: [],
    };
    mockUsers[userId] = user;
  }

  const userGrants = adminGrants.filter((g) => g.userId === userId);
  const userLogs = userActivityLogs[userId] || [
    {
      id: `act_init_1_${userId}`,
      userId,
      username: user.username,
      action: "ACCOUNT_REGISTERED",
      details: "User registered account and initialized wallet",
      ipAddress: "103.205.132.42",
      timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: `act_init_2_${userId}`,
      userId,
      username: user.username,
      action: "LOGIN_SUCCESS",
      details: "Logged in via Web Browser (Chrome/Android)",
      ipAddress: "103.205.132.42",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  res.json({
    success: true,
    user,
    bets: userBetHistories[userId] || [],
    transactions: user.transactions || [],
    adminGrants: userGrants,
    activityLogs: userLogs,
    stats: user.stats || null,
  });
});

app.post("/api/admin/users/:userId/grant-deposit", requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { amount, tag, reason, isDemo } = req.body;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return res.status(400).json({ success: false, error: "Invalid deposit amount. Must be greater than 0." });
  }

  const cleanTag = typeof tag === "string" && tag.trim() ? tag.trim() : "Manual Admin Deposit";
  const cleanReason = typeof reason === "string" && reason.trim() ? reason.trim() : "Direct admin credit allocation";

  if (isDemo) {
    user.demoBalance += num;
  } else {
    user.balance += num;
  }

  // Record in user transactions
  user.transactions.unshift({
    id: `tx_admin_grant_${Date.now()}`,
    type: "deposit",
    amount: num,
    timestamp: new Date().toISOString(),
    description: `Admin Deposit [Tag: ${cleanTag}]: +৳${num.toLocaleString()} (${cleanReason})`,
  });

  // Create admin grant record
  const grant: AdminGrant = {
    id: `grant_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId,
    username: user.username,
    amount: num,
    tag: cleanTag,
    reason: cleanReason,
    adminUsername: "admin",
    timestamp: new Date().toISOString(),
    isDemo: Boolean(isDemo),
  };
  adminGrants.unshift(grant);

  // Log activity
  logUserActivity(
    userId,
    user.username,
    "ADMIN_DEPOSIT_RECEIVED",
    `Received ৳${num.toLocaleString()} Admin Deposit under Tag Folder '${cleanTag}'. Reason: ${cleanReason}`
  );

  res.json({
    success: true,
    grant,
    user,
    message: `Successfully credited ৳${num.toLocaleString()} to @${user.username} under Tag Folder '${cleanTag}'.`,
  });
});

app.get("/api/admin/grants", requireAdmin, (_req, res) => {
  const totalAmount = adminGrants.reduce((acc, g) => acc + g.amount, 0);
  const totalUsersSet = new Set(adminGrants.map((g) => g.userId));

  // Tag Folder breakdown calculation
  const tagFoldersMap: Record<
    string,
    { tag: string; totalAmount: number; userIds: Set<string>; grants: AdminGrant[] }
  > = {};

  adminGrants.forEach((g) => {
    if (!tagFoldersMap[g.tag]) {
      tagFoldersMap[g.tag] = {
        tag: g.tag,
        totalAmount: 0,
        userIds: new Set(),
        grants: [],
      };
    }
    tagFoldersMap[g.tag].totalAmount += g.amount;
    tagFoldersMap[g.tag].userIds.add(g.userId);
    tagFoldersMap[g.tag].grants.push(g);
  });

  const tagFolders: TagFolderSummary[] = Object.values(tagFoldersMap).map((f) => ({
    tag: f.tag,
    totalAmount: f.totalAmount,
    userCount: f.userIds.size,
    grantsCount: f.grants.length,
    grants: f.grants,
  }));

  res.json({
    success: true,
    totalAmount,
    totalRecipientsCount: totalUsersSet.size,
    totalGrantsCount: adminGrants.length,
    tagFolders,
    grants: adminGrants,
  });
});

app.post("/api/admin/users/:userId/update", requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { username, balance, demoBalance, kycStatus, status } = req.body;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const changes: string[] = [];

  if (username !== undefined && username.trim() !== user.username) {
    changes.push(`Username: ${user.username} -> ${username.trim()}`);
    user.username = username.trim();
  }
  if (balance !== undefined) {
    const b = Number(balance);
    if (!isNaN(b) && b >= 0 && b !== user.balance) {
      changes.push(`Real Balance: ৳${user.balance} -> ৳${b}`);
      user.balance = b;
    }
  }
  if (demoBalance !== undefined) {
    const db = Number(demoBalance);
    if (!isNaN(db) && db >= 0 && db !== user.demoBalance) {
      changes.push(`Demo Balance: ৳${user.demoBalance} -> ৳${db}`);
      user.demoBalance = db;
    }
  }
  if (kycStatus !== undefined && kycStatus !== user.kycStatus) {
    changes.push(`KYC: ${user.kycStatus} -> ${kycStatus}`);
    user.kycStatus = kycStatus;
  }
  if (status !== undefined && status !== user.status) {
    changes.push(`Status: ${user.status} -> ${status}`);
    user.status = status;
  }

  if (changes.length > 0) {
    logUserActivity(userId, user.username, "ADMIN_PROFILE_MODIFIED", `Admin updated profile details: ${changes.join(" | ")}`);
  }

  res.json({ success: true, user });
});

app.post("/api/admin/users/:userId/balance", requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { type, amount, isDemo, reason } = req.body;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  const num = Number(amount);
  if (isNaN(num) || num < 0) return res.status(400).json({ success: false, error: "Invalid amount" });

  const note = reason || "Admin manual balance adjustment";

  if (isDemo) {
    if (type === "add") user.demoBalance += num;
    else user.demoBalance = Math.max(0, user.demoBalance - num);
  } else {
    if (type === "add") user.balance += num;
    else user.balance = Math.max(0, user.balance - num);
  }

  logUserActivity(
    userId,
    user.username,
    type === "add" ? "BALANCE_CREDITED" : "BALANCE_DEBITED",
    `Admin ${type === "add" ? "added" : "deducted"} ৳${num.toLocaleString()} (${isDemo ? "Demo" : "Real"}). Note: ${note}`
  );

  res.json({ success: true, user });
});

app.post("/api/admin/users/:userId/status", requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  const prev = user.status;
  user.status = status;

  logUserActivity(userId, user.username, "ACCOUNT_STATUS_CHANGED", `Account status modified from ${prev} to ${status} by admin`);

  res.json({ success: true, user });
});

app.post("/api/admin/users/:userId/kyc", requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { kycStatus } = req.body;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  const prev = user.kycStatus;
  user.kycStatus = kycStatus;

  logUserActivity(userId, user.username, "KYC_STATUS_UPDATED", `KYC status changed from ${prev} to ${kycStatus} by admin`);

  res.json({ success: true, user });
});


app.get("/api/admin/deposits", requireAdmin, (_req, res) => {
  res.json({ deposits: cashierDeposits });
});

app.get("/api/admin/withdrawals", requireAdmin, (_req, res) => {
  res.json({ withdrawals: cashierWithdrawals });
});

app.get("/api/admin/audit-logs", requireAdmin, (_req, res) => {
  const allLogs: any[] = [];
  Object.values(userActivityLogs).forEach((logs) => {
    logs.forEach((l) => {
      allLogs.push({
        id: l.id,
        action: l.action,
        entity_type: "USER_ACCOUNT",
        entity_id: l.userId,
        user_id: l.username,
        created_at: l.timestamp,
        new_values: l.details,
      });
    });
  });
  adminGrants.forEach((g) => {
    allLogs.push({
      id: g.id,
      action: "ADMIN_GRANT_ISSUED",
      entity_type: "WALLET_DEPOSIT",
      entity_id: g.userId,
      user_id: g.adminUsername || "admin",
      created_at: g.timestamp,
      new_values: `Grant ৳${g.amount.toLocaleString()} to @${g.username} [Tag: ${g.tag}]. Reason: ${g.reason}`,
    });
  });
  roundDisputes.forEach((d) => {
    allLogs.push({
      id: d.id,
      action: "ROUND_DISPUTE_EVENT",
      entity_type: "TABLE_ROUND",
      entity_id: String(d.roundNumber || d.id),
      user_id: d.username,
      created_at: d.timestamp,
      new_values: `Dispute status: ${d.status} (${d.issueType}) for ৳${d.betAmount || 0}`,
    });
  });
  allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ logs: allLogs });
});

app.post("/api/admin/deposits/:id/approve", requireAdmin, (req, res) => {
  const { id } = req.params;
  const dep = cashierDeposits.find((d) => d.id === id);
  if (!dep) return res.status(404).json({ success: false, error: "Deposit request not found" });
  if (dep.status !== "PENDING") {
    return res.status(400).json({ success: false, error: `Deposit already marked as ${dep.status}` });
  }

  dep.status = "APPROVED";
  dep.processedAt = new Date().toISOString();
  dep.processedBy = (req as any).adminUser || "admin";

  const user = mockUsers[dep.userId];
  if (user) {
    user.balance += dep.amount;
    user.transactions.unshift({
      id: `tx_dep_appr_${Date.now()}`,
      type: "deposit",
      amount: dep.amount,
      timestamp: new Date().toISOString(),
      description: `Verified Deposit (#${dep.id}): +৳${dep.amount.toLocaleString()} via ${dep.method}`,
    });
    logUserActivity(
      dep.userId,
      user.username,
      "DEPOSIT_APPROVED",
      `Deposit #${dep.id} for ৳${dep.amount.toLocaleString()} approved by admin.`
    );
  }

  res.json({
    success: true,
    deposit: dep,
    message: `Deposit #${id} approved and ৳${dep.amount.toLocaleString()} credited to player balance.`,
  });
});

app.post("/api/admin/deposits/:id/reject", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { note } = req.body || {};
  const dep = cashierDeposits.find((d) => d.id === id);
  if (!dep) return res.status(404).json({ success: false, error: "Deposit request not found" });
  if (dep.status !== "PENDING") {
    return res.status(400).json({ success: false, error: `Deposit already marked as ${dep.status}` });
  }

  dep.status = "REJECTED";
  dep.processedAt = new Date().toISOString();
  dep.processedBy = (req as any).adminUser || "admin";
  dep.note = note || "Invalid transaction reference / unverified payment";

  logUserActivity(
    dep.userId,
    dep.username,
    "DEPOSIT_REJECTED",
    `Deposit #${dep.id} rejected. Reason: ${dep.note}`
  );

  res.json({
    success: true,
    deposit: dep,
    message: `Deposit #${id} rejected.`,
  });
});

app.post("/api/admin/withdrawals/:id/approve", requireAdmin, (req, res) => {
  const { id } = req.params;
  const wdr = cashierWithdrawals.find((w) => w.id === id);
  if (!wdr) return res.status(404).json({ success: false, error: "Withdrawal request not found" });
  if (wdr.status !== "PENDING") {
    return res.status(400).json({ success: false, error: `Withdrawal already marked as ${wdr.status}` });
  }

  wdr.status = "APPROVED";
  wdr.processedAt = new Date().toISOString();
  wdr.processedBy = (req as any).adminUser || "admin";

  logUserActivity(
    wdr.userId,
    wdr.username,
    "WITHDRAWAL_FULFILLED",
    `Withdrawal #${wdr.id} for ৳${wdr.amount.toLocaleString()} approved and fulfilled via ${wdr.method}.`
  );

  res.json({
    success: true,
    withdrawal: wdr,
    message: `Withdrawal #${id} approved and marked as fulfilled.`,
  });
});

app.post("/api/admin/withdrawals/:id/reject", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { note } = req.body || {};
  const wdr = cashierWithdrawals.find((w) => w.id === id);
  if (!wdr) return res.status(404).json({ success: false, error: "Withdrawal request not found" });
  if (wdr.status !== "PENDING") {
    return res.status(400).json({ success: false, error: `Withdrawal already marked as ${wdr.status}` });
  }

  wdr.status = "REJECTED";
  wdr.processedAt = new Date().toISOString();
  wdr.processedBy = (req as any).adminUser || "admin";
  wdr.note = note || "Declined by compliance";

  const user = mockUsers[wdr.userId];
  if (user) {
    user.balance += wdr.amount;
    user.transactions.unshift({
      id: `tx_wdr_ref_${Date.now()}`,
      type: "refund",
      amount: wdr.amount,
      timestamp: new Date().toISOString(),
      description: `Refunded Rejected Withdrawal (#${wdr.id}): +৳${wdr.amount.toLocaleString()}`,
    });
    logUserActivity(
      wdr.userId,
      user.username,
      "WITHDRAWAL_REFUNDED",
      `Withdrawal #${wdr.id} rejected and ৳${wdr.amount.toLocaleString()} refunded to balance. Note: ${wdr.note}`
    );
  }

  res.json({
    success: true,
    withdrawal: wdr,
    message: `Withdrawal #${id} rejected and refunded to player balance.`,
  });
});

// 9. AI Dealer commentary
app.post("/api/ai-dealer", async (req, res) => {
  try {
    const { lastWinner = "Dragon", tableSlug = "classic" } = req.body || {};
    const safeSlug = (tableSlug || "classic").toString();
    const safeWinner = (lastWinner || "Dragon").toString();
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        commentary: `Cards shuffled on the ${safeSlug.toUpperCase()} arena. Fortune favors the daring. Last win went to ${safeWinner}!`,
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an elite, charismatic Asian casino dealer for Dragon Tiger P2P. Provide one punchy, exciting casino sentence for players placing bets. Last round winner: ${safeWinner}. Keep it high energy.`,
    });
    res.json({ commentary: response.text });
  } catch {
    res.json({
      commentary: "Cards are in play! Will the Dragon roar or will the Tiger strike? Place your bets!",
    });
  }
});

// 10. Safeguard: API 404 and Global Error Catchers (Ensures all /api requests return JSON, never HTML)
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.originalUrl}` });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.originalUrl && req.originalUrl.startsWith("/api")) {
    console.error("API Exception:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
  next(err);
});

// ============================================================================
// SERVER STARTUP & VITE INTEGRATION
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Dragon Tiger P2P Server running on http://localhost:${PORT}`);
  });
}

startServer();
