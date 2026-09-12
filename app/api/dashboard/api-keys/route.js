import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { generateApiKey } from '@/lib/api-auth';

async function getBrand() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return null;
  return session.brandId;
}

export async function GET() {
  const brandId = await getBrand();
  if (!brandId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const result = await query(
    `SELECT id, key_prefix, label, last_used_at, revoked_at, created_at FROM api_keys WHERE brand_id = $1 ORDER BY created_at DESC`,
    [brandId]
  );
  return NextResponse.json({ keys: result.rows });
}

export async function POST(request) {
  const brandId = await getBrand();
  if (!brandId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { label } = await request.json().catch(() => ({}));
  const { raw, hash, prefix } = generateApiKey();

  await query(
    `INSERT INTO api_keys (brand_id, key_hash, key_prefix, label) VALUES ($1, $2, $3, $4)`,
    [brandId, hash, prefix, label || null]
  );

  // The only time the real key is ever readable — it's hashed everywhere
  // after this, same as a password. Losing it means generating a new one.
  return NextResponse.json({ key: raw });
}

export async function DELETE(request) {
  const brandId = await getBrand();
  if (!brandId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { keyId } = await request.json();
  await query(`UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND brand_id = $2`, [keyId, brandId]);
  return NextResponse.json({ ok: true });
}
