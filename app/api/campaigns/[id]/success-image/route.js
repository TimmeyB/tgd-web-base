import { query } from '@/lib/db';

// Intentionally public/unauthenticated — Telegram's servers fetch photo
// URLs themselves and can't send custom headers, so this can't be gated
// behind the usual x-bot-secret check. Only ever holds a "what success
// looks like" reference screenshot, never tester data, so the exposure
// is low — anyone with the exact URL could view it, by design trade-off.
export async function GET(request, { params }) {
  const result = await query(
    'SELECT success_example_image, success_example_mime FROM campaigns WHERE id = $1',
    [params.id]
  );
  const campaign = result.rows[0];
  if (!campaign || !campaign.success_example_image) {
    return new Response('Not found', { status: 404 });
  }

  const buffer = Buffer.from(campaign.success_example_image, 'base64');
  return new Response(buffer, {
    headers: {
      'Content-Type': campaign.success_example_mime || 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
