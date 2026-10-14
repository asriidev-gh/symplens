import en, { type Dict } from "./en";
import fil from "./fil";
import es from "./es";
import zh from "./zh";
import ja from "./ja";
import ko from "./ko";
import fr from "./fr";
import de from "./de";
import pt from "./pt";
import hi from "./hi";
import id from "./id";
import vi from "./vi";
import ru from "./ru";
import it from "./it";
import type { Locale } from "@/lib/types";

// Add a language: create <code>.ts typed as Dict, register it here, add it to LANGUAGES.
const dictionaries: Record<Locale, Dict> = { en, es, zh, ja, ko, fr, de, pt, hi, id, vi, ru, it, fil };

/** Native names so people can find their language even if the UI is in one they cannot read. */
export const LANGUAGES: { code: Locale; label: string; speech: string }[] = [
  { code: "en", label: "English", speech: "en-US" },
  { code: "es", label: "Español", speech: "es-ES" },
  { code: "zh", label: "中文（简体）", speech: "zh-CN" },
  { code: "ja", label: "日本語", speech: "ja-JP" },
  { code: "ko", label: "한국어", speech: "ko-KR" },
  { code: "fr", label: "Français", speech: "fr-FR" },
  { code: "de", label: "Deutsch", speech: "de-DE" },
  { code: "pt", label: "Português (Brasil)", speech: "pt-BR" },
  { code: "hi", label: "हिन्दी", speech: "hi-IN" },
  { code: "id", label: "Bahasa Indonesia", speech: "id-ID" },
  { code: "vi", label: "Tiếng Việt", speech: "vi-VN" },
  { code: "ru", label: "Русский", speech: "ru-RU" },
  { code: "it", label: "Italiano", speech: "it-IT" },
  { code: "fil", label: "Filipino", speech: "fil-PH" },
];

export type TKey = keyof Dict;

export function translate(locale: Locale, key: TKey): string {
  return dictionaries[locale][key] ?? en[key];
}

export function categoryKey(category: string): TKey {
  const k = `cat_${category}` as TKey;
  return k in en ? k : "cat_other";
}

export const CATEGORY_EMOJI: Record<string, string> = {
  respiratory: "🫁",
  skin: "🩹",
  eye: "👁️",
  mouth_throat: "👄",
  digestive: "🫃",
  urinary: "💧",
  wound_injury: "🩹",
  nail_hair_scalp: "💅",
  swelling_pain: "🦵",
  document: "📄",
  other: "🩺",
};
