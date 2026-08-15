'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SupportLink from '../support-link';

const CAMPAIGN_TYPES = [
  {
    id: 'engagement',
    icon: '💬',
    label: 'Engagement',
    desc: 'Likes, comments, shares, follows — quick social actions.',
  },
  {
    id: 'upvote',
    icon: '⬆️',
    label: 'Upvote',
    desc: 'Get real people to check out your Product Hunt, Reddit, or Hacker News listing and react genuinely.',
  },
  {
    id: 'review',
    icon: '⭐',
    label: 'Reviews',
    desc: 'Real users try your product and share honest, first-hand feedback on your listing.',
  },
  {
    id: 'testing',
    icon: '🧪',
    label: 'Testing',
    desc: 'Real product testing, with a screening survey to qualify testers first.',
  },
  {
    id: 'survey',
    icon: '📋',
    label: 'Survey',
    desc: 'Recruit the right respondents with qualifying questions, then send them to your survey.',
  },
];

// Locked tester payout tiers, used as suggested ranges (not enforced).
const SUGGESTED_RANGE = {
  engagement: [0.25, 1],
  upvote: [0.25, 1],
  review: [1, 5],
  survey: [1, 5],
  testing: [1, 5], // starting point — scales up with app complexity
};

// Types that inherently need qualification, so screening defaults on.
const SCREENING_DEFAULT_ON = ['testing', 'survey'];

let qIdCounter = 0;
function newQuestion() {
  qIdCounter += 1;
  return { _key: qIdCounter, questionText: '', type: 'mc', options: ['', ''], qualifying: [] };
}

function suggestedRangeFor(campaignType, screeningMode) {
  if (campaignType === 'testing' && screeningMode !== 'none') return [5, 15];
  return SUGGESTED_RANGE[campaignType] || null;
}

