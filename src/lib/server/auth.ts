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

/**
 * Global failure counter, independent of the per-IP one. The per-IP lockout is
 * keyed on a client address derived from a proxy header, so it is only as
 * trustworthy as the network path; this bounds total guess throughput even if
 * an attacker can present a fresh address per request. Deliberately a delay
 * rather than a lockout, so nobody can lock the owner out by spraying failures.
 */
const GLOBAL_FREE_ATTEMPTS = 10;
const GLOBAL_MAX_DELAY_MS = 5000;
let globalFailures = 0;
let globalWindowStart = Date.now();

function globalDelayMs(): number {
  const now = Date.now();
  if (now - globalWindowStart > ATTEMPT_WINDOW_MS) {
    globalFailures = 0;
    globalWindowStart = now;
  }
  const over = globalFailures - GLOBAL_FREE_ATTEMPTS;
  if (over <= 0) return 0;
  return Math.min(2 ** Math.min(over, 10) * 100, GLOBAL_MAX_DELAY_MS);
}

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
  globalDelayMs(); // roll the window over before counting
  globalFailures += 1;

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

/**
 * Delay applied to a rejected login. Only failures pay it, so a correct
 * password is never slowed down, while sustained guessing gets progressively
 * throttled regardless of what address the attempts appear to come from.
 */
export async function throttleFailedLogin(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, Math.max(500, globalDelayMs())));
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
