import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { initializeTransaction } from '@/lib/paystack';

export async function POST(request, { params }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const brandResult = await query('SELECT * FROM brands WHERE id = $1', [session.brandId]);
  const brand = brandResult.rows[0];
  if (!brand) return NextResponse.json({ error: 'Brand not found.' }, { status: 404 });

  const result = await query('SELECT * FROM campaigns WHERE id = $1 AND brand_id = $2', [params.id, brand.id]);
  const campaign = result.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  if (campaign.payment_status === 'paid') {
    return NextResponse.json({ error: 'This campaign is already paid and live.' }, { status: 400 });
  }
  if (brand.subscription_status !== 'active') {
    return NextResponse.json({ error: 'An active subscription is required to launch campaigns.' }, { status: 403 });
  }

  // Uses whatever reward/slots are currently saved on the campaign — if the
  // brand edited them since the last abandoned attempt, this charges the
  // up-to-date amount, not the stale one from the original creation.
  const rate = Number(process.env.PAYSTACK_USD_TO_NGN_RATE || 0);
  if (!rate) {
    return NextResponse.json({ error: 'Payment pricing not configured yet.' }, { status: 500 });
  }
  const totalCharge = Number(campaign.total_charged);
  const amountNaira = totalCharge * rate;
  const reference = `camp_${campaign.id}_${Date.now()}`;

  const tx = await initializeTransaction({
    email: brand.email,
    amountNaira,
    reference,
    metadata: { purpose: 'campaign_payment', campaignId: campaign.id, brandId: brand.id },
    callbackUrl: `${new URL(request.url).origin}/payment/callback`,
  });

  return NextResponse.json({ authorizationUrl: tx.authorization_url });
}
