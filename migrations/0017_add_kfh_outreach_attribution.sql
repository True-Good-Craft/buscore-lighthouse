-- Apply after owner approval and before the 1.34 Worker is promoted.
-- Additive: existing totals/constraints stay readable by rollback Workers.
-- No raw events, identities or joint source/campaign/content rows.
CREATE TABLE IF NOT EXISTS kfh_outreach_daily (
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  event TEXT NOT NULL CHECK (event IN ('page_views', 'resource_calls', 'help_211', 'directions', 'official_sources')),
  dimension TEXT NOT NULL,
  value TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (typeof(count) = 'integer' AND count > 0),
  PRIMARY KEY (day, event, dimension, value),
  CHECK (
    (dimension = 'source' AND value IN ('direct_unknown', 'facebook', 'community', 'search', 'other', 'reddit')) OR
    (dimension = 'campaign' AND value IN ('none', 'launch_2026_09', 'outreach_2026_09')) OR
    (dimension = 'content' AND value IN ('none', 'post_01', 'poster_01', 'post_02'))
  )
) WITHOUT ROWID;
