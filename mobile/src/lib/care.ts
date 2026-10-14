import { Linking } from "react-native";
import type { Locale, Urgency } from "./types";

/**
 * "Find care near me" opens the phone's maps app with a search. SympLens never reads or stores the
 * user's location: the maps app does the locating.
 */
type Terms = { urgent: string; prompt: string; attention: string };

const TERMS: Record<Locale, Terms> = {
  en: { urgent: "emergency room", prompt: "urgent care clinic", attention: "doctor clinic" },
  es: { urgent: "urgencias hospital", prompt: "clínica de urgencias", attention: "clínica médica" },
  zh: { urgent: "急诊 医院", prompt: "急诊诊所", attention: "诊所" },
  ja: { urgent: "救急外来", prompt: "救急クリニック", attention: "病院 クリニック" },
  ko: { urgent: "응급실", prompt: "응급 진료", attention: "병원 의원" },
  fr: { urgent: "urgences hôpital", prompt: "centre de soins urgents", attention: "cabinet médical" },
  de: { urgent: "Notaufnahme", prompt: "Notfallpraxis", attention: "Arztpraxis" },
  pt: { urgent: "pronto-socorro", prompt: "pronto atendimento", attention: "clínica médica" },
  hi: { urgent: "आपातकालीन अस्पताल", prompt: "अर्जेंट केयर क्लिनिक", attention: "डॉक्टर क्लिनिक" },
  id: { urgent: "IGD rumah sakit", prompt: "klinik darurat", attention: "klinik dokter" },
  vi: { urgent: "phòng cấp cứu", prompt: "phòng khám cấp cứu", attention: "phòng khám bác sĩ" },
  ru: { urgent: "приёмное отделение больницы", prompt: "неотложная помощь", attention: "поликлиника" },
  it: { urgent: "pronto soccorso", prompt: "guardia medica", attention: "ambulatorio medico" },
  fil: { urgent: "ospital emergency room", prompt: "urgent care clinic", attention: "klinika ng doktor" },
};

export function careQuery(urgency: Urgency, locale: Locale): string {
  const t = TERMS[locale] ?? TERMS.en;
  return urgency === "urgent" ? t.urgent : urgency === "prompt_review" ? t.prompt : t.attention;
}

export function openCare(urgency: Urgency, locale: Locale): void {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(careQuery(urgency, locale))}`;
  Linking.openURL(url).catch(() => {});
}
