'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UnarchiveButton({ campaignId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUnarchive() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not unarchive this campaign.');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch (err) {
      setError('Could not reach the server. Try again.');
      setLoading(false);
    }
  }

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={handleUnarchive}
        disabled={loading}
        className="mono"
        style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: 12, cursor: 'pointer', padding: 0 }}
      >
        {loading ? 'Restoring…' : '↩ Unarchive'}
      </button>
      {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
    </span>
  );
}
