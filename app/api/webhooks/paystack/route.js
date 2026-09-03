import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { pingBot } from '@/lib/bot-sync';

// Paystack signs every webhook with your secret key so you can trust it's
// really them and not someone spoofing a "payment succeeded" call.
function isValidSignature(rawBody, signature) {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  return hash === signature;
}

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  if (!signature || !isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  await query(
    'INSERT INTO payment_events (event_type, reference, raw_payload) VALUES ($1, $2, $3)',
    [event.event, event.data?.reference || null, JSON.stringify(event)]
  );

  if (event.event === 'charge.success') {
    const { reference, metadata, amount, customer, plan_object } = event.data;
    const purpose = metadata?.purpose;

    if (purpose === 'subscription') {
      // First subscription payment succeeded — mark the brand active.
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await query(
        `UPDATE brands
         SET subscription_status = 'active',
             paystack_customer_code = $1,
             current_period_end = $2
         WHERE id = $3`,
        [customer.customer_code, periodEnd, metadata.brandId]
      );
    }

    if (purpose === 'campaign_payment') {
      // Self-handled campaigns are the brand's own risk (they review their
      // own testers) — no reason to gate on you being around to approve.
      // Admin-handled ones put your own Telegram reputation on the line,
      // so those still wait for a human look before going live.
      const campaignResult = await query('SELECT handling_mode FROM campaigns WHERE id = $1', [metadata.campaignId]);
      const handlingMode = campaignResult.rows[0]?.handling_mode;
      const newStatus = handlingMode === 'self' ? 'open' : 'pending_review';

      await query(
        `UPDATE campaigns SET payment_status = 'paid', paystack_reference = $1, status = $2 WHERE id = $3`,
        [reference, newStatus, metadata.campaignId]
      );
      // New campaign just went live (or into admin review) — let the bot
      // know now instead of waiting up to its backup interval. This is
      // awaited deliberately: Vercel can freeze a serverless function the
      // instant it sends its response, so un-awaited work here isn't
      // guaranteed to actually run. pingBot() has its own short timeout
      // and never throws, so this stays fast and safe either way.
      await pingBot();
    }

    if (purpose === 'campaign_edit') {
      // Only apply if this is still the reference we're expecting — guards
      // against a stale/duplicate webhook re-applying an old edit.
      const campaignResult = await query('SELECT * FROM campaigns WHERE id = $1', [metadata.campaignId]);
      const campaign = campaignResult.rows[0];
      if (campaign && campaign.pending_edit_reference === reference && campaign.pending_edit) {
        const fields = campaign.pending_edit;
        await query(
          `UPDATE campaigns
           SET title = $1, description = $2, reward = $3, slots_total = $4, form_url = $5,
               commission_amount = $6, total_charged = $7, pending_edit = NULL, pending_edit_reference = NULL
           WHERE id = $8`,
          [fields.title, fields.description, fields.reward, fields.slotsTotal, fields.formUrl,
           fields.commissionAmount, fields.totalCharged, campaign.id]
        );
      }
    }
  }

  if (event.event === 'subscription.create') {
    const { subscription_code, customer } = event.data;
    await query(
      `UPDATE brands SET subscription_code = $1 WHERE paystack_customer_code = $2`,
      [subscription_code, customer.customer_code]
    );
  }

  if (event.event === 'invoice.payment_failed') {
    const { customer } = event.data;
    await query(
      `UPDATE brands SET subscription_status = 'expired' WHERE paystack_customer_code = $1`,
      [customer.customer_code]
    );
  }

  if (event.event === 'subscription.disable') {
    const { customer } = event.data;
    await query(
      `UPDATE brands SET subscription_status = 'expired' WHERE paystack_customer_code = $1`,
      [customer.customer_code]
    );
  }

  // Paystack expects a fast 200 response — do nothing slow above this line.
  return NextResponse.json({ received: true });
}
