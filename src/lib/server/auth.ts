import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Server-side session store: random tokens, so a session cannot be forged —
 * only a token handed out by a successful login is valid. In-memory, so all
 * sessions are revoked on restart.
 */
const sessions = new Map<string, number>();

/** Failed-login tracking per IP: 5 failures within 15 min locks that IP out for 15 min. */
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; first: number; lockedUntil: number }>();

// Password comes from ADMIN_PASSWORD. In dev we fall back to "admin";
// in production login is disabled until the env var is set.
function adminPassword(): string | null {
  if (env.ADMIN_PASSWORD) return env.ADMIN_PASSWORD;
  return process.env.NODE_ENV === 'production' ? null : 'admin';
}

export function checkPassword(candidate: string): boolean {
  const expected = adminPassword();
  if (expected === null) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function loginAllowed(ip: string): { ok: boolean; retryAfterSec: number } {
  const entry = attempts.get(ip);
  const now = Date.now();
  if (entry && entry.lockedUntil > now) {
    return { ok: false, retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > ATTEMPT_WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now, lockedUntil: 0 });
    return;
  }
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
}

export function clearLoginFailures(ip: string): void {
  attempts.delete(ip);
}

function pruneExpiredSessions(): void {
  const now = Date.now();
  for (const [token, expires] of sessions) {
    if (expires < now) sessions.delete(token);
  }
}

export function isAuthed(cookies: Cookies): boolean {
  const token = cookies.get(COOKIE_NAME);
  if (!token) return false;
  const expires = sessions.get(token);
  if (expires === undefined) return false;
  if (Date.now() > expires) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function setSession(cookies: Cookies): void {
  pruneExpiredSessions();
  const token = randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  cookies.set(COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS / 1000
  });
}

export function clearSession(cookies: Cookies): void {
  const token = cookies.get(COOKIE_NAME);
  if (token) sessions.delete(token);
  cookies.delete(COOKIE_NAME, { path: '/' });
}
