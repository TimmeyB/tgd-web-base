import { NextResponse } from 'next/server';
import { listBanks } from '@/lib/paystack';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

export async function GET(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  try {
    const banks = await listBanks();
    return NextResponse.json({ banks: banks.map((b) => ({ name: b.name, code: b.code })) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
