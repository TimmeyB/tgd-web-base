import { query } from '@/lib/db';
import { requirePlatformAdmin } from '@/lib/admin-auth';
import AdminNav from '../admin-nav';
import AdminTable from '../admin-table';

export default async function AdminBrandsPage() {
  await requirePlatformAdmin();

  const result = await query(`
    SELECT b.id, b.company_name, b.email, b.subscription_status, b.created_at,
           COALESCE(SUM(w.amount), 0) AS wallet_balance
    FROM brands b
    LEFT JOIN wallet_transactions w ON w.brand_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
    LIMIT 200
  `);

  const rows = result.rows.map((b) => ({
    __key: b.id,
    company: b.company_name,
    email: b.email,
    status: (
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
    ),
    wallet: `$${Number(b.wallet_balance).toFixed(2)}`,
    joined: new Date(b.created_at).toLocaleDateString(),
  }));

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <p className="eyebrow">Platform admin</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 20 }}>Brands</h1>

      <AdminNav active="/admin/brands" />

      <AdminTable
        columns={[
          { key: 'company', label: 'Company' },
          { key: 'email', label: 'Email' },
          { key: 'status', label: 'Subscription' },
          { key: 'wallet', label: 'Wallet' },
          { key: 'joined', label: 'Joined' },
        ]}
        rows={rows}
        emptyText="No brands signed up yet."
      />
    </div>
  );
}
