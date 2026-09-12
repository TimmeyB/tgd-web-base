import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { initializeTransaction } from '@/lib/paystack';
import { getUsdToNgnRate } from '@/lib/exchange-rate';

export async function POST(request) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const brandResult = await query('SELECT * FROM brands WHERE id = $1', [session.brandId]);
  const brand = brandResult.rows[0];
  if (!brand) return NextResponse.json({ error: 'Brand not found.' }, { status: 404 });

  const { amountUsd } = await request.json();
  if (!amountUsd || Number(amountUsd) <= 0) {
    return NextResponse.json({ error: 'Enter a positive top-up amount.' }, { status: 400 });
  }

  const rate = await getUsdToNgnRate();
  if (!rate) {
    return NextResponse.json({ error: 'Payment pricing not available right now.' }, { status: 500 });
  }
  const amountNaira = Number(amountUsd) * rate;
  const reference = `topup_${brand.id}_${Date.now()}`;

  const tx = await initializeTransaction({
    email: brand.email,
    amountNaira,
    reference,
    // amountUsd is trusted here specifically because we set it ourselves,
    // server-side, right now — the webhook later reads this back to know
    // exactly how much USD to credit, since Paystack itself only ever
    // confirms the NGN charge succeeded, not the USD figure behind it.
    metadata: { purpose: 'wallet_topup', brandId: brand.id, amountUsd: Number(amountUsd) },
    callbackUrl: `${new URL(request.url).origin}/payment/callback`,
  });

  return NextResponse.json({ authorizationUrl: tx.authorization_url });
}
