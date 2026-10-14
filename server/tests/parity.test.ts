import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The emergency rules live in two places on purpose: the server enforces them, and the app runs the same
 * check on-device so it works offline. This test fails if the two copies drift apart.
 */
const read = (rel: string) => readFileSync(resolve(__dirname, "../..", rel), "utf8").replace(/\r\n/g, "\n");

/** Text from `start` through the first `end` after it. */
function slice(src: string, start: string, end: string): string {
  const a = src.indexOf(start);
  if (a < 0) throw new Error(`marker not found: ${start}`);
  const b = src.indexOf(end, a);
  if (b < 0) throw new Error(`end marker not found after: ${start}`);
  return src.slice(a, b + end.length);
}

describe("safety rules parity (server vs mobile)", () => {
  const server = read("server/src/lib/safety.ts");
  const mobile = read("mobile/src/lib/safety.ts");

  it("has identical English/Filipino emergency patterns", () => {
    const pick = (s: string) => slice(s, "const EMERGENCY_PATTERNS", "\n];");
    expect(pick(mobile)).toBe(pick(server));
  });

  it("has the same fever rule and urgency floors", () => {
    const fever = (s: string) => slice(s, "const FEVER_RE", ";");
    expect(fever(mobile)).toBe(fever(server));
    const detect = (s: string) => slice(s, "export function detectEmergency", "\n}\n");
    expect(detect(mobile)).toBe(detect(server));
  });

  it("has identical multilingual emergency patterns", () => {
    const norm = (s: string) => s.replace(/\/\*\*[\s\S]*?\*\//, "");
    expect(norm(read("mobile/src/lib/emergency-i18n.ts"))).toBe(norm(read("server/src/lib/emergency-i18n.ts")));
  });
});
