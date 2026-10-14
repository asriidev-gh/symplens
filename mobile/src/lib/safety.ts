import type { AgeGroup, Analysis, Urgency } from "./types";
import { FEVER_MULTILINGUAL, MULTILINGUAL_EMERGENCY } from "./emergency-i18n";
import { URGENCY } from "./types";

/**
 * Deterministic safety layer. Runs BEFORE and AFTER the model.
 * The model may raise urgency; it may never lower it below these floors.
 * COPY of server/src/lib/safety.ts so emergency detection works on-device, offline, and unpaywalled.
 * Keep the two files in sync (server/tests/safety.test.ts covers the shared behavior).
 */

const EMERGENCY_PATTERNS: { reason: string; re: RegExp }[] = [
  {
    reason: "severe breathing difficulty",
    re: /\b(can'?t|cannot|unable to|hard to|difficulty|trouble|struggling to)\s+breath|\b(stopped|isn'?t|is not|not|no longer)\s+breathing\b|\bgasping\b|nahihirapan(g)? huminga|hirap(ing)? huminga|di makahinga|hindi makahinga/i,
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

/**
 * Negation: "no chest pain" must not raise an emergency. A match counts as denied only when a negator sits
 * directly in front of it (at most ONE word between) inside the same clause. "no relief from chest pain" still
 * counts (two words between), as do "no, she has chest pain" and "no fever but chest pain" (clause breaks).
 * Postfix-negation languages (Japanese, Korean, Hindi) are deliberately NOT handled: those stay high-recall and
 * the model adjudicates. Keep in sync with mobile/src/lib/safety.ts (a parity test enforces it).
 */
const NEGATORS =
  "no|not|without|never|denies|denied|none|hindi|walang|wala|sin|ni|sans|pas|aucun|aucune|kein|keine|keinen|keiner|ohne|nicht|não|nao|sem|nenhum|nenhuma|non|senza|nessun|nessuna|tidak|tanpa|bukan|không|chẳng|нет|без|не";
const NEG_BEFORE = new RegExp(`(?:^|[\\s(])(?:${NEGATORS})\\s+(?!only\\b)(?:\\S+\\s+)?$`, "iu");
const NEG_BEFORE_CJK = /(?:没有|沒有|并无|无|没|未|不)[\u4e00-\u9fff]?$/u;
const CLAUSE_BREAK = /[.,;:!?\n，。；：！？、]|\b(?:but|however|although|pero|mais|aber|tapi)\b|但是|不过|但/giu;

function isNegated(text: string, index: number): boolean {
  const upto = text.slice(Math.max(0, index - 60), index);
  let start = 0;
  for (const m of upto.matchAll(CLAUSE_BREAK)) start = (m.index ?? 0) + m[0].length;
  const clause = upto.slice(start);
  return NEG_BEFORE.test(clause) || NEG_BEFORE_CJK.test(clause);
}

/** True if `re` matches somewhere in `text` and at least one match is not negated. */
export function hasUnnegatedMatch(text: string, re: RegExp): boolean {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  for (const m of text.matchAll(g)) {
    if (!isNegated(text, m.index ?? 0)) return true;
  }
  return false;
}

export function detectEmergency(texts: string[], ageGroup: AgeGroup): SafetyCheck {
  const joined = texts.join("\n").slice(0, 20_000);
  const reasons = [...EMERGENCY_PATTERNS, ...MULTILINGUAL_EMERGENCY].filter((p) => hasUnnegatedMatch(joined, p.re)).map((p) => p.reason);
  let floor: Urgency = reasons.length ? "urgent" : "low";

  // Fever in a newborn is treated as urgent; in a young infant, prompt review at minimum.
  if (hasUnnegatedMatch(joined, FEVER_RE) || hasUnnegatedMatch(joined, FEVER_MULTILINGUAL)) {
    if (ageGroup === "newborn") {
      reasons.push("fever in a newborn");
      floor = "urgent";
    } else if (ageGroup === "infant") {
      floor = maxUrgency(floor, "prompt_review");
    }
  }
  return { emergency: floor === "urgent", reasons: [...new Set(reasons)], floor };
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
