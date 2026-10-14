import { describe, expect, it, vi } from "vitest";
import { corsHeaders } from "../src/lib/http";
import { runAnalysis } from "../src/lib/pipeline";
import { AnalysisSchema, type Analysis, type AnalyzeRequest } from "../src/lib/schema";
import { detectEmergency, findDiagnosticPhrasing, sameStructure } from "../src/lib/safety";

const good: Analysis = {
  response_language: "English",
  category: "respiratory",
  image_usable: true,
  summary: "The photo shows thick yellow-green mucus.",
  observations: ["Yellow-green color", "Thick consistency"],
  possible_explanations: [
    { name: "Respiratory infection", description: "This appearance can occur with respiratory infections.", confidence: "possible" },
  ],
  urgency: "low",
  urgency_reason: "No obvious warning signs were described.",
  red_flags: ["Difficulty breathing"],
  next_steps: ["Monitor symptoms", "Stay hydrated"],
  needs_follow_up: false,
  follow_up_questions: [],
  limitations: ["Appearance alone cannot determine the cause."],
};

const req = (over: Partial<AnalyzeRequest> = {}): AnalyzeRequest => ({
  mode: "symptom",
  locale: "en",
  subject: { relation: "me", ageGroup: "adult" },
  description: "cough for a week",
  answers: [],
  ...over,
});

describe("emergency detection", () => {
  it("flags chest pain and breathing trouble", () => {
    expect(detectEmergency(["I have chest pain"], "adult").emergency).toBe(true);
    expect(detectEmergency(["he can't breathe properly"], "child").emergency).toBe(true);
  });
  it("flags Filipino phrases", () => {
    expect(detectEmergency(["nahihirapan huminga si lola"], "older_adult").emergency).toBe(true);
  });
  it("does not flag mundane text", () => {
    expect(detectEmergency(["small rash on arm for two days"], "adult").emergency).toBe(false);
  });
  it("treats fever in a newborn as urgent and in an infant as prompt review", () => {
    expect(detectEmergency(["has a fever"], "newborn").floor).toBe("urgent");
    expect(detectEmergency(["has a fever"], "infant").floor).toBe("prompt_review");
    expect(detectEmergency(["has a fever"], "adult").floor).toBe("low");
  });
});

describe("negation handling", () => {
  const flagged = (t: string, age: "adult" | "infant" | "newborn" = "adult") => detectEmergency([t], age);
  it("does not raise an emergency for denied symptoms", () => {
    expect(flagged("no chest pain, no trouble breathing").emergency).toBe(false);
    expect(flagged("I do not have difficulty breathing").emergency).toBe(false);
    expect(flagged("cough for a week but no chest pain").emergency).toBe(false);
    expect(flagged("sin dolor en el pecho").emergency).toBe(false);
    expect(flagged("yo no tengo dolor en el pecho").emergency).toBe(false);
    expect(flagged("keine Atemnot").emergency).toBe(false);
    expect(flagged("没有胸痛").emergency).toBe(false);
    expect(flagged("walang sakit sa dibdib").emergency).toBe(false);
  });
  it("does not raise the infant or newborn fever floor for denied fever", () => {
    expect(flagged("my baby has no fever", "infant").floor).toBe("low");
    expect(flagged("walang lagnat", "newborn").floor).toBe("low");
    expect(flagged("sans fièvre", "newborn").floor).toBe("low");
    expect(flagged("sin fiebre", "newborn").floor).toBe("low");
  });
  it("still flags real emergencies near negators", () => {
    expect(flagged("no relief from chest pain").emergency).toBe(true);
    expect(flagged("no, she has chest pain").emergency).toBe(true);
    expect(flagged("no fever but chest pain").emergency).toBe(true);
    expect(flagged("no improvement and now chest pain").emergency).toBe(true);
    expect(flagged("not only chest pain but dizziness").emergency).toBe(true);
    expect(flagged("I can't breathe").emergency).toBe(true);
    expect(flagged("he is not breathing").emergency).toBe(true);
    expect(flagged("she stopped breathing").emergency).toBe(true);
    expect(flagged("my baby has a fever", "newborn").floor).toBe("urgent");
  });
});

describe("emergency detection in other languages", () => {
  const cases: [string, string][] = [
    ["es", "mi hijo no puede respirar bien"],
    ["es", "tengo dolor en el pecho"],
    ["fr", "il a perdu connaissance"],
    ["de", "sie hat starke Blutung und ist bewusstlos"],
    ["pt", "ele não consegue respirar"],
    ["it", "ha una crisi epilettica"],
    ["id", "anak saya sesak napas"],
    ["vi", "bé bị khó thở"],
    ["ru", "у него судороги"],
    ["zh", "他呼吸困难，还有胸痛"],
    ["ja", "息ができない"],
    ["ko", "가슴이 아파요"],
    ["hi", "उसे साँस लेने में तकलीफ है"],
  ];
  for (const [lang, text] of cases) {
    it(`flags ${lang}: ${text}`, () => {
      expect(detectEmergency([text], "adult").emergency).toBe(true);
    });
  }
  it("does not flag mundane text in other languages", () => {
    expect(detectEmergency(["tengo un sarpullido pequeño en el brazo"], "adult").emergency).toBe(false);
    expect(detectEmergency(["腕に小さな発疹があります"], "adult").emergency).toBe(false);
    expect(detectEmergency(["у меня лёгкий насморк"], "adult").emergency).toBe(false);
  });
  it("applies the newborn fever floor in other languages", () => {
    expect(detectEmergency(["mi bebé tiene fiebre"], "newborn").floor).toBe("urgent");
    expect(detectEmergency(["新生儿发烧了"], "newborn").floor).toBe("urgent");
  });
});

