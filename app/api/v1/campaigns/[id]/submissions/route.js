import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiKey } from '@/lib/api-auth';

// Deliberately read-only — there is no way to approve/reject/pay through
// this API. That stays a human action on the dashboard, always.
export async function GET(request, { params }) {
  const auth = await verifyApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const campaignResult = await query('SELECT id FROM campaigns WHERE id = $1 AND brand_id = $2', [params.id, auth.brandId]);
  if (!campaignResult.rows[0]) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  const result = await query(
    `SELECT id, status, stage, screening_answers, proof_text, applied_at
     FROM submissions WHERE campaign_id = $1 ORDER BY applied_at DESC LIMIT 100`,
    [params.id]
  );
  return NextResponse.json({ submissions: result.rows });
}
