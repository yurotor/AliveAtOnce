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
  rank        integer NOT NULL,
  short_name  text,                      -- "Picasso"; null = use name
  field       text,                      -- broad field from the description (scripts/lib.ts fieldOf)
  photo       jsonb                      -- Commons portrait, see src/lib/photo.ts (null = none usable/resolved)
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
  surprise     double precision,            -- Jev, 1..10 (feed = 8+)
  recognizable double precision,            -- Jev, probability
  score        double precision NOT NULL,   -- ranking score (Jev, or heuristic before scoring)
  slug         text UNIQUE,                 -- /b/{slug}, e.g. darwin-picasso-eminem; never changes once set
  headline     text,                        -- Claude's headline, *and* = italic (null = template)
  one_liner    text,                        -- Claude's one-liner, optional
  feed         boolean NOT NULL DEFAULT false, -- in the homepage feed (passed every surprise filter, Jev 8+)
  daily_order  integer,                     -- position in the daily-bridge rotation (active only)
  active       boolean NOT NULL DEFAULT true, -- false = dropped from the latest load; page still works
  UNIQUE (bridge_id, early_id, late_id)
);
-- Upgrade path for databases created before these columns existed.
ALTER TABLE facts ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE facts ALTER COLUMN daily_order DROP NOT NULL;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS headline text;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS one_liner text;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS feed boolean NOT NULL DEFAULT false;
ALTER TABLE facts DROP COLUMN IF EXISTS line;
ALTER TABLE people ADD COLUMN IF NOT EXISTS short_name text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS field text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS photo jsonb;
CREATE INDEX IF NOT EXISTS facts_bridge_idx ON facts (bridge_id);
CREATE INDEX IF NOT EXISTS facts_early_idx ON facts (early_id);
CREATE INDEX IF NOT EXISTS facts_late_idx ON facts (late_id);
CREATE INDEX IF NOT EXISTS facts_daily_idx ON facts (daily_order);
CREATE INDEX IF NOT EXISTS facts_feed_idx ON facts (feed, score DESC);
