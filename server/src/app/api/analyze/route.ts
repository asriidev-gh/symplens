import { assertImageMatches, enforceLimits, errorResponse, json, readBody, preflight, withCors, enforceBudget } from "@/lib/http";
import { logEvent } from "@/lib/log";
import { runAnalysis } from "@/lib/pipeline";
import { AnalyzeRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_BODY = 8_000_000;

async function handle(req: Request): Promise<Response> {
  const started = Date.now();
  try {
    await enforceLimits(req, 12, 10 * 60_000); // 12 analyses / 10 min per IP and per install
    const body = await readBody(req, AnalyzeRequestSchema, MAX_BODY);
    if (body.image) assertImageMatches(body.image.mediaType, body.image.data);
    if (body.previous?.image) assertImageMatches(body.previous.image.mediaType, body.previous.image.data);
    await enforceBudget("analysis"); // global daily spend cap

    const result = await runAnalysis(body);
    // Log metadata only: no content, no image, no AI output.
    logEvent("analyze_ok", {
      ms: Date.now() - started,
      hasImage: !!body.image,
      tracking: !!body.previous,
      urgency: result.analysis.urgency,
      mode: body.mode,
    });
    return json(result);
  } catch (e) {
    logEvent("analyze_error", { ms: Date.now() - started, kind: e instanceof Error ? e.message.slice(0, 40) : "unknown" });
    return errorResponse(e);
  }
}

export const POST = withCors(handle);
export const OPTIONS = preflight;
