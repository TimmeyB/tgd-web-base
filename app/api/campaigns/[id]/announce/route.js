import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { pingBot } from '@/lib/bot-sync';

export async function PATCH(request, { params }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const result = await query(
    'SELECT * FROM campaigns WHERE id = $1 AND brand_id = $2',
    [params.id, session.brandId]
  );
  const campaign = result.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (campaign.status !== 'open') {
    return NextResponse.json({ error: 'Only open campaigns can be announced.' }, { status: 400 });
  }
  if (campaign.announced_at || campaign.announce_requested) {
    return NextResponse.json({ error: 'This campaign has already been announced (or is about to be).' }, { status: 400 });
  }

  // Flips a flag, then pings the bot so it broadcasts within seconds
  // instead of waiting on its backup timer.
  const updateResult = await query(
    `UPDATE campaigns SET announce_requested = true WHERE id = $1 RETURNING *`,
    [campaign.id]
  );
  pingBot();
  return NextResponse.json({ campaign: updateResult.rows[0] });
}
