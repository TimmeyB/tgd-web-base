import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, createSessionToken, SESSION_COOKIE } from '@/lib/auth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const result = await query('SELECT * FROM brands WHERE email = $1', [email.toLowerCase()]);
  const brand = result.rows[0];

  // A lockout notice is an accepted exception to the "always generic"
  // rule — by this point someone has already deliberately targeted one
  // specific email with repeated attempts, so this doesn't meaningfully
  // help an attacker scanning many addresses at once.
  if (brand?.locked_until && new Date(brand.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(brand.locked_until) - new Date()) / 60000);
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.` },
      { status: 429 }
    );
  }

  // Same generic error whether the email doesn't exist or the password is
  // wrong — avoids confirming to an attacker which emails have accounts.
  if (!brand || !(await verifyPassword(password, brand.password_hash))) {
    if (brand) {
      const attempts = brand.failed_login_attempts + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
      await query('UPDATE brands SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3', [attempts, lockedUntil, brand.id]);
    }
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  if (brand.failed_login_attempts > 0 || brand.locked_until) {
    await query('UPDATE brands SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [brand.id]);
  }

  const token = await createSessionToken(brand);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}
