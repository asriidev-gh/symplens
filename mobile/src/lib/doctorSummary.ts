import * as Print from "expo-print";
import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
import type { TKey } from "@/i18n";
import type { AnalysisResponse, Subject } from "./types";

type TFn = (k: TKey) => string;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const list = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "");

/** A one-page, plain summary a patient can hand to a clinician. Text is escaped; the photo is optional. */
export function buildDoctorHtml(args: {
  t: TFn;
  response: AnalysisResponse;
  createdAt: number;
  subject?: Subject | null;
  description?: string;
  photoB64?: string;
}): string {
  const { t, response, createdAt, subject, description, photoB64 } = args;
  const a = response.analysis;
  const who = subject ? `${t(`rel_${subject.relation}` as TKey)} · ${t(`age_${subject.ageGroup}` as TKey)} (${t(`ageRange_${subject.ageGroup}` as TKey)})` : "";
  const section = (title: string, body: string) => (body ? `<h2>${esc(title)}</h2>${body}` : "");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;padding:28px;line-height:1.45;font-size:14px}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:12px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.06em;color:#555}
  p{margin:4px 0} ul{margin:4px 0;padding-left:20px} li{margin:2px 0}
  .meta{color:#666;font-size:12px} .urg{display:inline-block;padding:3px 10px;border-radius:999px;background:#eee;font-weight:600}
  .foot{margin-top:24px;padding-top:10px;border-top:1px solid #ddd;color:#666;font-size:11px}
  img{max-width:260px;border-radius:8px;margin-top:6px}
</style></head><body>
<h1>${esc(t("doctorTitle"))}</h1>
<div class="meta">${esc(new Date(createdAt).toLocaleDateString())}${who ? " · " + esc(who) : ""}</div>
${section(t("describeTitle"), description?.trim() ? `<p>${esc(description.trim())}</p>` : "")}
${section(t("resultTitle"), `<p>${esc(a.summary)}</p>`)}
${photoB64 ? `<img src="data:image/jpeg;base64,${photoB64}" alt="" />` : ""}
${section(t("seeTitle"), list(a.observations))}
${section(t("meanTitle"), list(a.possible_explanations.map((p) => `${p.name}: ${p.description}`)))}
${section(t("concernTitle"), `<p><span class="urg">${esc(t(`urg_${a.urgency}` as TKey))}</span> ${esc(a.urgency_reason)}</p>`)}
${a.progress_note ? section(t("trackNoteTitle"), `<p>${esc(a.progress_note)}</p>`) : ""}
${section(t("watchTitle"), list(a.red_flags))}
${section(t("nextTitle"), list(a.next_steps))}
${section(t("doctorQuestions"), list(a.questions_for_doctor ?? []))}
<div class="foot">${esc(t("doctorGenerated"))} ${esc(t("notDiagnosis"))}</div>
</body></html>`;
}

/**
 * Web only: expo-print's printAsync ignores the html and prints the current page, so render the summary in a
 * hidden iframe and print that instead (the browser's "Save as PDF" then produces the one-page summary).
 */
function printHtmlOnWeb(html: string): void {
  const doc = (globalThis as any).document as Document | undefined;
  if (!doc) return;
  const frame = doc.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  doc.body.appendChild(frame);
  const w = frame.contentWindow;
  if (!w) {
    frame.remove();
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  const cleanup = () => frame.remove();
  w.addEventListener("afterprint", cleanup);
  setTimeout(() => {
    w.focus();
    w.print();
    setTimeout(cleanup, 60_000); // safety net if afterprint never fires
  }, 250);
}

/** Renders the HTML to a PDF and opens the share sheet (browser: print dialog showing the summary). */
export async function shareHtmlAsPdf(html: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === "web") {
    printHtmlOnWeb(html);
    return;
  }
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle, UTI: "com.adobe.pdf" });
      return;
    }
  } catch {
    /* fall through to the native print dialog */
  }
  await Print.printAsync({ html });
}
