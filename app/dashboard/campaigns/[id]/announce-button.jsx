'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AnnounceButton({ campaignId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAnnounce() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/announce`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
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
    <div>
      <button
        onClick={handleAnnounce}
        disabled={loading}
        className="btn btn-primary"
        style={{ fontSize: 13, padding: '8px 16px' }}
      >
        {loading ? 'Requesting…' : '📢 Announce to testers'}
      </button>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
        One-time push notification to all testers on Telegram — goes out within a couple minutes.
      </p>
      {error && <p className="error-text" style={{ fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}
