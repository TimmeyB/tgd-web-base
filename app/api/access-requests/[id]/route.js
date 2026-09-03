import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { pingBot } from '@/lib/bot-sync';

export async function PATCH(request, { params }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { decision } = await request.json(); // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'decision must be approve or reject.' }, { status: 400 });
  }

  const result = await query(
    `SELECT a.*, c.brand_id, c.handling_mode
     FROM access_requests a JOIN campaigns c ON c.id = a.campaign_id
     WHERE a.id = $1`,
    [params.id]
  );
  const accessRequest = result.rows[0];
  if (!accessRequest) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (accessRequest.brand_id !== session.brandId) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (accessRequest.handling_mode !== 'self') {
    return NextResponse.json({ error: 'This campaign is handled by TaskGrind admin, not reviewable here.' }, { status: 400 });
  }
  if (accessRequest.status !== 'pending') {
    return NextResponse.json({ error: 'This request has already been decided.' }, { status: 400 });
  }

  // Records the decision, then pings the bot so it starts the tester's
  // countdown within seconds instead of on its next backup poll.
  const newStatus = decision === 'approve' ? 'approved' : 'rejected';
  const updateResult = await query(
    `UPDATE access_requests SET status = $1, decided_at = now() WHERE id = $2 RETURNING *`,
    [newStatus, accessRequest.id]
  );
  await pingBot(); // awaited — Vercel can freeze the function right after the response is sent
  return NextResponse.json({ accessRequest: updateResult.rows[0] });
}
