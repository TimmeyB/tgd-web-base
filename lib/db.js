import { Pool } from 'pg';

// Reused across requests in the same server instance (Vercel serverless
// functions can reuse warm instances, so this avoids reconnecting every time).
let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required for Neon
    });
  }
  return pool;
}

export async function query(text, params) {
  const pool = getPool();
  return pool.query(text, params);
}
