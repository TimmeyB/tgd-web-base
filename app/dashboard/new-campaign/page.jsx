'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCampaignPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [slotsTotal, setSlotsTotal] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, reward, slotsTotal }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Something went wrong.');
      return;
    }
    router.push('/dashboard');
  }

  return (
    <div className="container" style={{ maxWidth: 560, paddingTop: 48, paddingBottom: 80 }}>
      <p className="eyebrow">New campaign</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 32 }}>Launch a campaign</h1>

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Test our new onboarding flow"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="description">Instructions for testers</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="What should the tester actually do, step by step?"
            required
          />
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="reward">Reward per completion ($)</label>
            <input
              id="reward"
              type="number"
              step="0.01"
              min="0.01"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="slotsTotal">Number of testers</label>
            <input
              id="slotsTotal"
              type="number"
              min="1"
              value={slotsTotal}
              onChange={(e) => setSlotsTotal(e.target.value)}
              required
            />
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
          {loading ? 'Launching…' : 'Launch campaign'}
        </button>
      </form>
    </div>
  );
}
