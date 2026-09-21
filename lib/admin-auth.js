import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

// Every /admin/* page calls this first. Returns the brandId if they're a
// platform admin; otherwise renders a plain 404 — same as if the route
// didn't exist, rather than a "forbidden" page that confirms it does.
export async function requirePlatformAdmin() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return notFound();

  const result = await query('SELECT is_platform_admin FROM brands WHERE id = $1', [session.brandId]);
  if (!result.rows[0]?.is_platform_admin) return notFound();

  return session.brandId;
}
