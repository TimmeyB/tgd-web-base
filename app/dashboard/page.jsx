import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import LogoutButton from './logout-button';
import SupportLink from './support-link';
import CampaignActions from './campaign-actions';
import ResendVerificationButton from './resend-verification-button';

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

export default async function DashboardPage({ searchParams }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const brandResult = await query('SELECT subscription_status, email_verified_at, email FROM brands WHERE id = $1', [session.brandId]);
  const brand = brandResult.rows[0];
  const isActive = brand?.subscription_status === 'active';

  // Hard gate: no campaigns, no dashboard content at all until the email
  // is confirmed. Deliberately stricter than the subscription-inactive
  // state above (which just shows a nudge banner) — verification is the
  // one thing we don't want anyone to be able to skip past.
  if (!brand?.email_verified_at) {
    const verify = searchParams?.verify;
    return (
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 480 }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p className="eyebrow">Confirm your email</p>
          <h1 style={{ fontSize: 22, marginTop: 8, marginBottom: 16 }}>One step left</h1>
          {verify === 'expired' && (
            <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 16 }}>
              That link expired — request a new one below.
            </p>
          )}
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>
            We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{brand?.email}</strong>.
            Click it to unlock your dashboard.
          </p>
          <ResendVerificationButton />
          <div style={{ marginTop: 24 }}>
            <LogoutButton />
          </div>
        </div>
      </div>
    );
  }

  const result = await query(
    'SELECT * FROM campaigns WHERE brand_id = $1 AND archived_at IS NULL ORDER BY created_at DESC',
    [session.brandId]
  );
  const campaigns = result.rows;

  const archivedCountResult = await query(
    'SELECT COUNT(*) AS count FROM campaigns WHERE brand_id = $1 AND archived_at IS NOT NULL',
    [session.brandId]
  );
  const archivedCount = Number(archivedCountResult.rows[0]?.count || 0);
  const justVerified = searchParams?.verify === 'success';

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      {justVerified && (
        <div style={{ background: 'rgba(62,207,142,0.15)', color: 'var(--green)', padding: '10px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
          ✓ Email confirmed
        </div>
      )}
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 style={{ fontSize: 26, marginTop: 4 }}>Your campaigns</h1>
        </div>
        <div className="dashboard-header-actions">
          <a href="/dashboard/new-campaign" className="btn btn-primary">New campaign</a>
          {archivedCount > 0 && (
            <a href="/dashboard/archive" className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              🗂 Archive ({archivedCount})
            </a>
          )}
          <a href="/dashboard/wallet" className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            💳 Wallet
          </a>
          <a href="/dashboard/api-keys" className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            🔑 API keys
          </a>
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
                  {c.created_via === 'agent' && c.status === 'pending_review' ? 'processing' : (STATUS_BADGE[c.status]?.label || c.status)}
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