describe("CORS", () => {
  const reqFrom = (origin?: string) => new Request("http://api.test/api/analyze", { headers: origin ? { origin } : {} });
  it("allows localhost in development and sends no header without an origin", () => {
    expect(corsHeaders(reqFrom("http://localhost:8081"))["Access-Control-Allow-Origin"]).toBe("http://localhost:8081");
    expect(corsHeaders(reqFrom())).toEqual({});
  });
  it("rejects unknown origins", () => {
    expect(corsHeaders(reqFrom("https://evil.example"))).toEqual({});
  });
});

describe("translation invariants", () => {
  const withQ: Analysis = {
    ...good,
    possible_explanations: [{ name: "A", description: "d", confidence: "possible" }],
    follow_up_questions: [{ id: "q1", question: "Q?", options: [{ id: "y", label: "Yes" }, { id: "n", label: "No" }] }],
    lab_values: [{ test: "Hb", result: "9.1", reference_range: "12-16", flag: "low" }],
  };
  const tr: Analysis = {
    ...withQ,
    summary: "resumen",
    follow_up_questions: [{ id: "q1", question: "¿?", options: [{ id: "y", label: "Sí" }, { id: "n", label: "No" }] }],
  };
  it("accepts a wording-only change", () => {
    expect(sameStructure(withQ, tr)).toBe(true);
  });
  it("rejects a changed urgency", () => {
    expect(sameStructure(withQ, { ...tr, urgency: "urgent" })).toBe(false);
  });
  it("rejects dropped or added items", () => {
    expect(sameStructure(withQ, { ...tr, red_flags: [] })).toBe(false);
    expect(sameStructure(withQ, { ...tr, next_steps: [...tr.next_steps, "extra"] })).toBe(false);
  });
  it("rejects changed confidence or lab values", () => {
    expect(sameStructure(withQ, { ...tr, possible_explanations: [{ name: "A", description: "d", confidence: "more_likely" }] })).toBe(false);
    expect(sameStructure(withQ, { ...tr, lab_values: [{ test: "Hb", result: "9.9", reference_range: "12-16", flag: "low" }] })).toBe(false);
  });
});

describe("progress tracking", () => {
  it("sends the earlier photo, labeled, before the current one", async () => {
    const call = vi.fn().mockResolvedValue(good);
    await runAnalysis(
      req({
        image: { mediaType: "image/jpeg", data: "AAAA" },
        previous: { daysAgo: 5, urgency: "low", summary: "red patch", observations: ["red"], image: { mediaType: "image/jpeg", data: "BBBB" } },
      }),
      call,
    );
    const content = call.mock.calls[0][0].content as { type: string; text?: string }[];
    expect(content.map((c) => c.type)).toEqual(["text", "image", "text", "image", "text"]);
    expect(content[0].text).toContain("EARLIER PHOTO (5 days ago)");
    expect(content[2].text).toBe("CURRENT PHOTO:");
    expect(content[4].text).toContain("<previous_assessment>");
  });
  it("works without an earlier photo", async () => {
    const call = vi.fn().mockResolvedValue(good);
    await runAnalysis(req({ previous: { daysAgo: 2, urgency: "low", summary: "x", observations: [] } }), call);
    const content = call.mock.calls[0][0].content as { type: string }[];
    expect(content.map((c) => c.type)).toEqual(["text"]);
  });
});

describe("diagnostic phrasing guard", () => {
  it("rejects certainty and false reassurance", () => {
    expect(findDiagnosticPhrasing({ ...good, summary: "You have pneumonia." })).not.toBeNull();
    expect(findDiagnosticPhrasing({ ...good, next_steps: ["There is nothing to worry about"] })).not.toBeNull();
  });
  it("allows hedged language", () => {
    expect(findDiagnosticPhrasing(good)).toBeNull();
  });
});

describe("pipeline", () => {
  it("returns validated output", async () => {
    const r = await runAnalysis(req(), vi.fn().mockResolvedValue(good));
    expect(AnalysisSchema.safeParse(r.analysis).success).toBe(true);
    expect(r.emergency).toBe(false);
  });
  it("never lets the model go below the safety floor", async () => {
    const r = await runAnalysis(
      req({ subject: { relation: "baby", ageGroup: "newborn" }, description: "my newborn has a fever" }),
      vi.fn().mockResolvedValue(good),
    );
    expect(r.analysis.urgency).toBe("urgent");
    expect(r.emergency).toBe(true);
  });
  it("retries once on invalid output, then fails safely", async () => {
    const call = vi.fn().mockResolvedValue({ nonsense: true });
    await expect(runAnalysis(req(), call)).rejects.toMatchObject({ code: "unsafe_output" });
    expect(call).toHaveBeenCalledTimes(2);
  });
  it("retries when output is diagnostic", async () => {
    const call = vi.fn().mockResolvedValueOnce({ ...good, summary: "You have pneumonia." }).mockResolvedValueOnce(good);
    const r = await runAnalysis(req(), call);
    expect(r.analysis.summary).toBe(good.summary);
    expect(call).toHaveBeenCalledTimes(2);
  });
  it("shows an emergency message even if the model is down", async () => {
    const call = vi.fn().mockRejectedValue(new Error("down"));
    const r = await runAnalysis(req({ description: "severe bleeding that won't stop" }), call);
    expect(r.emergency).toBe(true);
    expect(r.analysis.urgency).toBe("urgent");
  });
});
