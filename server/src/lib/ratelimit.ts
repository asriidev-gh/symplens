/**
 * Sliding-window in-memory limiter. Fine for a single instance / MVP.
 * For multiple instances replace the Map with Redis/Upstash (same interface).
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return { ok: true, retryAfterSec: 0 };
}

export function clientKeys(req: Request): string[] {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const install = req.headers.get("x-install-id")?.slice(0, 64);
  return [`ip:${ip}`, ...(install ? [`id:${install}`] : [])];
}
