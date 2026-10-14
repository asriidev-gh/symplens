import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AnalysisSchema, FollowUpResultSchema } from "./schema";

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return client;
}

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
  const res = await getClient().messages.create({
    model: MODEL(),
    // Thinking is always on for this model and counts toward max_tokens, so leave generous headroom.
    max_tokens: opts.maxTokens ?? 8000,
    // Forced tool_choice is rejected by current models: use "auto" and instruct the call instead.
    // The result is still validated against the zod schema (with one retry) by the pipeline.
    system: `${opts.system}

You MUST respond by calling the ${opts.tool.name} tool exactly once. Do not write any other text.`,
    tools: [opts.tool],
    tool_choice: { type: "auto" },
    output_config: { effort: "medium" },
    messages: [{ role: "user", content: opts.content }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  return block && block.type === "tool_use" ? block.input : undefined;
}
