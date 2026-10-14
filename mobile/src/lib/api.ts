import * as Network from "expo-network";
import type { Analysis, AnalysisResponse, Locale, Subject, Urgency } from "./types";
import type { Draft } from "./session";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export type ApiErrorKind = "offline" | "rate_limited" | "unsafe" | "subscription" | "failed";
export class ApiError extends Error {
  constructor(public kind: ApiErrorKind) {
    super(kind);
  }
}

export async function isOnline(): Promise<boolean> {
  try {
    const s = await Network.getNetworkStateAsync();
    return s.isConnected !== false && s.isInternetReachable !== false;
  } catch {
    return true; // let the request itself decide
  }
}

async function post<T>(path: string, body: unknown, installId: string, timeoutMs: number): Promise<T> {
  if (!(await isOnline())) throw new ApiError("offline");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-install-id": installId },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (res.status === 429) throw new ApiError("rate_limited");
    if (res.status === 402) throw new ApiError("subscription");
    if (!res.ok) {
      const code = (await res.json().catch(() => ({})))?.error;
      throw new ApiError(code === "unsafe_output" ? "unsafe" : "failed");
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError((await isOnline()) ? "failed" : "offline");
  } finally {
    clearTimeout(timer);
  }
}

export interface PreviousPayload {
  daysAgo: number;
  urgency: Urgency;
  summary: string;
  observations: string[];
  image?: { mediaType: "image/jpeg"; data: string };
}

export function analyze(draft: Draft, locale: Locale, installId: string, previous?: PreviousPayload): Promise<AnalysisResponse> {
  const body = {
    mode: draft.mode,
    locale,
    subject: draft.subject,
    description: draft.description.trim(),
    duration: draft.duration,
    answers: draft.answers,
    previous,
    image: draft.attachment
      ? { mediaType: draft.attachment.mediaType, data: draft.attachment.data }
      : undefined,
  };
  return post<AnalysisResponse>("/api/analyze", body, installId, 90_000);
}

export function followUp(
  args: {
    locale: Locale;
    ageGroup: Subject["ageGroup"];
    context: string;
    history: { role: "user" | "assistant"; text: string }[];
    question: string;
  },
  installId: string,
): Promise<{ answer: string; urgency: Urgency; emergency: boolean }> {
  return post("/api/followup", args, installId, 60_000);
}

export function contribute(payload: unknown, installId: string): Promise<{ ok: true }> {
  return post("/api/contribute", payload, installId, 20_000);
}

/** Translates an existing result (text only; no photo is sent). */
export function translateAnalysis(analysis: Analysis, target: Locale, installId: string): Promise<{ analysis: Analysis }> {
  return post("/api/translate", { target, analysis }, installId, 60_000);
}
