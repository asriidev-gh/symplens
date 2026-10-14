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

  it("has the same fever rule, negation handling and urgency floors", () => {
    // Everything from the fever rule through the end of detectEmergency (includes the negation helpers).
    const core = (s: string) => {
      const a = s.indexOf("const FEVER_RE");
      const b = s.indexOf("export function detectEmergency");
      return s.slice(a, b) + slice(s.slice(b), "export function detectEmergency", "\n}\n");
    };
    expect(core(mobile)).toBe(core(server));
  });

  it("has identical multilingual emergency patterns", () => {
    const norm = (s: string) => s.replace(/\/\*\*[\s\S]*?\*\//, "");
    expect(norm(read("mobile/src/lib/emergency-i18n.ts"))).toBe(norm(read("server/src/lib/emergency-i18n.ts")));
  });
});
