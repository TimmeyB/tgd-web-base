import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

// Self-handled campaigns are reviewed by the brand on their own dashboard,
// not by admin in Telegram — so the bot has no way to know a decision
// happened until it asks. This is that ask: "any approve/reject decisions
// I haven't acted on yet?" The bot pays/notifies the tester, then reports
// back to /api/bot/submissions, which marks bot_notified_at and drops the
// row out of this list.
export async function GET(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const result = await query(
    `SELECT s.*, c.reward, c.title AS campaign_title
     FROM submissions s
     JOIN campaigns c ON c.id = s.campaign_id
     WHERE c.handling_mode = 'self'
       AND s.status IN ('approved', 'rejected')
       AND s.bot_notified_at IS NULL
     ORDER BY s.id ASC`
  );

  return NextResponse.json({ decisions: result.rows });
}
