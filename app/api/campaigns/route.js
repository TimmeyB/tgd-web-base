import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { initializeTransaction } from '@/lib/paystack';

const COMMISSION_RATES = { self: 0.10, admin: 0.13 };

async function getBrand() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return null;
  const result = await query('SELECT * FROM brands WHERE id = $1', [session.brandId]);
  return result.rows[0] || null;
}

export async function GET() {
  const brand = await getBrand();
  if (!brand) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const result = await query(
    'SELECT * FROM campaigns WHERE brand_id = $1 ORDER BY created_at DESC',
    [brand.id]
  );
  return NextResponse.json({ campaigns: result.rows });
}

export async function POST(request) {
  const brand = await getBrand();
  if (!brand) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  if (brand.subscription_status !== 'active') {
    return NextResponse.json({ error: 'An active subscription is required to launch campaigns.' }, { status: 403 });
  }

  const {
    title,
    description,
    reward,
    slotsTotal,
    campaignType,
    handlingMode,
    screeningMode,
    screeningPoolCap,
    screeningQuestions,
    formUrl,
  } = await request.json();

  if (!title || !description || !reward || !slotsTotal || !campaignType) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }
  if (Number(reward) <= 0 || Number(slotsTotal) <= 0) {
    return NextResponse.json({ error: 'Reward and slots must be positive numbers.' }, { status: 400 });
  }
  const finalHandlingMode = handlingMode === 'self' ? 'self' : 'admin';

  // Screening is now available on every campaign type, not just Testing —
  // gate all downstream logic on the mode itself instead of the type.
  const finalScreeningMode = screeningMode || 'none';

  if (finalScreeningMode !== 'none') {
    if (!Array.isArray(screeningQuestions) || screeningQuestions.length === 0) {
      return NextResponse.json({ error: 'Add at least one screening question, or set screening to None.' }, { status: 400 });
    }
    for (const q of screeningQuestions) {
      if (!q.questionText || !q.type) {
        return NextResponse.json({ error: 'Every screening question needs text and a type.' }, { status: 400 });
      }
      if (q.type === 'mc' && (!Array.isArray(q.options) || q.options.length < 2)) {
        return NextResponse.json({ error: 'Multiple choice questions need at least 2 options.' }, { status: 400 });
      }
      if (finalScreeningMode === 'auto' && q.type !== 'mc') {
        return NextResponse.json({ error: 'Auto screening only supports multiple choice questions.' }, { status: 400 });
      }
    }
  }

  const baseCost = Number(reward) * Number(slotsTotal);
  const commissionAmount = Math.round(baseCost * COMMISSION_RATES[finalHandlingMode] * 100) / 100;
  const totalCharge = baseCost + commissionAmount;

  // Created as a draft, invisible to testers, until Paystack confirms
  // payment via webhook — the campaign never goes live unpaid.
  const campaignResult = await query(
    `INSERT INTO campaigns (brand_id, title, description, reward, slots_total, status, campaign_type, handling_mode, screening_mode, screening_pool_cap, form_url, commission_amount, total_charged)
     VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [brand.id, title, description, reward, slotsTotal, campaignType, finalHandlingMode, finalScreeningMode, screeningPoolCap || null, formUrl || null, commissionAmount, totalCharge]
  );
  const campaign = campaignResult.rows[0];

  if (finalScreeningMode !== 'none' && screeningQuestions?.length > 0) {
    for (let i = 0; i < screeningQuestions.length; i++) {
      const q = screeningQuestions[i];
      await query(
        `INSERT INTO screening_questions (campaign_id, question_order, question_text, type, options, qualifying)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          campaign.id,
          i,
          q.questionText,
          q.type,
          q.type === 'mc' ? JSON.stringify(q.options) : null,
          q.type === 'mc' ? JSON.stringify(q.qualifying || []) : null,
        ]
      );
    }
  }

  const rate = Number(process.env.PAYSTACK_USD_TO_NGN_RATE || 0);
  if (!rate) {
    return NextResponse.json({ error: 'Payment pricing not configured yet.' }, { status: 500 });
  }
  const amountNaira = totalCharge * rate;
  const reference = `camp_${campaign.id}_${Date.now()}`;

  const tx = await initializeTransaction({
    email: brand.email,
    amountNaira,
    reference,
    metadata: { purpose: 'campaign_payment', campaignId: campaign.id, brandId: brand.id },
    callbackUrl: `${new URL(request.url).origin}/payment/callback`,
  });

  return NextResponse.json({ authorizationUrl: tx.authorization_url });
}
