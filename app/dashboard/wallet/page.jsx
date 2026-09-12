'use client';

import { useState, useEffect } from 'react';

export default function WalletPage() {
  const [balance, setBalance] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dashboard/wallet')
      .then((res) => res.json())
      .then((data) => setBalance(data.balance))
      .catch(() => {});
  }, []);

  async function handleTopup(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Enter a positive amount.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not start checkout.');
        setLoading(false);
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError('Could not reach the server.');
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 560 }}>
      <a href="/dashboard" className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}>← Back to dashboard</a>
      <p className="eyebrow" style={{ marginTop: 16 }}>Wallet</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 24 }}>Pre-loaded balance</h1>

      <div className="card" style={{ padding: 20, marginBottom: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Current balance</p>
        <p className="mono" style={{ fontSize: 32, color: 'var(--green)' }}>
          {balance === null ? '…' : `$${balance.toFixed(2)}`}
        </p>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 24, background: 'rgba(217,164,65,0.08)', border: '1px solid var(--amber)' }}>
        <p style={{ fontSize: 13, color: 'var(--amber)' }}>
          Load funds here once, then campaigns you create — including ones an AI agent creates through your API key — can launch instantly by drawing from this balance instead of a fresh checkout each time.
        </p>
      </div>

      <form onSubmit={handleTopup} className="card" style={{ padding: 16 }}>
        <div className="field">
          <label htmlFor="amount">Amount to add ($)</label>
          <input id="amount" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Redirecting to checkout…' : 'Top up via Paystack'}
        </button>
        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</p>}
      </form>
    </div>
  );
}
