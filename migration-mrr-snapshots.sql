-- Run in Neon's SQL Editor. Additive only.

-- One row per calendar month, keyed by that month's first day. Written by
-- an upsert on every /admin page load (see app/admin/page.jsx), so the
-- current month's row keeps refreshing to the latest MRR all month, and
-- once the month rolls over a new row starts — freezing prior months so
-- "what was MRR in August" becomes answerable without any cron job.
CREATE TABLE IF NOT EXISTS mrr_snapshots (
  month DATE PRIMARY KEY,
  mrr NUMERIC(10, 2) NOT NULL,
  active_subscriptions INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
