import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Hit by clicking the link in the verification email — GET, not POST,
// since it needs to work as a plain link with no JS/fetch involved.
export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token');
  const origin = new URL(request.url).origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/dashboard?verify=missing`);
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await query(
    `SELECT * FROM email_verification_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  const record = result.rows[0];

  if (!record) {
    return NextResponse.redirect(`${origin}/dashboard?verify=expired`);
  }

  await query('UPDATE brands SET email_verified_at = now() WHERE id = $1', [record.brand_id]);
  await query('UPDATE email_verification_tokens SET used_at = now() WHERE id = $1', [record.id]);

  return NextResponse.redirect(`${origin}/dashboard?verify=success`);
}
