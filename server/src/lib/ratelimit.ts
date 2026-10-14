import { logEvent } from "./log";

/**
 * Abuse and cost protection.
 *
 * Counters live in Redis (Upstash REST) when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set, so limits
 * hold across every server instance. Without Redis they fall back to per-instance memory, which is fine for local
 * development but does NOT protect a multi-instance or serverless deployment (a warning is logged in production).
 * If Redis is configured but unreachable we also fall back to memory instead of failing open with no limit at all.
 */

type Result = { ok: boolean; retryAfterSec: number };

// ---------- identifying the caller ----------

/**
 * The caller's IP as seen by OUR proxy. The leftmost X-Forwarded-For entries are supplied by the client and can be
 * forged to dodge rate limits, so we take the entry added by the Nth proxy from the right (TRUSTED_PROXY_HOPS,
 * default 1: a single platform proxy such as Vercel, Fly, or an nginx/ALB in front).
 */
export function clientIp(req: Request): string {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1) || 1);
  const parts = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip = parts[Math.max(0, parts.length - hops)];
  return ip && /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : "unknown";
}

/** Per-install id sent by the app. A soft signal only (anyone can forge it), so the IP limit always applies too. */
export function installId(req: Request): string | undefined {
  const id = req.headers.get("x-install-id") ?? "";
  return /^[A-Za-z0-9_-]{8,64}$/.test(id) ? id : undefined;
}

// ---------- backends ----------

const hits = new Map<string, number[]>();

function memoryLimit(key: string, limit: number, windowMs: number): Result {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000)) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return { ok: true, retryAfterSec: 0 };
}

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

let warned = false;
function warnNoRedis(reason: string): void {
  if (warned || process.env.NODE_ENV !== "production") return;
  warned = true;
  logEvent("ratelimit_memory_fallback", { reason });
}

/** INCR a counter and set its TTL on first use. Returns null if Redis is not configured or fails. */
async function redisIncr(key: string, ttlMs: number): Promise<number | null> {
  const cfg = redisConfig();
  if (!cfg) {
    warnNoRedis("not_configured");
    return null;
  }
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["PEXPIRE", key, ttlMs, "NX"]]),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(String(res.status));
    const out = (await res.json()) as { result?: number }[];
    const n = out?.[0]?.result;
    return typeof n === "number" ? n : null;
  } catch {
    warnNoRedis("unreachable");
    return null;
  }
}

// ---------- public API ----------

/** Fixed-window limit shared across instances (Redis), or a per-instance sliding window (memory). */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<Result> {
  const bucket = Math.floor(Date.now() / windowMs);
  const n = await redisIncr(`rl:${key}:${bucket}`, windowMs * 2);
  if (n === null) return memoryLimit(key, limit, windowMs);
  if (n > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(((bucket + 1) * windowMs - Date.now()) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

const memBudget = new Map<string, number>();

/**
 * Global daily cap on model calls (UTC day), the backstop against a runaway bill whatever the per-caller limits do.
 * Logs once at 80% and once on exhaustion so you can alert on it.
 */
export async function consumeBudget(kind: string, limit: number): Promise<{ ok: boolean; used: number }> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `budget:${kind}:${day}`;
  let n = await redisIncr(key, 36 * 3600 * 1000);
  if (n === null) {
    n = (memBudget.get(key) ?? 0) + 1;
    memBudget.set(key, n);
    for (const k of memBudget.keys()) if (!k.endsWith(day)) memBudget.delete(k);
  }
  if (n === Math.ceil(limit * 0.8)) logEvent("budget_80_percent", { kind, used: n, limit });
  if (n === limit + 1) logEvent("budget_exhausted", { kind, limit });
  return { ok: n <= limit, used: n };
}

const memQuota = new Map<string, number>();

/** Per-subscriber monthly counter (UTC month). Shared across instances with Redis, per-instance otherwise. */
export async function consumeQuota(kind: string, id: string, limit: number): Promise<{ ok: boolean; used: number; retryAfterSec: number }> {
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const key = `quota:${kind}:${id}:${month}`;
  let n = await redisIncr(key, 40 * 86_400_000);
  if (n === null) {
    n = (memQuota.get(key) ?? 0) + 1;
    memQuota.set(key, n);
    if (memQuota.size > 20_000) for (const k of memQuota.keys()) if (!k.endsWith(month)) memQuota.delete(k);
  }
  const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return { ok: n <= limit, used: n, retryAfterSec: Math.max(60, Math.ceil((nextMonth - now.getTime()) / 1000)) };
}
