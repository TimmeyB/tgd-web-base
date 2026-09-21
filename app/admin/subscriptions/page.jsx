import { query } from '@/lib/db';
import { requirePlatformAdmin } from '@/lib/admin-auth';
import AdminNav from '../admin-nav';
import AdminTable from '../admin-table';

export default async function AdminSubscriptionsPage() {
  await requirePlatformAdmin();

  const result = await query(`
    SELECT sa.id, sa.status, sa.reference, sa.created_at, b.company_name, b.email
    FROM subscription_attempts sa JOIN brands b ON b.id = sa.brand_id
    ORDER BY sa.created_at DESC LIMIT 200
  `);

  const rows = result.rows.map((s) => ({
    __key: s.id,
    brand: `${s.company_name} (${s.email})`,
    status: (
      <span
        className="mono"
        style={{
          fontSize: 11,
          padding: '3px 9px',
          borderRadius: 6,
          background: s.status === 'completed' ? 'rgba(62,207,142,0.15)' : 'rgba(220,80,80,0.15)',
          color: s.status === 'completed' ? 'var(--green)' : 'var(--danger)',
        }}
      >
        {s.status === 'completed' ? 'completed' : 'not completed'}
      </span>
    ),
    reference: s.reference,
    when: new Date(s.created_at).toLocaleString(),
  }));

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <p className="eyebrow">Platform admin</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 20 }}>Subscription attempts</h1>

      <AdminNav active="/admin/subscriptions" />

      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
        "Not completed" covers both a declined card and someone abandoning checkout before paying — Paystack
        doesn't reliably tell us which for a first-time charge, so both show the same way rather than guessing.
      </p>

      <AdminTable
        columns={[
          { key: 'brand', label: 'Brand' },
          { key: 'status', label: 'Status' },
          { key: 'reference', label: 'Reference' },
          { key: 'when', label: 'Started' },
        ]}
        rows={rows}
        emptyText="No subscription attempts logged yet."
      />
    </div>
  );
}
