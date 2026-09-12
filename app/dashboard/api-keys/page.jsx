'use client';

import { useState, useEffect } from 'react';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState(null);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadKeys() {
    const res = await fetch('/api/dashboard/api-keys');
    const data = await res.json();
    if (res.ok) setKeys(data.keys);
  }

  useEffect(() => { loadKeys(); }, []);

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not generate a key.');
        setLoading(false);
        return;
      }
      setNewKey(data.key);
      setLabel('');
      await loadKeys();
    } catch (err) {
      setError('Could not reach the server.');
    }
    setLoading(false);
  }

  async function handleRevoke(keyId) {
    await fetch('/api/dashboard/api-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId }),
    });
    loadKeys();
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 640 }}>
      <a href="/dashboard" className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}>← Back to dashboard</a>
      <p className="eyebrow" style={{ marginTop: 16 }}>Developer</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 16 }}>API keys</h1>

      <div className="card" style={{ padding: 16, marginBottom: 24, background: 'rgba(217,164,65,0.08)', border: '1px solid var(--amber)' }}>
        <p style={{ fontSize: 13, color: 'var(--amber)' }}>
          A key lets an external tool or AI agent create and launch campaigns using your pre-loaded wallet balance, and read status. It can never charge a new payment, approve or reject a submission, or spend beyond what's already in your wallet — those always require you, logged in, on this dashboard. Agent-created campaigns are always reviewed by a human admin before going live.
        </p>
      </div>

      {newKey && (
        <div className="card" style={{ padding: 16, marginBottom: 24, border: '1px solid var(--green)' }}>
          <p style={{ fontSize: 13, marginBottom: 8 }}>Copy this now — it won't be shown again:</p>
          <code style={{ display: 'block', wordBreak: 'break-all', fontSize: 13, background: 'var(--bg)', padding: 10, borderRadius: 6 }}>{newKey}</code>
          <button className="btn" style={{ marginTop: 10, fontSize: 12 }} onClick={() => setNewKey(null)}>Done, I've saved it</button>
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 32 }}>
        <div className="field">
          <label htmlFor="label">Label (optional, helps you remember what it's for)</label>
          <input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Clueless Creations agent" />
        </div>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating…' : '+ Generate new key'}
        </button>
        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</p>}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Your keys</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {keys.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No keys yet.</p>}
        {keys.map((k) => (
          <div key={k.id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="mono" style={{ fontSize: 13 }}>{k.key_prefix}••••••••</p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {k.label || 'Unlabeled'} · created {new Date(k.created_at).toLocaleDateString()}
                {k.revoked_at && ' · revoked'}
              </p>
            </div>
            {!k.revoked_at && (
              <button onClick={() => handleRevoke(k.id)} className="mono" style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