export default function NewCampaignForm({ subscriptionActive = false }) {
  const router = useRouter();
  const [step, setStep] = useState('type'); // 'type' | 'form'
  const [campaignType, setCampaignType] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [slotsTotal, setSlotsTotal] = useState('');
  const [formUrl, setFormUrl] = useState('');

  const [screeningMode, setScreeningMode] = useState('none'); // 'none' | 'auto' | 'manual'
  const [screeningPoolCap, setScreeningPoolCap] = useState('');
  const [questions, setQuestions] = useState([]);

  const [error, setError] = useState('');
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [loading, setLoading] = useState(false);

  function selectType(id) {
    setCampaignType(id);
    setStep('form');
    // Reset every field so switching types starts clean — otherwise numbers
    // and text typed for one campaign silently carry over to the next.
    setTitle('');
    setDescription('');
    setReward('');
    setSlotsTotal('');
    setFormUrl('');
    setScreeningPoolCap('');
    setError('');
    setNeedsSubscription(false);
    if (SCREENING_DEFAULT_ON.includes(id)) {
      setQuestions([newQuestion()]);
      setScreeningMode('manual');
    } else {
      setQuestions([]);
      setScreeningMode('none');
    }
  }

  function updateQuestion(key, patch) {
    setQuestions((qs) => qs.map((q) => (q._key === key ? { ...q, ...patch } : q)));
  }

  function updateOption(qKey, index, value) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q._key !== qKey) return q;
        const options = [...q.options];
        options[index] = value;
        return { ...q, options };
      })
    );
  }

  function addOption(qKey) {
    setQuestions((qs) =>
      qs.map((q) => (q._key === qKey ? { ...q, options: [...q.options, ''] } : q))
    );
  }

  function toggleQualifying(qKey, optionValue) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q._key !== qKey) return q;
        const isIn = q.qualifying.includes(optionValue);
        return {
          ...q,
          qualifying: isIn ? q.qualifying.filter((v) => v !== optionValue) : [...q.qualifying, optionValue],
        };
      })
    );
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, newQuestion()]);
  }

  function removeQuestion(key) {
    setQuestions((qs) => qs.filter((q) => q._key !== key));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNeedsSubscription(false);

    if (screeningMode !== 'none') {
      for (const q of questions) {
        if (!q.questionText.trim()) {
          setError('Every screening question needs text.');
          return;
        }
        if (q.type === 'mc') {
          const cleanOptions = q.options.map((o) => o.trim()).filter(Boolean);
          if (cleanOptions.length < 2) {
            setError('Multiple choice questions need at least 2 options.');
            return;
          }
          if (screeningMode === 'auto' && q.qualifying.length === 0) {
            setError('Pick at least one qualifying answer for auto-grading.');
            return;
          }
        }
        if (screeningMode === 'auto' && q.type !== 'mc') {
          setError('Auto screening only supports multiple choice questions. Switch to Manual, or change this question to MC.');
          return;
        }
      }
    }

    setLoading(true);
    const payload = {
      title,
      description,
      reward,
      slotsTotal,
      campaignType,
      formUrl: formUrl.trim() || null,
      screeningMode,
      screeningPoolCap: screeningPoolCap ? Number(screeningPoolCap) : null,
      screeningQuestions:
        screeningMode !== 'none'
          ? questions.map((q) => ({
              questionText: q.questionText.trim(),
              type: q.type,
              options: q.type === 'mc' ? q.options.map((o) => o.trim()).filter(Boolean) : undefined,
              qualifying: q.type === 'mc' ? q.qualifying : undefined,
            }))
          : [],
    };

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          // They've built out the whole campaign already — don't send them
          // away, just surface the subscribe prompt right here.
          setNeedsSubscription(true);
          setError(data.error || 'An active subscription is required to launch campaigns.');
        } else {
          setError(data.error || 'Something went wrong.');
        }
        return;
      }
      // Campaign was created as a draft — it only goes live once Paystack
      // confirms this payment via webhook. Send the brand to pay now.
      window.location.href = data.authorizationUrl;
    } catch (err) {
      // Covers network failures and non-JSON error responses (e.g. a server
      // crash returning an HTML error page) — without this, the button was
      // getting stuck on "Launching…" forever with no explanation.
      setError('Something went wrong reaching the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'type') {
    return (
      <div className="container" style={{ maxWidth: 640, paddingTop: 48, paddingBottom: 80 }}>
        <a href="/dashboard" style={{ color: 'var(--text-dim)', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}>
          ← Back to dashboard
        </a>
        <p className="eyebrow">New campaign</p>
        <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 8 }}>What kind of campaign is this?</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 28 }}>
          Pick a type — testers only see campaigns that match what they're good at.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {CAMPAIGN_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => selectType(t.id)}
              className="card"
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                padding: 20,
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 10 }}>{t.icon}</div>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>{t.label}</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.4 }}>{t.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selectedType = CAMPAIGN_TYPES.find((t) => t.id === campaignType);

  return (
    <div className="container" style={{ maxWidth: 560, paddingTop: 48, paddingBottom: 80 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <button
          onClick={() => setStep('type')}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', padding: 0 }}
        >
          ← Change campaign type
        </button>
        <a href="/dashboard" style={{ color: 'var(--text-dim)', fontSize: 13, textDecoration: 'none' }}>
          Back to dashboard
        </a>
      </div>
      <p className="eyebrow">{selectedType.icon} {selectedType.label} campaign</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 32 }}>Launch a campaign</h1>

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Test our new onboarding flow" required />
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
            <input id="reward" type="number" step="0.01" min="0.01" value={reward} onChange={(e) => setReward(e.target.value)} required />
            {(() => {
              const range = suggestedRangeFor(campaignType, screeningMode);
              if (!range) return null;
              const [min, max] = range;
              const belowRange = reward && Number(reward) > 0 && Number(reward) < min;
              return (
                <p style={{ fontSize: 12, marginTop: 6, color: belowRange ? 'var(--amber)' : 'var(--text-dim)' }}>
                  {belowRange
                    ? `Suggested: $${min}–$${max}. Below-range rewards tend to attract lower-effort testers.`
                    : `Suggested for this type: $${min}–$${max}${campaignType === 'testing' && screeningMode !== 'none' ? '+' : ''}`}
                </p>
              );
            })()}
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="slotsTotal">Number of testers</label>
            <input id="slotsTotal" type="number" min="1" value={slotsTotal} onChange={(e) => setSlotsTotal(e.target.value)} required />
          </div>
        </div>

        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="formUrl">Google Form / external link (optional)</label>
          <input
            id="formUrl"
            type="url"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="https://forms.gle/..."
          />
        </div>

        <div style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>
            Screening survey {!SCREENING_DEFAULT_ON.includes(campaignType) && '(optional)'}
          </p>

            <div className="field">
              <label htmlFor="screeningMode">Screening mode</label>
              <select
                id="screeningMode"
                value={screeningMode}
                onChange={(e) => setScreeningMode(e.target.value)}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)' }}
              >
                <option value="none">No screening — anyone can start</option>
                <option value="auto">Auto — instant pass/fail (MC questions only)</option>
                <option value="manual">Manual — you review each applicant</option>
              </select>
            </div>

            {screeningMode !== 'none' && (
              <>
                <div className="field">
                  <label htmlFor="poolCap">Max applicants (optional)</label>
                  <input
                    id="poolCap"
                    type="number"
                    min="1"
                    value={screeningPoolCap}
                    onChange={(e) => setScreeningPoolCap(e.target.value)}
                    placeholder="Leave blank for unlimited"
                  />
                </div>

                {questions.map((q, qi) => (
                  <div key={q._key} className="card" style={{ background: 'var(--bg)', marginBottom: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>Question {qi + 1}</span>
                      {questions.length > 1 && (
                        <button type="button" onClick={() => removeQuestion(q._key)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="field">
                      <input
                        value={q.questionText}
                        onChange={(e) => updateQuestion(q._key, { questionText: e.target.value })}
                        placeholder="Question text"
                      />
                    </div>
                    <div className="field">
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(q._key, { type: e.target.value })}
                        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)' }}
                      >
                        <option value="mc">Multiple choice</option>
                        <option value="text">Free text</option>
                        <option value="media">Photo/video</option>
                      </select>
                    </div>

                    {q.type === 'mc' && (
                      <div style={{ marginTop: 4 }}>
                        {q.options.map((opt, oi) => (
                          <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            <input
                              value={opt}
                              onChange={(e) => updateOption(q._key, oi, e.target.value)}
                              placeholder={`Option ${oi + 1}`}
                              style={{ flex: 1 }}
                            />
                            {screeningMode === 'auto' && opt.trim() && (
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                                <input
                                  type="checkbox"
                                  checked={q.qualifying.includes(opt.trim())}
                                  onChange={() => toggleQualifying(q._key, opt.trim())}
                                />
                                Qualifies
                              </label>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOption(q._key)}
                          style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 6, color: 'var(--text-dim)', fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}
                        >
                          + Add option
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addQuestion}
                  className="btn"
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', width: '100%', marginBottom: 8 }}
                >
                  + Add another question
                </button>
              </>
            )}
        </div>

        {reward && slotsTotal && Number(reward) > 0 && Number(slotsTotal) > 0 && (
          <div className="card" style={{ background: 'var(--bg)', marginTop: 8, marginBottom: 16, padding: 16 }}>
            <div className="mono" style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Tester budget ({slotsTotal} × ${Number(reward).toFixed(2)})</span>
              <span>${(Number(reward) * Number(slotsTotal)).toFixed(2)}</span>
            </div>
            <div className="mono" style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span>Platform commission (10%)</span>
              <span>${(Number(reward) * Number(slotsTotal) * 0.1).toFixed(2)}</span>
            </div>
            <div className="mono" style={{ fontSize: 15, color: 'var(--green)', display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <span>Total charged at launch</span>
              <span>${(Number(reward) * Number(slotsTotal) * 1.1).toFixed(2)}</span>
            </div>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        {needsSubscription && (
          <div className="card" style={{ background: 'rgba(217,164,65,0.1)', border: '1px solid var(--amber)', marginTop: 8, marginBottom: 16, padding: 16 }}>
            <p style={{ fontSize: 13, marginBottom: 10 }}>
              Your campaign is ready to go — you just need an active subscription to launch it.
            </p>
            <a href="/dashboard/billing" className="btn btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Subscribe to launch — $8/mo
            </a>
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 16 }}>
          {loading ? 'Launching…' : subscriptionActive ? 'Launch campaign' : 'Continue to subscribe & launch'}
        </button>
      </form>
      <SupportLink />
    </div>
  );
}
