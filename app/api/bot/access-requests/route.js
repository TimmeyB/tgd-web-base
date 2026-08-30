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

  const { campaignId, testerHandle, email } = await request.json();
  if (!campaignId || !testerHandle || !email) {
    return NextResponse.json({ error: 'campaignId, testerHandle, and email are required.' }, { status: 400 });
  }

  const existing = await query(
    'SELECT * FROM access_requests WHERE campaign_id = $1 AND tester_handle = $2',
    [campaignId, testerHandle]
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ accessRequest: existing.rows[0] });
  }

  const result = await query(
    `INSERT INTO access_requests (campaign_id, tester_handle, email) VALUES ($1, $2, $3) RETURNING *`,
    [campaignId, testerHandle, email]
  );
  return NextResponse.json({ accessRequest: result.rows[0] });
}

// Bot polls this to find pending requests it needs to DM admin about, for
// admin-handled campaigns only — self-handled ones are decided on the web
// dashboard instead.
export async function GET(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const result = await query(
    `SELECT a.*, c.title AS campaign_title, c.handling_mode
     FROM access_requests a JOIN campaigns c ON c.id = a.campaign_id
     WHERE a.status = 'pending' AND c.handling_mode = 'admin'
     ORDER BY a.id ASC`
  );
  return NextResponse.json({ accessRequests: result.rows });
}
