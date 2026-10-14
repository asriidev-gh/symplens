import { enforceLimits, errorResponse, json, readBody, preflight, withCors, enforceBudget } from "@/lib/http";
import { enforceMonthlyQuota, hasEntitlement, subscriptionRequiredError } from "@/lib/entitlement";
import { logEvent } from "@/lib/log";
import { runFollowUp } from "@/lib/pipeline";
import { FollowUpRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(req: Request): Promise<Response> {
  const started = Date.now();
  try {
    await enforceLimits(req, 40, 10 * 60_000);
    const body = await readBody(req, FollowUpRequestSchema, 40_000);
    if (!(await hasEntitlement(req))) throw subscriptionRequiredError();
    await enforceMonthlyQuota(req, "aux");
    await enforceBudget("aux"); // global daily spend cap
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
