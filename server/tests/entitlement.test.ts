import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEntitlementCache, hasEntitlement } from "../src/lib/entitlement";

const req = (id?: string) => new Request("http://x/api/analyze", { headers: id ? { "x-install-id": id } : {} });
const rc = (entitlements: object, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify({ subscriber: { entitlements } }), { status })) as unknown as typeof fetch;
const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

describe("subscription entitlement", () => {
  beforeEach(() => {
    clearEntitlementCache();
    vi.stubEnv("REQUIRE_SUBSCRIPTION", "true");
    vi.stubEnv("REVENUECAT_SECRET_KEY", "sk_test");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is open when the gate is off", async () => {
    vi.stubEnv("REQUIRE_SUBSCRIPTION", "false");
    expect(await hasEntitlement(req())).toBe(true);
  });
  it("requires an install id", async () => {
    expect(await hasEntitlement(req(), rc({}))).toBe(false);
  });
  it("accepts an active entitlement", async () => {
    expect(await hasEntitlement(req("abcdef123456"), rc({ pro: { expires_date: future } }))).toBe(true);
  });
  it("rejects an expired or missing entitlement", async () => {
    expect(await hasEntitlement(req("abcdef123456"), rc({ pro: { expires_date: past } }))).toBe(false);
    clearEntitlementCache();
    expect(await hasEntitlement(req("abcdef123456"), rc({}))).toBe(false);
  });
  it("fails closed without a RevenueCat key", async () => {
    vi.stubEnv("REVENUECAT_SECRET_KEY", "");
    expect(await hasEntitlement(req("abcdef123456"), rc({ pro: { expires_date: future } }))).toBe(false);
  });
  it("does not lock subscribers out on a RevenueCat error (503, not cached)", async () => {
    await expect(hasEntitlement(req("abcdef123456"), rc({}, 500))).rejects.toMatchObject({ status: 503 });
  });
  it("caches a successful answer", async () => {
    const f = rc({ pro: { expires_date: future } });
    await hasEntitlement(req("abcdef123456"), f);
    await hasEntitlement(req("abcdef123456"), f);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
