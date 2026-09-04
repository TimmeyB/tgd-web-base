'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Something went wrong.');
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/login'), 2000);
  }

  if (!token) {
    return (
      <div className="card">
        <p>This reset link is missing its token. Request a new one from the login page.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card">
        <p>Password updated. Taking you to login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="field">
        <label htmlFor="password">New password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirm new password</label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
        {loading ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <div className="dot-grid-bg" />
      <div className="container" style={{ maxWidth: 420, paddingTop: 80 }}>
        <p className="eyebrow">TaskGrind for Brands</p>
        <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 32 }}>Set a new password</h1>
        <Suspense fallback={<div className="card"><p>Loading…</p></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </>
  );
}
