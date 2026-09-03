// Tells the bot to sync right now instead of waiting for its backup timer.
// Fire-and-forget by design: if the bot is mid-restart (every deploy) or
// Railway is cold, this just fails quietly and the bot's own backup poll
// picks the change up later. Never let this block or fail the request
// that triggered it — a brand's payment/approve/announce action must
// succeed on the web app regardless of whether the bot heard about it yet.
export async function pingBot() {
  const url = process.env.BOT_SYNC_URL;
  const secret = process.env.BOT_API_SECRET;
  if (!url || !secret) {
    console.error('[bot-sync] pingBot skipped — BOT_SYNC_URL or BOT_API_SECRET not set');
    return;
  }

  try {
    const res = await fetch(`${url}/sync`, {
      method: 'POST',
      headers: { 'x-bot-secret': secret },
      signal: AbortSignal.timeout(4000),
    });
    console.log(`[bot-sync] pingBot → ${res.status}`);
  } catch (e) {
    // Bot unreachable (asleep, redeploying, etc). Not an error worth
    // surfacing — the backup poll on the bot side is exactly for this.
    console.error('[bot-sync] pingBot failed:', e.message);
  }
}
