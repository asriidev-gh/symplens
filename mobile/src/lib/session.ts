import * as FileSystem from "expo-file-system/legacy";
import { useSyncExternalStore } from "react";
import type { AnalysisResponse, Attachment, Duration, Mode, Subject } from "./types";

/**
 * In-memory working state for the analysis flow. Never persisted.
 * Clearing it also deletes the temporary photo files we created.
 */
export interface Draft {
  mode: Mode;
  subject: Subject | null;
  attachment: Attachment | null;
  description: string;
  duration?: Duration;
  answers: { question: string; answer: string }[];
  /** set for a re-check: the earlier saved analysis to compare against */
  previousEntryId?: string;
}

export interface Current {
  response: AnalysisResponse;
  locale?: import("./types").Locale;
  /** history id if saved */
  savedId?: string;
  saved: boolean;
}

const emptyDraft = (mode: Mode = "symptom"): Draft => ({
  mode,
  subject: null,
  attachment: null,
  description: "",
  answers: [],
});

let draft: Draft = emptyDraft();
let current: Current | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getDraft = () => draft;
export const getCurrent = () => current;

export function useDraft(): Draft {
  return useSyncExternalStore(subscribe, getDraft);
}
export function useCurrent(): Current | null {
  return useSyncExternalStore(subscribe, getCurrent);
}

export function setDraft(patch: Partial<Draft>): void {
  draft = { ...draft, ...patch };
  emit();
}

export function startDraft(mode: Mode): void {
  discardAttachment();
  draft = emptyDraft(mode);
  current = null;
  emit();
}

export function setCurrent(c: Current | null): void {
  current = c;
  emit();
}

export function discardAttachment(): void {
  const uris = draft.attachment?.tempUris ?? [];
  for (const uri of uris) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  draft = { ...draft, attachment: null };
}

/** Drop the photo from memory and disk as soon as analysis has finished. */
export function releaseAttachment(): void {
  discardAttachment();
  emit();
}
