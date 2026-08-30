import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

// Admin decides directly in Telegram for admin-handled campaigns — this
// just mirrors that decision onto the web record so the brand's dashboard
// stays accurate, even though the brand isn't the one deciding.
export async function PATCH(request, { params }) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { decision } = await request.json(); // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'decision must be approve or reject.' }, { status: 400 });
  }

  const newStatus = decision === 'approve' ? 'approved' : 'rejected';
  const result = await query(
    `UPDATE access_requests SET status = $1, decided_at = now(), bot_notified_at = now() WHERE id = $2 RETURNING *`,
    [newStatus, params.id]
  );
  if (!result.rows[0]) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  return NextResponse.json({ accessRequest: result.rows[0] });
}
