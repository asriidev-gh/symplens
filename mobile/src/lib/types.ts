/** Mirrors server/src/lib/schema.ts (the server validates; the app trusts only validated responses). */
export const AGE_GROUPS = ["newborn", "infant", "toddler", "child", "teen", "adult", "older_adult"] as const;
export const RELATIONS = ["me", "baby", "child", "teen", "partner", "parent", "other"] as const;
export const URGENCY = ["low", "needs_attention", "prompt_review", "urgent"] as const;
export const DURATIONS = ["today", "few_days", "one_two_weeks", "over_month", "unsure"] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];
export type Relation = (typeof RELATIONS)[number];
export type Urgency = (typeof URGENCY)[number];
export type Duration = (typeof DURATIONS)[number];
export const LOCALES = ["en", "es", "zh", "ja", "ko", "fr", "de", "pt", "hi", "id", "vi", "ru", "it", "fil"] as const;
export type Locale = (typeof LOCALES)[number];
export type Mode = "symptom" | "report";

export interface FollowUpQuestion {
  id: string;
  question: string;
  options: { id: string; label: string }[];
}

export interface Analysis {
  category: string;
  image_usable: boolean;
  summary: string;
  observations: string[];
  possible_explanations: { name: string; description: string; confidence: "possible" | "less_likely" | "more_likely" }[];
  urgency: Urgency;
  urgency_reason: string;
  red_flags: string[];
  next_steps: string[];
  needs_follow_up: boolean;
  follow_up_questions: FollowUpQuestion[];
  limitations: string[];
  questions_for_doctor?: string[];
  progress_note?: string;
  lab_values?: { test: string; result: string; reference_range?: string; flag: "normal" | "high" | "low" | "unclear" }[];
}

export interface AnalysisResponse {
  analysis: Analysis;
  emergency: boolean;
  emergencyReasons: string[];
}

export interface Subject {
  relation: Relation;
  ageGroup: AgeGroup;
  ageYears?: number;
}

export interface Attachment {
  mediaType: "image/jpeg" | "application/pdf";
  /** base64 payload sent for analysis. Held in memory only; never persisted in history. */
  data: string;
  /** local preview URI (images only) */
  previewUri?: string;
  quality?: "ok" | "blurry_or_dark" | "low_resolution";
  /** temp files created for this attachment; deleted when the draft is cleared */
  tempUris: string[];
}

export interface HistoryEntry {
  id: string;
  /** set when the user chose to keep the photo on this device */
  photoUri?: string;
  /** groups re-checks of the same area; equals the first entry's id */
  trackId?: string;
  /** UI language when the analysis was made (the language of its text) */
  locale?: Locale;
  createdAt: number;
  mode: Mode;
  subject: Subject;
  description: string;
  response: AnalysisResponse;
}
