import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import LogoutButton from './logout-button';
import SupportLink from './support-link';
import CampaignActions from './campaign-actions';

const TYPE_LABELS = {
  engagement: '💬 Engagement',
  upvote: '⬆️ Upvote',
  review: '⭐ Reviews',
  testing: '🧪 Testing',
  survey: '📋 Survey',
};

const STATUS_BADGE = {
  draft: { bg: 'rgba(138,144,156,0.15)', color: 'var(--text-dim)', label: 'draft' },
  pending_review: { bg: 'rgba(217,164,65,0.15)', color: 'var(--amber)', label: 'pending review' },
  open: { bg: 'rgba(62,207,142,0.15)', color: 'var(--green)', label: 'open' },
  closed: { bg: 'rgba(138,144,156,0.15)', color: 'var(--text-dim)', label: 'closed' },
  rejected: { bg: 'rgba(220,80,80,0.15)', color: 'var(--danger)', label: 'rejected' },
};

export default async function DashboardPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const brandResult = await query('SELECT subscription_status FROM brands WHERE id = $1', [session.brandId]);
  const isActive = brandResult.rows[0]?.subscription_status === 'active';

  const result = await query(
    'SELECT * FROM campaigns WHERE brand_id = $1 ORDER BY created_at DESC',
    [session.brandId]
  );
  const campaigns = result.rows;

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 style={{ fontSize: 26, marginTop: 4 }}>Your campaigns</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/dashboard/new-campaign" className="btn btn-primary">New campaign</a>
          <LogoutButton />
        </div>
      </div>

      <a
        href="/dashboard/billing"
        className="mono"
        style={{
          display: 'inline-block',
          fontSize: 12,
          marginBottom: 24,
          padding: '4px 10px',
          borderRadius: 6,
          background: isActive ? 'rgba(62,207,142,0.15)' : 'rgba(217,164,65,0.15)',
          color: isActive ? 'var(--green)' : 'var(--amber)',
        }}
      >
        {isActive ? '● Subscription active' : '○ No active subscription — tap to subscribe'}
      </a>

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
              <div className="mono" style={{ marginTop: 16, display: 'flex', gap: 24, alignItems: 'center', fontSize: 13, color: 'var(--text-dim)' }}>
                <span>Reward: <span style={{ color: 'var(--amber)' }}>${c.reward}</span></span>
                <span>Slots: {c.slots_filled} / {c.slots_total}</span>
                <a href={`/dashboard/campaigns/${c.id}`} style={{ color: 'var(--green)' }}>View progress →</a>
              </div>
              <CampaignActions
                campaignId={c.id}
                isDraft={c.status === 'draft'}
                status={c.status}
                announceRequested={c.announce_requested}
                announcedAt={c.announced_at}
                locked={c.slots_filled > 0}
              />
            </div>
          ))}
        </div>
      )}
      <SupportLink />
    </div>
  );
}
