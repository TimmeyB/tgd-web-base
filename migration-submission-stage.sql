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

-- API keys for external integrations (AI agents, third-party tools).
-- Deliberately narrow blast radius: keys can only create draft campaigns
-- and read data, never trigger payment, approve/reject, or move money.
-- Stored hashed, same as password reset tokens — never plaintext.
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- first few chars shown in the dashboard list so a brand can tell keys apart without re-revealing the secret
  label TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_brand_id ON api_keys(brand_id);

-- Wallet/credit system, built as a ledger rather than a single mutable
-- balance column — every top-up and every campaign-launch deduction is
-- its own permanent row, and the balance is always just the sum of them.
-- That means the balance can never silently drift from reality the way
-- a directly-mutated column could if a bug ever double-fired an update;
-- there's always a full, provable paper trail for real money moving.
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL, -- positive = top-up, negative = spent on a campaign
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_brand_id ON wallet_transactions(brand_id);

-- Tracks where a campaign came from and how it got paid for — mainly so
-- agent-created campaigns can be forced into admin-handled review and
-- their own commission tier, and so it's visible in /admin which
-- campaigns were self-serve vs. API-created.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'dashboard';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Login brute-force protection. Tracked in the database, not memory —
-- Vercel serverless functions don't reliably share in-memory state
-- between invocations, so this is the only place a counter actually
-- persists correctly across requests.
ALTER TABLE brands ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Anonymous pageview counter for the landing page (posted cross-origin
-- from taskgrind.app, since that site isn't Vercel-hosted and can't use
-- Vercel's built-in analytics). No cookie, no visitor identifier — just
-- a path and a timestamp.
CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);

-- Every signup attempt, whether it created a real account or hit an
-- already-registered email. Safe to log both — this doesn't reopen the
-- enumeration fix, since the API response itself still never reveals
-- which case happened. This is purely for the admin view.
CREATE TABLE IF NOT EXISTS signup_attempts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  outcome TEXT NOT NULL, -- 'created' | 'duplicate'
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_created_at ON signup_attempts(created_at DESC);

-- Logged the moment subscription checkout starts, before we even know
-- whether it'll succeed. Anything still 'initiated' means the brand
-- either had their card declined or abandoned checkout — Paystack
-- doesn't reliably tell us which for a first-time charge, so both cases
-- just show as "not completed" rather than guessing.
CREATE TABLE IF NOT EXISTS subscription_attempts (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'initiated', -- 'initiated' | 'completed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscription_attempts_brand_id ON subscription_attempts(brand_id);








