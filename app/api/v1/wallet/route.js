import { NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/api-auth';
import { getWalletBalance } from '@/lib/wallet';

export async function GET(request) {
  const auth = await verifyApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const balance = await getWalletBalance(auth.brandId);
  return NextResponse.json({ balance });
}
