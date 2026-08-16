import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

// Lets admin manually stop a campaign from Telegram — e.g. slots never
// fully fill, or enough good submissions came in and they're done with it.
export async function PATCH(request, { params }) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const result = await query('SELECT * FROM campaigns WHERE id = $1', [params.id]);
  const campaign = result.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (campaign.status !== 'open') {
    return NextResponse.json({ error: 'Only open campaigns can be closed this way.' }, { status: 400 });
  }

  const updateResult = await query(
    `UPDATE campaigns SET status = 'closed' WHERE id = $1 RETURNING *`,
    [campaign.id]
  );
  return NextResponse.json({ campaign: updateResult.rows[0] });
}
