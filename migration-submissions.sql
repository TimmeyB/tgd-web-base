-- Run this in Neon's SQL Editor. Additive only.
--
-- Tracks tester activity against a campaign, written by the bot via the
-- new /api/bot/* routes once it's wired up. Until the bot integration is
-- live, this table just stays empty and the campaign detail page shows
-- zero applicants — that's expected, not a bug.

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tester_handle TEXT NOT NULL, -- Telegram username or ID; the bot owns tester identity, not this app
  status TEXT NOT NULL DEFAULT 'applied', -- applied | approved | rejected | completed
  screening_answers JSONB,
  proof_text TEXT,
  proof_url TEXT,
  applied_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (campaign_id, tester_handle)
);

CREATE INDEX IF NOT EXISTS idx_submissions_campaign_id ON submissions(campaign_id);
