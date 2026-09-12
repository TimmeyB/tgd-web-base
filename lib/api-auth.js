import crypto from 'crypto';
import { query } from '@/lib/db';

const DAILY_LIMIT = 50; // generous for real usage, tight enough to stop a leaked/buggy key from doing real damage

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function generateApiKey() {
  const raw = 'tg_' + crypto.randomBytes(24).toString('hex');
  return { raw, hash: hashKey(raw), prefix: raw.slice(0, 10) };
}

// Returns { brandId } on success, or { error, status } on failure — every
// /api/v1 route should check this before doing anything else. Deliberately
// separate from the brand-session cookie auth used everywhere else, since
// an API key represents a much narrower, machine-facing trust boundary.
export async function verifyApiKey(request) {
  const authHeader = request.headers.get('authorization') || '';
  const rawKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!rawKey) {
    return { error: 'Missing API key. Send it as: Authorization: Bearer <key>', status: 401 };
  }

  const result = await query('SELECT * FROM api_keys WHERE key_hash = $1', [hashKey(rawKey)]);
  const keyRow = result.rows[0];
  if (!keyRow || keyRow.revoked_at) {
    return { error: 'Invalid or revoked API key.', status: 401 };
  }

  const today = new Date().toISOString().slice(0, 10);
  const isNewDay = keyRow.usage_date.toISOString().slice(0, 10) !== today;
  const currentCount = isNewDay ? 0 : keyRow.usage_count;

  if (currentCount >= DAILY_LIMIT) {
    return { error: `Daily limit of ${DAILY_LIMIT} requests reached for this key. Resets at midnight UTC.`, status: 429 };
  }

  await query(
    `UPDATE api_keys SET usage_count = $1, usage_date = $2, last_used_at = now() WHERE id = $3`,
    [currentCount + 1, today, keyRow.id]
  );

  return { brandId: keyRow.brand_id };
}
