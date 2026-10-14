import { z } from "zod";
import { clientKeys, rateLimit } from "./ratelimit";

/** Error with a message that is safe to show to end users. */
export class SafeError extends Error {
  constructor(
    public code: "invalid_request" | "rate_limited" | "analysis_failed" | "unsafe_output" | "unavailable",
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

export function enforceLimits(req: Request, limit: number, windowMs: number): void {
  for (const key of clientKeys(req)) {
    const r = rateLimit(`${key}:${new URL(req.url).pathname}`, limit, windowMs);
    if (!r.ok) throw new SafeError("rate_limited", 429, r.retryAfterSec);
  }
}

/** Reads and validates a JSON body with a hard size cap. */
export async function readBody<T extends z.ZodType>(req: Request, schema: T, maxBytes: number): Promise<z.infer<T>> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new SafeError("invalid_request", 413);
  const text = await req.text();
  if (text.length > maxBytes) throw new SafeError("invalid_request", 413);
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
