import { z } from "zod";

export const AGE_GROUPS = ["newborn", "infant", "toddler", "child", "teen", "adult", "older_adult"] as const;
export const RELATIONS = ["me", "baby", "child", "teen", "partner", "parent", "other"] as const;
export const URGENCY = ["low", "needs_attention", "prompt_review", "urgent"] as const;
export const DURATIONS = ["today", "few_days", "one_two_weeks", "over_month", "unsure"] as const;
export const CATEGORIES = [
  "respiratory", "skin", "eye", "mouth_throat", "digestive", "urinary", "wound_injury",
  "nail_hair_scalp", "swelling_pain", "document", "other",
] as const;

export const LOCALES = ["en", "fil", "es", "zh", "ja", "ko", "fr", "de", "pt", "hi", "id", "vi", "ru", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export type AgeGroup = (typeof AGE_GROUPS)[number];
export type Urgency = (typeof URGENCY)[number];

// ~6 MB of base64 ≈ 4.5 MB binary. The app downsizes to far less.
export const MAX_IMAGE_B64 = 6_000_000;

export const AnalyzeRequestSchema = z
  .object({
    mode: z.enum(["symptom", "report"]).default("symptom"),
    locale: z.enum(LOCALES).default("en"),
    subject: z.object({
      relation: z.enum(RELATIONS),
      ageGroup: z.enum(AGE_GROUPS),
      ageYears: z.number().min(0).max(120).optional(),
    }),
    description: z.string().max(2000).default(""),
    duration: z.enum(DURATIONS).optional(),
    answers: z
      .array(z.object({ question: z.string().max(300), answer: z.string().max(300) }))
      .max(20)
      .default([]),
    image: z
      .object({
        mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
        data: z.string().max(MAX_IMAGE_B64),
      })
      .optional(),
    /** An earlier check of the same area, for progress tracking. The earlier photo is optional. */
    previous: z
      .object({
        daysAgo: z.number().int().min(0).max(3650),
        urgency: z.enum(URGENCY),
        summary: z.string().max(600),
        observations: z.array(z.string().max(300)).max(8).default([]),
        image: z
          .object({
            mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
            data: z.string().max(MAX_IMAGE_B64),
          })
          .optional(),
      })
      .optional(),
  })
  .refine((r) => r.description.trim().length > 0 || r.image, {
    message: "Provide a description or an image",
  });
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

const Short = z.string().min(1).max(500);

/** Human-readable text. The description is part of the tool schema the model sees, so it also pins the language. */
const LANG_NOTE = " Write this in the output_language given in the user message (never default to English).";
const text = (what: string, max = 500, min = 1) => z.string().min(min).max(max).describe(what + LANG_NOTE);

export const FollowUpQuestionSchema = z.object({
  id: z.string().max(40),
  question: text("A short question for the user."),
  options: z
    .array(z.object({ id: z.string().max(40), label: text("A short answer option label.", 60) }))
    .min(2)
    .max(6),
});

export const AnalysisSchema = z.object({
  // First on purpose: committing to the language before writing the summary keeps every field in it.
  response_language: z
    .string()
    .min(2)
    .max(40)
    .describe("Echo the output_language from the user message. Every text field below must be written in this language."),
  category: z.enum(CATEGORIES),
  image_usable: z.boolean(),
  summary: text("One or two plain sentences summarizing what is visible or described."),
  observations: z.array(text("One short observation.")).max(8),
  possible_explanations: z
    .array(
      z.object({
        name: text("Name of a possible explanation.", 120),
        description: text("Hedged, plain-language description.", 600),
        confidence: z.enum(["possible", "less_likely", "more_likely"]),
      }),
    )
    .max(5),
  urgency: z.enum(URGENCY),
  urgency_reason: text("Why this urgency level was chosen."),
  red_flags: z.array(text("One warning sign to watch for.")).max(10),
  next_steps: z.array(text("One concrete next step.")).min(1).max(8),
  needs_follow_up: z.boolean(),
  follow_up_questions: z.array(FollowUpQuestionSchema).max(4),
  limitations: z.array(text("One limitation of this analysis.")).max(5),
  questions_for_doctor: z
    .array(text("A short question the person could ask a clinician about this concern."))
    .max(5)
    .optional()
    .describe("2-4 questions to bring to a clinician. No dosing, no diagnosis claims."),
  progress_note: text("1-3 plain sentences comparing now with the earlier check. Only when an earlier check was provided.", 600)
    .optional(),
  lab_values: z
    .array(
      z.object({
        test: text("Test name as printed on the report.", 120, 0),
        result: z.string().max(60),
        reference_range: z.string().max(60).optional(),
        flag: z.enum(["normal", "high", "low", "unclear"]),
      }),
    )
    .max(60)
    .optional(),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

/** What the client receives: validated analysis + deterministic safety metadata. */
export interface AnalysisResponse {
  analysis: Analysis;
  emergency: boolean;
  emergencyReasons: string[];
}

export const FollowUpRequestSchema = z.object({
  locale: z.enum(LOCALES).default("en"),
  ageGroup: z.enum(AGE_GROUPS),
  context: z.string().max(4000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2500) })).max(12),
  question: z.string().min(1).max(1000),
});
export type FollowUpRequest = z.infer<typeof FollowUpRequestSchema>;

export const FollowUpResultSchema = z.object({
  answer: z.string().min(1).max(2500).describe("The answer." + LANG_NOTE),
  urgency: z.enum(URGENCY),
});

export const ContributeRequestSchema = z.object({
  consent: z.literal(true),
  category: z.enum(CATEGORIES),
  age_group: z.enum(AGE_GROUPS),
  visual_features: z.array(z.string().max(40)).max(10),
  symptoms: z.array(z.string().max(40)).max(10),
  duration_bucket: z.enum(DURATIONS).optional(),
  red_flags: z.array(z.string().max(80)).max(10),
  ai_observations: z.array(z.string().max(200)).max(8),
});

/** An analysis the app already holds (older saved results may lack response_language). */
export const TranslatableAnalysisSchema = AnalysisSchema.omit({ response_language: true }).extend({
  response_language: z.string().max(40).optional(),
});

export const TranslateRequestSchema = z.object({
  target: z.enum(LOCALES),
  analysis: TranslatableAnalysisSchema,
});
export type TranslateRequest = z.infer<typeof TranslateRequestSchema>;
