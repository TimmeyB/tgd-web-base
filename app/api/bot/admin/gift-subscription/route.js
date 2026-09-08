import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

// A subscription only ever really means "subscription_status = active"
// with a future current_period_end to your own app — Paystack doesn't
// need to be involved to grant that. This just sets those two fields
// directly, the same way a successful webhook normally would.
export async function POST(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { email, months } = await request.json();
  if (!email || !months || months <= 0) {
    return NextResponse.json({ error: 'email and a positive months value are required.' }, { status: 400 });
  }

  const result = await query(
    `UPDATE brands
     SET subscription_status = 'active',
         current_period_end = GREATEST(COALESCE(current_period_end, now()), now()) + ($2 || ' months')::interval
     WHERE email = $1
     RETURNING company_name, email, current_period_end`,
    [email.toLowerCase(), months]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'No brand found with that email.' }, { status: 404 });
  }

  return NextResponse.json({ brand: result.rows[0] });
}
