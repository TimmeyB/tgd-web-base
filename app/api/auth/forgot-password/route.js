import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const result = await query('SELECT * FROM brands WHERE email = $1', [email.toLowerCase()]);
  const brand = result.rows[0];

  // Always return the same success response whether or not the email
  // exists — otherwise this endpoint becomes a way to check who has an
  // account here, which is a real privacy leak.
  if (brand) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `INSERT INTO password_reset_tokens (brand_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [brand.id, tokenHash, expiresAt]
    );

    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(brand.email, resetUrl);
  }

  return NextResponse.json({ ok: true });
}
