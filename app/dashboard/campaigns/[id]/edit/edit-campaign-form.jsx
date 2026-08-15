'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditCampaignForm({ campaign }) {
  const router = useRouter();
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description);
  const [reward, setReward] = useState(String(campaign.reward));
  const [slotsTotal, setSlotsTotal] = useState(String(campaign.slots_total));
  const [formUrl, setFormUrl] = useState(campaign.form_url || '');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const locked = campaign.slots_filled > 0;
  const isDraft = campaign.payment_status !== 'paid';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (locked) return;

    setLoading(true);
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, reward, slotsTotal, formUrl: formUrl.trim() || null }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Something went wrong.');
      return;
    }

    if (data.applied) {
      if (isDraft) {
        // Nothing's been charged for a draft yet — stay here so they can
        // hit "Continue to payment" next, rather than bouncing them away.
        setSaved(true);
      } else {
        router.push('/dashboard');
      }
      return;
    }

    // Raising the budget on a paid, live campaign needed a top-up payment.
    window.location.href = data.authorizationUrl;
  }

  async function handleContinuePayment() {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/campaigns/${campaign.id}/pay`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Something went wrong.');
      setLoading(false);
      return;
    }
    window.location.href = data.authorizationUrl;
  }

  const newBaseCost = reward && slotsTotal ? Number(reward) * Number(slotsTotal) : 0;
  const newTotal = newBaseCost * 1.1;
  const alreadyPaid = Number(campaign.total_charged || 0);
  const needsTopUp = !isDraft && newTotal > alreadyPaid;

  return (
    <div className="container" style={{ maxWidth: 560, paddingTop: 48, paddingBottom: 80 }}>
      <button
        onClick={() => router.push('/dashboard')}
        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', marginBottom: 12, padding: 0 }}
      >
        ← Back to dashboard
      </button>
      <p className="eyebrow">{isDraft ? 'Edit draft' : 'Edit campaign'}</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 12 }}>{campaign.title}</h1>

      {locked && (
        <div className="card" style={{ background: 'rgba(217,164,65,0.1)', border: '1px solid var(--amber)', marginBottom: 20, padding: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--amber)' }}>
            This campaign already has {campaign.slots_filled} tester{campaign.slots_filled === 1 ? '' : 's'} in progress,
            so its terms are locked to protect what they signed up for. Launch a new campaign instead if you want to change pricing.
          </p>
        </div>
      )}

      {isDraft && !locked && (
        <div className="card" style={{ background: 'rgba(138,144,156,0.1)', border: '1px solid var(--border)', marginBottom: 20, padding: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            This campaign was never paid for, so it isn't live yet. Edit freely below, then hit "Continue to payment" when you're ready to launch it.
          </p>
        </div>
      )}

      {saved && (
        <div className="card" style={{ background: 'rgba(62,207,142,0.1)', border: '1px solid var(--green)', marginBottom: 20, padding: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--green)', marginBottom: 10 }}>Saved. Ready to launch when you are.</p>
          <button onClick={handleContinuePayment} disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
            {loading ? 'Redirecting…' : `Continue to payment — $${newTotal.toFixed(2)}`}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <fieldset disabled={locked} style={{ border: 'none', padding: 0, margin: 0 }}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="description">Instructions for testers</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="reward">Reward per completion ($)</label>
              <input id="reward" type="number" step="0.01" min="0.01" value={reward} onChange={(e) => setReward(e.target.value)} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="slotsTotal">Number of testers</label>
              <input id="slotsTotal" type="number" min="1" value={slotsTotal} onChange={(e) => setSlotsTotal(e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="formUrl">Google Form / external link (optional)</label>
            <input id="formUrl" type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://forms.gle/..." />
          </div>

          {!locked && newBaseCost > 0 && (
            <div className="card" style={{ background: 'var(--bg)', marginTop: 8, marginBottom: 16, padding: 16 }}>
              <div className="mono" style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>{isDraft ? 'Total to pay at launch' : 'New total (budget + 10%)'}</span>
                <span>${newTotal.toFixed(2)}</span>
              </div>
              {!isDraft && (
                <div className="mono" style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Already paid</span>
                  <span>${alreadyPaid.toFixed(2)}</span>
                </div>
              )}
              {needsTopUp && (
                <div className="mono" style={{ fontSize: 15, color: 'var(--amber)', display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 10, borderTop: '1px solid var(--border)' }}>
                  <span>Top-up required</span>
                  <span>${(newTotal - alreadyPaid).toFixed(2)}</span>
                </div>
              )}
              {!needsTopUp && !isDraft && (
                <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 10 }}>
                  Covered by what you already paid — no extra charge.
                </p>
              )}
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 16 }}>
            {loading ? 'Saving…' : needsTopUp ? 'Continue to pay top-up & save' : 'Save changes'}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
