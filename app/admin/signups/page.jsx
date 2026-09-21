import { query } from '@/lib/db';
import { requirePlatformAdmin } from '@/lib/admin-auth';
import AdminNav from '../admin-nav';
import AdminTable from '../admin-table';

export default async function AdminSignupsPage() {
  await requirePlatformAdmin();

  const result = await query(`
    SELECT id, email, outcome, created_at FROM signup_attempts ORDER BY created_at DESC LIMIT 200
  `);

  const rows = result.rows.map((s) => ({
    __key: s.id,
    email: s.email,
    outcome: (
      <span
        className="mono"
        style={{
          fontSize: 11,
          padding: '3px 9px',
          borderRadius: 6,
          background: s.outcome === 'created' ? 'rgba(62,207,142,0.15)' : 'rgba(217,164,65,0.15)',
          color: s.outcome === 'created' ? 'var(--green)' : 'var(--amber)',
        }}
      >
        {s.outcome === 'created' ? 'new account' : 'already existed'}
      </span>
    ),
    when: new Date(s.created_at).toLocaleString(),
  }));

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <p className="eyebrow">Platform admin</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 20 }}>Signup attempts</h1>

      <AdminNav active="/admin/signups" />

      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
        "Already existed" means someone tried to sign up with an email that already has an account — the real
        owner gets a quiet email notice, and nothing changes for them.
      </p>

      <AdminTable
        columns={[
          { key: 'email', label: 'Email' },
          { key: 'outcome', label: 'Outcome' },
          { key: 'when', label: 'When' },
        ]}
        rows={rows}
        emptyText="No signup attempts logged yet."
      />
    </div>
  );
}
