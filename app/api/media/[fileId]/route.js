import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

// Brand must be logged in AND own a campaign that this exact file_id
// actually belongs to — otherwise a brand could view another brand's
// tester photos just by guessing file_ids.
export async function GET(request, { params }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return new Response('Not authenticated', { status: 401 });

  const fileId = params.fileId;
  const ownsIt = await query(
    `SELECT 1 FROM submissions s
     JOIN campaigns c ON c.id = s.campaign_id
     WHERE c.brand_id = $1 AND (s.proof_url = $2 OR s.screening_answers::text LIKE '%' || $2 || '%')
     LIMIT 1`,
    [session.brandId, fileId]
  );
  if (ownsIt.rows.length === 0) {
    return new Response('Not found', { status: 404 });
  }

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return new Response('Media proxy not configured', { status: 500 });
  }

  try {
    const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileInfo = await fileInfoRes.json();
    if (!fileInfo.ok) {
      return new Response('This file is no longer available from Telegram.', { status: 404 });
    }

    const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`);
    if (!fileRes.ok) {
      return new Response('This file is no longer available from Telegram.', { status: 404 });
    }

    const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';
    const buffer = await fileRes.arrayBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    return new Response('Failed to fetch media from Telegram.', { status: 502 });
  }
}
