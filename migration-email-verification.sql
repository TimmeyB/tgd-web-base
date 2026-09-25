-- Run in Neon's SQL Editor. Additive only.

-- Email verification. Same shape as password_reset_tokens: hashed,
-- single-use, expiring. 24h expiry (longer than the 1h password reset
-- window, since there's no urgency/security reason to rush this one —
-- just enough time that a brand who signs up and checks email the next
-- morning isn't locked out of the link).
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_brand_id ON email_verification_tokens(brand_id);

-- NULL = unverified. Deliberately not blocking login/signup on this —
-- just tracked so specific actions (payouts, campaign launch, etc.) can
-- require it later if we decide to.
ALTER TABLE brands ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
