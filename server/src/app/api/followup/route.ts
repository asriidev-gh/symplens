import { enforceLimits, errorResponse, json, readBody, preflight, withCors } from "@/lib/http";
import { logEvent } from "@/lib/log";
import { runFollowUp } from "@/lib/pipeline";
import { FollowUpRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(req: Request): Promise<Response> {
  const started = Date.now();
  try {
    enforceLimits(req, 40, 10 * 60_000);
    const body = await readBody(req, FollowUpRequestSchema, 40_000);
    const result = await runFollowUp(body);
    logEvent("followup_ok", { ms: Date.now() - started, urgency: result.urgency });
    return json(result);
  } catch (e) {
    logEvent("followup_error", { ms: Date.now() - started });
    return errorResponse(e);
  }
}

export const POST = withCors(handle);
export const OPTIONS = preflight;
