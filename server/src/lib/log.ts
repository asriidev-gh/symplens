/**
 * Allow-list logger. Only primitive, non-health metadata may be logged.
 * Never pass request bodies, descriptions, answers, images, or AI output here.
 */
type Meta = Record<string, string | number | boolean | undefined>;

export function logEvent(event: string, meta: Meta = {}): void {
  const safe: Meta = {};
  for (const [k, v] of Object.entries(meta)) {
    // Defensive: drop long strings that could contain content.
    if (typeof v === "string" && v.length > 64) continue;
    safe[k] = v;
  }
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...safe }));
}
