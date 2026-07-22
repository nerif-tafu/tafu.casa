import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './storage';

type VisitEvent = { ts: number; path: string; ip: string };
type Geo = { country: string; city: string };
type MetricsData = { events: VisitEvent[]; geo: Record<string, Geo> };

const FILE = path.join(DATA_DIR, 'metrics.json');
const MAX_EVENTS = 20000;
const FLUSH_DELAY_MS = 3000;

let data: MetricsData | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function load(): Promise<MetricsData> {
  if (data) return data;
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, 'utf-8'));
    data = {
      events: Array.isArray(parsed?.events) ? parsed.events : [],
      geo: parsed?.geo && typeof parsed.geo === 'object' ? parsed.geo : {}
    };
  } catch {
    data = { events: [], geo: {} };
  }
  return data;
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    if (!data) return;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(data));
    } catch {
      /* best-effort */
    }
  }, FLUSH_DELAY_MS);
}

export async function recordVisit(page: string, ip: string): Promise<void> {
  const d = await load();
  d.events.push({ ts: Date.now(), path: page, ip });
  if (d.events.length > MAX_EVENTS) d.events.splice(0, d.events.length - MAX_EVENTS);
  scheduleFlush();
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === 'unknown' ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fc|fd|fe80)/i.test(ip)
  );
}

function locationOf(d: MetricsData, ip: string): string {
  if (isPrivateIp(ip)) return 'Local / private';
  const geo = d.geo[ip];
  return geo ? `${geo.city}, ${geo.country}` : 'Unknown';
}

/** Resolve locations for uncached public IPs (best-effort, batched, cached). */
async function resolveGeo(d: MetricsData): Promise<void> {
  const pending = [...new Set(d.events.map((e) => e.ip))]
    .filter((ip) => !d.geo[ip] && !isPrivateIp(ip))
    .slice(0, 100);
  if (pending.length === 0) return;
  try {
    const res = await fetch('http://ip-api.com/batch?fields=query,status,country,city', {
      method: 'POST',
      body: JSON.stringify(pending),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return;
    for (const r of await res.json()) {
      if (r?.status === 'success' && r.query) {
        d.geo[r.query] = { country: r.country ?? '', city: r.city ?? '' };
      }
    }
    scheduleFlush();
  } catch {
    /* offline or rate-limited — locations stay "Unknown" */
  }
}

export type MetricsSummary = {
  totalVisits: number;
  uniqueIps: number;
  pages: { path: string; views: number; unique: number }[];
  topVisitors: { ip: string; location: string; views: number; lastSeen: number }[];
  recent: { ts: number; ip: string; location: string; path: string }[];
};

export async function getMetrics(): Promise<MetricsSummary> {
  const d = await load();
  await resolveGeo(d);

  const perPage = new Map<string, { views: number; ips: Set<string> }>();
  const perIp = new Map<string, { views: number; lastSeen: number }>();
  for (const e of d.events) {
    const page = perPage.get(e.path) ?? { views: 0, ips: new Set<string>() };
    page.views += 1;
    page.ips.add(e.ip);
    perPage.set(e.path, page);

    const visitor = perIp.get(e.ip) ?? { views: 0, lastSeen: 0 };
    visitor.views += 1;
    visitor.lastSeen = Math.max(visitor.lastSeen, e.ts);
    perIp.set(e.ip, visitor);
  }

  return {
    totalVisits: d.events.length,
    uniqueIps: perIp.size,
    pages: [...perPage.entries()]
      .map(([p, v]) => ({ path: p, views: v.views, unique: v.ips.size }))
      .sort((a, b) => b.views - a.views),
    topVisitors: [...perIp.entries()]
      .map(([ip, v]) => ({ ip, location: locationOf(d, ip), views: v.views, lastSeen: v.lastSeen }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20),
    recent: d.events
      .slice(-500)
      .reverse()
      .map((e) => ({ ts: e.ts, ip: e.ip, location: locationOf(d, e.ip), path: e.path }))
  };
}
