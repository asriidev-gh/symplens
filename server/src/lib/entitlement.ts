import { SafeError } from "./http";
import { consumeQuota, installId } from "./ratelimit";
import { logEvent } from "./log";

/**
 * Subscription gate. The app uses its install id as the RevenueCat app-user id, so the server can ask RevenueCat
 * whether that id has an active "pro" entitlement. Off unless REQUIRE_SUBSCRIPTION=true, so development and tests
 * work without it. Emergency guidance is never gated: callers decide what to do with a "not entitled" answer
 * (analyze still returns the on-server emergency fallback for emergencies).
 *
 * Env: REQUIRE_SUBSCRIPTION, REVENUECAT_SECRET_KEY (a secret v1 API key), REVENUECAT_ENTITLEMENT (default "pro").
 */
const TTL_MS = 60_000;
const cache = new Map<string, { ok: boolean; at: number }>();

export const subscriptionRequired = (): boolean => process.env.REQUIRE_SUBSCRIPTION === "true";

export function clearEntitlementCache(): void {
  cache.clear();
}

export async function hasEntitlement(req: Request, fetchFn: typeof fetch = fetch): Promise<boolean> {
  if (!subscriptionRequired()) return true;
  const id = installId(req);
  if (!id) return false;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.ok;

  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) {
    // Misconfiguration must not silently hand out free access nor lock everyone out of a paid product: fail closed, loudly.
    logEvent("entitlement_misconfigured", {});
    return false;
  }
  try {
    const res = await fetchFn(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`rc ${res.status}`);
    const data = (await res.json()) as {
      subscriber?: { entitlements?: Record<string, { expires_date: string | null } | undefined> };
    };
    const ent = data.subscriber?.entitlements?.[process.env.REVENUECAT_ENTITLEMENT ?? "pro"];
    const ok = !!ent && (ent.expires_date === null || new Date(ent.expires_date).getTime() > Date.now());
    cache.set(id, { ok, at: Date.now() });
    return ok;
  } catch {
    logEvent("entitlement_check_failed", {});
    // Do not cache failures. A subscriber should not be locked out because RevenueCat had a blip.
    throw new SafeError("unavailable", 503);
  }
}

export const subscriptionRequiredError = () => new SafeError("subscription_required", 402);

/**
 * Fair-use cap per subscriber per UTC month (MONTHLY_ANALYSIS_LIMIT, default 60; MONTHLY_AUX_LIMIT for chat and
 * translation, default 300). Counted only for entitled callers, so emergency answers never use it up or hit it.
 */
export async function enforceMonthlyQuota(req: Request, kind: "analysis" | "aux"): Promise<void> {
  if (!subscriptionRequired()) return;
  const id = installId(req);
  if (!id) return;
  const limit = Number(kind === "analysis" ? process.env.MONTHLY_ANALYSIS_LIMIT ?? 60 : process.env.MONTHLY_AUX_LIMIT ?? 300);
  const q = await consumeQuota(kind, id, limit);
  if (!q.ok) throw new SafeError("monthly_limit", 429, q.retryAfterSec);
}
