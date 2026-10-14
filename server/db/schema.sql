-- SympLens anonymized case patterns (OPT-IN ONLY).
-- Deliberately contains: no photos, no thumbnails, no free text, no names/emails/device ids,
-- and only a DATE (not a timestamp) to limit re-identification.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS anonymous_cases (
  id               BIGSERIAL PRIMARY KEY,
  category         TEXT   NOT NULL,
  age_group        TEXT   NOT NULL,
  visual_features  TEXT[] NOT NULL DEFAULT '{}',
  symptoms         TEXT[] NOT NULL DEFAULT '{}',
  duration_bucket  TEXT,
  red_flags        TEXT[] NOT NULL DEFAULT '{}',
  ai_observations  TEXT[] NOT NULL DEFAULT '{}',
  -- Filled by a background job once an embedding provider is configured.
  embedding        vector(1024),
  created_on       DATE   NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS anonymous_cases_embedding_idx
  ON anonymous_cases USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS anonymous_cases_cat_age_idx ON anonymous_cases (category, age_group);

-- Similar-case lookup (NOT used to answer users in the MVP; similarity != diagnosis):
--   SELECT id, category, red_flags, ai_observations
--   FROM anonymous_cases
--   WHERE category = $1 AND age_group = $2 AND embedding IS NOT NULL
--   ORDER BY embedding <=> $3 LIMIT 5;
