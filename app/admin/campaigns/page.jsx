import { query } from '@/lib/db';
import { requirePlatformAdmin } from '@/lib/admin-auth';
import AdminNav from '../admin-nav';
import AdminTable from '../admin-table';

const STATUS_STYLES = {
  open: { bg: 'rgba(62,207,142,0.15)', color: 'var(--green)' },
  draft: { bg: 'rgba(138,144,156,0.15)', color: 'var(--text-dim)' },
  pending_review: { bg: 'rgba(217,164,65,0.15)', color: 'var(--amber)' },
  closed: { bg: 'rgba(138,144,156,0.15)', color: 'var(--text-dim)' },
  rejected: { bg: 'rgba(220,80,80,0.15)', color: 'var(--danger)' },
};

export default async function AdminCampaignsPage() {
  await requirePlatformAdmin();

  const result = await query(`
    SELECT c.id, c.title, c.campaign_type, c.status, c.reward, c.slots_total, c.created_via, c.created_at,
           b.company_name, b.email
    FROM campaigns c JOIN brands b ON b.id = c.brand_id
    ORDER BY c.created_at DESC LIMIT 200
  `);

  const rows = result.rows.map((c) => ({
    __key: c.id,
    title: c.title,
    brand: `${c.company_name} (${c.email})`,
    type: c.campaign_type,
    reward: `$${c.reward} × ${c.slots_total}`,
    source: c.created_via === 'agent' ? '🤖 agent' : 'dashboard',
    status: (
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
        {c.created_via === 'agent' && c.status === 'pending_review' ? 'processing' : c.status}
      </span>
    ),
    created: new Date(c.created_at).toLocaleDateString(),
  }));

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <p className="eyebrow">Platform admin</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 20 }}>Campaigns</h1>

      <AdminNav active="/admin/campaigns" />

      <AdminTable
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'brand', label: 'Brand' },
          { key: 'type', label: 'Type' },
          { key: 'reward', label: 'Reward' },
          { key: 'source', label: 'Source' },
          { key: 'status', label: 'Status' },
          { key: 'created', label: 'Created' },
        ]}
        rows={rows}
        emptyText="No campaigns yet."
      />
    </div>
  );
}
