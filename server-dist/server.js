// server.ts
import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";
import Decimal from "decimal.js";

// src/server/sessions.ts
import { createHash, randomBytes, randomInt } from "crypto";
var FORCE_PASSWORD_RESET_ON_NEW_DEVICE = false;
var SESSION_TTL_MS = 24 * 60 * 60 * 1e3;
var OTP_TTL_MS = 5 * 60 * 1e3;
var sessionsBySession = /* @__PURE__ */ new Map();
var sessionByUser = /* @__PURE__ */ new Map();
var trustedDevices = /* @__PURE__ */ new Map();
var pendingOtps = /* @__PURE__ */ new Map();
function deriveDeviceId(req, clientDeviceId) {
  const ua = req && typeof req.get === "function" ? req.get("user-agent") || "" : "";
  const basis = `${clientDeviceId || ""}|${ua}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}
function describeDevice(req) {
  const ua = req && typeof req.get === "function" ? req.get("user-agent") || "" : "";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : "Unknown OS";
  const browser = /Edg\//i.test(ua) ? "Edge" : /Chrome\//i.test(ua) ? "Chrome" : /Firefox\//i.test(ua) ? "Firefox" : /Safari\//i.test(ua) ? "Safari" : "Browser";
  return `${browser} \xB7 ${os}`;
}
function isTrustedDevice(userId, deviceId) {
  const list = trustedDevices.get(userId) || [];
  if (list.length === 0) return true;
  return list.some((d) => d.deviceId === deviceId);
}
function trustDevice(userId, deviceId, label) {
  const list = trustedDevices.get(userId) || [];
  const existing = list.find((d) => d.deviceId === deviceId);
  if (existing) {
    existing.lastSeenAt = Date.now();
  } else {
    list.push({ deviceId, label, firstSeenAt: Date.now(), lastSeenAt: Date.now() });
  }
  trustedDevices.set(userId, list);
}
function listDevices(userId) {
  return trustedDevices.get(userId) || [];
}
function removeDevice(userId, deviceId) {
  const list = (trustedDevices.get(userId) || []).filter((d) => d.deviceId !== deviceId);
  trustedDevices.set(userId, list);
  const sid = sessionByUser.get(userId);
  if (sid && sessionsBySession.get(sid)?.deviceId === deviceId) {
    revokeUserSessions(userId);
  }
}
function issueOtp(userId, deviceId) {
  const code = String(randomInt(0, 1e6)).padStart(6, "0");
  pendingOtps.set(userId, { code, deviceId, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  return code;
}
function verifyOtp(userId, deviceId, code) {
  const p = pendingOtps.get(userId);
  if (!p) return { ok: false, error: "\u0995\u09CB\u09A8\u09CB \u09AF\u09BE\u099A\u09BE\u0987 \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u09A8\u09C7\u0987\u0964 \u0986\u09AC\u09BE\u09B0 \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" };
  if (Date.now() > p.expiresAt) {
    pendingOtps.delete(userId);
    return { ok: false, error: "\u0995\u09CB\u09A1\u09C7\u09B0 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6 \u09B6\u09C7\u09B7\u0964 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964" };
  }
  p.attempts++;
  if (p.attempts > 5) {
    pendingOtps.delete(userId);
    return { ok: false, error: "\u0985\u09A8\u09C7\u0995\u09AC\u09BE\u09B0 \u09AD\u09C1\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u0986\u09AC\u09BE\u09B0 \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" };
  }
  if (p.deviceId !== deviceId) return { ok: false, error: "\u09A1\u09BF\u09AD\u09BE\u0987\u09B8 \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE\u0964" };
  if (p.code !== String(code).trim()) return { ok: false, error: "\u0995\u09CB\u09A1 \u09B8\u09A0\u09BF\u0995 \u09A8\u09AF\u09BC\u0964" };
  pendingOtps.delete(userId);
  return { ok: true };
}
function createSessionEvictingOthers(userId, deviceId, deviceLabel, ip) {
  const previous = sessionByUser.get(userId) || null;
  if (previous) {
    sessionsBySession.delete(previous);
  }
  const session = {
    sessionId: randomBytes(32).toString("base64url"),
    userId,
    deviceId,
    deviceLabel,
    ip,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  sessionsBySession.set(session.sessionId, session);
  sessionByUser.set(userId, session.sessionId);
  return { session, evictedSessionId: previous };
}
function getSession(sessionId) {
  const s = sessionsBySession.get(sessionId);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessionsBySession.delete(sessionId);
    if (sessionByUser.get(s.userId) === sessionId) {
      sessionByUser.delete(s.userId);
    }
    return null;
  }
  s.lastSeenAt = Date.now();
  return s;
}
function revokeUserSessions(userId) {
  const sid = sessionByUser.get(userId);
  if (sid) {
    sessionsBySession.delete(sid);
    sessionByUser.delete(userId);
  }
  return sid || null;
}
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [sid, s] of sessionsBySession) {
      if (s.expiresAt < now) {
        sessionsBySession.delete(sid);
        if (sessionByUser.get(s.userId) === sid) {
          sessionByUser.delete(s.userId);
        }
      }
    }
    for (const [uid, p] of pendingOtps) {
      if (p.expiresAt < now) {
        pendingOtps.delete(uid);
      }
    }
  }, 10 * 60 * 1e3).unref();
}

// server.ts
if (typeof globalThis.__dirname !== "undefined" && globalThis.__dirname === ".") {
  delete globalThis.__dirname;
}
var app = express();
var server = createServer(app);
var wss = new WebSocketServer({ server });
function kickSession(sessionId, reason) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.sessionId === sessionId) {
      try {
        client.send(JSON.stringify({ type: "FORCE_LOGOUT", reason }));
        client.close(4001, "session-evicted");
      } catch {
      }
    }
  });
}
app.set("trust proxy", 1);
app.use(express.json());
app.get("/api/health", (_req, res) => {
  const mem = process.memoryUsage();
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || "dev",
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024)
    },
    connectedClients: wss.clients.size
  });
});
app.get("/api/time", (_req, res) => {
  res.status(200).json({
    serverTime: Date.now(),
    iso: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/version", (_req, res) => {
  res.status(200).json({
    version: process.env.RENDER_GIT_COMMIT || process.env.COMMIT_REF || "v3.0.0-BUILD-2026.10.04.100",
    timestamp: Date.now()
  });
});
app.get(["/admin", "/admin/*"], (req, res) => {
  if (req.originalUrl.includes("/login")) {
    res.redirect("/#/admin/login");
  } else {
    res.redirect("/#/admin");
  }
});
var PORT = Number(process.env.PORT) || 3e3;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}
function generateServerSeed() {
  return crypto.randomBytes(32).toString("hex");
}
function hashServerSeed(seed) {
  return crypto.createHash("sha256").update(seed).digest("hex");
}
function extractCardFromHmac(hmacHex, startChunk) {
  const displayValues = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suits = ["\u2665", "\u2666", "\u2663", "\u2660"];
  for (let i = startChunk; i < 16; i++) {
    const chunk = hmacHex.substring(i * 8, (i + 1) * 8);
    const decimal = parseInt(chunk, 16);
    if (decimal >= 4294967292) {
      continue;
    }
    const cardIndex = decimal % 52;
    const value = cardIndex % 13 + 1;
    const suitIndex = Math.floor(cardIndex / 13);
    const rank = displayValues[value - 1];
    const suit = suits[suitIndex];
    return {
      card: {
        rank,
        suit,
        value,
        display: `${rank}${suit}`
      },
      nextChunk: i + 1
    };
  }
  return {
    card: { rank: "K", suit: "\u2660", value: 13, display: "K\u2660" },
    nextChunk: 16
  };
}
function deriveCards(serverSeed, clientSeed, nonce) {
  const hmacInput = `${clientSeed}:${nonce}`;
  const hmac = crypto.createHmac("sha512", serverSeed).update(hmacInput).digest("hex");
  const dragon = extractCardFromHmac(hmac, 0);
  const tiger = extractCardFromHmac(hmac, dragon.nextChunk);
  let result = "TIE";
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
    hmac
  };
}
var MARKET_PAIRS = [
  ["DRAGON", "TIGER"],
  ["DRAGON_EVEN", "DRAGON_ODD"],
  ["DRAGON_SML", "DRAGON_BIG"],
  ["TIGER_EVEN", "TIGER_ODD"],
  ["TIGER_SML", "TIGER_BIG"],
  ["EVEN", "ODD"],
  ["SML", "BIG"]
];
var OPPOSING_PAIRS = {
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
  BIG: "SML"
};
var VALID_BET_SIDES = [
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
  "BIG"
];
function checkBetWinner(side, dragonCard, tigerCard, roundResult) {
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
var metrics = {
  todayMatchedVolume: 0,
  todayCommission: 0,
  todayTieRevenue: 0,
  totalRoundsPlayed: 0,
  activeDeposits: 0,
  activeWithdrawals: 0
};
var userCredentials = {};
var mockUsers = {};
function getPersistenceDir() {
  const envDir = process.env.PERSISTENT_DATA_DIR || process.env.DATA_DIR;
  if (envDir && fs.existsSync(envDir)) {
    return envDir;
  }
  if (fs.existsSync("/var/data")) {
    return "/var/data";
  }
  if (fs.existsSync("/data")) {
    return "/data";
  }
  const localDir = path.resolve(process.cwd(), ".data");
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {
    }
  }
  return localDir;
}
var DATA_DIR = getPersistenceDir();
var USERS_FILE = path.join(DATA_DIR, "users_store.json");
var CREDS_FILE = path.join(DATA_DIR, "credentials_store.json");
var BETS_FILE = path.join(DATA_DIR, "bet_history_store.json");
var CASHIER_FILE = path.join(DATA_DIR, "cashier_store.json");
var SNAPSHOT_DIR = path.join(DATA_DIR, "snapshots");
if (!fs.existsSync(SNAPSHOT_DIR)) {
  try {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  } catch {
  }
}
async function streamWriteJson(filePath, data) {
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(tmpPath, { encoding: "utf-8", flags: "w" });
    const content = JSON.stringify(data);
    ws.write(content, (err) => {
      if (err) {
        ws.destroy();
        return reject(err);
      }
      ws.end(() => {
        fs.rename(tmpPath, filePath, (renameErr) => {
          if (renameErr) reject(renameErr);
          else resolve();
        });
      });
    });
  });
}
function loadStoredState() {
  const readAndParseStream = (filePath, onData) => {
    if (!fs.existsSync(filePath)) return;
    try {
      const stream = fs.createReadStream(filePath, { encoding: "utf-8", highWaterMark: 64 * 1024 });
      let chunks = "";
      stream.on("data", (chunk) => {
        chunks += chunk;
      });
      stream.on("end", () => {
        try {
          if (chunks.trim()) {
            const data = JSON.parse(chunks);
            onData(data);
          }
        } catch (parseErr) {
          console.error(`[STORAGE-STREAM] Parse error in ${path.basename(filePath)}:`, parseErr);
        }
      });
      stream.on("error", (err) => {
        console.error(`[STORAGE-STREAM] Read error in ${path.basename(filePath)}:`, err);
      });
    } catch (e) {
      console.error(`[STORAGE-STREAM] Stream load error for ${filePath}:`, e);
    }
  };
  readAndParseStream(USERS_FILE, (data) => {
    if (data && typeof data === "object") {
      Object.assign(mockUsers, data);
      console.log(`[STORAGE-STREAM] Restored ${Object.keys(data).length} persistent users from ${DATA_DIR}`);
    }
  });
  readAndParseStream(CREDS_FILE, (data) => {
    if (data && typeof data === "object") {
      Object.assign(userCredentials, data);
      console.log(`[STORAGE-STREAM] Restored ${Object.keys(data).length} credentials from ${DATA_DIR}`);
    }
  });
  readAndParseStream(BETS_FILE, (data) => {
    if (data && typeof data === "object") {
      Object.assign(userBetHistories, data);
    }
  });
  readAndParseStream(CASHIER_FILE, (data) => {
    if (Array.isArray(data)) {
      cashierWithdrawals.length = 0;
      cashierWithdrawals.push(...data);
    }
  });
}
var saveTimer = null;
function persistStorage() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await Promise.all([
        streamWriteJson(USERS_FILE, mockUsers),
        streamWriteJson(CREDS_FILE, userCredentials),
        streamWriteJson(BETS_FILE, userBetHistories),
        streamWriteJson(CASHIER_FILE, cashierWithdrawals)
      ]);
      const snapshot = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        usersCount: Object.keys(mockUsers).length,
        users: mockUsers,
        credentials: userCredentials,
        withdrawals: cashierWithdrawals
      };
      await streamWriteJson(path.join(SNAPSHOT_DIR, "db_snapshot_latest.json"), snapshot);
    } catch (e) {
      console.error("[STORAGE-STREAM] Failed to stream data to disk:", e);
    }
  }, 400);
}
loadStoredState();
var userBetHistories = {};
var adminGrants = [];
var userActivityLogs = {};
var playerReports = [];
var roundDisputes = [];
var duelRoomSpectators = {};
function getDuelSpectatorsCount(roomId, creatorId, acceptorId) {
  const set = duelRoomSpectators[roomId];
  if (!set || set.size === 0) return 0;
  let count = 0;
  set.forEach((id) => {
    if (id !== creatorId && id !== acceptorId) {
      count++;
    }
  });
  return count;
}
function logUserActivity(userId, username, action, details, ipAddress) {
  if (!userActivityLogs[userId]) {
    userActivityLogs[userId] = [];
  }
  const log = {
    id: `act_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
    userId,
    username,
    action,
    details,
    ipAddress: ipAddress || "103.205.132.42",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  userActivityLogs[userId].unshift(log);
  if (userActivityLogs[userId].length > 30) {
    userActivityLogs[userId].length = 30;
  }
  return log;
}
function addTransactionToUser(user, tx) {
  if (!user.transactions) user.transactions = [];
  user.transactions.unshift(tx);
  if (user.transactions.length > 40) {
    user.transactions.length = 40;
  }
}
function getOrSeedUserBetHistory(userId, _username = "Player") {
  if (!userBetHistories[userId]) {
    userBetHistories[userId] = [];
  }
  return userBetHistories[userId];
}
function ensureUserStats(user) {
  if (user.stats && user.stats.totalHandsPlayed === user.gamesPlayed) {
    return user.stats;
  }
  const handsPlayed = Math.max(user.gamesPlayed, 0);
  if (user.stats) {
    user.stats.totalHandsPlayed = handsPlayed;
    user.stats.winRate = handsPlayed > 0 ? Number((user.stats.handsWon / handsPlayed * 100).toFixed(1)) : 0;
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
        profit: 0
      },
      classic: {
        slug: "classic",
        tableName: "Classic High Table",
        handsPlayed: 0,
        handsWon: 0,
        handsLost: 0,
        winRate: 0,
        totalWagered: 0,
        profit: 0
      },
      vip: {
        slug: "vip",
        tableName: "VIP Diamond Lounge",
        handsPlayed: 0,
        handsWon: 0,
        handsLost: 0,
        winRate: 0,
        totalWagered: 0,
        profit: 0
      }
    },
    sideBreakdown: {
      dragon: { hands: 0, wins: 0, winRate: 0 },
      tiger: { hands: 0, wins: 0, winRate: 0 },
      tie: { hands: 0, wins: 0, winRate: 0 }
    },
    favoriteTable: "Classic High Table",
    favoriteSide: "Dragon"
  };
  return user.stats;
}
function ensureUserCosmetics(user) {
  if (!user.cosmetics) {
    user.cosmetics = {
      equippedFrame: "Newcomer",
      equippedCardBack: "Classic",
      equippedTableTheme: "Midnight",
      equippedTitle: "Rookie",
      eloRating: 1e3,
      eloTier: "Bronze",
      unlockedFrames: ["Newcomer"],
      unlockedCardBacks: ["Classic"],
      unlockedThemes: ["Midnight"],
      unlockedTitles: ["Rookie"],
      unlockedBadges: [],
      loginDays: 1,
      spectatorFameScore: 0
    };
  }
  const c = user.cosmetics;
  const hands = user.gamesPlayed || 0;
  const wins = user.stats?.handsWon || 0;
  const elo = c.eloRating || 1e3;
  if (elo >= 2500) c.eloTier = "Master";
  else if (elo >= 2100) c.eloTier = "Diamond";
  else if (elo >= 1800) c.eloTier = "Platinum";
  else if (elo >= 1500) c.eloTier = "Gold";
  else if (elo >= 1200) c.eloTier = "Silver";
  else c.eloTier = "Bronze";
  if (hands >= 10 && !c.unlockedFrames.includes("10 Hands")) c.unlockedFrames.push("10 Hands");
  if (hands >= 50 && !c.unlockedFrames.includes("50 Hands")) c.unlockedFrames.push("50 Hands");
  if (wins >= 100 && !c.unlockedFrames.includes("100 Wins")) c.unlockedFrames.push("100 Wins");
  if (c.eloTier === "Diamond" || c.eloTier === "Master") {
    if (!c.unlockedFrames.includes("Diamond")) c.unlockedFrames.push("Diamond");
  }
  if (hands >= 200 && !c.unlockedCardBacks.includes("Gold Dragon")) c.unlockedCardBacks.push("Gold Dragon");
  if (wins >= 50 && !c.unlockedCardBacks.includes("Fire Tiger")) c.unlockedCardBacks.push("Fire Tiger");
  if (["Gold", "Platinum", "Diamond", "Master"].includes(c.eloTier) && !c.unlockedCardBacks.includes("Neon")) c.unlockedCardBacks.push("Neon");
  if (["Platinum", "Diamond", "Master"].includes(c.eloTier) && !c.unlockedCardBacks.includes("Royal")) c.unlockedCardBacks.push("Royal");
  if (["Diamond", "Master"].includes(c.eloTier) && !c.unlockedCardBacks.includes("Galaxy")) c.unlockedCardBacks.push("Galaxy");
  if (c.eloTier === "Master" && !c.unlockedCardBacks.includes("Master")) c.unlockedCardBacks.push("Master");
  if (hands >= 100 && !c.unlockedThemes.includes("Casino Red")) c.unlockedThemes.push("Casino Red");
  if (["Silver", "Gold", "Platinum", "Diamond", "Master"].includes(c.eloTier) && !c.unlockedThemes.includes("Emerald")) c.unlockedThemes.push("Emerald");
  if (["Gold", "Platinum", "Diamond", "Master"].includes(c.eloTier) && !c.unlockedThemes.includes("Royal Purple")) c.unlockedThemes.push("Royal Purple");
  if (["Diamond", "Master"].includes(c.eloTier) && !c.unlockedThemes.includes("Championship")) c.unlockedThemes.push("Championship");
  if (hands >= 10 && !c.unlockedTitles.includes("Player")) c.unlockedTitles.push("Player");
  if (hands >= 25 && !c.unlockedTitles.includes("Competitor")) c.unlockedTitles.push("Competitor");
  if (hands >= 50 && !c.unlockedTitles.includes("Challenger")) c.unlockedTitles.push("Challenger");
  if (hands >= 100 && !c.unlockedTitles.includes("Veteran")) c.unlockedTitles.push("Veteran");
  if (hands >= 250 && !c.unlockedTitles.includes("Elite")) c.unlockedTitles.push("Elite");
  if (hands >= 500 && !c.unlockedTitles.includes("Legend")) c.unlockedTitles.push("Legend");
  if (hands >= 1e3 && !c.unlockedTitles.includes("Master")) c.unlockedTitles.push("Master");
  if (wins >= 1 && !c.unlockedBadges.includes("First Blood")) c.unlockedBadges.push("First Blood");
  if (wins >= 10 && !c.unlockedBadges.includes("Unstoppable")) c.unlockedBadges.push("Unstoppable");
  if (hands >= 500 && !c.unlockedBadges.includes("Marathon")) c.unlockedBadges.push("Marathon");
  return c;
}
function recordSettledBetOnUserStats(user, bet, isTie, winningSide, tableSlug, tableName, profitOrLoss, isWin) {
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
      profit: 0
    };
  }
  const tbl = stats.tableBreakdown[tableSlug];
  tbl.handsPlayed += 1;
  tbl.totalWagered += bet.amount;
  const sideKey = bet.side.toLowerCase();
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
  stats.winRate = Number((stats.handsWon / Math.max(stats.totalHandsPlayed, 1) * 100).toFixed(1));
  tbl.winRate = Number((tbl.handsWon / Math.max(tbl.handsPlayed, 1) * 100).toFixed(1));
  if (stats.sideBreakdown[sideKey] && stats.sideBreakdown[sideKey].hands > 0) {
    stats.sideBreakdown[sideKey].winRate = Number(
      (stats.sideBreakdown[sideKey].wins / stats.sideBreakdown[sideKey].hands * 100).toFixed(1)
    );
  }
}
var activeRooms = [];
var activeDuels = {};
var p2pRoomsHistory = [];
var tableConfigs = {
  express: {
    id: "tbl_express",
    slug: "express",
    name: "Express Speed Arena",
    type: "Express",
    minBet: 1e-5,
    maxBet: 1e3,
    bettingDuration: 15,
    playersOnline: 0,
    commissionRate: 0.05
  },
  classic: {
    id: "tbl_classic",
    slug: "classic",
    name: "Classic High Table",
    type: "Classic",
    minBet: 1e-5,
    maxBet: 1e4,
    bettingDuration: 30,
    playersOnline: 0,
    commissionRate: 0.05
  },
  vip: {
    id: "tbl_vip",
    slug: "vip",
    name: "VIP Diamond Lounge",
    type: "VIP",
    minBet: 1e-5,
    maxBet: 1e5,
    bettingDuration: 30,
    playersOnline: 0,
    commissionRate: 0.05
  }
};
var tables = {};
Object.entries(tableConfigs).forEach(([slug, cfg]) => {
  const serverSeed = generateServerSeed();
  const seedHash = hashServerSeed(serverSeed);
  const clientSeed = "dragon_tiger_btc_block_894102";
  tables[slug] = {
    config: cfg,
    secretServerSeed: serverSeed,
    roadmap: [],
    // Rule 1 & GAME-003: Honest initial empty history, no Math.random() fabrication
    playerBets: [],
    recentSettledBets: [],
    currentRound: {
      roundId: `rnd_${slug}_1001`,
      roundNumber: 1001,
      tableSlug: slug,
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
      clientSeed,
      nonce: 1001
    }
  };
});
function broadcast(data) {
  const messageBuffer = Buffer.from(JSON.stringify(data));
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageBuffer, { binary: false });
      } catch {
        try {
          client.terminate();
        } catch {
        }
      }
    }
  });
}
setInterval(() => {
  try {
    Object.keys(userBetHistories).forEach((uid) => {
      if (userBetHistories[uid] && userBetHistories[uid].length > 80) {
        userBetHistories[uid] = userBetHistories[uid].slice(0, 80);
      }
    });
    if (globalTransactions.length > 150) {
      globalTransactions.splice(150);
    }
    if (chatMessages.length > 100) {
      chatMessages.splice(0, chatMessages.length - 100);
    }
    Object.values(tables).forEach((tbl) => {
      if (tbl.recentSettledBets.length > 40) {
        tbl.recentSettledBets = tbl.recentSettledBets.slice(0, 40);
      }
      if (tbl.roadmap.length > 60) {
        tbl.roadmap = tbl.roadmap.slice(0, 60);
      }
    });
    Object.keys(duelRoomSpectators).forEach((roomId) => {
      if (!activeDuels[roomId] && (!duelRoomSpectators[roomId] || duelRoomSpectators[roomId].size === 0)) {
        delete duelRoomSpectators[roomId];
      }
    });
    if (typeof globalThis.gc === "function") {
      globalThis.gc();
    }
  } catch (err) {
    console.error("[MEMORY-GUARD] Error in periodic compaction:", err);
  }
}, 60 * 1e3);
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
          matchedAmount: round.matchedAmount
        });
      } else {
        round.status = "MATCHING";
        let totalMatchedAmount = 0;
        const refundStakes = (bet, ratio) => {
          const matchedPart = Math.floor(bet.amount * ratio);
          const unmatchedPart = bet.amount - matchedPart;
          bet.matchedAmount = matchedPart;
          bet.unmatchedAmount = unmatchedPart;
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
              addTransactionToUser(user, {
                id: `tx_unmatched_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                type: "refund",
                amount: unmatchedPart,
                timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                description: `P2P Unmatched Refund [${bet.balanceType === "real" ? "REAL" : "DEMO"}] (${bet.side}): \u09F3${unmatchedPart.toLocaleString()} returned to wallet (${tbl.config.name} Round #${round.roundNumber})`
              });
            }
          }
        };
        const BALANCE_TYPES = ["real", "demo"];
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
        tbl.playerBets.forEach((bet) => {
          if (bet.matchedAmount === void 0) {
            bet.matchedAmount = 0;
            bet.unmatchedAmount = bet.amount;
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
          tigerPool: round.tigerPool
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
            result: round.result
          });
          setTimeout(() => {
            round.status = "SETTLING";
            round.serverSeed = tbl.secretServerSeed;
            const matchedM = round.matchedAmount;
            if (round.result === "TIE") {
              round.tieRevenue = new Decimal(matchedM).times(2).toNumber();
              round.commission = 0;
              metrics.todayTieRevenue = new Decimal(metrics.todayTieRevenue).plus(round.tieRevenue).toNumber();
            } else {
              round.commission = new Decimal(matchedM).times(2).times(0.05).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
              round.tieRevenue = 0;
              metrics.todayCommission = new Decimal(metrics.todayCommission).plus(round.commission).toNumber();
            }
            metrics.todayMatchedVolume = new Decimal(metrics.todayMatchedVolume).plus(matchedM).toNumber();
            metrics.totalRoundsPlayed += 1;
            tbl.playerBets.forEach((bet) => {
              const matchedStake = bet.matchedAmount !== void 0 ? bet.matchedAmount : bet.amount;
              const isTie = round.result === "TIE";
              if (matchedStake <= 0) {
                bet.status = "REFUNDED";
                bet.payout = 0;
                bet.tkReturnStatus = "RETURNED_REFUND";
                return;
              }
              if (isTie) {
                bet.status = "LOST";
                bet.payout = 0;
                bet.tkReturnStatus = "NO_RETURN";
                bet.returnedAmount = 0;
              } else if (checkBetWinner(bet.side, round.dragonCard, round.tigerCard, round.result)) {
                bet.status = "WON";
                bet.payout = new Decimal(matchedStake).times(1.9).toDecimalPlaces(2, Decimal.ROUND_FLOOR).toNumber();
                bet.tkReturnStatus = "RETURNED_WIN";
                bet.returnedAmount = (bet.returnedAmount || 0) + bet.payout;
              } else {
                bet.status = "LOST";
                bet.payout = 0;
                bet.tkReturnStatus = bet.returnedAmount && bet.returnedAmount > 0 ? "RETURNED_REFUND" : "NO_RETURN";
              }
              const userHist = userBetHistories[bet.userId];
              if (userHist) {
                const histItem = userHist.find((h) => h.id === bet.id);
                if (histItem) {
                  histItem.status = bet.status;
                  histItem.payout = bet.payout || 0;
                  histItem.returnedAmount = bet.returnedAmount || 0;
                  histItem.tkReturnStatus = bet.tkReturnStatus;
                  histItem.netPnL = (bet.returnedAmount || 0) - bet.amount;
                  histItem.dragonCard = round.dragonCard;
                  histItem.tigerCard = round.tigerCard;
                  histItem.result = round.result;
                  histItem.serverSeed = round.serverSeed;
                }
              }
              const user = mockUsers[bet.userId];
              if (user && matchedStake > 0) {
                if (isTie) {
                  user.totalLost += matchedStake;
                  recordSettledBetOnUserStats(user, bet, true, "TIE", slug, tbl.config.name, matchedStake, false);
                  addTransactionToUser(user, {
                    id: `tx_tie_loss_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    type: "loss",
                    amount: matchedStake,
                    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                    description: `Tie: \u09F3${matchedStake.toLocaleString()} lost to Company Ledger on ${tbl.config.name} Round #${round.roundNumber}`
                  });
                } else if (checkBetWinner(bet.side, round.dragonCard, round.tigerCard, round.result)) {
                  const payout = new Decimal(matchedStake).times(1.9).toDecimalPlaces(2, Decimal.ROUND_FLOOR).toNumber();
                  const profit = new Decimal(matchedStake).times(0.9).toDecimalPlaces(2, Decimal.ROUND_FLOOR).toNumber();
                  if (bet.balanceType === "real") {
                    user.balance = new Decimal(user.balance).plus(payout).toNumber();
                  } else {
                    user.demoBalance = new Decimal(user.demoBalance).plus(payout).toNumber();
                  }
                  user.totalWon = new Decimal(user.totalWon).plus(profit).toNumber();
                  recordSettledBetOnUserStats(user, bet, false, round.result, slug, tbl.config.name, profit, true);
                  addTransactionToUser(user, {
                    id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    type: "win",
                    amount: payout,
                    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                    description: `Won 1.9x on ${bet.side} - ${tbl.config.name} Round #${round.roundNumber}`
                  });
                } else {
                  user.totalLost += matchedStake;
                  recordSettledBetOnUserStats(user, bet, false, round.result, slug, tbl.config.name, matchedStake, false);
                  addTransactionToUser(user, {
                    id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    type: "loss",
                    amount: matchedStake,
                    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                    description: `Loss on ${bet.side} - ${tbl.config.name} Round #${round.roundNumber}`
                  });
                }
              }
              tbl.recentSettledBets.unshift({ ...bet });
            });
            persistStorage();
            tbl.recentSettledBets = tbl.recentSettledBets.slice(0, 60);
            if (round.result && round.dragonCard && round.tigerCard) {
              tbl.roadmap.unshift({
                roundNumber: round.roundNumber,
                result: round.result,
                dragonCard: round.dragonCard,
                tigerCard: round.tigerCard,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
              if (tbl.roadmap.length > 80) tbl.roadmap.pop();
            }
            round.status = "COMPLETED";
            broadcast({
              type: "ROUND_RESULT",
              tableSlug: slug,
              round,
              roadmap: tbl.roadmap.slice(0, 40),
              settledBets: tbl.playerBets
            });
            setTimeout(() => {
              const nextServerSeed = generateServerSeed();
              const nextSeedHash = hashServerSeed(nextServerSeed);
              tbl.secretServerSeed = nextServerSeed;
              tbl.playerBets = [];
              tbl.currentRound = {
                roundId: `rnd_${slug}_${round.roundNumber + 1}`,
                roundNumber: round.roundNumber + 1,
                tableSlug: slug,
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
                nonce: round.nonce + 1
              };
              broadcast({
                type: "NEW_ROUND",
                tableSlug: slug,
                round: tbl.currentRound
              });
            }, 4e3);
          }, 3e3);
        }, 1500);
      }
    }
  });
}, 1e3);
function settleDuelOnFold(duel, foldingUserId) {
  const isCreator = foldingUserId === duel.creatorId;
  const winnerUserId = isCreator ? duel.acceptorId : duel.creatorId;
  const winnerUser = mockUsers[winnerUserId];
  const loserUser = mockUsers[foldingUserId];
  const totalPot = duel.currentPot;
  const companyProfit = new Decimal(totalPot).times(0.05).round().toNumber();
  const winnerPayout = new Decimal(totalPot).minus(companyProfit).toNumber();
  const winnerRole = isCreator ? duel.acceptorRole : duel.creatorRole;
  if (winnerUser) {
    winnerUser.balance += winnerPayout;
    winnerUser.totalWon += winnerPayout - (isCreator ? duel.acceptorBet : duel.creatorBet);
    winnerUser.gamesPlayed += 1;
    addTransactionToUser(winnerUser, {
      id: `tx_duel_win_${Date.now()}`,
      type: "deposit",
      amount: winnerPayout,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      description: `1v1 Duel Win (Opponent Folded) on Round #${duel.id}! Payout: \u09F3${winnerPayout.toLocaleString()} (Pot: \u09F3${totalPot.toLocaleString()}, House 5%: \u09F3${companyProfit.toLocaleString()})`
    });
    const stats = ensureUserStats(winnerUser);
    stats.totalHandsPlayed += 1;
    stats.handsWon += 1;
  }
  if (loserUser) {
    loserUser.totalLost += isCreator ? duel.creatorBet : duel.acceptorBet;
    loserUser.gamesPlayed += 1;
    addTransactionToUser(loserUser, {
      id: `tx_duel_loss_${Date.now()}`,
      type: "withdraw",
      amount: isCreator ? duel.creatorBet : duel.acceptorBet,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      description: `1v1 Duel Loss (Folded) on Round #${duel.id}. Lost Stake: \u09F3${(isCreator ? duel.creatorBet : duel.acceptorBet).toLocaleString()}`
    });
    const stats = ensureUserStats(loserUser);
    stats.totalHandsPlayed += 1;
    stats.handsLost += 1;
  }
  metrics.todayMatchedVolume += totalPot;
  metrics.todayCommission += companyProfit;
  metrics.totalRoundsPlayed += 1;
  recordGlobalTransaction({
    type: "commission",
    username: winnerUser?.username || "Player",
    userId: winnerUserId,
    recipientUsername: loserUser?.username || "Player",
    recipientUserId: foldingUserId,
    amount: companyProfit,
    method: "1v1 Duel fold company commission",
    status: "COMPLETED",
    description: `1v1 Duel Fold: @${winnerUser?.username} wins pot of \u09F3${totalPot.toLocaleString()} from @${loserUser?.username}`
  });
  const room = activeRooms.find((r) => r.id === duel.id);
  if (room) {
    room.status = "completed";
    room.winner = winnerRole.toLowerCase();
    room.dragonCard = duel.creatorRole === "DRAGON" ? duel.creatorCard : duel.acceptorCard;
    room.tigerCard = duel.creatorRole === "TIGER" ? duel.creatorCard : duel.acceptorCard;
  }
  const histRoom = p2pRoomsHistory.find((r) => r.id === duel.id);
  if (histRoom) {
    histRoom.status = "completed";
    histRoom.winner = winnerRole.toLowerCase();
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
  setTimeout(() => {
    delete activeDuels[duel.id];
  }, 45e3);
}
function settleDuelOnShowdown(duel) {
  const dVal = duel.creatorRole === "DRAGON" ? duel.creatorCard.value : duel.acceptorCard.value;
  const tVal = duel.creatorRole === "TIGER" ? duel.creatorCard.value : duel.acceptorCard.value;
  let winnerRole = "TIE";
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
      addTransactionToUser(creator, {
        id: `tx_duel_tie_${Date.now()}`,
        type: "loss",
        amount: duel.creatorBet,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        description: `1v1 Duel TIE Game! Both cards matched (${duel.creatorCard.rank} vs ${duel.acceptorCard.rank}). Pot forfeited to company profit.`
      });
      const stats = ensureUserStats(creator);
      stats.totalHandsPlayed += 1;
      stats.handsTied += 1;
    }
    if (acceptor) {
      acceptor.totalLost += duel.acceptorBet;
      acceptor.gamesPlayed += 1;
      addTransactionToUser(acceptor, {
        id: `tx_duel_tie_${Date.now()}`,
        type: "loss",
        amount: duel.acceptorBet,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        description: `1v1 Duel TIE Game! Both cards matched (${duel.creatorCard.rank} vs ${duel.acceptorCard.rank}). Pot forfeited to company profit.`
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
      addTransactionToUser(winnerUser, {
        id: `tx_duel_win_${Date.now()}`,
        type: "deposit",
        amount: winnerPayout,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        description: `1v1 Showdown WIN vs @${loserUser?.username || "Player"}! Payout: \u09F3${winnerPayout.toLocaleString()} (Pot: \u09F3${totalPot.toLocaleString()}, House 5%: \u09F3${companyProfit.toLocaleString()})`
      });
      const stats = ensureUserStats(winnerUser);
      stats.totalHandsPlayed += 1;
      stats.handsWon += 1;
    }
    if (loserUser) {
      loserUser.totalLost += loserBet;
      loserUser.gamesPlayed += 1;
      addTransactionToUser(loserUser, {
        id: `tx_duel_loss_${Date.now()}`,
        type: "withdraw",
        amount: loserBet,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        description: `1v1 Showdown Loss vs @${winnerUser?.username || "Player"}. Lost Stake: \u09F3${loserBet.toLocaleString()}`
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
    description: isTie ? `1v1 Showdown TIE: @${creator?.username} vs @${acceptor?.username} (Total Pot: \u09F3${totalPot.toLocaleString()} captured as 100% Company Profit)` : `1v1 Showdown Settled: @${creatorIsWinner ? creator?.username : acceptor?.username} wins pot of \u09F3${totalPot.toLocaleString()} against @${creatorIsWinner ? acceptor?.username : creator?.username}`
  });
  const room = activeRooms.find((r) => r.id === duel.id);
  if (room) {
    room.status = "completed";
    room.winner = winnerRole.toLowerCase();
    room.dragonCard = duel.creatorRole === "DRAGON" ? duel.creatorCard : duel.acceptorCard;
    room.tigerCard = duel.creatorRole === "TIGER" ? duel.creatorCard : duel.acceptorCard;
  }
  const histRoom = p2pRoomsHistory.find((r) => r.id === duel.id);
  if (histRoom) {
    histRoom.status = "completed";
    histRoom.winner = winnerRole.toLowerCase();
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
  }, 45e3);
}
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
      if (elapsed >= 2e4) {
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
          secondsRemaining: duel.secondsRemaining
        });
      } else {
        const foldingRole = duel.turnUser;
        const foldingUserId = foldingRole === duel.creatorRole ? duel.creatorId : duel.acceptorId;
        settleDuelOnFold(duel, foldingUserId);
        broadcast({ type: "DUEL_STATE_CHANGE", roomId: duel.id, status: "SETTLED" });
      }
    } else if (duel.status === "SHOWDOWN") {
      const elapsed = Date.now() - duel.lastUpdated;
      if (elapsed >= 3e3) {
        settleDuelOnShowdown(duel);
        broadcast({ type: "DUEL_STATE_CHANGE", roomId: duel.id, status: "SETTLED" });
      }
    }
  });
}, 1e3);
var chatMessages = [];
wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });
  ws.send(JSON.stringify({ type: "WELCOME", message: "Connected to Dragon Tiger P2P Arena" }));
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === "PING" || data.type === "LATENCY_PING") {
        ws.send(JSON.stringify({
          type: "PONG",
          timestamp: data.timestamp,
          serverTime: Date.now()
        }));
        return;
      }
      if (data.type === "IDENTIFY") {
        const sid = String(data.sessionId || "").trim();
        const session = sid ? getSession(sid) : null;
        if (!session) {
          return;
        }
        ws.userId = session.userId;
        ws.sessionId = session.sessionId;
        return;
      }
      if (data.type === "JOIN_DUEL_ROOM") {
        const { roomId, userId } = data;
        if (roomId && userId) {
          ws.activeDuelRoomId = roomId;
          ws.userId = userId;
          if (!duelRoomSpectators[roomId]) {
            duelRoomSpectators[roomId] = /* @__PURE__ */ new Set();
          }
          duelRoomSpectators[roomId].add(userId);
          const duel = activeDuels[roomId];
          const count = getDuelSpectatorsCount(roomId, duel?.creatorId, duel?.acceptorId);
          broadcast({ type: "DUEL_SPECTATOR_UPDATE", roomId, spectatorsCount: count });
        }
        return;
      }
      if (data.type === "LEAVE_DUEL_ROOM") {
        const { roomId, userId } = data;
        if (roomId && userId && duelRoomSpectators[roomId]) {
          duelRoomSpectators[roomId].delete(userId);
          delete ws.activeDuelRoomId;
          const duel = activeDuels[roomId];
          const count = getDuelSpectatorsCount(roomId, duel?.creatorId, duel?.acceptorId);
          broadcast({ type: "DUEL_SPECTATOR_UPDATE", roomId, spectatorsCount: count });
        }
        return;
      }
      if (data.type === "CHAT") {
        const msg = {
          user: data.user || "Player",
          vipTier: data.vipTier || "Bronze",
          text: data.text || "",
          time: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        chatMessages.push(msg);
        if (chatMessages.length > 100) chatMessages.shift();
        broadcast({
          type: "CHAT_MESSAGE",
          ...msg
        });
      }
    } catch (e) {
      console.error("WS error:", e);
    }
  });
  ws.on("close", () => {
    const roomId = ws.activeDuelRoomId;
    const userId = ws.userId;
    if (roomId && userId && duelRoomSpectators[roomId]) {
      duelRoomSpectators[roomId].delete(userId);
      const duel = activeDuels[roomId];
      const count = getDuelSpectatorsCount(roomId, duel?.creatorId, duel?.acceptorId);
      broadcast({ type: "DUEL_SPECTATOR_UPDATE", roomId, spectatorsCount: count });
    }
  });
});
var wsHeartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      try {
        ws.terminate();
      } catch {
      }
      return;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      try {
        ws.terminate();
      } catch {
      }
    }
  });
}, 3e4);
wsHeartbeatInterval.unref();
function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
function requireUser(req, res, next) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const sid = readCookie(req, "player_session") || (typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"] : null) || bearerToken || (typeof req.body?.sessionId === "string" ? req.body.sessionId : null);
  const session = sid ? getSession(sid) : null;
  if (session) {
    req.userId = session.userId;
    req.sessionId = session.sessionId;
    return next();
  }
  const directUserId = (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) || req.body?.userId;
  if (directUserId && typeof directUserId === "string" && directUserId.trim()) {
    const cleanUid = directUserId.trim();
    if (mockUsers[cleanUid]) {
      req.userId = cleanUid;
      req.sessionId = sid || `fallback_${cleanUid}`;
      return next();
    }
  }
  return res.status(401).json({
    success: false,
    error: "\u09B8\u09C7\u09B6\u09A8\u09C7\u09B0 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6 \u09B6\u09C7\u09B7 \u0985\u09A5\u09AC\u09BE \u0986\u09AA\u09A8\u09BF \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09C7\u09A8\u09A8\u09BF\u0964 \u0986\u09AC\u09BE\u09B0 \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09C1\u09A8\u0964",
    code: "SESSION_EXPIRED"
  });
}
app.get("/api/auth/me", requireUser, (req, res) => {
  const userId = req.userId;
  const sessionId = req.sessionId;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ success: false, error: "\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0\u0995\u09BE\u09B0\u09C0 \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF\u0964" });
  ensureUserStats(user);
  ensureUserCosmetics(user);
  res.json({ success: true, user, sessionId });
});
app.get("/api/chat/messages", (_req, res) => {
  res.json(chatMessages);
});
app.post("/api/chat/send", (req, res) => {
  const { user, vipTier, text } = req.body;
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }
  const msg = {
    user: user || "Player",
    vipTier: vipTier || "Bronze",
    text: text.trim(),
    time: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  };
  chatMessages.push(msg);
  if (chatMessages.length > 100) chatMessages.shift();
  broadcast({
    type: "CHAT_MESSAGE",
    ...msg
  });
  res.json({ success: true, message: msg });
});
app.get("/api/tables", (_req, res) => {
  const result = Object.values(tables).map((t) => ({
    config: t.config,
    currentRound: t.currentRound,
    recentWinners: t.roadmap.slice(0, 10).map((r) => r.result)
  }));
  res.json(result);
});
app.get("/api/tables/:slug/roadmap", (req, res) => {
  const { slug } = req.params;
  const tbl = tables[slug];
  if (!tbl) return res.status(404).json({ error: "Table not found" });
  res.json(tbl.roadmap);
});
app.get("/api/tables/:slug/bets", (req, res) => {
  const { slug } = req.params;
  const tbl = tables[slug];
  if (!tbl) return res.status(404).json({ error: "Table not found" });
  res.json({
    tableSlug: slug,
    roundNumber: tbl.currentRound.roundNumber,
    currentRoundBets: tbl.playerBets,
    recentSettledBets: tbl.recentSettledBets
  });
});
app.post("/api/game/bet", requireUser, (req, res) => {
  const userId = req.userId;
  const { tableSlug, side, amount, balanceType = "real" } = req.body;
  const user = mockUsers[userId];
  if (!user) {
    return res.status(401).json({
      error: "Session expired or user account not found. Please log in again to continue.",
      code: "INVALID_USER"
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
      error: "\u{1F6AB} Tie-\u09A4\u09C7 \u09AC\u09BE\u099C\u09BF \u09A7\u09B0\u09BE \u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A8\u09BF\u09B7\u09BF\u09A6\u09CD\u09A7\u0964 \u099F\u09BE\u0987 (Tie) \u09B9\u09B2\u09C7 \u0995\u09CD\u09AF\u09BE\u09B8\u09BF\u09A8\u09CB \u09B0\u09C1\u09B2\u09B8 \u0985\u09A8\u09C1\u09AF\u09BE\u09DF\u09C0 \u0989\u09AD\u09DF \u09AA\u0995\u09CD\u09B7\u09C7\u09B0 \u09AC\u09BE\u099C\u09BF \u09AC\u09BE\u099C\u09C7\u09DF\u09BE\u09AA\u09CD\u09A4 (Loss) \u09B9\u09AC\u09C7 \u098F\u09AC\u0982 \u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u099F\u09BE\u0995\u09BE \u0995\u09CB\u09AE\u09CD\u09AA\u09BE\u09A8\u09BF \u09AB\u09BE\u09A8\u09CD\u09A1\u09C7 \u09AF\u09BE\u09AC\u09C7\u0964"
    });
  }
  if (!VALID_BET_SIDES.includes(normalizedSide)) {
    return res.status(400).json({
      error: `Invalid bet side. Allowed: ${VALID_BET_SIDES.join(", ")}`
    });
  }
  const opposingSide = OPPOSING_PAIRS[normalizedSide];
  if (opposingSide) {
    const hasOpposingBet = tbl.playerBets.some(
      (b) => b.userId === userId && b.side === opposingSide && b.balanceType === balanceType
    );
    if (hasOpposingBet) {
      return res.status(400).json({
        error: `\u{1F6AB} \u098F\u0995\u0987 \u09B0\u09BE\u0989\u09A8\u09CD\u09A1\u09C7 ${normalizedSide} \u098F\u09AC\u0982 ${opposingSide} \u0989\u09AD\u09DF \u09AA\u09BE\u09B6\u09C7 \u09AC\u09BE\u099C\u09BF \u09A7\u09B0\u09BE \u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A8\u09BF\u09B7\u09BF\u09A6\u09CD\u09A7 (Self-Matching Block)\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09AF\u09C7\u0995\u09CB\u09A8\u09CB \u098F\u0995 \u09AA\u09BE\u09B6\u09C7 \u09AC\u09BE\u099C\u09BF \u09AC\u099C\u09BE\u09DF \u09B0\u09BE\u0996\u09C1\u09A8\u0964`
      });
    }
  }
  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: "Invalid bet amount" });
  }
  if (numAmount < tbl.config.minBet || numAmount > tbl.config.maxBet) {
    return res.status(400).json({
      error: `Bet amount is outside the allowed limits of this table.`
    });
  }
  const activeBal = balanceType === "real" ? user.balance : user.demoBalance;
  if (activeBal < numAmount) {
    return res.status(400).json({ error: "Insufficient balance for this bet" });
  }
  if (balanceType === "real") {
    user.balance -= numAmount;
  } else {
    user.demoBalance -= numAmount;
  }
  user.gamesPlayed += 1;
  const userStats = ensureUserStats(user);
  const betRecord = {
    id: `bet_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
    userId: user.userId,
    username: user.username,
    vipTier: "Standard",
    side: normalizedSide,
    amount: numAmount,
    balanceType,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    roundNumber: tbl.currentRound.roundNumber,
    tableSlug,
    status: "ACTIVE"
  };
  tbl.playerBets.unshift(betRecord);
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
    serverSeedHash: tbl.currentRound.serverSeedHash
  });
  if (userBetHistories[user.userId].length > 80) {
    userBetHistories[user.userId].pop();
  }
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
  broadcast({
    type: "NEW_BET",
    tableSlug,
    bet: betRecord,
    dragonPool: tbl.currentRound.dragonPool,
    tigerPool: tbl.currentRound.tigerPool,
    matchedAmount: tbl.currentRound.matchedAmount
  });
  persistStorage();
  res.json({
    success: true,
    bet: betRecord,
    newBalance: balanceType === "real" ? user.balance : user.demoBalance,
    round: tbl.currentRound
  });
});
app.post("/api/game/cancel-bet", requireUser, (req, res) => {
  const userId = req.userId;
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
    if (canceledBet.balanceType === "real") {
      user.balance += canceledBet.amount;
    } else {
      user.demoBalance += canceledBet.amount;
    }
    if (canceledBet.side === "DRAGON") {
      tbl.currentRound.dragonPool = Math.max(0, tbl.currentRound.dragonPool - canceledBet.amount);
      tbl.currentRound.dragonPlayers = Math.max(0, tbl.currentRound.dragonPlayers - 1);
    } else if (canceledBet.side === "TIGER") {
      tbl.currentRound.tigerPool = Math.max(0, tbl.currentRound.tigerPool - canceledBet.amount);
      tbl.currentRound.tigerPlayers = Math.max(0, tbl.currentRound.tigerPlayers - 1);
    }
    tbl.currentRound.matchedAmount = Math.min(tbl.currentRound.dragonPool, tbl.currentRound.tigerPool);
    const userHist = userBetHistories[userId];
    if (userHist) {
      const histItem = userHist.find((h) => h.id === canceledBet.id);
      if (histItem) {
        histItem.status = "CANCELLED";
        histItem.tkReturnStatus = "RETURNED_REFUND";
        histItem.returnedAmount = canceledBet.amount;
      }
    }
    broadcast({
      type: "BET_CANCELLED",
      tableSlug,
      betId: canceledBet.id,
      dragonPool: tbl.currentRound.dragonPool,
      tigerPool: tbl.currentRound.tigerPool,
      matchedAmount: tbl.currentRound.matchedAmount
    });
    persistStorage();
    return res.json({
      success: true,
      refundedAmount: canceledBet.amount,
      newBalance: canceledBet.balanceType === "real" ? user.balance : user.demoBalance,
      round: tbl.currentRound
    });
  }
  res.status(400).json({ success: false, error: "Failed to cancel bet" });
});
app.post(["/api/wallet/reset-demo", "/api/wallet/:userId/reset-demo"], (req, res) => {
  const sid = readCookie(req, "player_session") || (typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"] : null);
  const session = sid ? getSession(sid) : null;
  const userId = session?.userId || req.params.userId || (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) || req.body?.userId;
  if (!userId) {
    return res.status(400).json({ success: false, error: "User ID required" });
  }
  let user = mockUsers[userId];
  if (!user) {
    mockUsers[userId] = {
      userId,
      username: `Player_${userId.slice(0, 5)}`,
      balance: 0,
      demoBalance: 1e4,
      balanceType: "demo",
      lockedBalance: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      kycStatus: "none",
      transactions: []
    };
    user = mockUsers[userId];
  } else {
    user.demoBalance = 1e4;
  }
  addTransactionToUser(user, {
    id: `tx_${Date.now()}_demo_refill`,
    type: "faucet",
    amount: 1e4,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    description: "Refilled Demo Balance to \u09F310,000"
  });
  persistStorage();
  res.json({
    success: true,
    demoBalance: user.demoBalance,
    user
  });
});
app.post(["/api/wallet/toggle-balance", "/api/wallet/:userId/toggle-balance"], (req, res) => {
  const sid = readCookie(req, "player_session") || (typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"] : null);
  const session = sid ? getSession(sid) : null;
  const userId = session?.userId || req.params.userId || (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) || req.body?.userId;
  if (!userId) {
    return res.status(400).json({ success: false, error: "User ID required" });
  }
  const { balanceType } = req.body;
  let user = mockUsers[userId];
  if (!user) {
    mockUsers[userId] = {
      userId,
      username: `Player_${userId.slice(0, 5)}`,
      balance: 0,
      demoBalance: 1e4,
      balanceType: "real",
      lockedBalance: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      kycStatus: "none",
      transactions: []
    };
    user = mockUsers[userId];
  }
  if (balanceType === "real" || balanceType === "demo") {
    user.balanceType = balanceType;
  } else {
    user.balanceType = user.balanceType === "real" ? "demo" : "real";
  }
  persistStorage();
  res.json({
    success: true,
    balanceType: user.balanceType,
    user
  });
});
app.post("/api/verify", (req, res) => {
  const { serverSeed, serverSeedHash, clientSeed, nonce } = req.body;
  if (!serverSeed || !clientSeed || nonce === void 0) {
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
    algorithm: "HMAC-SHA512 with modulo bias rejection"
  });
});
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
  const userId = `user_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
  userCredentials[normalizedUser] = {
    userId,
    username: cleanUsername,
    passwordHash,
    salt
  };
  const newUser = {
    userId,
    username: cleanUsername,
    balance: 0,
    demoBalance: 1e4,
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
        amount: 1e4,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        description: "Welcome Demo Starter Chips (\u09F310,000)"
      }
    ]
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
    maxAge: 24 * 60 * 60 * 1e3,
    path: "/"
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
  if (!isTrustedDevice(user.userId, deviceId)) {
    if (FORCE_PASSWORD_RESET_ON_NEW_DEVICE) {
      const code2 = issueOtp(user.userId, deviceId);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV OTP - PASSWORD RESET] ${user.username} (${user.userId}) \u2192 ${code2}`);
      }
      return res.status(403).json({
        success: false,
        code: "PASSWORD_RESET_REQUIRED",
        error: "\u09A8\u09A4\u09C1\u09A8 \u09A1\u09BF\u09AD\u09BE\u0987\u09B8 \u09B6\u09A8\u09BE\u0995\u09CD\u09A4 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09A8\u09BF\u09B0\u09BE\u09AA\u09A4\u09CD\u09A4\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u0986\u09AA\u09A8\u09BE\u09B0 \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09CB\u09A1 \u09A6\u09BF\u09A8 \u0993 \u09A8\u09A4\u09C1\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09B8\u09C7\u099F \u0995\u09B0\u09C1\u09A8\u0964"
      });
    }
    const code = issueOtp(user.userId, deviceId);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV OTP - DEVICE VERIFICATION] ${user.username} (${user.userId}) \u2192 ${code}`);
    }
    return res.status(403).json({
      success: false,
      code: "DEVICE_VERIFICATION_REQUIRED",
      error: "\u09A8\u09A4\u09C1\u09A8 \u09A1\u09BF\u09AD\u09BE\u0987\u09B8 \u09B6\u09A8\u09BE\u0995\u09CD\u09A4 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u0986\u09AA\u09A8\u09BE\u09B0 \u09A8\u09BF\u09AC\u09A8\u09CD\u09A7\u09BF\u09A4 \u09A8\u09AE\u09CD\u09AC\u09B0\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09EC \u09B8\u0982\u0996\u09CD\u09AF\u09BE\u09B0 \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09CB\u09A1 \u09A6\u09BF\u09A8\u0964"
    });
  }
  const { session, evictedSessionId } = createSessionEvictingOthers(
    user.userId,
    deviceId,
    deviceLabel,
    req.ip || ""
  );
  if (evictedSessionId) {
    kickSession(evictedSessionId, "\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7 \u0985\u09A8\u09CD\u09AF \u098F\u0995\u099F\u09BF \u09A1\u09BF\u09AD\u09BE\u0987\u09B8 \u09A5\u09C7\u0995\u09C7 \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964");
  }
  trustDevice(user.userId, deviceId, deviceLabel);
  res.cookie("player_session", session.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1e3,
    path: "/"
  });
  res.json({
    success: true,
    user,
    sessionId: session.sessionId,
    device: { label: deviceLabel, evictedOther: !!evictedSessionId }
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
    kickSession(evictedSessionId, "\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7 \u0985\u09A8\u09CD\u09AF \u098F\u0995\u099F\u09BF \u09A1\u09BF\u09AD\u09BE\u0987\u09B8 \u09A5\u09C7\u0995\u09C7 \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964");
  }
  res.cookie("player_session", session.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1e3,
    path: "/"
  });
  return res.json({
    success: true,
    user,
    sessionId: session.sessionId,
    device: { label: deviceLabel, evictedOther: !!evictedSessionId }
  });
});
app.post("/api/auth/logout", (req, res) => {
  const sid = readCookie(req, "player_session") || (typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"] : null) || (typeof req.body?.sessionId === "string" ? req.body.sessionId : null);
  const targetUserId = (typeof req.body?.userId === "string" ? req.body.userId : null) || (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null);
  if (sid) {
    const session = getSession(sid);
    if (session) {
      revokeUserSessions(session.userId);
    }
  }
  if (targetUserId) {
    revokeUserSessions(targetUserId);
  }
  res.clearCookie("player_session", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  res.setHeader("Set-Cookie", "player_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax");
  res.json({ success: true, message: "Logged out successfully" });
});
app.get(["/api/user/devices", "/api/user/devices/:userId"], requireUser, (req, res) => {
  const userId = req.userId;
  res.json({ success: true, devices: listDevices(userId) });
});
app.post(["/api/user/devices/remove", "/api/user/devices/:userId/remove"], requireUser, (req, res) => {
  const userId = req.userId;
  const { deviceId } = req.body || {};
  if (deviceId) {
    removeDevice(userId, deviceId);
  }
  res.json({ success: true });
});
app.get("/api/wallet/:userId", (req, res) => {
  const { userId } = req.params;
  const usernameQuery = req.query.username || "";
  if (!mockUsers[userId]) {
    if (usernameQuery) {
      const cred = userCredentials[usernameQuery.trim().toLowerCase()];
      if (cred && cred.userId && mockUsers[cred.userId]) {
        ensureUserStats(mockUsers[cred.userId]);
        ensureUserCosmetics(mockUsers[cred.userId]);
        return res.json(mockUsers[cred.userId]);
      }
    }
    mockUsers[userId] = {
      userId,
      username: usernameQuery || `Player_${userId.slice(0, 5)}`,
      balance: 0,
      demoBalance: 1e4,
      balanceType: "real",
      lockedBalance: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      kycStatus: "none",
      transactions: []
    };
    persistStorage();
  }
  ensureUserStats(mockUsers[userId]);
  ensureUserCosmetics(mockUsers[userId]);
  res.json(mockUsers[userId]);
});
app.get("/api/user/cosmetics/:userId", (req, res) => {
  const { userId } = req.params;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ error: "User profile not found" });
  const cosmetics = ensureUserCosmetics(user);
  res.json({ success: true, cosmetics });
});
app.post("/api/user/cosmetics/equip", requireUser, (req, res) => {
  const userId = req.userId;
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
var ADMIN_SECRET = process.env.ADMIN_SECRET || crypto.randomBytes(32).toString("hex");
var ADMIN_CREDENTIALS = {
  username: (process.env.ADMIN_USERNAME || "admin").toLowerCase().trim(),
  passwordHash: crypto.createHash("sha256").update(process.env.ADMIN_PASSWORD || "AdminPass@2026!").digest("hex")
};
function generateAdminToken(username) {
  const payload = {
    username,
    exp: Date.now() + 8 * 60 * 60 * 1e3,
    nonce: crypto.randomBytes(16).toString("hex")
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", ADMIN_SECRET).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${sig}`;
}
function verifyAdminToken(token) {
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
function requireAdmin(req, res, next) {
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
      code: "UNAUTHORIZED"
    });
  }
  req.adminUser = result.username;
  next();
}
var cashierDeposits = [
  {
    id: "dep_1001",
    userId: "usr_seed_1",
    username: "DragonMaster",
    amount: 500,
    method: "bKash (Merchant Pay)",
    trxId: "9K2L1P0X",
    accountNumber: "01712345678",
    status: "PENDING",
    timestamp: new Date(Date.now() - 15 * 60 * 1e3).toISOString()
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
    timestamp: new Date(Date.now() - 35 * 60 * 1e3).toISOString()
  }
];
var cashierWithdrawals = [
  {
    id: "wdr_2001",
    userId: "usr_seed_3",
    username: "HighRollerBD",
    amount: 2500,
    method: "bKash Personal",
    accountNumber: "01999887766",
    status: "PENDING",
    timestamp: new Date(Date.now() - 20 * 60 * 1e3).toISOString()
  }
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
    stats
  });
});
app.get("/api/wallet/:userId/bets", (req, res) => {
  const { userId } = req.params;
  const user = mockUsers[userId];
  const username = user?.username || req.query.username || "Player";
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
  const winRate = settledCount > 0 ? Number((winsCount / settledCount * 100).toFixed(1)) : 0;
  const netPnL = totalWon + totalReturned - totalWagered;
  const response = {
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
    bets: history
  };
  res.json(response);
});
app.get("/api/wallet/:userId/history", (req, res) => {
  const { userId } = req.params;
  const user = mockUsers[userId];
  const username = user?.username || req.query.username || "Player";
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
  const winRate = settledCount > 0 ? Number((winsCount / settledCount * 100).toFixed(1)) : 0;
  const netPnL = totalWon + totalReturned - totalWagered;
  const response = {
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
    bets: history
  };
  res.json(response);
});
app.post("/api/wallet/deposit", requireUser, (req, res) => {
  const userId = req.userId;
  const { amount, method, description } = req.body;
  if (amount === void 0) {
    return res.status(400).json({ success: false, error: "Missing required parameter (amount)" });
  }
  let user = mockUsers[userId];
  if (!user) {
    user = {
      userId,
      username: `Player_${userId.slice(0, 6)}`,
      balance: 0,
      demoBalance: 1e4,
      balanceType: "real",
      lockedBalance: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      kycStatus: "none",
      transactions: []
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
    id: `tx_dep_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
    type: "deposit",
    amount: numAmount,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    description: cleanDesc
  };
  addTransactionToUser(user, tx);
  recordGlobalTransaction({
    type: "deposit",
    username: user.username,
    userId: user.userId,
    amount: numAmount,
    method: cleanMethod,
    status: "COMPLETED",
    description: cleanDesc
  });
  persistStorage();
  return res.json({ success: true, user, message: `Successfully deposited \u09F3${numAmount.toLocaleString()}!` });
});
app.post("/api/wallet/withdraw", requireUser, (req, res) => {
  const userId = req.userId;
  const { amount, method, accountNumber, description } = req.body;
  if (amount === void 0) {
    return res.status(400).json({ success: false, error: "Missing required parameter (amount)" });
  }
  let user = mockUsers[userId];
  if (!user) {
    user = {
      userId,
      username: `Player_${userId.slice(0, 6)}`,
      balance: 0,
      demoBalance: 1e4,
      balanceType: "real",
      lockedBalance: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      kycStatus: "none",
      transactions: []
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  const tx = {
    id: `tx_wdr_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
    type: "withdraw",
    amount: numAmount,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    description: cleanDesc
  };
  addTransactionToUser(user, tx);
  recordGlobalTransaction({
    type: "withdraw",
    username: user.username,
    userId: user.userId,
    amount: numAmount,
    method: cleanMethod,
    status: "PENDING",
    description: cleanDesc
  });
  persistStorage();
  return res.json({ success: true, user, message: `Withdrawal request for \u09F3${numAmount.toLocaleString()} submitted for compliance review!` });
});
app.post("/api/wallet/transfer", (_req, res) => {
  return res.status(403).json({
    success: false,
    error: "Direct peer-to-peer wallet transfers are disabled for anti-money laundering and account integrity compliance. Please use P2P challenge rooms for gameplay.",
    code: "P2P_TRANSFER_DISABLED"
  });
});
app.post("/api/sync/client-state", (req, res) => {
  const { clientProfile, clientBets } = req.body || {};
  if (!clientProfile || !clientProfile.userId) {
    return res.status(400).json({ success: false, error: "Invalid client profile" });
  }
  const userId = clientProfile.userId;
  let serverUser = mockUsers[userId];
  if (!serverUser) {
    serverUser = {
      userId: clientProfile.userId,
      username: clientProfile.username || `Player_${userId.slice(0, 5)}`,
      balance: typeof clientProfile.balance === "number" ? clientProfile.balance : 0,
      demoBalance: typeof clientProfile.demoBalance === "number" ? clientProfile.demoBalance : 1e4,
      balanceType: clientProfile.balanceType || "real",
      lockedBalance: clientProfile.lockedBalance || 0,
      totalWon: clientProfile.totalWon || 0,
      totalLost: clientProfile.totalLost || 0,
      gamesPlayed: clientProfile.gamesPlayed || 0,
      kycStatus: clientProfile.kycStatus || "none",
      transactions: Array.isArray(clientProfile.transactions) ? clientProfile.transactions : []
    };
    mockUsers[userId] = serverUser;
    if (Array.isArray(clientBets) && clientBets.length > 0 && !userBetHistories[userId]) {
      userBetHistories[userId] = clientBets;
    }
    persistStorage();
    console.log(`[STORAGE] Re-hydrated user ${serverUser.username} (${serverUser.userId}) with balance \u09F3${serverUser.balance} from client state.`);
  } else {
    ensureUserStats(serverUser);
    ensureUserCosmetics(serverUser);
  }
  return res.json({
    success: true,
    user: serverUser,
    message: "User synchronized successfully"
  });
});
app.get("/api/admin/export-database", requireAdmin, (_req, res) => {
  res.setHeader("Content-Disposition", `attachment; filename=apex_dragon_tiger_db_${Date.now()}.json`);
  res.setHeader("Content-Type", "application/json");
  res.json({
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    users: mockUsers,
    credentials: userCredentials,
    betHistories: userBetHistories,
    cashierWithdrawals
  });
});
app.post("/api/admin/import-database", requireAdmin, (req, res) => {
  const { users, credentials, betHistories, cashierWithdrawals: withdrawals } = req.body || {};
  if (users && typeof users === "object") {
    Object.assign(mockUsers, users);
  }
  if (credentials && typeof credentials === "object") {
    Object.assign(userCredentials, credentials);
  }
  if (betHistories && typeof betHistories === "object") {
    Object.assign(userBetHistories, betHistories);
  }
  if (Array.isArray(withdrawals)) {
    cashierWithdrawals.length = 0;
    cashierWithdrawals.push(...withdrawals);
  }
  persistStorage();
  res.json({
    success: true,
    message: `Database restored with ${Object.keys(mockUsers).length} users.`
  });
});
var globalTransactions = [];
function recordGlobalTransaction(tx) {
  const hexChars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += hexChars[Math.floor(Math.random() * hexChars.length)];
  }
  const newTx = {
    ...tx,
    id: `gtx_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
    txHash: hash,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  globalTransactions.unshift(newTx);
  if (globalTransactions.length > 500) {
    globalTransactions.pop();
  }
  return newTx;
}
app.get("/api/transparency/transactions", (req, res) => {
  const { type, search, limit } = req.query;
  let results = [...globalTransactions];
  if (type && type !== "all") {
    results = results.filter((tx) => tx.type === type);
  }
  if (search && typeof search === "string" && search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter(
      (tx) => tx.username.toLowerCase().includes(q) || tx.recipientUsername && tx.recipientUsername.toLowerCase().includes(q) || tx.txHash.toLowerCase().includes(q) || tx.method.toLowerCase().includes(q) || tx.description.toLowerCase().includes(q)
    );
  }
  const max = Number(limit) || 100;
  res.json({
    success: true,
    totalCount: results.length,
    transactions: results.slice(0, max)
  });
});
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
    playersOnline: (t.currentRound.dragonPlayers || 0) + (t.currentRound.tigerPlayers || 0) || 1
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
      gamesPlayed: u.gamesPlayed
    }))
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
  if (minBet !== void 0) tbl.config.minBet = Number(minBet);
  if (maxBet !== void 0) tbl.config.maxBet = Number(maxBet);
  if (bettingDuration !== void 0) tbl.config.bettingDuration = Number(bettingDuration);
  res.json({ success: true, config: tbl.config });
});
app.post("/api/merchant/test", (req, res) => {
  const { endpoint, method, payload } = req.body;
  const sampleResponses = {
    "/player/create": { success: true, playerId: "ext_user_8829", currency: "INR", balance: 5e3 },
    "/player/deposit": { success: true, transactionId: `tx_merch_${Date.now()}`, newBalance: 15e3 },
    "/player/launch-game": {
      success: true,
      gameUrl: "https://dragontiger.p2p.casino/play?token=session_jwt_apex_token_8892&table=classic",
      expiresIn: 3600
    }
  };
  res.json({
    endpoint,
    method,
    status: 200,
    timeMs: Math.floor(Math.random() * 25) + 12,
    response: sampleResponses[endpoint] || { success: true, status: "acknowledged", payload }
  });
});
var recentRoomAttempts = {};
var checkExpiredRooms = () => {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1e3;
  for (let i = activeRooms.length - 1; i >= 0; i--) {
    const room = activeRooms[i];
    if (room.status === "open" && room.createdAt) {
      const createdTime = new Date(room.createdAt).getTime();
      const elapsed = now - createdTime;
      room.autoCloseSecondsRemaining = Math.max(0, Math.floor((FIVE_MINUTES - elapsed) / 1e3));
      if (elapsed > FIVE_MINUTES) {
        room.status = "cancelled";
        const creator = mockUsers[room.creatorId];
        if (creator) {
          creator.balance += room.amount;
          addTransactionToUser(creator, {
            id: `tx_p2p_expire_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            type: "deposit",
            amount: room.amount,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            description: `Refund P2P Challenge: Room expired after 5 minutes without opponent (Stake: \u09F3${room.amount.toLocaleString()})`
          });
        }
        activeRooms.splice(i, 1);
        broadcast({ type: "ROOM_EXPIRED", roomId: room.id });
      }
    }
  }
};
setInterval(checkExpiredRooms, 1e4);
var memorySweepInterval = setInterval(() => {
  const now = Date.now();
  for (const uid in recentRoomAttempts) {
    recentRoomAttempts[uid] = recentRoomAttempts[uid].filter((t) => now - t < 5 * 60 * 1e3);
    if (recentRoomAttempts[uid].length === 0) {
      delete recentRoomAttempts[uid];
    }
  }
  for (const duelId in activeDuels) {
    const duel = activeDuels[duelId];
    if (duel && duel.status === "SETTLED" && now - duel.lastUpdated > 3e4) {
      delete activeDuels[duelId];
    }
  }
  for (const uid in userActivityLogs) {
    if (userActivityLogs[uid] && userActivityLogs[uid].length > 30) {
      userActivityLogs[uid].length = 30;
    }
  }
  for (const uid in mockUsers) {
    const u = mockUsers[uid];
    if (u && u.transactions && u.transactions.length > 40) {
      u.transactions.length = 40;
    }
  }
  for (const uid in userBetHistories) {
    if (userBetHistories[uid] && userBetHistories[uid].length > 40) {
      userBetHistories[uid].length = 40;
    }
  }
  if (p2pRoomsHistory.length > 60) {
    p2pRoomsHistory.length = 60;
  }
  if (globalTransactions.length > 100) {
    globalTransactions.length = 100;
  }
  if (chatMessages.length > 60) {
    chatMessages.length = 60;
  }
  if (playerReports.length > 40) {
    playerReports.length = 40;
  }
  if (roundDisputes.length > 40) {
    roundDisputes.length = 40;
  }
  if (adminGrants.length > 40) {
    adminGrants.length = 40;
  }
  if (cashierDeposits.length > 50) {
    cashierDeposits.length = 50;
  }
  if (cashierWithdrawals.length > 50) {
    cashierWithdrawals.length = 50;
  }
  try {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    if (heapUsedMB > 350) {
      console.warn(`[MemoryWatchdog] High heap memory detected (${heapUsedMB} MB). Performing emergency array trim.`);
      for (const uid in userActivityLogs) {
        userActivityLogs[uid].length = Math.min(userActivityLogs[uid].length, 10);
      }
      for (const uid in userBetHistories) {
        userBetHistories[uid].length = Math.min(userBetHistories[uid].length, 15);
      }
      for (const uid in mockUsers) {
        if (mockUsers[uid]?.transactions) {
          mockUsers[uid].transactions.length = Math.min(mockUsers[uid].transactions.length, 15);
        }
      }
      if (global.gc) {
        global.gc();
      }
    }
  } catch {
  }
}, 60 * 1e3);
memorySweepInterval.unref();
app.get("/api/rooms", (req, res) => {
  checkExpiredRooms();
  const reqUserId = req.query.userId || req.headers["x-user-id"];
  const sanitized = activeRooms.map((room) => {
    if (reqUserId && room.creatorId === reqUserId) {
      return room;
    }
    const { password, ...rest } = room;
    return {
      ...rest,
      hasPassword: !!password,
      password: password ? "\u{1F512} Protected" : void 0
    };
  });
  res.json(sanitized);
});
app.post("/api/rooms/create", requireUser, (req, res) => {
  const userId = req.userId;
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
    choice
  } = req.body;
  if (!mockUsers[userId]) {
    return res.status(401).json({
      error: "Authentication required. Every player must be logged in to create challenge bets.",
      code: "AUTH_REQUIRED"
    });
  }
  const now = Date.now();
  if (!recentRoomAttempts[userId]) recentRoomAttempts[userId] = [];
  recentRoomAttempts[userId] = recentRoomAttempts[userId].filter((t) => now - t < 6e4);
  recentRoomAttempts[userId].push(now);
  const isHighFrequencySpam = recentRoomAttempts[userId].length >= 4;
  if (recentRoomAttempts[userId].length > 7) {
    return res.status(429).json({
      error: "\u26A0\uFE0F \u09B8\u09BF\u0995\u09BF\u0989\u09B0\u09BF\u099F\u09BF \u09B8\u09A4\u09B0\u09CD\u0995\u09A4\u09BE: \u0985\u09A4\u09CD\u09AF\u09A7\u09BF\u0995 \u09A6\u09CD\u09B0\u09C1\u09A4 \u09B0\u09C1\u09AE \u09B0\u09BF\u0995\u09CB\u09AF\u09BC\u09C7\u09B8\u09CD\u099F \u09B6\u09A8\u09BE\u0995\u09CD\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7 (Bot Spam Defense)\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09E9\u09E6 \u09B8\u09C7\u0995\u09C7\u09A8\u09CD\u09A1 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8\u0964",
      botSpamDetected: true
    });
  }
  const hasActiveRoom = activeRooms.some((r) => r.creatorId === userId && r.status === "open");
  if (hasActiveRoom) {
    return res.status(400).json({
      error: "\u{1F6AB} \u0986\u09AA\u09A8\u09BE\u09B0 \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u098F\u0995\u099F\u09BF \u09B8\u0995\u09CD\u09B0\u09BF\u09AF\u09BC \u09A1\u09C1\u09AF\u09BC\u09C7\u09B2 \u09B0\u09C1\u09AE \u09B0\u09DF\u09C7\u099B\u09C7! \u09A8\u09A4\u09C1\u09A8 \u09B0\u09C1\u09AE \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09A4\u09C7 \u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 \u09B8\u0995\u09CD\u09B0\u09BF\u09DF \u09B0\u09C1\u09AE\u099F\u09BF \u09A1\u09BF\u09B2\u09BF\u099F \u09AC\u09BE \u0995\u09CD\u09AF\u09BE\u09A8\u09CD\u09B8\u09C7\u09B2 \u0995\u09B0\u09C1\u09A8\u0964"
    });
  }
  const user = mockUsers[userId];
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 1) {
    return res.status(400).json({ error: "Minimum challenge stake is \u09F31 chip" });
  }
  const parsedMinStake = Number(minStake) || 1;
  const parsedMaxStake = Number(maxStake) || 1e5;
  if (parsedMinStake < 1 || parsedMaxStake < parsedMinStake) {
    return res.status(400).json({ error: "\u0985\u09AC\u09C8\u09A7 \u09A8\u09CD\u09AF\u09C2\u09A8\u09A4\u09AE \u09AC\u09BE \u09B8\u09B0\u09CD\u09AC\u09CB\u099A\u09CD\u099A \u09AC\u09BE\u099C\u09BF \u09B8\u09C0\u09AE\u09BE!" });
  }
  let calculatedAcceptorAmount = 0;
  if (clientAcceptorAmount !== void 0 && !isNaN(Number(clientAcceptorAmount)) && Number(clientAcceptorAmount) >= 1) {
    calculatedAcceptorAmount = Math.round(Number(clientAcceptorAmount));
  } else {
    let numOdds2 = Number(odds);
    if (isNaN(numOdds2) || numOdds2 < 1.05) numOdds2 = 2;
    if (numOdds2 > 50) numOdds2 = 50;
    calculatedAcceptorAmount = Math.max(1, Math.round(numAmount * (numOdds2 - 1)));
  }
  const totalPot = numAmount + calculatedAcceptorAmount;
  const numOdds = Number((totalPot / numAmount).toFixed(2));
  if (numOdds < 1.05 || numOdds > 50) {
    return res.status(400).json({ error: "Invalid challenge odds ratio. Odds multiplier must be between 1.05x and 50.0x." });
  }
  if (user.balance < numAmount) {
    return res.status(400).json({ error: `\u{1F6AB} \u0985\u09AA\u09B0\u09CD\u09AF\u09BE\u09AA\u09CD\u09A4 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8! \u09B0\u09C1\u09AE \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09A4\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u09AE\u09C2\u09B2 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8\u09C7 \u0985\u09A8\u09CD\u09A4\u09A4 \u09F3${numAmount.toLocaleString()} \u099A\u09BF\u09AA\u09B8 \u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964 \u09A6\u09DF\u09BE \u0995\u09B0\u09C7 Add Fund \u09AC\u09BE \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u0995\u09B0\u09C1\u09A8\u0964` });
  }
  user.balance -= numAmount;
  addTransactionToUser(user, {
    id: `tx_p2p_create_${Date.now()}`,
    type: "withdraw",
    amount: numAmount,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    description: `Created P2P Challenge: Risked \u09F3${numAmount.toLocaleString()} (Min: \u09F3${parsedMinStake.toLocaleString()}, Max: \u09F3${parsedMaxStake.toLocaleString()})`
  });
  const selectedChoice = choice === "tiger" || choice === "dragon" ? choice : "dragon";
  const tags = [];
  if (numAmount <= 200) tags.push("Newbie Friendly");
  if (numAmount >= 3e3) tags.push("High Roller");
  if (isSingleRoundQuickChallenge) tags.push("Fast Action", "1v1 Quick");
  else tags.push("Classic Duel");
  if (invitedUsername) tags.push("Direct Invite");
  const activityScore = isSingleRoundQuickChallenge ? 85 : numAmount >= 1e3 ? 75 : 50;
  const isFastAction = isSingleRoundQuickChallenge === true || parsedMinStake <= 50 && numAmount <= 500;
  const isHotRoom = activityScore >= 75 || numAmount >= 2500;
  const newRoom = {
    id: `room_${Date.now()}`,
    creatorId: userId,
    creatorName: username || user.username,
    amount: numAmount,
    choice: selectedChoice,
    odds: numOdds,
    acceptorAmount: calculatedAcceptorAmount,
    status: "open",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    isPrivate: isPrivate === true || Boolean(password),
    password: password || void 0,
    minStake: parsedMinStake,
    maxStake: parsedMaxStake,
    invitedUsername: invitedUsername ? String(invitedUsername).trim().replace(/^@/, "") : void 0,
    activityScore,
    lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
    isFastAction,
    isHotRoom,
    tags,
    autoCloseSecondsRemaining: 300,
    capacityPercent: 50,
    recentBetActionsCount: isSingleRoundQuickChallenge ? 9 : 3,
    isSingleRoundQuickChallenge: isSingleRoundQuickChallenge === true
  };
  activeRooms.unshift(newRoom);
  p2pRoomsHistory.unshift(newRoom);
  if (p2pRoomsHistory.length > 100) p2pRoomsHistory.pop();
  broadcast({ type: "ROOM_CREATED", room: newRoom });
  res.json({
    success: true,
    room: newRoom,
    user,
    botSpamWarning: isHighFrequencySpam ? "High creation frequency detected from your IP. Please avoid rapid creation/deletion." : void 0
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
  const userId = req.userId;
  const { roomId, username, password, acceptorStake: customAcceptorStake } = req.body;
  if (!mockUsers[userId]) {
    return res.status(401).json({
      error: "Authentication required. Every player must be logged in to accept challenge bets.",
      code: "AUTH_REQUIRED"
    });
  }
  const room = activeRooms.find((r) => r.id === roomId);
  if (!room || room.status !== "open") {
    return res.status(400).json({ error: "Challenge is no longer available or already matched" });
  }
  if (room.invitedUsername) {
    const acceptorUsername = (username || mockUsers[userId]?.username || "").trim().toLowerCase().replace(/^@/, "");
    const cleanInvited = room.invitedUsername.trim().toLowerCase().replace(/^@/, "");
    if (acceptorUsername !== cleanInvited) {
      return res.status(403).json({
        error: `\u{1F6AB} \u098F\u0987 \u09A1\u09C1\u09AF\u09BC\u09C7\u09B2 \u09B0\u09C1\u09AE\u099F\u09BF \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 @${cleanInvited} \u098F\u09B0 \u099C\u09A8\u09CD\u09AF \u09A8\u09BF\u09B0\u09CD\u09A7\u09BE\u09B0\u09BF\u09A4\u0964`
      });
    }
  }
  if (room.isPrivate) {
    if (!password || room.password !== password) {
      return res.status(400).json({ error: "\u{1F6AB} \u09AD\u09C1\u09B2 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1! \u09B8\u09A0\u09BF\u0995 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09A6\u09BF\u09DF\u09C7 \u099C\u09DF\u09C7\u09A8 \u0995\u09B0\u09C1\u09A8 \u09AC\u09BE \u099C\u09DF\u09C7\u09A8\u09BF\u0982 \u09B2\u09BF\u0999\u09CD\u0995 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964" });
    }
  }
  if (room.creatorId === userId) {
    return res.status(400).json({ error: "You cannot accept your own challenge. Use 'Cancel & Refund' to cancel it." });
  }
  let requiredAcceptorStake = Math.max(1, room.acceptorAmount || Math.round(room.amount * ((room.odds || 2) - 1)));
  if (customAcceptorStake !== void 0 && !isNaN(Number(customAcceptorStake))) {
    const customStakeNum = Math.max(1, Number(customAcceptorStake));
    if (room.minStake !== void 0 && customStakeNum < room.minStake) {
      return res.status(400).json({ error: `\u{1F6AB} \u09AC\u09BE\u099C\u09BF\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u09B0\u09C1\u09AE \u0995\u09CD\u09B0\u09BF\u09DF\u09C7\u099F\u09B0 \u0995\u09B0\u09CD\u09A4\u09C3\u0995 \u09A8\u09BF\u09B0\u09CD\u09A7\u09BE\u09B0\u09BF\u09A4 \u09B8\u09B0\u09CD\u09AC\u09A8\u09BF\u09AE\u09CD\u09A8 \u09AC\u09BE\u099C\u09BF \u09F3${room.minStake.toLocaleString()} \u098F\u09B0 \u0995\u09AE \u09B9\u09A4\u09C7 \u09AA\u09BE\u09B0\u09AC\u09C7 \u09A8\u09BE\u0964` });
    }
    if (room.maxStake !== void 0 && customStakeNum > room.maxStake) {
      return res.status(400).json({ error: `\u{1F6AB} \u09AC\u09BE\u099C\u09BF\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u09B0\u09C1\u09AE \u0995\u09CD\u09B0\u09BF\u09DF\u09C7\u099F\u09B0 \u0995\u09B0\u09CD\u09A4\u09C3\u0995 \u09A8\u09BF\u09B0\u09CD\u09A7\u09BE\u09B0\u09BF\u09A4 \u09B8\u09B0\u09CD\u09AC\u09CB\u099A\u09CD\u099A \u09AC\u09BE\u099C\u09BF \u09F3${room.maxStake.toLocaleString()} \u098F\u09B0 \u09AC\u09C7\u09B6\u09BF \u09B9\u09A4\u09C7 \u09AA\u09BE\u09B0\u09AC\u09C7 \u09A8\u09BE\u0964` });
    }
    requiredAcceptorStake = Math.round(customStakeNum);
  }
  const acceptor = mockUsers[userId];
  if (acceptor.balance < requiredAcceptorStake) {
    return res.status(400).json({ error: `Insufficient balance to accept duel. Required stake: \u09F3${requiredAcceptorStake.toLocaleString()} chips.` });
  }
  acceptor.balance -= requiredAcceptorStake;
  room.acceptorId = userId;
  room.acceptorName = username || acceptor.username;
  room.status = "matched";
  room.capacityPercent = 100;
  room.lastActiveAt = (/* @__PURE__ */ new Date()).toISOString();
  room.activityScore = Math.min(100, (room.activityScore || 50) + 35);
  const seed = generateServerSeed();
  const cards = deriveCards(seed, "p2p_duel", Date.now());
  room.dragonCard = cards.dragonCard;
  room.tigerCard = cards.tigerCard;
  room.winner = cards.result.toLowerCase();
  if (room.isSingleRoundQuickChallenge) {
    const totalPot = new Decimal(room.amount).plus(requiredAcceptorStake).toNumber();
    const companyFee = new Decimal(totalPot).times(0.05).round().toNumber();
    const winnerPayout = new Decimal(totalPot).minus(companyFee).toNumber();
    const creatorUser2 = mockUsers[room.creatorId];
    metrics.todayCommission = new Decimal(metrics.todayCommission).plus(companyFee).toNumber();
    metrics.todayMatchedVolume = new Decimal(metrics.todayMatchedVolume).plus(totalPot).toNumber();
    if (room.winner === "tie") {
      metrics.todayTieRevenue += totalPot;
      room.status = "completed";
    } else {
      const creatorWon = room.winner === "dragon" && room.choice === "dragon" || room.winner === "tiger" && room.choice === "tiger";
      if (creatorWon && creatorUser2) {
        creatorUser2.balance += winnerPayout;
        creatorUser2.totalWon += winnerPayout - room.amount;
        addTransactionToUser(creatorUser2, {
          id: `tx_quick_win_${Date.now()}`,
          type: "win",
          amount: winnerPayout,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          description: `Won 1v1 Quick Challenge Pot: +\u09F3${winnerPayout.toLocaleString()} (5% House Rake: \u09F3${companyFee.toLocaleString()})`
        });
      } else {
        acceptor.balance += winnerPayout;
        acceptor.totalWon += winnerPayout - requiredAcceptorStake;
        addTransactionToUser(acceptor, {
          id: `tx_quick_win_${Date.now()}`,
          type: "win",
          amount: winnerPayout,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          description: `Won 1v1 Quick Challenge Pot: +\u09F3${winnerPayout.toLocaleString()} (5% House Rake: \u09F3${companyFee.toLocaleString()})`
        });
      }
      room.status = "completed";
    }
  }
  const creatorRole = room.choice.toUpperCase();
  const acceptorRole = creatorRole === "DRAGON" ? "TIGER" : "DRAGON";
  const creatorUser = mockUsers[room.creatorId];
  const creatorElo = creatorUser?.cosmetics?.eloRating || 1200;
  const acceptorElo = acceptor?.cosmetics?.eloRating || 1200;
  const creatorTotal = (creatorUser?.totalWon || 0) + (creatorUser?.totalLost || 0);
  const creatorWinRate = (creatorUser?.gamesPlayed || 0) > 0 && creatorTotal > 0 ? Math.round((creatorUser?.totalWon || 0) / creatorTotal * 100) : 0;
  const acceptorTotal = (acceptor?.totalWon || 0) + (acceptor?.totalLost || 0);
  const acceptorWinRate = (acceptor?.gamesPlayed || 0) > 0 && acceptorTotal > 0 ? Math.round((acceptor?.totalWon || 0) / acceptorTotal * 100) : 0;
  activeDuels[roomId] = {
    id: roomId,
    status: "ROLE_COIN_FLIP",
    tier: room.amount < 500 ? "Express" : room.amount < 2e3 ? "Classic" : "VIP",
    creatorId: room.creatorId,
    creatorName: room.creatorName,
    creatorRole,
    creatorCard: creatorRole === "DRAGON" ? cards.dragonCard : cards.tigerCard,
    creatorBet: room.amount,
    creatorPeeked: false,
    creatorElo,
    creatorWinRate,
    acceptorId: userId,
    acceptorName: room.acceptorName || acceptor.username || "Opponent",
    acceptorRole,
    acceptorCard: acceptorRole === "DRAGON" ? cards.dragonCard : cards.tigerCard,
    acceptorBet: requiredAcceptorStake,
    acceptorPeeked: false,
    acceptorElo,
    acceptorWinRate,
    currentPot: room.amount + requiredAcceptorStake,
    currentRaise: Math.max(room.amount, requiredAcceptorStake),
    bettingRound: 1,
    turnUser: "DRAGON",
    secondsRemaining: 60,
    raisesCount: 0,
    spectatorsCount: getDuelSpectatorsCount(roomId, room.creatorId, userId),
    lastUpdated: Date.now()
  };
  broadcast({ type: "ROOM_RESOLVED", room, duel: activeDuels[roomId] });
  res.json({ success: true, room, duel: activeDuels[roomId] });
});
app.get("/api/rooms/active-duel", (req, res) => {
  const userId = req.query.userId || req.headers["x-user-id"];
  if (!userId) return res.json({ activeDuel: null });
  const ongoing = Object.values(activeDuels).find(
    (d) => (d.creatorId === userId || d.acceptorId === userId) && d.status !== "SETTLED"
  );
  if (!ongoing) return res.json({ activeDuel: null });
  const room = activeRooms.find((r) => r.id === ongoing.id) || p2pRoomsHistory.find((r) => r.id === ongoing.id);
  res.json({ activeDuel: ongoing, room: room || null });
});
app.get("/api/rooms/duel/:roomId", (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.query;
  const duel = activeDuels[roomId];
  if (!duel) {
    const room = activeRooms.find((r) => r.id === roomId);
    if (room && room.status === "completed") {
      return res.json({
        id: roomId,
        status: "SETTLED",
        winnerRole: room.winner?.toUpperCase(),
        dragonPlayer: { userId: room.choice === "dragon" ? room.creatorId : room.acceptorId, card: room.dragonCard },
        tigerPlayer: { userId: room.choice === "tiger" ? room.creatorId : room.acceptorId, card: room.tigerCard }
      });
    }
    return res.status(404).json({ error: "Active duel not found or expired" });
  }
  const responseState = {
    ...duel,
    spectatorsCount: getDuelSpectatorsCount(roomId, duel.creatorId, duel.acceptorId)
  };
  const isCreator = userId === duel.creatorId;
  const isAcceptor = userId === duel.acceptorId;
  if (duel.status !== "SHOWDOWN" && duel.status !== "SETTLED") {
    if (isCreator) {
      if (duel.creatorRole === "DRAGON") {
        responseState.acceptorCard = void 0;
      } else {
        responseState.acceptorCard = void 0;
      }
    } else if (isAcceptor) {
      if (duel.acceptorRole === "DRAGON") {
        responseState.creatorCard = void 0;
      } else {
        responseState.creatorCard = void 0;
      }
    } else {
      responseState.creatorCard = void 0;
      responseState.acceptorCard = void 0;
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
  const userId = req.userId;
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
    additionalCost = duel.creatorBet + duel.acceptorBet;
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
    return res.status(400).json({ error: `Insufficient balance. Action cost is \u09F3${additionalCost.toLocaleString()} but you have \u09F3${user.balance.toLocaleString()}.` });
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
  const creatorHasActed = duel.creatorAction !== void 0;
  const acceptorHasActed = duel.acceptorAction !== void 0;
  if (creatorHasActed && acceptorHasActed && duel.creatorBet === duel.acceptorBet) {
    if (duel.bettingRound < 2 && duel.raisesCount < 3) {
      duel.bettingRound += 1;
      duel.creatorAction = void 0;
      duel.acceptorAction = void 0;
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
  const userId = req.userId;
  const { roomId } = req.body;
  if (!mockUsers[userId]) {
    return res.status(401).json({
      error: "Authentication required",
      code: "AUTH_REQUIRED"
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
    addTransactionToUser(user, {
      id: `tx_room_cancel_${Date.now()}`,
      type: "refund",
      amount: room.amount,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      description: `P2P Challenge Cancelled: \u09F3${room.amount.toLocaleString()} 100% refunded to wallet`
    });
  }
  broadcast({ type: "ROOM_CANCELLED", roomId });
  const histRoom = p2pRoomsHistory.find((r) => r.id === roomId);
  if (histRoom) {
    histRoom.status = "cancelled";
  }
  res.json({ success: true, refundedAmount: room.amount, user });
});
app.get("/api/rooms/history/:userId", (req, res) => {
  const { userId } = req.params;
  const history = p2pRoomsHistory.filter(
    (r) => r.creatorId === userId || r.acceptorId === userId
  );
  res.json(history);
});
app.get("/api/leaderboard", (req, res) => {
  const list = Object.values(mockUsers).filter((u) => (u.gamesPlayed || 0) > 0).map((u) => {
    const netProfit = (u.totalWon || 0) - (u.totalLost || 0);
    const totalDecided = (u.totalWon || 0) + (u.totalLost || 0);
    return {
      userId: u.userId,
      username: u.username,
      balance: u.balance,
      profit: netProfit,
      winRate: u.gamesPlayed > 0 && totalDecided > 0 ? Math.round((u.totalWon || 0) / totalDecided * 100) : 0,
      gamesPlayed: u.gamesPlayed,
      vipTier: u.cosmetics?.eloTier || "Standard",
      eloRating: u.cosmetics?.eloRating || 1e3,
      eloTier: u.cosmetics?.eloTier || "Bronze",
      equippedFrame: u.cosmetics?.equippedFrame,
      equippedTitle: u.cosmetics?.equippedTitle
    };
  }).sort((a, b) => b.profit - a.profit);
  res.json(list);
});
app.get(["/api/site/liquidity", "/api/transparency"], (_req, res) => {
  let totalRealBalance = 0;
  let totalDemoBalance = 0;
  let totalLockedEscrow = 0;
  Object.values(tables).forEach((t) => {
    t.playerBets.forEach((b) => {
      if (b.status === "ACTIVE") {
        totalLockedEscrow += b.amount;
      }
    });
  });
  activeRooms.forEach((r) => {
    if (r.status === "open") {
      totalLockedEscrow += r.amount;
    }
  });
  const userList = Object.values(mockUsers).map((u, idx) => {
    totalRealBalance += u.balance;
    totalDemoBalance += u.demoBalance;
    let userActiveEscrow = 0;
    Object.values(tables).forEach((t) => {
      t.playerBets.forEach((b) => {
        if (b.userId === u.userId && b.status === "ACTIVE") {
          userActiveEscrow += b.amount;
        }
      });
    });
    const isOnline = true;
    const status = userActiveEscrow > 0 ? "IN_GAME" : idx % 2 === 0 ? "ACTIVE" : "IDLE";
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
      lastActive: new Date(Date.now() - idx * 45e3).toISOString()
    };
  });
  userList.sort((a, b) => b.balance - a.balance);
  const totalSiteLiquidity = totalRealBalance + totalLockedEscrow;
  const totalActivePlayers = wss.clients.size;
  const responseData = {
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
      todayGlobalTurnover: metrics.todayMatchedVolume
    },
    tableLiquidity: {
      express: {
        pool: (tables["express"]?.currentRound.dragonPool || 0) + (tables["express"]?.currentRound.tigerPool || 0),
        matched: tables["express"]?.currentRound.matchedAmount || 0,
        players: (tables["express"]?.currentRound.dragonPlayers || 0) + (tables["express"]?.currentRound.tigerPlayers || 0)
      },
      classic: {
        pool: (tables["classic"]?.currentRound.dragonPool || 0) + (tables["classic"]?.currentRound.tigerPool || 0),
        matched: tables["classic"]?.currentRound.matchedAmount || 0,
        players: (tables["classic"]?.currentRound.dragonPlayers || 0) + (tables["classic"]?.currentRound.tigerPlayers || 0)
      },
      vip: {
        pool: (tables["vip"]?.currentRound.dragonPool || 0) + (tables["vip"]?.currentRound.tigerPool || 0),
        matched: tables["vip"]?.currentRound.matchedAmount || 0,
        players: (tables["vip"]?.currentRound.dragonPlayers || 0) + (tables["vip"]?.currentRound.tigerPlayers || 0)
      }
    },
    users: userList,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  res.json(responseData);
});
app.get("/api/p2p/capacity-trends", (_req, res) => {
  const now = /* @__PURE__ */ new Date();
  const points = [];
  const currentConnected = wss.clients.size;
  const currentRooms = activeRooms.length;
  const currentCapacity = currentRooms > 0 ? Math.min(100, Math.round(activeRooms.filter((r) => r.status === "matched").length / currentRooms * 100)) : 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 10 * 60 * 1e3);
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    points.push({
      time: timeStr,
      players: currentConnected,
      capacityPct: currentCapacity,
      activeRooms: currentRooms
    });
  }
  res.json({ success: true, points });
});
app.post("/api/reports/submit", (req, res) => {
  const { reporterUserId, reporterUsername, reportedUserId, reportedUsername, reason, details } = req.body;
  if (!reporterUserId || !reportedUserId || !reason) {
    return res.status(400).json({ error: "Missing required report information." });
  }
  const report = {
    id: `rep_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
    reporterUserId,
    reporterUsername: reporterUsername || "Anonymous",
    reportedUserId,
    reportedUsername: reportedUsername || "Unknown Player",
    reason,
    details: details || "",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: "PENDING"
  };
  playerReports.unshift(report);
  broadcast({
    type: "PLAYER_REPORTED",
    report: {
      id: report.id,
      reportedUsername: report.reportedUsername,
      reason: report.reason,
      timestamp: report.timestamp
    }
  });
  res.json({
    success: true,
    message: `Player @${report.reportedUsername} successfully reported for '${reason}'. Security review team notified.`,
    report
  });
});
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
    serverSeedHash
  } = req.body;
  if (!userId || !description || !description.trim()) {
    return res.status(400).json({ error: "Missing required dispute information." });
  }
  const dispute = {
    id: `disp_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
    userId,
    username: username || mockUsers[userId]?.username || "Player",
    roundNumber: roundNumber ? Number(roundNumber) : void 0,
    tableSlug,
    tableName,
    roomId,
    betAmount: betAmount ? Number(betAmount) : void 0,
    side,
    issueType: issueType || "Result Dispute",
    description: description.trim(),
    status: "PENDING",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    roundDetails: {
      dragonCard: typeof dragonCard === "object" ? dragonCard?.display : dragonCard,
      tigerCard: typeof tigerCard === "object" ? tigerCard?.display : tigerCard,
      result,
      serverSeedHash
    }
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
    dispute
  });
  res.json({
    success: true,
    dispute,
    message: "\u0986\u09AA\u09A8\u09BE\u09B0 \u09B0\u09BE\u0989\u09A8\u09CD\u09A1 \u09B8\u0982\u0995\u09CD\u09B0\u09BE\u09A8\u09CD\u09A4 \u0985\u09AD\u09BF\u09AF\u09CB\u0997 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u099C\u09AE\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8 \u099F\u09BF\u09AE \u09B0\u09BF\u09AD\u09BF\u0989 \u0995\u09B0\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B8\u09CD\u09A5\u09BE \u09A8\u09C7\u09AC\u09C7\u0964"
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
      refunded: refundedCount
    },
    disputes: roundDisputes
  });
});
app.post("/api/admin/disputes/:disputeId/resolve", requireAdmin, (req, res) => {
  const { disputeId } = req.params;
  const { action, adminNotes, refundAmount } = req.body;
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
      addTransactionToUser(user, {
        id: `tx_dispute_refund_${Date.now()}`,
        type: "refund",
        amount: amt,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        description: `Round Dispute #${dispute.roundNumber || dispute.roomId || dispute.id} Refund: +\u09F3${amt.toLocaleString()} (${cleanNotes || "Admin Approved Dispute Refund"})`
      });
      logUserActivity(
        dispute.userId,
        dispute.username,
        "ROUND_DISPUTE_REFUNDED",
        `Admin refunded \u09F3${amt.toLocaleString()} for Round #${dispute.roundNumber || dispute.roomId || "N/A"}. Note: ${cleanNotes || "Approved"}`
      );
    }
    dispute.status = "REFUNDED";
    dispute.refundedAmount = amt;
    dispute.adminNotes = cleanNotes || `Refunded \u09F3${amt.toLocaleString()} to user wallet.`;
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
  dispute.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
  res.json({
    success: true,
    dispute,
    user,
    message: `Dispute #${dispute.id} status updated to ${dispute.status}.`
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
      resolved: resolvedCount
    },
    reports: playerReports
  });
});
app.post("/api/admin/reports/:reportId/action", requireAdmin, (req, res) => {
  const { reportId } = req.params;
  const { action, notes } = req.body;
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
    message: `Report #${report.id} updated with action '${action}'.`
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  res.json({ success: true, message: "Ping sent to table" });
});
app.get("/api/system/telemetry", (_req, res) => {
  const totalActivePlayers = Math.max(wss.clients.size, 1);
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
      vip: vipActive
    },
    tableLimits: {
      express: { minBet: 10, maxBet: 1e3 },
      classic: { minBet: 100, maxBet: 1e4 },
      vip: { minBet: 1e3, maxBet: 1e5 }
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
      { code: "GBR-LON-01", location: "London, UK", status: "ONLINE", ping: "68ms", load: "0%" }
    ]
  });
});
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
    const username = knownGrant?.username || (knownReport?.reportedUserId === userId ? knownReport.reportedUsername : knownReport?.reporterUsername) || knownDispute?.username || `User_${userId.slice(0, 5)}`;
    user = {
      userId,
      username,
      balance: 1e4,
      demoBalance: 1e4,
      balanceType: "real",
      lockedBalance: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      kycStatus: "verified",
      status: "ACTIVE",
      transactions: []
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
      timestamp: new Date(Date.now() - 864e5 * 5).toISOString()
    },
    {
      id: `act_init_2_${userId}`,
      userId,
      username: user.username,
      action: "LOGIN_SUCCESS",
      details: "Logged in via Web Browser (Chrome/Android)",
      ipAddress: "103.205.132.42",
      timestamp: new Date(Date.now() - 36e5 * 2).toISOString()
    }
  ];
  res.json({
    success: true,
    user,
    bets: userBetHistories[userId] || [],
    transactions: user.transactions || [],
    adminGrants: userGrants,
    activityLogs: userLogs,
    stats: user.stats || null
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
  addTransactionToUser(user, {
    id: `tx_admin_grant_${Date.now()}`,
    type: "deposit",
    amount: num,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    description: `Admin Deposit [Tag: ${cleanTag}]: +\u09F3${num.toLocaleString()} (${cleanReason})`
  });
  const grant = {
    id: `grant_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
    userId,
    username: user.username,
    amount: num,
    tag: cleanTag,
    reason: cleanReason,
    adminUsername: "admin",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isDemo: Boolean(isDemo)
  };
  adminGrants.unshift(grant);
  logUserActivity(
    userId,
    user.username,
    "ADMIN_DEPOSIT_RECEIVED",
    `Received \u09F3${num.toLocaleString()} Admin Deposit under Tag Folder '${cleanTag}'. Reason: ${cleanReason}`
  );
  res.json({
    success: true,
    grant,
    user,
    message: `Successfully credited \u09F3${num.toLocaleString()} to @${user.username} under Tag Folder '${cleanTag}'.`
  });
});
app.get("/api/admin/grants", requireAdmin, (_req, res) => {
  const totalAmount = adminGrants.reduce((acc, g) => acc + g.amount, 0);
  const totalUsersSet = new Set(adminGrants.map((g) => g.userId));
  const tagFoldersMap = {};
  adminGrants.forEach((g) => {
    if (!tagFoldersMap[g.tag]) {
      tagFoldersMap[g.tag] = {
        tag: g.tag,
        totalAmount: 0,
        userIds: /* @__PURE__ */ new Set(),
        grants: []
      };
    }
    tagFoldersMap[g.tag].totalAmount += g.amount;
    tagFoldersMap[g.tag].userIds.add(g.userId);
    tagFoldersMap[g.tag].grants.push(g);
  });
  const tagFolders = Object.values(tagFoldersMap).map((f) => ({
    tag: f.tag,
    totalAmount: f.totalAmount,
    userCount: f.userIds.size,
    grantsCount: f.grants.length,
    grants: f.grants
  }));
  res.json({
    success: true,
    totalAmount,
    totalRecipientsCount: totalUsersSet.size,
    totalGrantsCount: adminGrants.length,
    tagFolders,
    grants: adminGrants
  });
});
app.post("/api/admin/users/:userId/update", requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { username, balance, demoBalance, kycStatus, status } = req.body;
  const user = mockUsers[userId];
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  const changes = [];
  if (username !== void 0 && username.trim() !== user.username) {
    changes.push(`Username: ${user.username} -> ${username.trim()}`);
    user.username = username.trim();
  }
  if (balance !== void 0) {
    const b = Number(balance);
    if (!isNaN(b) && b >= 0 && b !== user.balance) {
      changes.push(`Real Balance: \u09F3${user.balance} -> \u09F3${b}`);
      user.balance = b;
    }
  }
  if (demoBalance !== void 0) {
    const db = Number(demoBalance);
    if (!isNaN(db) && db >= 0 && db !== user.demoBalance) {
      changes.push(`Demo Balance: \u09F3${user.demoBalance} -> \u09F3${db}`);
      user.demoBalance = db;
    }
  }
  if (kycStatus !== void 0 && kycStatus !== user.kycStatus) {
    changes.push(`KYC: ${user.kycStatus} -> ${kycStatus}`);
    user.kycStatus = kycStatus;
  }
  if (status !== void 0 && status !== user.status) {
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
    `Admin ${type === "add" ? "added" : "deducted"} \u09F3${num.toLocaleString()} (${isDemo ? "Demo" : "Real"}). Note: ${note}`
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
  const allLogs = [];
  Object.values(userActivityLogs).forEach((logs) => {
    logs.forEach((l) => {
      allLogs.push({
        id: l.id,
        action: l.action,
        entity_type: "USER_ACCOUNT",
        entity_id: l.userId,
        user_id: l.username,
        created_at: l.timestamp,
        new_values: l.details
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
      new_values: `Grant \u09F3${g.amount.toLocaleString()} to @${g.username} [Tag: ${g.tag}]. Reason: ${g.reason}`
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
      new_values: `Dispute status: ${d.status} (${d.issueType}) for \u09F3${d.betAmount || 0}`
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
  dep.processedAt = (/* @__PURE__ */ new Date()).toISOString();
  dep.processedBy = req.adminUser || "admin";
  const user = mockUsers[dep.userId];
  if (user) {
    user.balance += dep.amount;
    addTransactionToUser(user, {
      id: `tx_dep_appr_${Date.now()}`,
      type: "deposit",
      amount: dep.amount,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      description: `Verified Deposit (#${dep.id}): +\u09F3${dep.amount.toLocaleString()} via ${dep.method}`
    });
    logUserActivity(
      dep.userId,
      user.username,
      "DEPOSIT_APPROVED",
      `Deposit #${dep.id} for \u09F3${dep.amount.toLocaleString()} approved by admin.`
    );
  }
  res.json({
    success: true,
    deposit: dep,
    message: `Deposit #${id} approved and \u09F3${dep.amount.toLocaleString()} credited to player balance.`
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
  dep.processedAt = (/* @__PURE__ */ new Date()).toISOString();
  dep.processedBy = req.adminUser || "admin";
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
    message: `Deposit #${id} rejected.`
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
  wdr.processedAt = (/* @__PURE__ */ new Date()).toISOString();
  wdr.processedBy = req.adminUser || "admin";
  logUserActivity(
    wdr.userId,
    wdr.username,
    "WITHDRAWAL_FULFILLED",
    `Withdrawal #${wdr.id} for \u09F3${wdr.amount.toLocaleString()} approved and fulfilled via ${wdr.method}.`
  );
  res.json({
    success: true,
    withdrawal: wdr,
    message: `Withdrawal #${id} approved and marked as fulfilled.`
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
  wdr.processedAt = (/* @__PURE__ */ new Date()).toISOString();
  wdr.processedBy = req.adminUser || "admin";
  wdr.note = note || "Declined by compliance";
  const user = mockUsers[wdr.userId];
  if (user) {
    user.balance += wdr.amount;
    addTransactionToUser(user, {
      id: `tx_wdr_ref_${Date.now()}`,
      type: "refund",
      amount: wdr.amount,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      description: `Refunded Rejected Withdrawal (#${wdr.id}): +\u09F3${wdr.amount.toLocaleString()}`
    });
    logUserActivity(
      wdr.userId,
      user.username,
      "WITHDRAWAL_REFUNDED",
      `Withdrawal #${wdr.id} rejected and \u09F3${wdr.amount.toLocaleString()} refunded to balance. Note: ${wdr.note}`
    );
  }
  res.json({
    success: true,
    withdrawal: wdr,
    message: `Withdrawal #${id} rejected and refunded to player balance.`
  });
});
app.post("/api/ai-dealer", async (req, res) => {
  try {
    const { lastWinner = "Dragon", tableSlug = "classic" } = req.body || {};
    const safeSlug = (tableSlug || "classic").toString();
    const safeWinner = (lastWinner || "Dragon").toString();
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        commentary: `Cards shuffled on the ${safeSlug.toUpperCase()} arena. Fortune favors the daring. Last win went to ${safeWinner}!`
      });
    }
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an elite, charismatic Asian casino dealer for Dragon Tiger P2P. Provide one punchy, exciting casino sentence for players placing bets. Last round winner: ${safeWinner}. Keep it high energy.`
    });
    res.json({ commentary: response.text });
  } catch {
    res.json({
      commentary: "Cards are in play! Will the Dragon roar or will the Tiger strike? Place your bets!"
    });
  }
});
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.originalUrl}` });
});
app.use((err, req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith("/api")) {
    console.error("API Exception:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
  next(err);
});
async function startServer() {
  console.log(`[BOOT] Environment: ${process.env.NODE_ENV || "development"}`);
  if (process.env.NODE_ENV !== "production") {
    console.log("[BOOT] Starting with Vite Development Middleware...");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : void 0
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "7d",
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        } else if (filePath.includes("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        console.log(`[SERVER] Serving index.html for route: ${req.url}`);
        res.sendFile(indexPath);
      } else {
        console.error(`[SERVER] index.html NOT FOUND at ${indexPath}. Falling back to emergency minimal HTML.`);
        res.status(200).send("<!DOCTYPE html><html><head><title>Apex Casino</title><style>body{background:#02050b;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;}</style></head><body><div style='text-align:center;'><h2>Apex Casino</h2><p>Initializing system... if this screen persists, please refresh.</p><script type='module' src='/src/main.tsx'></script></div></body></html>");
      }
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Dragon Tiger P2P Server running on http://localhost:${PORT}`);
  });
}
startServer();
