import { NextResponse } from 'next/server';
import { verifyTransfer } from '@/lib/paystack';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

export async function GET(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  const reference = new URL(request.url).searchParams.get('reference');
  if (!reference) {
    return NextResponse.json({ error: 'reference is required.' }, { status: 400 });
  }
  try {
    const result = await verifyTransfer(reference);
    return NextResponse.json({ status: result.status, reason: result.reason || null });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
