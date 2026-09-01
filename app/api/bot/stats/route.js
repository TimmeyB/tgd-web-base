import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function checkBotAuth(request) {
  const secret = request.headers.get('x-bot-secret');
  return secret && process.env.BOT_API_SECRET && secret === process.env.BOT_API_SECRET;
}

export async function POST(request) {
  if (!checkBotAuth(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { totalTesters } = await request.json();
  if (typeof totalTesters !== 'number') {
    return NextResponse.json({ error: 'totalTesters must be a number.' }, { status: 400 });
  }

  await query(
    `UPDATE platform_stats SET total_testers = $1, updated_at = now() WHERE id = 1`,
    [totalTesters]
  );
  return NextResponse.json({ ok: true });
}
