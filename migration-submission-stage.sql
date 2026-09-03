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

