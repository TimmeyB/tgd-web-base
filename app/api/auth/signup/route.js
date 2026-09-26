import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { sendExistingAccountNoticeEmail, sendVerificationEmail } from '@/lib/email';

// Gives Neon's free-tier database (and Resend's API call below) room to
// finish even after a cold start, instead of Vercel's 10s default killing
// the function mid-request.
export const maxDuration = 30;

export async function POST(request) {
  const { companyName, email, password, agreedToTerms, website } = await request.json();

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

  if (existing.rows.length > 0) {
    await sendExistingAccountNoticeEmail(existing.rows[0].email);
    await query('INSERT INTO signup_attempts (email, outcome) VALUES ($1, $2)', [email.toLowerCase(), 'duplicate']);
    return NextResponse.json({ ok: true });
  }

  const passwordHash = await hashPassword(password);
  const result = await query(
    'INSERT INTO brands (company_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email',
    [companyName, email.toLowerCase(), passwordHash]
  );
  const brand = result.rows[0];
  await query('INSERT INTO signup_attempts (email, outcome) VALUES ($1, $2)', [email.toLowerCase(), 'created']);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await query(
    `INSERT INTO email_verification_tokens (brand_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [brand.id, tokenHash, expiresAt]
  );
  const origin = new URL(request.url).origin;
  await sendVerificationEmail(brand.email, `${origin}/api/auth/verify-email?token=${rawToken}`);

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
