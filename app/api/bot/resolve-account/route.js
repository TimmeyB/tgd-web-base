import { NextResponse } from 'next/server';
import { resolveAccount } from '@/lib/paystack';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

export async function POST(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  const { accountNumber, bankCode } = await request.json();
  if (!accountNumber || !bankCode) {
    return NextResponse.json({ error: 'accountNumber and bankCode are required.' }, { status: 400 });
  }
  try {
    const result = await resolveAccount(accountNumber, bankCode);
    return NextResponse.json({ accountName: result.account_name });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
