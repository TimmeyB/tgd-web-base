import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiKey } from '@/lib/api-auth';
import { getWalletBalance, recordWalletTransaction } from '@/lib/wallet';

// Agent-created campaigns always carry this rate, separate from the
// normal 10%/13% choice a human makes on the dashboard — always
// admin-handled (see below), so it's priced as the higher-oversight tier
// consistently, not something an agent gets to choose.
const AGENT_COMMISSION_RATE = 0.15;

// An agent can only ever spend a balance a human already funded through
// real Paystack checkout — it never has a way to trigger a fresh charge
// itself. If the balance doesn't cover it, nothing gets created at all;
// there's no such thing as an unpaid agent-created campaign left lying
// around to accidentally launch later.
export async function POST(request) {
  const auth = await verifyApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const brandResult = await query('SELECT * FROM brands WHERE id = $1', [auth.brandId]);
  const brand = brandResult.rows[0];
  if (!brand) return NextResponse.json({ error: 'Brand not found.' }, { status: 404 });
  if (brand.subscription_status !== 'active') {
    return NextResponse.json({ error: 'An active subscription is required to create campaigns.' }, { status: 403 });
  }

  const {
    title, description, reward, slotsTotal, campaignType,
    screeningMode, screeningQuestions, formUrl,
    durationDays, requiresDailyReport, dailyReportQuestions,
  } = await request.json();

  if (!title || !description || !reward || !slotsTotal || !campaignType) {
    return NextResponse.json({ error: 'title, description, reward, slotsTotal, and campaignType are required.' }, { status: 400 });
  }
  if (Number(reward) <= 0 || Number(slotsTotal) <= 0) {
    return NextResponse.json({ error: 'reward and slotsTotal must be positive numbers.' }, { status: 400 });
  }
  if (!['testing', 'engagement', 'upvote', 'review', 'survey'].includes(campaignType)) {
    return NextResponse.json({ error: 'campaignType must be one of: testing, engagement, upvote, review, survey.' }, { status: 400 });
  }

  // Always admin-handled — never a choice here. A campaign created
  // through the API might happen while nobody's actually watching the
  // dashboard, so a real human always looks it over before it goes live,
  // same review step as any other admin-handled campaign.
  const finalHandlingMode = 'admin';
  const finalScreeningMode = screeningMode || 'none';

  if (finalScreeningMode !== 'none') {
    if (!Array.isArray(screeningQuestions) || screeningQuestions.length === 0) {
      return NextResponse.json({ error: 'Add at least one screening question, or set screeningMode to none.' }, { status: 400 });
    }
    for (const q of screeningQuestions) {
      if (!q.questionText || !q.type) {
        return NextResponse.json({ error: 'Every screening question needs questionText and type.' }, { status: 400 });
      }
      if (finalScreeningMode === 'auto' && q.type !== 'mc') {
        return NextResponse.json({ error: 'Auto screening only supports multiple choice (mc) questions.' }, { status: 400 });
      }
    }
  }

  const finalDurationDays = campaignType === 'testing' && Number(durationDays) > 0 ? Number(durationDays) : 0;
  const finalRequiresDailyReport = finalDurationDays > 0 && !!requiresDailyReport;

  const baseCost = Number(reward) * Number(slotsTotal);
  const commissionAmount = Math.round(baseCost * AGENT_COMMISSION_RATE * 100) / 100;
  const totalCharge = baseCost + commissionAmount;

  const balance = await getWalletBalance(brand.id);
  if (balance < totalCharge) {
    const shortfall = (totalCharge - balance).toFixed(2);
    return NextResponse.json(
      {
        error: `Insufficient wallet balance. This campaign costs $${totalCharge.toFixed(2)} (reward × slots + 15% commission), you have $${balance.toFixed(2)}. Top up $${shortfall} more before creating this campaign.`,
        totalCharge,
        currentBalance: balance,
        shortfall: Number(shortfall),
      },
      { status: 402 }
    );
  }

  const campaignResult = await query(
    `INSERT INTO campaigns (brand_id, title, description, reward, slots_total, status, campaign_type, handling_mode, screening_mode, form_url, commission_amount, total_charged, duration_days, requires_daily_report, created_via, payment_method, payment_status)
     VALUES ($1, $2, $3, $4, $5, 'pending_review', $6, $7, $8, $9, $10, $11, $12, $13, 'agent', 'wallet', 'paid') RETURNING *`,
    [brand.id, title, description, reward, slotsTotal, campaignType, finalHandlingMode, finalScreeningMode, formUrl || null, commissionAmount, totalCharge, finalDurationDays, finalRequiresDailyReport]
  );
  const campaign = campaignResult.rows[0];

  await recordWalletTransaction(brand.id, -totalCharge, `campaign_launch:${campaign.id}`);

  if (finalScreeningMode !== 'none' && screeningQuestions?.length > 0) {
    for (let i = 0; i < screeningQuestions.length; i++) {
      const q = screeningQuestions[i];
      await query(
        `INSERT INTO screening_questions (campaign_id, sort_order, question_text, question_type, options, qualifying_answers, purpose)
         VALUES ($1, $2, $3, $4, $5, $6, 'screening')`,
        [campaign.id, i, q.questionText, q.type, q.type === 'mc' ? JSON.stringify(q.options || []) : null, q.type === 'mc' ? JSON.stringify(q.qualifying || []) : null]
      );
    }
  }

  if (finalRequiresDailyReport && dailyReportQuestions?.length > 0) {
    for (let i = 0; i < dailyReportQuestions.length; i++) {
      const q = dailyReportQuestions[i];
      await query(
        `INSERT INTO screening_questions (campaign_id, sort_order, question_text, question_type, options, qualifying_answers, purpose)
         VALUES ($1, $2, $3, $4, $5, NULL, 'daily_report')`,
        [campaign.id, i, q.questionText, q.type, q.type === 'mc' ? JSON.stringify(q.options || []) : null]
      );
    }
  }

  // No pingBot() here on purpose — this campaign isn't actually open to
  // testers yet. It goes out for a human admin's approval first, same as
  // any other admin-handled campaign; the existing sync already checks
  // for pending_review campaigns on its normal cycle.

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      totalCharge: campaign.total_charged,
    },
    note: 'Paid from your wallet balance and sent for admin review — it will go live once approved, usually within a few hours.',
  });
}

export async function GET(request) {
  const auth = await verifyApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const result = await query(
    `SELECT id, title, status, campaign_type, reward, slots_total, slots_filled, created_at
     FROM campaigns WHERE brand_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [auth.brandId]
  );
  return NextResponse.json({ campaigns: result.rows });
}
