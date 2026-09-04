import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request) {
  const { token, newPassword } = await request.json();
  if (!token || !newPassword) {
    return NextResponse.json({ error: 'Missing token or new password.' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await query(
    `SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  const record = result.rows[0];
  if (!record) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired. Request a new one.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await query('UPDATE brands SET password_hash = $1 WHERE id = $2', [passwordHash, record.brand_id]);
  await query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [record.id]);

  return NextResponse.json({ ok: true });
}
