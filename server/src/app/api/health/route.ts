import { preflight, withCors } from "@/lib/http";

export const GET = withCors(() => Response.json({ ok: true }));
export const OPTIONS = preflight;
