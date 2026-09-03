import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import UnarchiveButton from './unarchive-button';

const TYPE_LABELS = {
  engagement: '💬 Engagement',
  upvote: '⬆️ Upvote',
  review: '⭐ Reviews',
  testing: '🧪 Testing',
  survey: '📋 Survey',
};

const STATUS_BADGE = {
  draft: { bg: 'rgba(138,144,156,0.15)', color: 'var(--text-dim)', label: 'draft' },
  closed: { bg: 'rgba(138,144,156,0.15)', color: 'var(--text-dim)', label: 'closed' },
  rejected: { bg: 'rgba(220,80,80,0.15)', color: 'var(--danger)', label: 'rejected' },
};

export default async function ArchivePage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const result = await query(
    'SELECT * FROM campaigns WHERE brand_id = $1 AND archived_at IS NOT NULL ORDER BY archived_at DESC',
    [session.brandId]
  );
  const campaigns = result.rows;

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <a href="/dashboard" className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}>← Back to dashboard</a>
      <p className="eyebrow" style={{ marginTop: 16 }}>Archive</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 24 }}>Archived campaigns</h1>

      {campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-dim)' }}>Nothing archived yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaigns.map((c) => (
            <div key={c.id} className="card" style={{ padding: 20, opacity: 0.8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {TYPE_LABELS[c.campaign_type] || c.campaign_type}
                  </span>
                  <h3 style={{ fontSize: 17, marginTop: 4 }}>
                    <a href={`/dashboard/campaigns/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {c.title}
                    </a>
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4 }}>{c.description}</p>
                </div>
                <span
                  className="mono"
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: STATUS_BADGE[c.status]?.bg || 'rgba(138,144,156,0.15)',
                    color: STATUS_BADGE[c.status]?.color || 'var(--text-dim)',
                  }}
                >
                  {STATUS_BADGE[c.status]?.label || c.status}
                </span>
              </div>
              <div className="mono" style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
                <span>Archived {new Date(c.archived_at).toLocaleDateString()}</span>
                <UnarchiveButton campaignId={c.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
