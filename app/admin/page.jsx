import { query } from '@/lib/db';
import { requirePlatformAdmin } from '@/lib/admin-auth';
import AdminNav from './admin-nav';

export default async function AdminPage() {
  await requirePlatformAdmin();

  const [statsResult, moneyResult, pageViewsResult] = await Promise.all([
    query(`
      SELECT
        (SELECT COUNT(*) FROM brands) AS total_brands,
        (SELECT COUNT(*) FROM campaigns) AS total_campaigns,
        (SELECT COUNT(*) FROM campaigns WHERE status = 'open') AS open_campaigns,
        (SELECT COUNT(*) FROM brands WHERE subscription_status = 'active') AS active_subscriptions
    `),
    // Pulled from our own business tables rather than parsing raw Paystack
    // webhook JSON — commission_amount and wallet_transactions are the
    // actual source of truth for what's been earned and what's held.
    query(`
      SELECT
        (SELECT COALESCE(SUM(commission_amount), 0) FROM campaigns WHERE payment_status = 'paid') AS commission_earned,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions) AS wallet_held_total,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE amount > 0) AS wallet_topups_lifetime,
        (SELECT COUNT(*) FROM brands WHERE subscription_status = 'active') * 8 AS mrr
    `),
    query(`SELECT COUNT(*) AS count FROM page_views WHERE created_at > now() - interval '7 days'`),
  ]);

  const stats = statsResult.rows[0];
  const money = moneyResult.rows[0];
  const landingPageViews = pageViewsResult.rows[0].count;

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <p className="eyebrow">Platform admin</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 20 }}>Overview</h1>

      <AdminNav active="/admin" />

      <h2 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Money</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          ['Monthly recurring revenue', `$${Number(money.mrr).toFixed(2)}`, 'from active subscriptions'],
          ['Commission earned', `$${Number(money.commission_earned).toFixed(2)}`, 'lifetime, from paid campaigns'],
          ['Held in wallets right now', `$${Number(money.wallet_held_total).toFixed(2)}`, 'prepaid, not yet spent'],
          ['Total ever topped up', `$${Number(money.wallet_topups_lifetime).toFixed(2)}`, 'gross wallet inflow'],
        ].map(([label, value, sub]) => (
          <div key={label} className="card" style={{ padding: 18 }}>
            <p className="mono" style={{ fontSize: 22, color: 'var(--green)' }}>{value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{label}</p>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.7, marginTop: 2 }}>{sub}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activity</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          ['Brands signed up', stats.total_brands],
          ['Active subscriptions', stats.active_subscriptions],
          ['Campaigns created', stats.total_campaigns],
          ['Currently open', stats.open_campaigns],
          ['Landing page views (7d)', landingPageViews],
        ].map(([label, value]) => (
          <div key={label} className="card" style={{ padding: 18 }}>
            <p className="mono" style={{ fontSize: 22, color: 'var(--green)' }}>{value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
