import { NextResponse } from 'next/server';
import { createTransferRecipient, initiateTransfer } from '@/lib/paystack';
import { getUsdToNgnRate } from '@/lib/exchange-rate';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

export async function POST(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { amountUsd, reference, reason, recipientCode, accountName, accountNumber, bankCode } = await request.json();
  if (!amountUsd || !reference) {
    return NextResponse.json({ error: 'amountUsd and reference are required.' }, { status: 400 });
  }

  // The conversion happens here, authoritatively, every time — same
  // pattern as charging brands. The bot never gets to decide the naira
  // amount itself; it only ever sends the USD figure the tester actually
  // earned, and this route converts it fresh using the current rate.
  const rate = await getUsdToNgnRate();
  if (!rate) {
    return NextResponse.json({ error: 'Exchange rate not available right now.' }, { status: 500 });
  }
  const amountNaira = amountUsd * rate;

  try {
    let finalRecipientCode = recipientCode;

    // Only register a new recipient the first time this bank account is
    // ever paid — after that, the bot reuses the saved recipient_code.
    if (!finalRecipientCode) {
      if (!accountName || !accountNumber || !bankCode) {
        return NextResponse.json(
          { error: 'No recipientCode given, and accountName/accountNumber/bankCode are needed to create one.' },
          { status: 400 }
        );
      }
      const recipient = await createTransferRecipient({ name: accountName, accountNumber, bankCode });
      finalRecipientCode = recipient.recipient_code;
    }

    const transfer = await initiateTransfer({
      amountNaira,
      recipientCode: finalRecipientCode,
      reason: reason || 'TaskGrind payout',
      reference,
    });

    return NextResponse.json({
      recipientCode: finalRecipientCode,
      transferReference: transfer.reference,
      transferCode: transfer.transfer_code, // needed later if Paystack requires an OTP to finalize
      amountNaira,
      status: transfer.status, // 'success' | 'pending' | 'otp'
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

