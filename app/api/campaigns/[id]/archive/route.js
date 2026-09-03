import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

async function getBrand() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return null;
  const result = await query('SELECT * FROM brands WHERE id = $1', [session.brandId]);
  return result.rows[0] || null;
}

// Tucks a campaign out of the main dashboard without deleting it — purely
// cosmetic, doesn't touch status, slots, or anything a tester depends on.
// Archiving an open/pending_review campaign is deliberately blocked: those
// are still live and testers can still claim them, so hiding them from
// the brand's own view would be actively confusing, not decluttering.
export async function PATCH(request, { params }) {
  const brand = await getBrand();
  if (!brand) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const result = await query('SELECT * FROM campaigns WHERE id = $1 AND brand_id = $2', [params.id, brand.id]);
  const campaign = result.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  const { archived } = await request.json();

  if (archived && ['open', 'pending_review'].includes(campaign.status)) {
    return NextResponse.json(
      { error: 'This campaign is still live — close or delete it before archiving.' },
      { status: 400 }
    );
  }

  const updateResult = await query(
    `UPDATE campaigns SET archived_at = $1 WHERE id = $2 RETURNING *`,
    [archived ? new Date().toISOString() : null, campaign.id]
  );

  return NextResponse.json({ campaign: updateResult.rows[0] });
}
