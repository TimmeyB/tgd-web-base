import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiKey } from '@/lib/api-auth';

export async function GET(request, { params }) {
  const auth = await verifyApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const result = await query('SELECT * FROM campaigns WHERE id = $1 AND brand_id = $2', [params.id, auth.brandId]);
  const campaign = result.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  const countsResult = await query(
    `SELECT status, COUNT(*) AS count FROM submissions WHERE campaign_id = $1 GROUP BY status`,
    [campaign.id]
  );
  const counts = { applied: 0, approved: 0, rejected: 0, completed: 0 };
  for (const row of countsResult.rows) counts[row.status] = Number(row.count);

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      slotsTotal: campaign.slots_total,
      slotsFilled: campaign.slots_filled,
      reward: campaign.reward,
    },
    counts,
  });
}
