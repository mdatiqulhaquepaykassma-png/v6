import { createHash, randomBytes, randomInt } from "crypto";
import type { Request } from "express";

/**
 * Single-device session enforcement & device binding.
 * In-memory state now; structured to map directly to prisma.session in Phase 1.
 */

export const FORCE_PASSWORD_RESET_ON_NEW_DEVICE = false;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;

export interface Session {
  sessionId: string;
  userId: string;
  deviceId: string;
  deviceLabel: string;
  ip: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
}

export interface TrustedDevice {
  deviceId: string;
  label: string;
  firstSeenAt: number;
  lastSeenAt: number;
}

export interface PendingOtp {
  code: string;
  deviceId: string;
  expiresAt: number;
  attempts: number;
}

const sessionsBySession = new Map<string, Session>();
const sessionByUser = new Map<string, string>(); // userId -> sessionId (strictly ONE)
const trustedDevices = new Map<string, TrustedDevice[]>(); // userId -> devices
const pendingOtps = new Map<string, PendingOtp>(); // userId -> otp

/** Client deviceId + user agent stable fingerprint */
export function deriveDeviceId(req?: Request | null, clientDeviceId?: string): string {
  const ua = req && typeof req.get === "function" ? req.get("user-agent") || "" : "";
  const basis = `${clientDeviceId || ""}|${ua}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}

export function describeDevice(req?: Request | null): string {
  const ua = req && typeof req.get === "function" ? req.get("user-agent") || "" : "";
  const os =
    /Android/i.test(ua) ? "Android" :
    /iPhone|iPad|iPod/i.test(ua) ? "iOS" :
    /Windows/i.test(ua) ? "Windows" :
    /Mac OS/i.test(ua) ? "macOS" : "Unknown OS";
  const browser =
    /Edg\//i.test(ua) ? "Edge" :
    /Chrome\//i.test(ua) ? "Chrome" :
    /Firefox\//i.test(ua) ? "Firefox" :
    /Safari\//i.test(ua) ? "Safari" : "Browser";
  return `${browser} · ${os}`;
}

export function isTrustedDevice(userId: string, deviceId: string): boolean {
  const list = trustedDevices.get(userId) || [];
  // If user has no registered devices yet (first login), treat as first trusted device
  if (list.length === 0) return true;
  return list.some((d) => d.deviceId === deviceId);
}

export function trustDevice(userId: string, deviceId: string, label: string) {
  const list = trustedDevices.get(userId) || [];
  const existing = list.find((d) => d.deviceId === deviceId);
  if (existing) {
    existing.lastSeenAt = Date.now();
  } else {
    list.push({ deviceId, label, firstSeenAt: Date.now(), lastSeenAt: Date.now() });
  }
  trustedDevices.set(userId, list);
}

export function listDevices(userId: string): TrustedDevice[] {
  return trustedDevices.get(userId) || [];
}

export function removeDevice(userId: string, deviceId: string) {
  const list = (trustedDevices.get(userId) || []).filter((d) => d.deviceId !== deviceId);
  trustedDevices.set(userId, list);
  const sid = sessionByUser.get(userId);
  if (sid && sessionsBySession.get(sid)?.deviceId === deviceId) {
    revokeUserSessions(userId);
  }
}

/* ── OTP ── */

export function issueOtp(userId: string, deviceId: string): string {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  pendingOtps.set(userId, { code, deviceId, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  return code;
}

export function verifyOtp(userId: string, deviceId: string, code: string): { ok: boolean; error?: string } {
  const p = pendingOtps.get(userId);
  if (!p) return { ok: false, error: "কোনো যাচাই অনুরোধ নেই। আবার লগইন করুন।" };
  if (Date.now() > p.expiresAt) {
    pendingOtps.delete(userId);
    return { ok: false, error: "কোডের মেয়াদ শেষ। আবার চেষ্টা করুন।" };
  }
  p.attempts++;
  if (p.attempts > 5) {
    pendingOtps.delete(userId);
    return { ok: false, error: "অনেকবার ভুল হয়েছে। আবার লগইন করুন।" };
  }
  if (p.deviceId !== deviceId) return { ok: false, error: "ডিভাইস মিলছে না।" };
  if (p.code !== String(code).trim()) return { ok: false, error: "কোড সঠিক নয়।" };
  pendingOtps.delete(userId);
  return { ok: true };
}

/* ── Session Lifecycle (Single Device Enforcement) ── */

/**
 * Creates a new session while evicting any previous session for the user.
 * Returns the evicted sessionId so the server can push a WebSocket FORCE_LOGOUT event.
 */
export function createSessionEvictingOthers(
  userId: string,
  deviceId: string,
  deviceLabel: string,
  ip: string
): { session: Session; evictedSessionId: string | null } {
  const previous = sessionByUser.get(userId) || null;
  if (previous) {
    sessionsBySession.delete(previous);
  }

  const session: Session = {
    sessionId: randomBytes(32).toString("base64url"),
    userId,
    deviceId,
    deviceLabel,
    ip,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  sessionsBySession.set(session.sessionId, session);
  sessionByUser.set(userId, session.sessionId);
  return { session, evictedSessionId: previous };
}

export function getSession(sessionId: string): Session | null {
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

export function revokeUserSessions(userId: string): string | null {
  const sid = sessionByUser.get(userId);
  if (sid) {
    sessionsBySession.delete(sid);
    sessionByUser.delete(userId);
  }
  return sid || null;
}

// Expired session cleanup loop
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
  }, 10 * 60 * 1000).unref();
}
