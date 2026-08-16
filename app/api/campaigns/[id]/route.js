import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { initializeTransaction } from '@/lib/paystack';

const COMMISSION_RATES = { self: 0.10, admin: 0.13 };

async function getBrand() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return null;
  const result = await query('SELECT * FROM brands WHERE id = $1', [session.brandId]);
  return result.rows[0] || null;
}

export async function GET(request, { params }) {
  const brand = await getBrand();
  if (!brand) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const result = await query('SELECT * FROM campaigns WHERE id = $1 AND brand_id = $2', [params.id, brand.id]);
  const campaign = result.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  return NextResponse.json({ campaign });
}

export async function PATCH(request, { params }) {
  const brand = await getBrand();
  if (!brand) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const result = await query('SELECT * FROM campaigns WHERE id = $1 AND brand_id = $2', [params.id, brand.id]);
  const campaign = result.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  // Once a tester has accepted a slot, the terms they saw when they signed
  // up shouldn't move under them — lock the campaign at that point.
  if (campaign.slots_filled > 0) {
    return NextResponse.json(
      { error: 'This campaign already has testers in progress, so it can no longer be edited.' },
      { status: 403 }
    );
  }

  const { title, description, reward, slotsTotal, formUrl } = await request.json();

  if (!title || !description || !reward || !slotsTotal) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }
  if (Number(reward) <= 0 || Number(slotsTotal) <= 0) {
    return NextResponse.json({ error: 'Reward and slots must be positive numbers.' }, { status: 400 });
  }

  const newBaseCost = Number(reward) * Number(slotsTotal);
  const newCommission = Math.round(newBaseCost * COMMISSION_RATES[campaign.handling_mode] * 100) / 100;
  const newTotal = newBaseCost + newCommission;

  const fields = {
    title,
    description,
    reward: Number(reward),
    slotsTotal: Number(slotsTotal),
    formUrl: formUrl || null,
    commissionAmount: newCommission,
    totalCharged: newTotal,
  };

  // Nothing has actually been charged yet for a draft — total_charged here
  // is just the intended amount from creation time, not money received.
  // So edits apply freely with no payment math; the real charge happens
  // whenever they hit "Continue to payment".
  if (campaign.payment_status !== 'paid') {
    const updateResult = await query(
      `UPDATE campaigns
       SET title = $1, description = $2, reward = $3, slots_total = $4, form_url = $5,
           commission_amount = $6, total_charged = $7
       WHERE id = $8 RETURNING *`,
      [fields.title, fields.description, fields.reward, fields.slotsTotal, fields.formUrl,
       fields.commissionAmount, fields.totalCharged, campaign.id]
    );
    return NextResponse.json({ applied: true, stillNeedsPayment: true, campaign: updateResult.rows[0] });
  }

  // Past this point, the campaign is live and paid — total_charged genuinely
  // reflects money already received, so it's safe to use as a baseline.
  const alreadyPaid = Number(campaign.total_charged || 0);

  // Shrinking or same-cost edits never require a new charge — the brand
  // already paid enough to cover it, so apply immediately.
  if (newTotal <= alreadyPaid) {
    const updateResult = await query(
      `UPDATE campaigns
       SET title = $1, description = $2, reward = $3, slots_total = $4, form_url = $5,
           commission_amount = $6, total_charged = $7
       WHERE id = $8 RETURNING *`,
      [fields.title, fields.description, fields.reward, fields.slotsTotal, fields.formUrl,
       fields.commissionAmount, fields.totalCharged, campaign.id]
    );
    return NextResponse.json({ applied: true, campaign: updateResult.rows[0] });
  }

  // Raising the budget needs a real payment for the difference before it
  // takes effect — hold the requested changes until Paystack confirms.
  const deltaUsd = newTotal - alreadyPaid;
  const rate = Number(process.env.PAYSTACK_USD_TO_NGN_RATE || 0);
  if (!rate) {
    return NextResponse.json({ error: 'Payment pricing not configured yet.' }, { status: 500 });
  }
  const amountNaira = deltaUsd * rate;
  const reference = `campedit_${campaign.id}_${Date.now()}`;

  await query(
    `UPDATE campaigns SET pending_edit = $1, pending_edit_reference = $2 WHERE id = $3`,
    [JSON.stringify(fields), reference, campaign.id]
  );

  const tx = await initializeTransaction({
    email: brand.email,
    amountNaira,
    reference,
    metadata: { purpose: 'campaign_edit', campaignId: campaign.id, brandId: brand.id },
    callbackUrl: `${new URL(request.url).origin}/payment/callback`,
  });

  return NextResponse.json({ applied: false, authorizationUrl: tx.authorization_url });
}

export async function DELETE(request, { params }) {
  const brand = await getBrand();
  if (!brand) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const result = await query('SELECT * FROM campaigns WHERE id = $1 AND brand_id = $2', [params.id, brand.id]);
  const campaign = result.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  // Same protection as editing — once a tester has accepted a slot, the
  // campaign can't just vanish on them.
  if (campaign.slots_filled > 0) {
    return NextResponse.json(
      { error: 'This campaign already has testers in progress, so it can no longer be deleted.' },
      { status: 403 }
    );
  }

  await query('DELETE FROM campaigns WHERE id = $1', [campaign.id]);
  return NextResponse.json({ deleted: true });
}
