import type Anthropic from "@anthropic-ai/sdk";
import { ANALYSIS_TOOL, FOLLOWUP_TOOL, callTool } from "./claude";
import { SafeError } from "./http";
import { FOLLOWUP_SYSTEM, RETRY_NOTE, SYSTEM_PROMPT, TRANSLATE_SYSTEM, buildFollowUpText, buildTranslateText, buildUserText } from "./prompt";
import {
  AnalysisSchema,
  FollowUpResultSchema,
  type AnalysisResponse,
  type AnalyzeRequest,
  type FollowUpRequest,
  type TranslateRequest,
  type Urgency,
} from "./schema";
import { detectEmergency, emergencyFallback, enforceFloor, findDiagnosticPhrasing, findDiagnosticText, maxUrgency, sameStructure } from "./safety";

export type Caller = typeof callTool;

/**
 * analyze: safety pre-check → model → schema validation → diagnostic-phrasing check
 * (one retry) → deterministic urgency floor. Unvalidated output is never returned.
 */
export async function runAnalysis(req: AnalyzeRequest, call: Caller = callTool): Promise<AnalysisResponse> {
  const check = detectEmergency([req.description, ...req.answers.map((a) => a.answer)], req.subject.ageGroup);

  const content: Anthropic.ContentBlockParam[] = [];
  if (req.previous?.image) {
    content.push(
      { type: "text", text: `EARLIER PHOTO (${req.previous.daysAgo} days ago):` },
      { type: "image", source: { type: "base64", media_type: req.previous.image.mediaType, data: req.previous.image.data } },
    );
    if (req.image) content.push({ type: "text", text: "CURRENT PHOTO:" });
  }
  if (req.image) {
    content.push(
      req.image.mediaType === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: req.image.data } }
        : { type: "image", source: { type: "base64", media_type: req.image.mediaType, data: req.image.data } },
    );
  }
  content.push({ type: "text", text: buildUserText(req) });

  let rejection: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const retryContent = attempt === 0 ? content : [...content, { type: "text" as const, text: RETRY_NOTE }];
      const raw = await call({ system: SYSTEM_PROMPT, tool: ANALYSIS_TOOL, content: retryContent });
      const parsed = AnalysisSchema.safeParse(raw);
      if (!parsed.success) {
        rejection = "schema";
        continue;
      }
      if (findDiagnosticPhrasing(parsed.data)) {
        rejection = "diagnostic";
        continue;
      }
      return {
        analysis: enforceFloor(parsed.data, check),
        emergency: check.emergency || parsed.data.urgency === "urgent",
        emergencyReasons: check.reasons,
      };
    } catch {
      rejection = "upstream";
    }
  }

  // Model unavailable/invalid. Safety must not depend on it.
  if (check.emergency) {
    return { analysis: emergencyFallback(check), emergency: true, emergencyReasons: check.reasons };
  }
  throw new SafeError(rejection === "upstream" ? "unavailable" : "unsafe_output", 502);
}

export async function runFollowUp(
  req: FollowUpRequest,
  call: Caller = callTool,
): Promise<{ answer: string; urgency: Urgency; emergency: boolean; emergencyReasons: string[] }> {
  const check = detectEmergency([req.question], req.ageGroup);
  const content: Anthropic.ContentBlockParam[] = [{ type: "text", text: buildFollowUpText(req) }];
  try {
    const raw = await call({ system: FOLLOWUP_SYSTEM, tool: FOLLOWUP_TOOL, content, maxTokens: 4000 });
    const parsed = FollowUpResultSchema.safeParse(raw);
    if (parsed.success && !findDiagnosticText(parsed.data.answer)) {
      const urgency = maxUrgency(parsed.data.urgency, check.floor);
      return { answer: parsed.data.answer, urgency, emergency: urgency === "urgent", emergencyReasons: check.reasons };
    }
  } catch {
    /* fall through */
  }
  if (check.emergency) {
    return {
      answer: "What you described may be an emergency. Please call your local emergency number or go to the nearest emergency room now.",
      urgency: "urgent",
      emergency: true,
      emergencyReasons: check.reasons,
    };
  }
  throw new SafeError("unavailable", 502);
}

/**
 * Translates an existing, already-validated analysis. Text-only (no image). The result must match the
 * source structure exactly (urgency, enums, list sizes, lab values) or it is rejected and retried once.
 */
export async function runTranslate(req: TranslateRequest, call: Caller = callTool) {
  const { response_language: _drop, ...source } = req.analysis;
  const content: Anthropic.ContentBlockParam[] = [{ type: "text", text: buildTranslateText(req.target, JSON.stringify(source)) }];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await call({ system: TRANSLATE_SYSTEM, tool: ANALYSIS_TOOL, content, maxTokens: 8000 });
      const parsed = AnalysisSchema.safeParse(raw);
      if (parsed.success && sameStructure(source as never, parsed.data)) return { analysis: parsed.data };
    } catch {
      /* retry */
    }
  }
  throw new SafeError("unsafe_output", 502);
}
