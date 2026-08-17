'use client';

import { useState } from 'react';
import SupportLink from '../support-link';

export default function BillingPage({ searchParams }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const blocked = searchParams?.blocked === '1';

  async function handleSubscribe() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/billing/subscribe', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError('Something went wrong reaching the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 480, paddingTop: 64, paddingBottom: 80 }}>
      <p className="eyebrow">Billing</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 16 }}>Unlock campaign creation</h1>

      {blocked && (
        <div className="card" style={{ background: 'rgba(217,164,65,0.1)', border: '1px solid var(--amber)', marginBottom: 20, padding: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--amber)' }}>
            You need an active subscription before launching campaigns.
          </p>
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: 18, marginBottom: 4 }}>TaskGrind Access</h3>
        <p className="mono" style={{ fontSize: 28, color: 'var(--green)', margin: '12px 0' }}>
          $8<span style={{ fontSize: 14, color: 'var(--text-dim)' }}>/month</span>
        </p>
        <ul style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.9, paddingLeft: 18, marginBottom: 24 }}>
          <li>Launch unlimited campaigns — Engagement, Upvote, Reviews, Testing</li>
          <li>Full screening builder for Testing campaigns</li>
          <li>Live dashboard with campaign metrics</li>
          <li>10% platform commission on tester budget, charged at launch — no hidden fees</li>
        </ul>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" onClick={handleSubscribe} disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Redirecting to Paystack…' : 'Subscribe with Paystack'}
        </button>
      </div>
      <SupportLink />
    </div>
  );
}
