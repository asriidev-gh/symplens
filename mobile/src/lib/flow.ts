import { router } from "expo-router";
import { startDraft } from "./session";
import type { Mode } from "./types";

export function startFlow(mode: Mode, textOnly = false): void {
  startDraft(mode);
  router.push({ pathname: "/analyze/who", params: textOnly ? { textOnly: "1" } : {} });
}
