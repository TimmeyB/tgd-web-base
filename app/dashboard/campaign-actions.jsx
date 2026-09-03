'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CampaignActions({ campaignId, isDraft, status, announceRequested, announcedAt, locked = false }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [announceLoading, setAnnounceLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  const canArchive = ['draft', 'closed', 'rejected'].includes(status);

  async function handleArchive() {
    setArchiveLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not archive this campaign.');
        setArchiveLoading(false);
        return;
      }
      router.refresh();
    } catch (err) {
      setError('Could not reach the server. Try again.');
      setArchiveLoading(false);
    }
  }

  async function handleAnnounce() {
    setAnnounceLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/announce`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setAnnounceLoading(false);
        return;
      }
      router.refresh();
    } catch (err) {
      setError('Could not reach the server. Try again.');
      setAnnounceLoading(false);
    }
  }

  async function handleContinuePayment() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/pay`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError('Could not reach the server. Try again.');
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not delete this campaign.');
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
    <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      {status === 'open' && (
        announcedAt ? (
          <span className="mono" style={{ fontSize: 12, color: 'var(--green)' }}>✅ Announced</span>
        ) : announceRequested ? (
          <span className="mono" style={{ fontSize: 12, color: 'var(--amber)' }}>📢 Announcing…</span>
        ) : (
          <button
            onClick={handleAnnounce}
            disabled={announceLoading}
            className="mono"
            style={{ background: 'none', border: 'none', color: 'var(--amber)', fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            {announceLoading ? 'Requesting…' : '📢 Announce to testers'}
          </button>
        )
      )}

      <a
        href={`/dashboard/campaigns/${campaignId}/edit`}
        className="mono"
        style={{ fontSize: 12, color: 'var(--green)' }}
      >
        {isDraft ? 'Edit draft →' : 'Edit campaign →'}
      </a>

      {isDraft && !locked && (
        <button
          onClick={handleContinuePayment}
          disabled={loading}
          className="mono"
          style={{ background: 'none', border: 'none', color: 'var(--amber)', fontSize: 12, cursor: 'pointer', padding: 0 }}
        >
          {loading ? 'Redirecting…' : 'Continue to payment →'}
        </button>
      )}

      {canArchive && (
        <button
          onClick={handleArchive}
          disabled={archiveLoading}
          className="mono"
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', padding: 0 }}
        >
          {archiveLoading ? 'Archiving…' : '🗂 Archive'}
        </button>
      )}

      {!locked && !confirmingDelete ? (
        <button
          onClick={() => setConfirmingDelete(true)}
          className="mono"
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', padding: 0 }}
        >
          Delete
        </button>
      ) : (
        <span className="mono" style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--text-dim)' }}>Delete this campaign?</span>
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0 }}
          >
            Cancel
          </button>
        </span>
      )}

      {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
}
