const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/brands', label: 'Brands' },
  { href: '/admin/campaigns', label: 'Campaigns' },
  { href: '/admin/signups', label: 'Signup attempts' },
  { href: '/admin/subscriptions', label: 'Subscription attempts' },
];

export default function AdminNav({ active }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 28, WebkitOverflowScrolling: 'touch' }}>
      {TABS.map((tab) => (
        <a
          key={tab.href}
          href={tab.href}
          className="mono"
          style={{
            flexShrink: 0,
            fontSize: 13,
            padding: '8px 14px',
            borderRadius: 8,
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            background: active === tab.href ? 'rgba(62,207,142,0.15)' : 'var(--bg-raised)',
            color: active === tab.href ? 'var(--green)' : 'var(--text-dim)',
            border: `1px solid ${active === tab.href ? 'var(--green)' : 'var(--border)'}`,
          }}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}
