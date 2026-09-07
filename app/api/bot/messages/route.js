import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

export async function POST(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { messageId, ackDelivered, submissionId, body } = await request.json();

  if (ackDelivered) {
    if (!messageId) return NextResponse.json({ error: 'messageId is required.' }, { status: 400 });
    await query(`UPDATE messages SET delivered_at = now() WHERE id = $1`, [messageId]);
    return NextResponse.json({ ok: true });
  }

  if (!submissionId || !body || !body.trim()) {
    return NextResponse.json({ error: 'submissionId and body are required.' }, { status: 400 });
  }
  const result = await query(
    `INSERT INTO messages (submission_id, sender, body) VALUES ($1, 'tester', $2) RETURNING *`,
    [submissionId, body.trim()]
  );
  return NextResponse.json({ message: result.rows[0] });
}
