import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { logEvent } from "./log";
import { AnalysisSchema, FollowUpResultSchema } from "./schema";

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return client;
}

type Effort = "low" | "medium" | "high";
/** Reasoning effort. Lower is faster and cheaper; change only after re-running `npm run eval`. */
export const EFFORT = (): Effort => {
  const e = process.env.CLAUDE_EFFORT;
  return e === "low" || e === "high" ? e : "medium";
};

export const MODEL = () => process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

function toolSchema(schema: z.ZodType) {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest as Anthropic.Tool.InputSchema;
}

export const ANALYSIS_TOOL: Anthropic.Tool = {
  name: "report_analysis",
  description: "Report the structured, non-diagnostic analysis for the user.",
  input_schema: toolSchema(AnalysisSchema),
};

export const FOLLOWUP_TOOL: Anthropic.Tool = {
  name: "report_followup",
  description: "Answer the user's follow-up question.",
  input_schema: toolSchema(FollowUpResultSchema),
};

/** Calls Claude with a forced tool and returns the raw (unvalidated) tool input. */
export async function callTool(opts: {
  system: string;
  tool: Anthropic.Tool;
  content: Anthropic.ContentBlockParam[];
  maxTokens?: number;
}): Promise<unknown> {
  const started = Date.now();
  const res = await getClient().messages.create({
    model: MODEL(),
    // Thinking is always on for this model and counts toward max_tokens, so leave generous headroom.
    max_tokens: opts.maxTokens ?? 8000,
    // Forced tool_choice is rejected by current models: use "auto" and instruct the call instead.
    // The result is still validated against the zod schema (with one retry) by the pipeline.
    // The instructions and tool definition are identical on every request, so mark them cacheable: later calls read
    // them from cache (cheaper input, slightly faster). Only the short, varying user message is billed in full.
    system: [
      {
        type: "text",
        text: `${opts.system}

You MUST respond by calling the ${opts.tool.name} tool exactly once. Do not write any other text.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [opts.tool],
    tool_choice: { type: "auto" },
    output_config: { effort: EFFORT() },
    messages: [{ role: "user", content: opts.content }],
  });
  // Cost and speed telemetry: token counts only, never content.
  logEvent("model_usage", {
    ms: Date.now() - started,
    tool: opts.tool.name,
    inTokens: res.usage.input_tokens,
    outTokens: res.usage.output_tokens,
    cacheRead: res.usage.cache_read_input_tokens ?? 0,
    cacheWrite: res.usage.cache_creation_input_tokens ?? 0,
    effort: EFFORT(),
  });
  const block = res.content.find((b) => b.type === "tool_use");
  return block && block.type === "tool_use" ? block.input : undefined;
}
