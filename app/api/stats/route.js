import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

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
        'Cache-Control': 'public, max-age=60, s-maxage=60',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
