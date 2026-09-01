-- Run in Neon's SQL Editor. Additive only.

-- Single-row table the bot updates every sync cycle with its current user
-- count. Kept separate from anything brand-specific since this is a
-- public, platform-wide number for the landing page.
CREATE TABLE IF NOT EXISTS platform_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_testers INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO platform_stats (id, total_testers) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
