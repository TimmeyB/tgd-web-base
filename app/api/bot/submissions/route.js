import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

// The bot calls this every time a tester applies, gets screened, or
// completes a task — same endpoint, different status each time. This
// route figures out what changed and only touches slots_filled when a
// completion is genuinely new, so retried/duplicate calls stay safe.
export async function POST(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { campaignId, testerHandle, status, screeningAnswers, proofText, proofUrl, ackDecision } = await request.json();

  if (!campaignId || !testerHandle || !status) {
    return NextResponse.json({ error: 'campaignId, testerHandle, and status are required.' }, { status: 400 });
  }
  const validStatuses = ['applied', 'approved', 'rejected', 'completed'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  const campaignResult = await query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
  const campaign = campaignResult.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  const existingResult = await query(
    'SELECT * FROM submissions WHERE campaign_id = $1 AND tester_handle = $2',
    [campaignId, testerHandle]
  );
  const existing = existingResult.rows[0];
  const wasAlreadyCompleted = existing?.status === 'completed';

  // Set when the bot is reporting back after acting on a brand's
  // approve/reject decision for a self-handled campaign — stamps
  // bot_notified_at so /api/bot/pending-decisions stops returning it.
  const notifiedClause = ackDecision ? 'now()' : 'bot_notified_at';

  let submission;
  if (existing) {
    const updateResult = await query(
      `UPDATE submissions
       SET status = $1, screening_answers = COALESCE($2, screening_answers),
           proof_text = COALESCE($3, proof_text), proof_url = COALESCE($4, proof_url),
           reviewed_at = CASE WHEN $1 IN ('approved', 'rejected') THEN now() ELSE reviewed_at END,
           completed_at = CASE WHEN $1 = 'completed' THEN now() ELSE completed_at END,
           bot_notified_at = ${notifiedClause}
       WHERE id = $5 RETURNING *`,
      [status, screeningAnswers ? JSON.stringify(screeningAnswers) : null, proofText || null, proofUrl || null, existing.id]
    );
    submission = updateResult.rows[0];
  } else {
    const insertResult = await query(
      `INSERT INTO submissions (campaign_id, tester_handle, status, screening_answers, proof_text, proof_url, reviewed_at, completed_at, bot_notified_at)
       VALUES ($1, $2, $3, $4, $5, $6,
               CASE WHEN $3 IN ('approved', 'rejected') THEN now() ELSE NULL END,
               CASE WHEN $3 = 'completed' THEN now() ELSE NULL END,
               ${ackDecision ? 'now()' : 'NULL'})
       RETURNING *`,
      [campaignId, testerHandle, status, screeningAnswers ? JSON.stringify(screeningAnswers) : null, proofText || null, proofUrl || null]
    );
    submission = insertResult.rows[0];
  }

  // A slot is only actually consumed the first time a submission reaches
  // 'completed' — this guards against the bot retrying the same call.
  if (status === 'completed' && !wasAlreadyCompleted) {
    const newFilled = campaign.slots_filled + 1;
    const closeNow = newFilled >= campaign.slots_total;
    await query(
      `UPDATE campaigns SET slots_filled = $1, status = $2 WHERE id = $3`,
      [newFilled, closeNow ? 'closed' : campaign.status, campaignId]
    );
  }

  return NextResponse.json({ submission });
}
