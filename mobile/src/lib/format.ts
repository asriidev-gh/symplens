import type { TKey } from "@/i18n";
import { categoryKey } from "@/i18n";
import type { AnalysisResponse, HistoryEntry } from "./types";

type TFn = (k: TKey) => string;

/** Plain-text rendering used for "Read this to me" and for export/share. */
export function toPlainText(r: AnalysisResponse, t: TFn, opts: { includeDisclaimer?: boolean } = {}): string {
  const a = r.analysis;
  const lines: string[] = [];
  if (r.emergency) lines.push(`${t("emergencyTitle")}. ${t("emergencyBody")}`);
  lines.push(t("resultTitle") + ".", a.summary);
  if (a.observations.length) lines.push(t("seeTitle") + ".", ...a.observations.map((o) => `- ${o}`));
  if (a.possible_explanations.length) {
    lines.push(t("meanTitle") + ".", ...a.possible_explanations.map((p) => `- ${p.name}: ${p.description}`));
  }
  lines.push(`${t("concernTitle")} ${t(`urg_${a.urgency}` as TKey)}. ${a.urgency_reason}`);
  if (a.red_flags.length) lines.push(t("watchTitle") + ".", ...a.red_flags.map((o) => `- ${o}`));
  lines.push(t("nextTitle") + ".", ...a.next_steps.map((o) => `- ${o}`));
  if (opts.includeDisclaimer) lines.push("", t("notDiagnosis"));
  return lines.join("\n");
}

export function toExportText(e: Pick<HistoryEntry, "createdAt" | "response">, t: TFn): string {
  const a = e.response.analysis;
  const head = `SympLens – ${t(categoryKey(a.category))} – ${new Date(e.createdAt).toLocaleString()}`;
  return `${head}\n\n${toPlainText(e.response, t, { includeDisclaimer: true })}`;
}

/** Short context passed to the follow-up chat (no photo, no identifiers). */
export function toChatContext(r: AnalysisResponse): string {
  const a = r.analysis;
  return [
    `Summary: ${a.summary}`,
    `Observations: ${a.observations.join("; ")}`,
    `Possible explanations: ${a.possible_explanations.map((p) => p.name).join("; ")}`,
    `Urgency: ${a.urgency} (${a.urgency_reason})`,
    `Red flags: ${a.red_flags.join("; ")}`,
  ]
    .join("\n")
    .slice(0, 3900);
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function dayLabel(ts: number, t: TFn): string {
  const d = new Date(ts);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86_400_000);
  if (diff === 0) return t("today");
  if (diff === 1) return t("yesterday");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: diff > 300 ? "numeric" : undefined });
}
