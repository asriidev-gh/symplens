import { describe, expect, it } from "vitest";
import { SafeError, enforceLimits, readBody } from "../src/lib/http";
import { clientIp, consumeBudget, installId, rateLimit } from "../src/lib/ratelimit";
import { z } from "zod";

const req = (headers: Record<string, string> = {}, init: RequestInit = {}) =>
  new Request("http://api.test/api/analyze", { method: "POST", headers, ...init });

describe("client identification", () => {
  it("uses the address our proxy added, not the forgeable leftmost entry", () => {
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
  });
  it("rotating forged leftmost values cannot change the identity", () => {
    const ids = new Set(["1.1.1.1", "2.2.2.2", "3.3.3.3"].map((fake) => clientIp(req({ "x-forwarded-for": `${fake}, 198.51.100.4` }))));
    expect(ids.size).toBe(1);
  });
  it("rejects malformed values", () => {
    expect(clientIp(req())).toBe("unknown");
    expect(clientIp(req({ "x-forwarded-for": "<script>" }))).toBe("unknown");
  });
  it("accepts only well-formed install ids", () => {
    expect(installId(req({ "x-install-id": "abc123DEF456_-xy" }))).toBe("abc123DEF456_-xy");
    expect(installId(req({ "x-install-id": "short" }))).toBeUndefined();
    expect(installId(req({ "x-install-id": "bad id with spaces!!" }))).toBeUndefined();
  });
});

describe("rate limiting (in-memory backend)", () => {
  it("blocks after the limit and reports a retry time", async () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    const blocked = await rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
  it("enforceLimits throws a 429 SafeError once an IP exceeds the limit, regardless of forged headers", async () => {
    const ip = `192.0.2.${Math.floor(Math.random() * 200) + 20}`;
    const call = (fake: string) => enforceLimits(req({ "x-forwarded-for": `${fake}, ${ip}` }), 2, 60_000);
    await call("1.1.1.1");
    await call("2.2.2.2");
    await expect(call("3.3.3.3")).rejects.toMatchObject({ code: "rate_limited", status: 429 });
  });
});

describe("daily budget", () => {
  it("allows up to the limit then refuses", async () => {
    const kind = `t${Math.random()}`;
    expect((await consumeBudget(kind, 2)).ok).toBe(true);
    expect((await consumeBudget(kind, 2)).ok).toBe(true);
    expect((await consumeBudget(kind, 2)).ok).toBe(false);
  });
});

describe("body size cap", () => {
  const schema = z.object({ a: z.string() });
  it("rejects an oversized body even with no content-length (chunked)", async () => {
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(enc.encode('{"a":"'));
        c.enqueue(enc.encode("x".repeat(5000)));
        c.enqueue(enc.encode('"}'));
        c.close();
      },
    });
    const r = new Request("http://api.test/x", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    await expect(readBody(r, schema, 1000)).rejects.toBeInstanceOf(SafeError);
  });
  it("accepts a normal body", async () => {
    const r = req({ "content-type": "application/json" }, { body: JSON.stringify({ a: "hi" }) });
    await expect(readBody(r, schema, 1000)).resolves.toEqual({ a: "hi" });
  });
});
