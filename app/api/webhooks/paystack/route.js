import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

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
      await query(
        `UPDATE campaigns SET payment_status = 'paid', paystack_reference = $1 WHERE id = $2`,
        [reference, metadata.campaignId]
      );
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
