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
    successExampleImage,
    successExampleMime,
    screeningMode,
    screeningPoolCap,
    screeningQuestions,
    formUrl,
    durationDays,
    requiresDailyReport,
    requiresGmailAccess,
    dailyReportQuestions,
  } = await request.json();

  if (!title || !description || !reward || !slotsTotal || !campaignType) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }
  if (Number(reward) <= 0 || Number(slotsTotal) <= 0) {
    return NextResponse.json({ error: 'Reward and slots must be positive numbers.' }, { status: 400 });
  }
  const finalHandlingMode = handlingMode === 'self' ? 'self' : 'admin';
  // Client sends a full data URI (data:image/png;base64,XXXX) — strip the
  // prefix so we store raw base64, since successExampleMime already has
  // the type info and the serving route needs raw bytes to decode.
  const rawImageBase64 = successExampleImage && finalHandlingMode === 'admin'
    ? successExampleImage.split(',').pop()
    : null;

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

  const finalDurationDays = campaignType === 'testing' && Number(durationDays) > 0 ? Number(durationDays) : 0;
  const finalRequiresDailyReport = finalDurationDays > 0 && !!requiresDailyReport;
  const finalRequiresGmailAccess = finalDurationDays > 0 && !!requiresGmailAccess;

  if (finalRequiresDailyReport) {
    if (!Array.isArray(dailyReportQuestions) || dailyReportQuestions.length === 0) {
      return NextResponse.json({ error: 'Add at least one daily report question, or turn off written reports.' }, { status: 400 });
    }
    for (const q of dailyReportQuestions) {
      if (!q.questionText || !q.type) {
        return NextResponse.json({ error: 'Every daily report question needs text and a type.' }, { status: 400 });
      }
      if (q.type === 'mc' && (!Array.isArray(q.options) || q.options.length < 2)) {
        return NextResponse.json({ error: 'Multiple choice questions need at least 2 options.' }, { status: 400 });
      }
    }
  }

  const baseCost = Number(reward) * Number(slotsTotal);
  const commissionAmount = Math.round(baseCost * COMMISSION_RATES[finalHandlingMode] * 100) / 100;
  const totalCharge = baseCost + commissionAmount;

  // Created as a draft, invisible to testers, until Paystack confirms
  // payment via webhook — the campaign never goes live unpaid.
  const campaignResult = await query(
    `INSERT INTO campaigns (brand_id, title, description, reward, slots_total, status, campaign_type, handling_mode, screening_mode, screening_pool_cap, form_url, commission_amount, total_charged, success_example_image, success_example_mime, duration_days, requires_daily_report, requires_gmail_access)
     VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
    [brand.id, title, description, reward, slotsTotal, campaignType, finalHandlingMode, finalScreeningMode, screeningPoolCap || null, formUrl || null, commissionAmount, totalCharge, rawImageBase64, rawImageBase64 ? successExampleMime : null, finalDurationDays, finalRequiresDailyReport, finalRequiresGmailAccess]
  );
  const campaign = campaignResult.rows[0];

  if (finalScreeningMode !== 'none' && screeningQuestions?.length > 0) {
    for (let i = 0; i < screeningQuestions.length; i++) {
      const q = screeningQuestions[i];
      await query(
        `INSERT INTO screening_questions (campaign_id, sort_order, question_text, question_type, options, qualifying_answers, purpose)
         VALUES ($1, $2, $3, $4, $5, $6, 'screening')`,
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

  if (finalRequiresDailyReport && dailyReportQuestions?.length > 0) {
    for (let i = 0; i < dailyReportQuestions.length; i++) {
      const q = dailyReportQuestions[i];
      await query(
        `INSERT INTO screening_questions (campaign_id, sort_order, question_text, question_type, options, qualifying_answers, purpose)
         VALUES ($1, $2, $3, $4, $5, NULL, 'daily_report')`,
        [
          campaign.id,
          i,
          q.questionText,
          q.type,
          q.type === 'mc' ? JSON.stringify(q.options) : null,
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
