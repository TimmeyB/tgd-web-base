import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';

export const maxDuration = 30;

export async function POST(request) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const result = await query('SELECT email, email_verified_at FROM brands WHERE id = $1', [session.brandId]);
  const brand = result.rows[0];
  if (!brand) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  if (brand.email_verified_at) return NextResponse.json({ error: 'This email is already verified.' }, { status: 400 });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO email_verification_tokens (brand_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [session.brandId, tokenHash, expiresAt]
  );

  const origin = new URL(request.url).origin;
  await sendVerificationEmail(brand.email, `${origin}/api/auth/verify-email?token=${rawToken}`);

  return NextResponse.json({ ok: true });
}
