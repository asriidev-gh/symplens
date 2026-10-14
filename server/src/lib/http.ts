import { z } from "zod";
import { clientIp, consumeBudget, installId, rateLimit } from "./ratelimit";

/** Error with a message that is safe to show to end users. */
export class SafeError extends Error {
  constructor(
    public code: "invalid_request" | "rate_limited" | "analysis_failed" | "unsafe_output" | "unavailable" | "subscription_required",
    public status: number,
    public retryAfterSec?: number,
  ) {
    super(code);
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof SafeError) {
    return json(
      { error: e.code },
      e.status,
      e.retryAfterSec ? { "Retry-After": String(e.retryAfterSec) } : {},
    );
  }
  // Deliberately generic: never echo internals or request content.
  return json({ error: "analysis_failed" }, 500);
}

/**
 * Per-caller limits: by IP (the proxy-added address, not a forgeable header), by IP across all routes (4x),
 * and by install id (a soft signal). Counters are shared across instances when Redis is configured.
 */
export async function enforceLimits(req: Request, limit: number, windowMs: number): Promise<void> {
  const path = new URL(req.url).pathname;
  const ip = clientIp(req);
  const id = installId(req);
  const checks = [rateLimit(`ip:${ip}:${path}`, limit, windowMs), rateLimit(`ip:${ip}:all`, limit * 4, windowMs)];
  if (id) checks.push(rateLimit(`id:${id}:${path}`, limit, windowMs));
  for (const r of await Promise.all(checks)) {
    if (!r.ok) throw new SafeError("rate_limited", 429, r.retryAfterSec);
  }
}

/** Global daily cap on model calls: the backstop against a runaway bill (env: DAILY_ANALYSIS_LIMIT, DAILY_AUX_LIMIT). */
export async function enforceBudget(kind: "analysis" | "aux"): Promise<void> {
  const limit = Number(kind === "analysis" ? process.env.DAILY_ANALYSIS_LIMIT ?? 3000 : process.env.DAILY_AUX_LIMIT ?? 6000);
  const { ok } = await consumeBudget(kind, limit);
  if (!ok) throw new SafeError("unavailable", 503, 3600);
}

/** Reads the body as text but stops (and rejects) as soon as it exceeds maxBytes, even without a content-length. */
async function readCapped(req: Request, maxBytes: number): Promise<string> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new SafeError("invalid_request", 413);
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Reads and validates a JSON body with a hard size cap. */
export async function readBody<T extends z.ZodType>(req: Request, schema: T, maxBytes: number): Promise<z.infer<T>> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new SafeError("invalid_request", 413);
  const text = await readCapped(req, maxBytes);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SafeError("invalid_request", 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new SafeError("invalid_request", 400);
  return parsed.data;
}

const MAGIC: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "application/pdf": (b) => b.toString("ascii", 0, 4) === "%PDF",
  "image/webp": (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};

export function assertImageMatches(mediaType: string, b64: string): void {
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(b64)) throw new SafeError("invalid_request", 400);
  const head = Buffer.from(b64.slice(0, 64), "base64");
  if (!MAGIC[mediaType]?.(head)) throw new SafeError("invalid_request", 400);
}

/**
 * CORS for the web build of the app (native apps are not subject to CORS).
 * Allowed: origins listed in CORS_ORIGINS (comma-separated), and in development any localhost / LAN origin.
 * Production default: none, so other websites cannot call this API from a user's browser.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin) return {};
  const listed = (process.env.CORS_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  const devLocal =
    process.env.NODE_ENV !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}(\.\d{1,3}){3})(:\d+)?$/.test(origin);
  if (!listed.includes(origin) && !devLocal) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-install-id",
    "Access-Control-Max-Age": "600",
  };
}

/** Wraps a route handler so every response (including errors) carries the CORS headers. */
export function withCors(handler: (req: Request) => Promise<Response> | Response) {
  return async (req: Request): Promise<Response> => {
    const res = await handler(req);
    for (const [k, v] of Object.entries(corsHeaders(req))) res.headers.set(k, v);
    return res;
  };
}

export const preflight = (req: Request): Response => new Response(null, { status: 204, headers: corsHeaders(req) });
