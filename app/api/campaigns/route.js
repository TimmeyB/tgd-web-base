import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

async function getBrandId() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  return session?.brandId ?? null;
}

export async function GET() {
  const brandId = await getBrandId();
  if (!brandId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const result = await query(
    'SELECT * FROM campaigns WHERE brand_id = $1 ORDER BY created_at DESC',
    [brandId]
  );
  return NextResponse.json({ campaigns: result.rows });
}

export async function POST(request) {
  const brandId = await getBrandId();
  if (!brandId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { title, description, reward, slotsTotal } = await request.json();

  if (!title || !description || !reward || !slotsTotal) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }
  if (Number(reward) <= 0 || Number(slotsTotal) <= 0) {
    return NextResponse.json({ error: 'Reward and slots must be positive numbers.' }, { status: 400 });
  }

  const result = await query(
    `INSERT INTO campaigns (brand_id, title, description, reward, slots_total, status)
     VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
    [brandId, title, description, reward, slotsTotal]
  );

  return NextResponse.json({ campaign: result.rows[0] });
}
