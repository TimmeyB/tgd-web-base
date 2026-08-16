import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Shared-secret auth — the bot isn't a logged-in brand, so it authenticates
// with a static key instead of a session cookie. Set BOT_API_SECRET in
// Vercel and give the bot the same value in its own environment.
function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

export async function GET(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const statusParam = new URL(request.url).searchParams.get('status') || 'open';
  if (!['open', 'pending_review'].includes(statusParam)) {
    return NextResponse.json({ error: 'status must be open or pending_review.' }, { status: 400 });
  }

  const campaignsResult = await query(
    `SELECT id, brand_id, title, description, reward, slots_total, slots_filled,
            campaign_type, handling_mode, screening_mode, screening_pool_cap, form_url
     FROM campaigns WHERE status = $1 ORDER BY id DESC`,
    [statusParam]
  );
  const campaigns = campaignsResult.rows;

  if (campaigns.length === 0) {
    return NextResponse.json({ campaigns: [] });
  }

  const ids = campaigns.map((c) => c.id);
  const questionsResult = await query(
    `SELECT * FROM screening_questions WHERE campaign_id = ANY($1) ORDER BY campaign_id, sort_order`,
    [ids]
  );
  const questionsByCampaign = {};
  for (const q of questionsResult.rows) {
    if (!questionsByCampaign[q.campaign_id]) questionsByCampaign[q.campaign_id] = [];
    // Translate DB column names to the field names the bot expects, so the
    // bot's sync code doesn't need to know about the web app's actual schema.
    questionsByCampaign[q.campaign_id].push({
      question_text: q.question_text,
      type: q.question_type,
      options: q.options,
      qualifying: q.qualifying_answers,
    });
  }

  const enriched = campaigns.map((c) => ({
    ...c,
    screeningQuestions: questionsByCampaign[c.id] || [],
  }));

  return NextResponse.json({ campaigns: enriched });
}
