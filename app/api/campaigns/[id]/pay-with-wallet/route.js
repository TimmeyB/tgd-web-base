import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { pingBot } from '@/lib/bot-sync';
import { getWalletBalance, recordWalletTransaction } from '@/lib/wallet';

export async function POST(request, { params }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const brandResult = await query('SELECT * FROM brands WHERE id = $1', [session.brandId]);
  const brand = brandResult.rows[0];
  if (!brand) return NextResponse.json({ error: 'Brand not found.' }, { status: 404 });

  const campaignResult = await query('SELECT * FROM campaigns WHERE id = $1 AND brand_id = $2', [params.id, brand.id]);
  const campaign = campaignResult.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (campaign.status !== 'draft') {
    return NextResponse.json({ error: 'This campaign has already been paid for or is no longer a draft.' }, { status: 400 });
  }

  const cost = Number(campaign.total_charged);
  const balance = await getWalletBalance(brand.id);
  if (balance < cost) {
    const shortfall = (cost - balance).toFixed(2);
    return NextResponse.json(
      { error: `Not enough wallet balance. You need $${shortfall} more — top up your wallet first.` },
      { status: 402 }
    );
  }

  const newStatus = campaign.handling_mode === 'self' ? 'open' : 'pending_review';

  await recordWalletTransaction(brand.id, -cost, `campaign_launch:${campaign.id}`);
  await query(
    `UPDATE campaigns SET payment_status = 'paid', status = $1, payment_method = 'wallet' WHERE id = $2`,
    [newStatus, campaign.id]
  );
  await pingBot();

  return NextResponse.json({ ok: true, status: newStatus });
}
