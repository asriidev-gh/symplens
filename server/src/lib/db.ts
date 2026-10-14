import { Pool } from "pg";
import type { z } from "zod";
import type { ContributeRequestSchema } from "./schema";

let pool: Pool | null = null;

export function dbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

function getPool(): Pool {
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  return pool;
}

/**
 * Stores an anonymized, opt-in case pattern. Contains NO photo, NO free text, NO identifiers.
 * The embedding column stays NULL until an embedding provider is configured.
 */
export async function insertAnonymousCase(c: z.infer<typeof ContributeRequestSchema>): Promise<void> {
  await getPool().query(
    `INSERT INTO anonymous_cases
       (category, age_group, visual_features, symptoms, duration_bucket, red_flags, ai_observations, created_on)
     VALUES ($1,$2,$3,$4,$5,$6,$7, CURRENT_DATE)`,
    [c.category, c.age_group, c.visual_features, c.symptoms, c.duration_bucket ?? null, c.red_flags, c.ai_observations],
  );
}
