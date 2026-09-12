import { NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/api-auth';
import { getWalletBalance } from '@/lib/wallet';

const AGENT_COMMISSION_RATE = 0.15;

// Creates nothing, spends nothing — just runs the same validation and
// cost math the real create endpoint uses, so an agent can show a brand
// an accurate summary and get their confirmation before actually
// committing wallet funds.
export async function POST(request) {
  const auth = await verifyApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { title, description, reward, slotsTotal, campaignType, screeningMode, screeningQuestions, durationDays } = await request.json();

  if (!title || !description || !reward || !slotsTotal || !campaignType) {
    return NextResponse.json({ error: 'title, description, reward, slotsTotal, and campaignType are required.' }, { status: 400 });
  }
  if (Number(reward) <= 0 || Number(slotsTotal) <= 0) {
    return NextResponse.json({ error: 'reward and slotsTotal must be positive numbers.' }, { status: 400 });
  }
  if (!['testing', 'engagement', 'upvote', 'review', 'survey'].includes(campaignType)) {
    return NextResponse.json({ error: 'campaignType must be one of: testing, engagement, upvote, review, survey.' }, { status: 400 });
  }

  const finalScreeningMode = screeningMode || 'none';
  if (finalScreeningMode !== 'none' && (!Array.isArray(screeningQuestions) || screeningQuestions.length === 0)) {
    return NextResponse.json({ error: 'Add at least one screening question, or set screeningMode to none.' }, { status: 400 });
  }

  const baseCost = Number(reward) * Number(slotsTotal);
  const commissionAmount = Math.round(baseCost * AGENT_COMMISSION_RATE * 100) / 100;
  const totalCharge = baseCost + commissionAmount;
  const balance = await getWalletBalance(auth.brandId);

  return NextResponse.json({
    summary: {
      title, description, campaignType,
      reward: Number(reward),
      slotsTotal: Number(slotsTotal),
      screeningMode: finalScreeningMode,
      screeningQuestionCount: screeningQuestions?.length || 0,
      durationDays: campaignType === 'testing' && Number(durationDays) > 0 ? Number(durationDays) : 0,
      handlingMode: 'admin (always, for agent-created campaigns)',
      commissionRate: '15%',
    },
    baseCost,
    commissionAmount,
    totalCharge,
    currentWalletBalance: balance,
    canAfford: balance >= totalCharge,
    shortfall: balance >= totalCharge ? 0 : Number((totalCharge - balance).toFixed(2)),
    note: 'This is a preview only — nothing has been created or charged. Call POST /api/v1/campaigns with the same fields to actually create it.',
  });
}
