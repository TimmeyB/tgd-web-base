import { query } from '@/lib/db';

export async function getWalletBalance(brandId) {
  const result = await query(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM wallet_transactions WHERE brand_id = $1`,
    [brandId]
  );
  return Number(result.rows[0].balance);
}

// amount: positive for a top-up, negative for a spend. Never mutate a
// balance directly — every change is its own permanent, provable row.
export async function recordWalletTransaction(brandId, amount, reason) {
  await query(
    `INSERT INTO wallet_transactions (brand_id, amount, reason) VALUES ($1, $2, $3)`,
    [brandId, amount, reason]
  );
}
