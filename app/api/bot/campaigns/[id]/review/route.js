import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

// Called by the bot when an admin taps Approve/Reject on a newly-paid
// campaign in Telegram. This is the gate that keeps a campaign hidden
// from testers until a human has actually looked at it.
export async function PATCH(request, { params }) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { decision } = await request.json(); // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'decision must be approve or reject.' }, { status: 400 });
  }

  const result = await query('SELECT * FROM campaigns WHERE id = $1', [params.id]);
  const campaign = result.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (campaign.status !== 'pending_review') {
    return NextResponse.json({ error: 'This campaign has already been reviewed.' }, { status: 400 });
  }

  const newStatus = decision === 'approve' ? 'open' : 'rejected';
  const updateResult = await query(
    'UPDATE campaigns SET status = $1 WHERE id = $2 RETURNING *',
    [newStatus, campaign.id]
  );

  return NextResponse.json({ campaign: updateResult.rows[0] });
}
