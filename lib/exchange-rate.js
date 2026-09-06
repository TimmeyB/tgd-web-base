// Naira moves too much day to day for a fixed rate to stay fair for long
// in either direction — this fetches a real live rate instead.
//
// Cached in memory for an hour so we're not hitting the API on every
// single request; a module-level cache is fine here since exchange rates
// don't need per-request freshness.
//
// Falls back to PAYSTACK_USD_TO_NGN_RATE (if you keep it set) only if the
// live API is ever unreachable — better to use a slightly stale number
// than to let checkout or payouts break entirely.

let rateCache = { rate: null, fetchedAt: 0 };
const CACHE_MS = 60 * 60 * 1000; // 1 hour

export async function getUsdToNgnRate() {
  if (rateCache.rate && Date.now() - rateCache.fetchedAt < CACHE_MS) {
    return rateCache.rate;
  }

  try {
    // open.er-api.com — free, no API key required, updates daily.
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    const rate = data?.rates?.NGN;
    if (rate && rate > 0) {
      rateCache = { rate, fetchedAt: Date.now() };
      return rate;
    }
  } catch (err) {
    console.error('[exchange-rate] live fetch failed:', err.message);
  }

  // Live fetch failed — fall back to a fixed rate if one's configured,
  // otherwise fall back to whatever was last cached (even if stale),
  // rather than returning nothing and breaking checkout/payouts.
  const fallback = Number(process.env.PAYSTACK_USD_TO_NGN_RATE || 0);
  if (fallback > 0) return fallback;
  return rateCache.rate || null;
}
