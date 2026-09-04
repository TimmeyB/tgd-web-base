'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true); // always show success, whether or not the email exists
  }

  return (
    <>
      <div className="dot-grid-bg" />
      <div className="container" style={{ maxWidth: 420, paddingTop: 80 }}>
        <p className="eyebrow">TaskGrind for Brands</p>
        <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 32 }}>Reset your password</h1>

        {sent ? (
          <div className="card">
            <p>If that email has an account, a reset link is on its way — check your inbox.</p>
            <p style={{ marginTop: 12, color: 'var(--text-dim)', fontSize: 14 }}>
              The link works for 1 hour. Didn't get it? Check spam, or try again in a minute.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p style={{ marginTop: 20, color: 'var(--text-dim)', fontSize: 14 }}>
          <a href="/login" style={{ color: 'var(--green)' }}>← Back to login</a>
        </p>
      </div>
    </>
  );
}
