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


