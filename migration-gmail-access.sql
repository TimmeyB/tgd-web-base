-- Run in Neon's SQL Editor. Additive only.

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS requires_gmail_access BOOLEAN NOT NULL DEFAULT false;

-- Separate from `submissions` on purpose — a single tester goes through
-- TWO distinct approval moments on a gated beta campaign (Gmail access
-- first, final proof much later), and `submissions` has a one-row-per-
-- tester-per-campaign constraint that can't support that.
CREATE TABLE IF NOT EXISTS access_requests (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tester_handle TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  requested_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ,
  bot_notified_at TIMESTAMPTZ,
  UNIQUE (campaign_id, tester_handle)
);

CREATE INDEX IF NOT EXISTS idx_access_requests_campaign_id ON access_requests(campaign_id);
