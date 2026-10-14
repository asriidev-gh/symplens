import * as Speech from "expo-speech";
import { LANGUAGES } from "@/i18n";
import type { Locale } from "./types";

export function speak(text: string, locale: Locale, onDone?: () => void): void {
  Speech.stop();
  Speech.speak(text, {
    language: LANGUAGES.find((l) => l.code === locale)?.speech,
    rate: 0.92,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

/**
 * Voice input uses expo-speech-recognition, which needs a development build (not Expo Go).
 * It is loaded lazily so the rest of the app works without it.
 */
type RecognitionModule = typeof import("expo-speech-recognition").ExpoSpeechRecognitionModule;
function loadRecognition(): RecognitionModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-speech-recognition").ExpoSpeechRecognitionModule as RecognitionModule;
    return mod.isRecognitionAvailable() ? mod : null;
  } catch {
    return null;
  }
}

export function voiceInputAvailable(): boolean {
  return loadRecognition() !== null;
}

/** Starts dictation; returns a stop function, or null if unavailable/denied. */
export async function startDictation(
  locale: Locale,
  onText: (text: string, final: boolean) => void,
  onEnd: () => void,
): Promise<(() => void) | null> {
  const mod = loadRecognition();
  if (!mod) return null;
  const perm = await mod.requestPermissionsAsync();
  if (!perm.granted) return null;
  const subs = [
    mod.addListener("result", (e) => onText(e.results[0]?.transcript ?? "", e.isFinal)),
    mod.addListener("end", () => {
      subs.forEach((s) => s.remove());
      onEnd();
    }),
    mod.addListener("error", () => {
      subs.forEach((s) => s.remove());
      onEnd();
    }),
  ];
  mod.start({ lang: LANGUAGES.find((l) => l.code === locale)?.speech ?? "en-US", interimResults: true });
  return () => mod.stop();
}
