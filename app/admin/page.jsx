import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

const STATUS_STYLES = {
  open: { bg: 'rgba(62,207,142,0.15)', color: 'var(--green)' },
  draft: { bg: 'rgba(138,144,156,0.15)', color: 'var(--text-dim)' },
  pending_review: { bg: 'rgba(217,164,65,0.15)', color: 'var(--amber)' },
  closed: { bg: 'rgba(138,144,156,0.15)', color: 'var(--text-dim)' },
  rejected: { bg: 'rgba(220,80,80,0.15)', color: 'var(--danger)' },
};

export default async function AdminPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return notFound();

  const brandCheck = await query('SELECT is_platform_admin FROM brands WHERE id = $1', [session.brandId]);
  if (!brandCheck.rows[0]?.is_platform_admin) return notFound();

  const [brandsResult, campaignsResult, statsResult] = await Promise.all([
    query('SELECT id, company_name, email, subscription_status, created_at FROM brands ORDER BY created_at DESC LIMIT 50'),
    query(`
      SELECT c.id, c.title, c.campaign_type, c.status, c.reward, c.slots_total, c.created_at,
             b.company_name, b.email
      FROM campaigns c JOIN brands b ON b.id = c.brand_id
      ORDER BY c.created_at DESC LIMIT 50
    `),
    query(`
      SELECT
        (SELECT COUNT(*) FROM brands) AS total_brands,
        (SELECT COUNT(*) FROM campaigns) AS total_campaigns,
        (SELECT COUNT(*) FROM campaigns WHERE status = 'open') AS open_campaigns,
        (SELECT COUNT(*) FROM brands WHERE subscription_status = 'active') AS active_subscriptions
    `),
  ]);

  const brands = brandsResult.rows;
  const campaigns = campaignsResult.rows;
  const stats = statsResult.rows[0];

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <p className="eyebrow">Platform admin</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 24 }}>Everything, across every brand</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 40 }}>
        {[
          ['Brands signed up', stats.total_brands],
          ['Active subscriptions', stats.active_subscriptions],
          ['Campaigns created', stats.total_campaigns],
          ['Currently open', stats.open_campaigns],
        ].map(([label, value]) => (
          <div key={label} className="card" style={{ padding: 18 }}>
            <p className="mono" style={{ fontSize: 22, color: 'var(--green)' }}>{value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Recent campaigns</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
        {campaigns.map((c) => (
          <div key={c.id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 14 }}>{c.title}</p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                {c.company_name} ({c.email}) · {c.campaign_type} · ${c.reward} × {c.slots_total} · {new Date(c.created_at).toLocaleDateString()}
              </p>
            </div>
            <span
              className="mono"
              style={{
                fontSize: 11,
                padding: '3px 9px',
                borderRadius: 6,
                background: STATUS_STYLES[c.status]?.bg || 'rgba(138,144,156,0.15)',
                color: STATUS_STYLES[c.status]?.color || 'var(--text-dim)',
              }}
            >
              {c.status}
            </span>
          </div>
        ))}
        {campaigns.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No campaigns yet.</p>}
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Recent signups</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {brands.map((b) => (
          <div key={b.id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 14 }}>{b.company_name}</p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                {b.email} · joined {new Date(b.created_at).toLocaleDateString()}
              </p>
            </div>
            <span
              className="mono"
              style={{
                fontSize: 11,
                padding: '3px 9px',
                borderRadius: 6,
                background: b.subscription_status === 'active' ? 'rgba(62,207,142,0.15)' : 'rgba(138,144,156,0.15)',
                color: b.subscription_status === 'active' ? 'var(--green)' : 'var(--text-dim)',
              }}
            >
              {b.subscription_status || 'none'}
            </span>
          </div>
        ))}
        {brands.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No signups yet.</p>}
      </div>
    </div>
  );
}
