import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

export async function POST(request, { params }) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const result = await query(
    `UPDATE access_requests SET bot_notified_at = now() WHERE id = $1 RETURNING *`,
    [params.id]
  );
  if (!result.rows[0]) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  return NextResponse.json({ accessRequest: result.rows[0] });
}
