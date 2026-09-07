import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { pingBot } from '@/lib/bot-sync';

async function getOwnedSubmission(submissionId, brandId) {
  const result = await query(
    `SELECT s.*, c.brand_id, c.title AS campaign_title
     FROM submissions s JOIN campaigns c ON c.id = s.campaign_id
     WHERE s.id = $1`,
    [submissionId]
  );
  const submission = result.rows[0];
  if (!submission || submission.brand_id !== brandId) return null;
  return submission;
}

export async function GET(request, { params }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const submission = await getOwnedSubmission(params.id, session.brandId);
  if (!submission) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });

  const result = await query(
    `SELECT id, sender, body, created_at FROM messages WHERE submission_id = $1 ORDER BY created_at ASC`,
    [submission.id]
  );
  return NextResponse.json({ messages: result.rows });
}

export async function POST(request, { params }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const submission = await getOwnedSubmission(params.id, session.brandId);
  if (!submission) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });

  const { body } = await request.json();
  if (!body || !body.trim()) {
    return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
  }

  const result = await query(
    `INSERT INTO messages (submission_id, sender, body) VALUES ($1, 'brand', $2) RETURNING *`,
    [submission.id, body.trim()]
  );
  // Awaited on purpose — Vercel can freeze the function right after the
  // response is sent, so this can't be fire-and-forget.
  await pingBot();

  return NextResponse.json({ message: result.rows[0] });
}
