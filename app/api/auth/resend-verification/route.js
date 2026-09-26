import crypto from 'crypto';
import { NextResponse, unstable_after as after } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { sendExistingAccountNoticeEmail, sendVerificationEmail } from '@/lib/email';

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
    after(async () => {
      await sendExistingAccountNoticeEmail(existing.rows[0].email).catch((err) =>
        console.error('[signup] existing-account notice failed:', err.message)
      );
      await query('INSERT INTO signup_attempts (email, outcome) VALUES ($1, $2)', [email.toLowerCase(), 'duplicate']).catch(
        (err) => console.error('[signup] attempt log failed:', err.message)
      );
    });
    return NextResponse.json({ ok: true });
  }

  const passwordHash = await hashPassword(password);
  const result = await query(
    'INSERT INTO brands (company_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email',
    [companyName, email.toLowerCase(), passwordHash]
  );
  const brand = result.rows[0];

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const origin = new URL(request.url).origin;

  // Scheduled via after() rather than plain fire-and-forget — this is what
  // actually guarantees it runs to completion even though the response
  // below is sent first. Plain unawaited promises after a route handler
  // returns are NOT reliably executed on Vercel; after() exists
  // specifically to fix that.
  after(async () => {
    try {
      await query('INSERT INTO signup_attempts (email, outcome) VALUES ($1, $2)', [email.toLowerCase(), 'created']);
      await query(
        `INSERT INTO email_verification_tokens (brand_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [brand.id, tokenHash, expiresAt]
      );
      await sendVerificationEmail(brand.email, `${origin}/api/auth/verify-email?token=${rawToken}`);
    } catch (err) {
      console.error('[signup] post-response work failed:', err.message);
    }
  });

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
