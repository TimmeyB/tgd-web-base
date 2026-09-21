// Plain server-renderable table shell. Columns don't try to shrink to fit
// a phone screen — that's what makes tables unreadable on mobile. Instead
// the whole table scrolls sideways within its own box, so every column
// stays a sane width and nothing gets crushed.
export default function AdminTable({ columns, rows, emptyText = 'Nothing here yet.' }) {
  if (rows.length === 0) {
    return <p style={{ color: 'var(--text-dim)', fontSize: 13, padding: '20px 0' }}>{emptyText}</p>;
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-dim)',
                  borderBottom: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                  background: 'var(--bg-raised)',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.__key ?? i} style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border)' }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '10px 14px', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
