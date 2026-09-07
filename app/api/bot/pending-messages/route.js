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
    `SELECT m.id, m.submission_id, m.body, s.tester_handle, c.title AS campaign_title
     FROM messages m
     JOIN submissions s ON s.id = m.submission_id
     JOIN campaigns c ON c.id = s.campaign_id
     WHERE m.sender = 'brand' AND m.delivered_at IS NULL
     ORDER BY m.id ASC`
  );
  return NextResponse.json({ messages: result.rows });
}
