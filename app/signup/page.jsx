'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot — real users never see or fill this
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, email, password, agreedToTerms, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      // Covers network failures and non-JSON error responses (e.g. a
      // timeout or crash returning an HTML error page instead of JSON) —
      // without this, the button could get stuck on "Creating account…"
      // forever with no explanation at all.
      setError('Something went wrong reaching the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="dot-grid-bg" />
      <div className="container" style={{ maxWidth: 420, paddingTop: 80 }}>
        <p className="eyebrow">TaskGrind for Brands</p>
        <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 32 }}>Create your account</h1>
        <form onSubmit={handleSubmit} className="card">
          <div className="field">
            <label htmlFor="companyName">Company name</label>
            <input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          {/* Honeypot — invisible to real people, but a bot filling every field will trip it */}
          <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-dim)', marginTop: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              I agree to the <a href="/terms" target="_blank" style={{ color: 'var(--green)' }}>Terms of Service</a> and{' '}
              <a href="/privacy" target="_blank" style={{ color: 'var(--green)' }}>Privacy Policy</a>
            </span>
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 12 }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p style={{ marginTop: 20, color: 'var(--text-dim)', fontSize: 14 }}>
          Already have an account? <a href="/login" style={{ color: 'var(--green)' }}>Log in</a>
        </p>
      </div>
    </>
  );
              }
