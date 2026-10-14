import { dbConfigured, insertAnonymousCase } from "@/lib/db";
import { enforceLimits, errorResponse, json, readBody, SafeError, preflight, withCors } from "@/lib/http";
import { logEvent } from "@/lib/log";
import { ContributeRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";

/** Opt-in only: the schema requires consent === true. No photo or free text is accepted. */
async function handle(req: Request): Promise<Response> {
  try {
    enforceLimits(req, 10, 60 * 60_000);
    const body = await readBody(req, ContributeRequestSchema, 10_000);
    if (!dbConfigured()) throw new SafeError("unavailable", 503);
    await insertAnonymousCase(body);
    logEvent("contribute_ok");
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export const POST = withCors(handle);
export const OPTIONS = preflight;
