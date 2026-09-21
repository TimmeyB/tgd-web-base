import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Only the landing page calls this, from its own separate domain — CORS
// is scoped narrowly to that one origin, not opened up to everyone.
const ALLOWED_ORIGIN = 'https://taskgrind.app';

function withCors(response) {
  response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request) {
  const { path } = await request.json().catch(() => ({}));
  await query('INSERT INTO page_views (path) VALUES ($1)', [typeof path === 'string' ? path.slice(0, 200) : '/']);
  return withCors(NextResponse.json({ ok: true }));
}
