/**
 * Live multilingual evals (cost API credits): npm run eval
 * Checks the model answers in the requested language, still returns valid schema/enums,
 * and that emergencies in other languages are caught.
 */
import { describe, expect, it } from "vitest";
import { runAnalysis } from "../src/lib/pipeline";
import { type AnalyzeRequest, type Locale } from "../src/lib/schema";

const mk = (locale: Locale, description: string, ageGroup: AnalyzeRequest["subject"]["ageGroup"] = "adult"): AnalyzeRequest => ({
  mode: "symptom",
  locale,
  subject: { relation: "me", ageGroup },
  description,
  answers: [],
});

const NON_LATIN: [Locale, string, RegExp][] = [
  ["ja", "腕に小さなかゆい発疹が2日前からあります", /[\u3040-\u30ff\u4e00-\u9fff]/],
  ["ru", "уже два дня небольшая зудящая сыпь на руке", /[\u0400-\u04ff]/],
  ["zh", "手臂上有一小块发痒的皮疹，已经两天了", /[\u4e00-\u9fff]/],
  ["hi", "दो दिन से बाँह पर छोटे दाने और खुजली है", /[\u0900-\u097f]/],
];

describe("live multilingual evals", () => {
  for (const [locale, text, script] of NON_LATIN) {
    it(`answers in ${locale}`, { timeout: 120_000 }, async () => {
      const { analysis } = await runAnalysis(mk(locale, text));
      expect(analysis.summary).toMatch(script);
      expect(analysis.next_steps.join(" ")).toMatch(script);
      expect(["low", "needs_attention", "prompt_review", "urgent"]).toContain(analysis.urgency);
    });
  }

  it("answers in Spanish", { timeout: 120_000 }, async () => {
    const { analysis } = await runAnalysis(mk("es", "tengo una pequeña erupción con picazón en el brazo desde hace dos días"));
    expect(`${analysis.summary} ${analysis.next_steps.join(" ")}`).toMatch(/\b(el|la|de|que|puede|con|una?)\b/i);
    expect(`${analysis.summary}`).not.toMatch(/\b(the|and|may|could)\b/i);
  });

  it("flags a Japanese emergency as urgent", { timeout: 120_000 }, async () => {
    const { analysis, emergency } = await runAnalysis(mk("ja", "息ができなくて、胸が痛いです"));
    expect(emergency).toBe(true);
    expect(analysis.urgency).toBe("urgent");
  });

  it("flags a Spanish newborn fever as urgent", { timeout: 120_000 }, async () => {
    const { analysis } = await runAnalysis(mk("es", "mi bebé de 10 días tiene fiebre", "newborn"));
    expect(analysis.urgency).toBe("urgent");
  });
});
