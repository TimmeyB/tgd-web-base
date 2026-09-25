import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

// Lets the landing page (a different domain — taskgrind.app vs
// app.taskgrind.app, and a separate Railway-hosted app, not Next.js) know
// whether the visitor already has a valid session here, so it can redirect
// straight to the dashboard instead of showing marketing copy to someone
// who's already signed up. The session cookie is httpOnly and scoped to
// this domain, so the landing page can't just read it itself — it has to
// ask. Returns only a boolean, nothing else about the account.
//
// CORS is scoped to the exact landing page origin, not '*' — a wildcard
// origin can't be combined with credentialed requests per the CORS spec,
// and we don't want this queryable (even for a boolean) from arbitrary
// sites anyway.
const ALLOWED_ORIGIN = 'https://taskgrind.app';

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  return NextResponse.json(
    { authenticated: Boolean(session) },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Credentials': 'true',
      },
    }
  );
}
