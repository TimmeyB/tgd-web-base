-- Fixes a real bug: screening approvals and actual task-completion
-- approvals were sharing the exact same status field, with nothing to
-- tell them apart. That meant approving someone's screening answer (or
-- auto-screening grading them) got treated by the payment logic as "pay
-- this person now" — even though they hadn't done the task yet.
--
-- 'screening' = this row represents a screening decision only. Approving
--   it should unlock the task for the tester, not pay them.
-- 'task'      = this row represents the actual task/proof. Approving it
--   is what should trigger payment.
--
-- Existing rows default to 'task' so nothing already paid out gets
-- reinterpreted retroactively.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'task';

-- Lets a brand tuck draft/closed/rejected campaigns out of the main
-- dashboard without deleting anything. NULL = visible on the main
-- dashboard as normal; a timestamp = archived, only shown on /dashboard/archive.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Password reset. Tokens are stored hashed (never plaintext) so a leaked
-- database still can't be used to reset anyone's password. 1-hour expiry,
-- single use — used_at gets set the moment it's redeemed.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_brand_id ON password_reset_tokens(brand_id);

-- Lets a brand message a specific tester about their submission when
-- feedback is unclear, without ever seeing the tester's actual Telegram
-- identity — everything routes through the bot as a relay. delivered_at
-- tracks whether the bot has actually handed a brand message to the
-- tester yet (NULL = still waiting for the bot to pick it up).
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL, -- 'brand' | 'tester'
  body TEXT NOT NULL,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_submission_id ON messages(submission_id);

-- Marks a brand account as a platform admin — lets that one account see
-- an /admin view of everything happening across every brand, not just
-- their own campaigns. Nobody has this by default; you flip it on
-- yourself with a one-off UPDATE, same as the subscription gift below.
ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;

-- Lets a brand pin daily check-ins to a specific hour instead of them
-- firing whenever the bot's hourly poll happens to notice a new day
-- started. NULL means "no fixed hour" — each tester's own claim-start
-- hour is used instead, so it isn't a total guess even when unset.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS daily_report_hour INTEGER;





