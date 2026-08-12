import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import LogoutButton from './logout-button';

export default async function DashboardPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const result = await query(
    'SELECT * FROM campaigns WHERE brand_id = $1 ORDER BY created_at DESC',
    [session.brandId]
  );
  const campaigns = result.rows;

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 style={{ fontSize: 26, marginTop: 4 }}>Your campaigns</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/dashboard/new-campaign" className="btn btn-primary">New campaign</a>
          <LogoutButton />
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>
            No campaigns yet. Launch your first one to start reaching testers.
          </p>
          <a href="/dashboard/new-campaign" className="btn btn-primary">Create your first campaign</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaigns.map((c) => (
            <div key={c.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ fontSize: 17 }}>{c.title}</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4 }}>{c.description}</p>
                </div>
                <span
                  className="mono"
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: c.status === 'open' ? 'rgba(62,207,142,0.15)' : 'rgba(138,144,156,0.15)',
                    color: c.status === 'open' ? 'var(--green)' : 'var(--text-dim)',
                  }}
                >
                  {c.status}
                </span>
              </div>
              <div className="mono" style={{ marginTop: 16, display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-dim)' }}>
                <span>Reward: <span style={{ color: 'var(--amber)' }}>${c.reward}</span></span>
                <span>Slots: {c.slots_filled} / {c.slots_total}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
