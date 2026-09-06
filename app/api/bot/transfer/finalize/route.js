import { NextResponse } from 'next/server';
import { finalizeTransfer } from '@/lib/paystack';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

export async function POST(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  const { transferCode, otp } = await request.json();
  if (!transferCode || !otp) {
    return NextResponse.json({ error: 'transferCode and otp are required.' }, { status: 400 });
  }
  try {
    const result = await finalizeTransfer({ transferCode, otp });
    return NextResponse.json({ status: result.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
