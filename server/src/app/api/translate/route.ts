import { enforceLimits, errorResponse, json, preflight, readBody, withCors } from "@/lib/http";
import { logEvent } from "@/lib/log";
import { runTranslate } from "@/lib/pipeline";
import { TranslateRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Translates an existing result. Text only: no photo is accepted or stored. */
async function handle(req: Request): Promise<Response> {
  const started = Date.now();
  try {
    enforceLimits(req, 30, 10 * 60_000);
    const body = await readBody(req, TranslateRequestSchema, 80_000);
    const result = await runTranslate(body);
    logEvent("translate_ok", { ms: Date.now() - started, target: body.target });
    return json(result);
  } catch (e) {
    logEvent("translate_error", { ms: Date.now() - started });
    return errorResponse(e);
  }
}

export const POST = withCors(handle);
export const OPTIONS = preflight;
