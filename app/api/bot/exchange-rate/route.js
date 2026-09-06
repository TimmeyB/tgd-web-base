import { NextResponse } from 'next/server';
import { getUsdToNgnRate } from '@/lib/exchange-rate';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

// Display-only. The real conversion for an actual transfer always happens
// fresh, server-side, in /api/bot/transfer — this endpoint exists purely
// so the bot can show a naira estimate in its messages, never to decide
// how much money actually moves.
export async function GET(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  const rate = await getUsdToNgnRate();
  if (!rate) {
    return NextResponse.json({ error: 'Exchange rate not available right now.' }, { status: 500 });
  }
  return NextResponse.json({ rate });
}
