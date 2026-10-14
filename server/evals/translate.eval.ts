/** Live translation evals (cost API credits): npm run eval */
import { describe, expect, it } from "vitest";
import { runTranslate } from "../src/lib/pipeline";
import { sameStructure } from "../src/lib/safety";
import type { Locale } from "../src/lib/schema";

const source = {
  category: "skin" as const,
  image_usable: true,
  summary: "The photo shows a foot with red, peeling, flaky skin between the toes. It has been itchy for one to two weeks.",
  observations: ["Skin between the toes looks red and scaly.", "The big toe nail looks mostly clear."],
  possible_explanations: [
    { name: "Athlete's foot (fungal skin infection)", description: "This can be consistent with a fungal infection. It cannot be confirmed from a photo alone.", confidence: "more_likely" as const },
    { name: "Eczema or contact dermatitis", description: "Dry, itchy skin can also occur with irritation from socks or soaps.", confidence: "possible" as const },
  ],
  urgency: "needs_attention" as const,
  urgency_reason: "No emergency signs were described, but symptoms have lasted more than a week.",
  red_flags: ["Spreading redness", "Fever", "Pus or increasing pain"],
  next_steps: ["Keep the area clean and dry.", "Consider contacting a healthcare professional if it does not improve."],
  needs_follow_up: true,
  follow_up_questions: [{ id: "pain", question: "Is it painful?", options: [{ id: "y", label: "Yes" }, { id: "n", label: "No" }, { id: "u", label: "Not sure" }] }],
  limitations: ["A photo alone cannot determine the cause."],
};

const CASES: [Locale, RegExp][] = [
  ["ja", /[\u3040-\u30ff\u4e00-\u9fff]/],
  ["fil", /\b(ang|ng|sa|mga|na)\b/i],
  ["es", /\b(el|la|de|que|puede|con)\b/i],
  ["ko", /[\uac00-\ud7af]/],
];

describe("live translation", () => {
  for (const [target, script] of CASES) {
    it(`translates to ${target} without changing structure or urgency`, { timeout: 120_000 }, async () => {
      const { analysis } = await runTranslate({ target, analysis: source });
      expect(analysis.urgency).toBe("needs_attention");
      expect(sameStructure(source as never, analysis)).toBe(true);
      expect(analysis.summary).toMatch(script);
      expect(analysis.red_flags.join(" ")).toMatch(script);
    });
  }
});
