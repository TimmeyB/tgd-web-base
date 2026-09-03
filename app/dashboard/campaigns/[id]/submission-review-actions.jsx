'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmissionReviewActions({ submissionId, screeningOnly }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDecision(decision) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
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
    <div style={{ marginTop: 12 }}>
      {screeningOnly && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
          This is a screening answer, not a finished task — approving only lets them start. Payment happens separately once they submit real proof.
        </p>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={() => handleDecision('approve')}
          disabled={loading}
          className="btn"
          style={{ background: 'rgba(62,207,142,0.15)', border: '1px solid var(--green)', color: 'var(--green)', fontSize: 13, padding: '6px 14px' }}
        >
          {screeningOnly ? '✅ Approve screening' : '✅ Approve'}
        </button>
        <button
          onClick={() => handleDecision('reject')}
          disabled={loading}
          className="btn"
          style={{ background: 'rgba(220,80,80,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 13, padding: '6px 14px' }}
        >
          {screeningOnly ? '❌ Reject screening' : '❌ Reject'}
        </button>
        {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
      </div>
    </div>
  );
}
