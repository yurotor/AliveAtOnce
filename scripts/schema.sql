-- Alive At Once schema. Applied (idempotently) by scripts/6-load-db.ts.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS people (
  id          text PRIMARY KEY,          -- Wikidata QID
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  born_label  text NOT NULL,
  died_label  text,
  -- Decimal-year bounds (see src/lib/life.ts). d_lo/d_hi null = still alive.
  b_lo        double precision NOT NULL,
  b_hi        double precision NOT NULL,
  d_lo        double precision,
  d_hi        double precision,
  image       text,
  wiki        text,
  sitelinks   integer NOT NULL,
  pageviews   bigint NOT NULL DEFAULT 0,
  fame        double precision NOT NULL,
  rank        integer NOT NULL
);
CREATE INDEX IF NOT EXISTS people_rank_idx ON people (rank);
CREATE INDEX IF NOT EXISTS people_name_trgm_idx ON people USING gin (name gin_trgm_ops);

-- A "bridge": one life (bridge) that overlapped both an earlier and a later
-- figure who never overlapped each other.
CREATE TABLE IF NOT EXISTS facts (
  id           serial PRIMARY KEY,
  bridge_id    text NOT NULL REFERENCES people(id),
  early_id     text NOT NULL REFERENCES people(id),
  late_id      text NOT NULL REFERENCES people(id),
  gap          double precision NOT NULL,   -- years between early's death and late's birth
  surprise     double precision,            -- Jev, 0..1
  recognizable double precision,            -- Jev, probability
  score        double precision NOT NULL,   -- ranking score (Jev, or heuristic before scoring)
  line         text,                        -- Claude's one-liner (null = use template)
  daily_order  integer,                     -- position in the daily-bridge rotation (active only)
  active       boolean NOT NULL DEFAULT true, -- false = dropped from the latest load; page still works
  UNIQUE (bridge_id, early_id, late_id)
);
-- Upgrade path for databases created before these columns existed.
ALTER TABLE facts ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE facts ALTER COLUMN daily_order DROP NOT NULL;
CREATE INDEX IF NOT EXISTS facts_bridge_idx ON facts (bridge_id);
CREATE INDEX IF NOT EXISTS facts_early_idx ON facts (early_id);
CREATE INDEX IF NOT EXISTS facts_late_idx ON facts (late_id);
CREATE INDEX IF NOT EXISTS facts_daily_idx ON facts (daily_order);
