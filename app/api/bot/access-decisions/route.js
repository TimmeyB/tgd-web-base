import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

export async function GET(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const result = await query(
    `SELECT a.* FROM access_requests a
     JOIN campaigns c ON c.id = a.campaign_id
     WHERE c.handling_mode = 'self' AND a.status IN ('approved', 'rejected') AND a.bot_notified_at IS NULL
     ORDER BY a.id ASC`
  );
  return NextResponse.json({ decisions: result.rows });
}
