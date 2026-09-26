import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { sendExistingAccountNoticeEmail, sendVerificationEmail } from '@/lib/email';

// Raises the execution ceiling above the 10s default — a safety net on
// top of trimming the critical path below, in case Neon's free-tier
// database needs a moment to wake up from idle.
export const maxDuration = 30;

export async function POST(request) {
  const { companyName, email, password, agreedToTerms, website } = await request.json();

  // Honeypot — a real person never sees or fills this field, so anything
  // in it means a bot filled every field indiscriminately. Reply as if
  // it worked so the bot doesn't learn it was caught, but create nothing.
  if (website) {
    return NextResponse.json({ ok: true });
  }

  if (!companyName || !email || !password) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  if (!agreedToTerms) {
    return NextResponse.json({ error: 'You must agree to the Terms of Service and Privacy Policy.' }, { status: 400 });
  }

  const existing = await query('SELECT id, email FROM brands WHERE email = $1', [email.toLowerCase()]);

  // Deliberately the same response shape and status either way — an
  // attacker scripting through a list of emails can't tell "this one
  // already has an account" from "this one was just created", since both
  // look identical from the outside. The real account owner still finds
  // out, just by email instead of by the API response itself.
  if (existing.rows.length > 0) {
    sendExistingAccountNoticeEmail(existing.rows[0].email).catch((err) =>
      console.error('[signup] existing-account notice failed:', err.message)
    );
    query('INSERT INTO signup_attempts (email, outcome) VALUES ($1, $2)', [email.toLowerCase(), 'duplicate']).catch(
      (err) => console.error('[signup] attempt log failed:', err.message)
    );
    return NextResponse.json({ ok: true });
  }

  const passwordHash = await hashPassword(password);
  const result = await query(
    'INSERT INTO brands (company_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email',
    [companyName, email.toLowerCase(), passwordHash]
  );
  const brand = result.rows[0];

  // Everything below this line is either logging or something the user
  // can't act on within the next several seconds anyway (they have to
  // open an email client and tap a link) — none of it needs to block the
  // response. Only brand creation + the session cookie are on the
  // critical path now; this is what actually fixes the timeout, not just
  // the raised ceiling above.
  query('INSERT INTO signup_attempts (email, outcome) VALUES ($1, $2)', [email.toLowerCase(), 'created']).catch(
    (err) => console.error('[signup] attempt log failed:', err.message)
  );

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const origin = new URL(request.url).origin;

  query(
    `INSERT INTO email_verification_tokens (brand_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [brand.id, tokenHash, expiresAt]
  )
    .then(() => sendVerificationEmail(brand.email, `${origin}/api/auth/verify-email?token=${rawToken}`))
    .catch((err) => console.error('[signup] verification token/email failed:', err.message));

  const token = await createSessionToken(brand);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}
