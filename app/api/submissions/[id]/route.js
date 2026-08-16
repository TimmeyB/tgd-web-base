import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function PATCH(request, { params }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { decision } = await request.json(); // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'decision must be approve or reject.' }, { status: 400 });
  }

  const result = await query(
    `SELECT s.*, c.brand_id, c.handling_mode
     FROM submissions s JOIN campaigns c ON c.id = s.campaign_id
     WHERE s.id = $1`,
    [params.id]
  );
  const submission = result.rows[0];
  if (!submission) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  if (submission.brand_id !== session.brandId) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (submission.handling_mode !== 'self') {
    return NextResponse.json({ error: 'This campaign is handled by TaskGrind admin, not reviewable here.' }, { status: 400 });
  }
  if (submission.status !== 'applied') {
    return NextResponse.json({ error: 'This submission has already been reviewed.' }, { status: 400 });
  }

  // Only marks the decision — the bot polls for it, actually pays the
  // tester on its own rail, and reports back 'completed' once done. This
  // is a decision, not a payout.
  const newStatus = decision === 'approve' ? 'approved' : 'rejected';
  const updateResult = await query(
    `UPDATE submissions SET status = $1, reviewed_at = now() WHERE id = $2 RETURNING *`,
    [newStatus, submission.id]
  );

  return NextResponse.json({ submission: updateResult.rows[0] });
}
