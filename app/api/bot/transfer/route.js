import { NextResponse } from 'next/server';
import { createTransferRecipient, initiateTransfer } from '@/lib/paystack';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

export async function POST(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { amountNaira, reference, reason, recipientCode, accountName, accountNumber, bankCode } = await request.json();
  if (!amountNaira || !reference) {
    return NextResponse.json({ error: 'amountNaira and reference are required.' }, { status: 400 });
  }

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
      status: transfer.status, // 'success' | 'pending' | 'otp'
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
