import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { initializeTransaction } from '@/lib/paystack';

export async function POST() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const result = await query('SELECT * FROM brands WHERE id = $1', [session.brandId]);
  const brand = result.rows[0];
  if (!brand) return NextResponse.json({ error: 'Brand not found.' }, { status: 404 });

  const reference = `sub_${brand.id}_${Date.now()}`;
  const amountNaira = Number(process.env.PAYSTACK_SUBSCRIPTION_AMOUNT_NGN || 0);

  if (!amountNaira) {
    return NextResponse.json({ error: 'Subscription pricing not configured yet.' }, { status: 500 });
  }

  const tx = await initializeTransaction({
    email: brand.email,
    amountNaira,
    reference,
    plan: process.env.PAYSTACK_PLAN_CODE || undefined,
    metadata: { purpose: 'subscription', brandId: brand.id },
  });

  return NextResponse.json({ authorizationUrl: tx.authorization_url });
}
