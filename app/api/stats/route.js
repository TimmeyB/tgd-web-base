import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Cached at Vercel's edge for all visitors, not just per-browser — so a
// traffic spike on the landing page doesn't translate into a matching
// spike of database queries. 48 hours is plenty since this number is
// meant to show real testers exist, not to be a live-updating counter.
export const revalidate = 172800; // 48 hours, in seconds

// Deliberately public — no auth, no session required. This is meant to be
// fetched directly from the landing page (a different Railway app, a
// different domain) to show a real, live number instead of a static claim.
// CORS is wide open on purpose: this is a single non-sensitive number,
// safe for any site to read.
export async function GET() {
  const result = await query('SELECT total_testers, updated_at FROM platform_stats WHERE id = 1');
  const stats = result.rows[0] || { total_testers: 0, updated_at: null };

  return NextResponse.json(
    { totalTesters: stats.total_testers, updatedAt: stats.updated_at },
    {
      headers: {
        'Cache-Control': 'public, max-age=172800, s-maxage=172800',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
