import type { AgeGroup, Analysis, Urgency } from "./schema";
import { FEVER_MULTILINGUAL, MULTILINGUAL_EMERGENCY } from "./emergency-i18n";
import { URGENCY } from "./schema";

/**
 * Deterministic safety layer. Runs BEFORE and AFTER the model.
 * The model may raise urgency; it may never lower it below these floors.
 * Keep in sync with mobile/src/lib/safety.ts (the app runs the same check on-device).
 */

const EMERGENCY_PATTERNS: { reason: string; re: RegExp }[] = [
  {
    reason: "severe breathing difficulty",
    re: /\b(can'?t|cannot|unable to|hard to|difficulty|trouble|struggling to)\s+breath|\bgasping\b|nahihirapan(g)? huminga|hirap(ing)? huminga|di makahinga|hindi makahinga/i,
  },
  {
    reason: "chest pain",
    re: /\bchest (pain|pressure|tightness)\b|\bpain in (my|the) chest\b|sakit (ng|sa) dibdib|masakit ang dibdib/i,
  },
  {
    reason: "severe bleeding",
    re: /\b(severe|heavy|uncontrolled|won'?t stop|nonstop|spurting)\b.{0,25}\bbleed|\bbleeding\b.{0,25}\b(won'?t stop|heavy|severe|uncontrolled)|hindi tumitigil.{0,20}dugo|sobrang dugo|malakas na pagdurugo/i,
  },
  {
    reason: "loss of consciousness",
    re: /\b(passed out|fainted|unconscious|unresponsive|not responding|won'?t wake|collapsed)\b|nawalan ng malay|hindi (na )?gumigising|nahimatay/i,
  },
  {
    reason: "seizure",
    re: /\b(seizure|convuls\w*)\b|kombulsyon/i,
  },
  {
    reason: "severe allergic reaction",
    re: /\banaphyla\w*|\b(throat|tongue|lips?|face)\b.{0,20}\b(swelling|swollen|closing)|\b(swelling|swollen)\b.{0,20}\b(throat|tongue|lips?)\b|namamaga ang lalamunan/i,
  },
  {
    reason: "blue or gray lips/skin",
    re: /\b(blue|bluish|gr[ae]y|purple)\b.{0,15}\b(lips?|skin|face|fingernails?)\b|asul na labi/i,
  },
  {
    reason: "sudden neurological symptoms",
    re: /\b(face droop\w*|slurred speech|sudden (weakness|numbness|confusion|vision loss|severe headache)|worst headache)\b|biglang (pamamanhid|panghihina|pagkalito)/i,
  },
  {
    reason: "possible poisoning or overdose",
    re: /\b(poison\w*|overdose|swallowed (a )?(battery|magnet|bleach|detergent|pills?)|drank (bleach|kerosene))\b|nalason|nakainom ng (lason|bleach|gasolina)|nakalunok ng (baterya|magnet)/i,
  },
  {
    reason: "severe injury",
    re: /\b(head injury|hit (his|her|my|their) head|bone (is )?(sticking|visible)|deep wound|severe burn|major (accident|injury|trauma))\b|malalim na sugat|malubhang sunog/i,
  },
  {
    reason: "thoughts of self-harm",
    re: /\b(suicid\w*|kill myself|end my life|want to die|self[- ]harm)\b|magpakamatay|gusto ko nang mamatay/i,
  },
  {
    reason: "signs of severe dehydration",
    re: /\b(sunken (eyes|fontanelle)|no tears|no wet diapers?)\b|walang ihi.{0,20}oras/i,
  },
  {
    reason: "vomiting blood or black stool",
    re: /\b(vomit\w*|throw\w* up|cough\w*) (up )?(blood|coffee grounds)\b|\bblack,? tarry stools?\b|nagsusuka ng dugo|itim na dumi/i,
  },
];

const FEVER_RE = /\b(fever|febrile|lagnat|nilalagnat)\b|\btemperature (of )?(38|39|40|10[0-5])/i;

export interface SafetyCheck {
  emergency: boolean;
  reasons: string[];
  /** Minimum urgency allowed in the final answer. */
  floor: Urgency;
}

export function maxUrgency(a: Urgency, b: Urgency): Urgency {
  return URGENCY.indexOf(a) >= URGENCY.indexOf(b) ? a : b;
}

export function detectEmergency(texts: string[], ageGroup: AgeGroup): SafetyCheck {
  const joined = texts.join("\n").slice(0, 20_000);
  const reasons = [...EMERGENCY_PATTERNS, ...MULTILINGUAL_EMERGENCY].filter((p) => p.re.test(joined)).map((p) => p.reason);
  let floor: Urgency = reasons.length ? "urgent" : "low";

  // Fever in a newborn is treated as urgent; in a young infant, prompt review at minimum.
  if (FEVER_RE.test(joined) || FEVER_MULTILINGUAL.test(joined)) {
    if (ageGroup === "newborn") {
      reasons.push("fever in a newborn");
      floor = "urgent";
    } else if (ageGroup === "infant") {
      floor = maxUrgency(floor, "prompt_review");
    }
  }
  return { emergency: floor === "urgent", reasons: [...new Set(reasons)], floor };
}

/** Phrases that assert a diagnosis, certainty, or false reassurance. Matching output is rejected. */
const DIAGNOSTIC_PATTERNS: RegExp[] = [
  /\byou (definitely |certainly |clearly )?(have|are suffering from|suffer from) (a |an )?[a-z -]{0,40}\b(infection|cancer|pneumonia|melanoma|diabetes|disease|syndrome|carcinoma|tumou?r|covid|tuberculosis)\b/i,
  /\b(this|it) is (definitely|certainly|clearly|without doubt)\b/i,
  /\bdiagnos(is|ed) (is|as|with)\b/i,
  /\b(is|are) (definitely|certainly) (not )?(cancer|cancerous|malignant|benign|harmless|safe)\b/i,
  /\bno need (to|for) (see|visit|consult|a doctor)/i,
  /\bnothing to worry about\b/i,
  /\b100 ?% (accurate|certain|sure)\b/i,
  /\bmayroon ka(ng)? (kanser|pneumonia|tb|diabetes)\b/i,
];

export function findDiagnosticText(text: string): string | null {
  const hit = DIAGNOSTIC_PATTERNS.find((re) => re.test(text));
  return hit ? hit.source : null;
}

export function findDiagnosticPhrasing(a: Analysis): string | null {
  return findDiagnosticText(
    [
      a.summary,
      a.urgency_reason,
      ...a.observations,
      ...a.next_steps,
      ...a.possible_explanations.flatMap((p) => [p.name, p.description]),
    ].join("\n"),
  );
}

/** Apply the deterministic floor; keep the model's own urgency if it is higher. */
export function enforceFloor(a: Analysis, check: SafetyCheck): Analysis {
  const urgency = maxUrgency(a.urgency, check.floor);
  if (urgency === a.urgency) return a;
  return {
    ...a,
    urgency,
    urgency_reason: check.reasons.length
      ? `Some of what was described (${check.reasons.join(", ")}) can need urgent care.`
      : a.urgency_reason,
    red_flags: [...new Set([...check.reasons, ...a.red_flags])].slice(0, 10),
  };
}

/** Used when the model is unavailable but an emergency was detected: safety never waits on the AI. */
export function emergencyFallback(check: SafetyCheck): Analysis {
  return {
    response_language: "English",
    category: "other",
    image_usable: false,
    summary: "What was described may need urgent medical attention.",
    observations: [],
    possible_explanations: [],
    urgency: "urgent",
    urgency_reason: `Warning signs detected: ${check.reasons.join(", ")}.`,
    red_flags: check.reasons,
    next_steps: [
      "Call your local emergency number or go to the nearest emergency room now.",
      "Do not wait for an app to finish analyzing.",
      "If someone is with the person, stay with them until help arrives.",
    ],
    needs_follow_up: false,
    follow_up_questions: [],
    limitations: ["This is an automatic safety message, not an analysis."],
  };
}

type Shape = Omit<Analysis, "response_language"> & { response_language?: string };

/**
 * A translation may change wording only. Urgency, category, confidence, flags, ids, lab values and the
 * number of items in every list must match the source, so a translation can never change a warning.
 */
export function sameStructure(src: Shape, out: Shape): boolean {
  if (
    src.category !== out.category ||
    src.image_usable !== out.image_usable ||
    src.urgency !== out.urgency ||
    src.needs_follow_up !== out.needs_follow_up
  ) {
    return false;
  }
  const lens: (keyof Shape)[] = ["observations", "red_flags", "next_steps", "limitations", "possible_explanations", "follow_up_questions", "questions_for_doctor"];
  for (const k of lens) {
    if (((src[k] as unknown[]) ?? []).length !== ((out[k] as unknown[]) ?? []).length) return false;
  }
  if (!src.possible_explanations.every((p, i) => p.confidence === out.possible_explanations[i].confidence)) return false;
  const qOk = src.follow_up_questions.every((q, i) => {
    const o = out.follow_up_questions[i];
    return q.id === o.id && q.options.length === o.options.length && q.options.every((opt, j) => opt.id === o.options[j].id);
  });
  if (!qOk) return false;
  const sl = src.lab_values ?? [];
  const ol = out.lab_values ?? [];
  if (sl.length !== ol.length) return false;
  return sl.every((l, i) => l.result === ol[i].result && l.flag === ol[i].flag && (l.reference_range ?? "") === (ol[i].reference_range ?? ""));
}
