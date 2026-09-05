'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SupportLink from '../support-link';
import QuestionBuilder from './question-builder';

const CAMPAIGN_TYPES = [
  {
    id: 'testing',
    icon: '🧪',
    label: 'Testing',
    desc: 'Real product testing, with a screening survey to qualify testers first.',
  },
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

const COMMISSION_RATES = { self: 0.10, admin: 0.13 };

let qIdCounter = 0;
function newQuestion() {
  qIdCounter += 1;
  return { _key: qIdCounter, questionText: '', type: 'mc', options: ['', ''], qualifying: [] };
}

function suggestedRangeFor(campaignType, screeningMode) {
  if (campaignType === 'testing' && screeningMode !== 'none') return [5, 15];
  return SUGGESTED_RANGE[campaignType] || null;
}

const FIELD_LABELS = {
  testing: {
    titlePlaceholder: 'e.g. Test our new onboarding flow',
    descriptionLabel: 'Instructions for testers',
    descriptionPlaceholder: 'What should the tester actually do, step by step?',
    rewardLabel: 'Pay per completed test ($)',
    slotsLabel: 'Number of testers',
  },
  engagement: {
    titlePlaceholder: 'e.g. Boost our launch announcement',
    descriptionLabel: 'Instructions for participants',
    descriptionPlaceholder: 'What should people actually do — like, comment, repost, follow? Be specific, and link the post.',
    rewardLabel: 'Pay per person ($)',
    slotsLabel: 'Set a goal for likes, comments & reposts',
  },
  upvote: {
    titlePlaceholder: 'e.g. Upvote us on Product Hunt',
    descriptionLabel: 'Instructions for upvoters',
    descriptionPlaceholder: 'Where should people upvote, and anything they should know before they do?',
    rewardLabel: 'Pay per upvote ($)',
    slotsLabel: 'Number of upvoters',
  },
  review: {
    titlePlaceholder: 'e.g. Leave a review on our Play Store listing',
    descriptionLabel: 'Instructions for reviewers',
    descriptionPlaceholder: 'What should the review cover, and where should people leave it?',
    rewardLabel: 'Pay per review ($)',
    slotsLabel: 'Number of reviewers',
  },
  survey: {
    titlePlaceholder: 'e.g. Fill out our product-market fit survey',
    descriptionLabel: 'Instructions for respondents',
    descriptionPlaceholder: 'What should respondents know before they start the survey?',
    rewardLabel: 'Pay per response ($)',
    slotsLabel: 'Number of respondents',
  },
};

export default function NewCampaignForm({ subscriptionActive = false }) {
  const router = useRouter();
  const [step, setStep] = useState('type'); // 'type' | 'form'
  const [campaignType, setCampaignType] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [slotsTotal, setSlotsTotal] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [handlingMode, setHandlingMode] = useState('admin'); // 'self' (10%) | 'admin' (13%)
  const [successExampleImage, setSuccessExampleImage] = useState(null); // base64 data URI
  const [successExampleMime, setSuccessExampleMime] = useState('');
  const [imageError, setImageError] = useState('');

  const [screeningMode, setScreeningMode] = useState('none'); // 'none' | 'auto' | 'manual'
  const [screeningPoolCap, setScreeningPoolCap] = useState('');
  const [questions, setQuestions] = useState([]);

  const [durationDays, setDurationDays] = useState('');
  const [requiresDailyReport, setRequiresDailyReport] = useState(false);
  const [requiresGmailAccess, setRequiresGmailAccess] = useState(false);
  const [dailyReportQuestions, setDailyReportQuestions] = useState([]);

  const [error, setError] = useState('');
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSuccessImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    if (file.size > 3 * 1024 * 1024) {
      setImageError('Image is too large — keep it under 3MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSuccessExampleImage(reader.result);
      setSuccessExampleMime(file.type);
    };
    reader.readAsDataURL(file);
  }

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
    setHandlingMode('admin');
    setSuccessExampleImage(null);
    setSuccessExampleMime('');
    setImageError('');
    setScreeningPoolCap('');
    setDurationDays('');
    setRequiresDailyReport(false);
    setRequiresGmailAccess(false);
    setDailyReportQuestions([]);
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

  function addQuestion() {
    setQuestions((qs) => [...qs, newQuestion()]);
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

    if (campaignType === 'testing' && Number(durationDays) > 0 && requiresDailyReport) {
      for (const q of dailyReportQuestions) {
        if (!q.questionText.trim()) {
          setError('Every daily report question needs text.');
          return;
        }
        if (q.type === 'mc') {
          const cleanOptions = q.options.map((o) => o.trim()).filter(Boolean);
          if (cleanOptions.length < 2) {
            setError('Multiple choice questions need at least 2 options.');
            return;
          }
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
      handlingMode,
      successExampleImage: handlingMode === 'admin' ? successExampleImage : null,
      successExampleMime: handlingMode === 'admin' ? successExampleMime : null,
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
      durationDays: campaignType === 'testing' && durationDays ? Number(durationDays) : 0,
      requiresDailyReport: campaignType === 'testing' && Number(durationDays) > 0 ? requiresDailyReport : false,
      requiresGmailAccess: campaignType === 'testing' && Number(durationDays) > 0 ? requiresGmailAccess : false,
      dailyReportQuestions:
        campaignType === 'testing' && Number(durationDays) > 0 && requiresDailyReport
          ? dailyReportQuestions.map((q) => ({
              questionText: q.questionText.trim(),
              type: q.type,
              options: q.type === 'mc' ? q.options.map((o) => o.trim()).filter(Boolean) : undefined,
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
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>
          Pick a type — testers only see campaigns that match what they're good at.
        </p>
        <div
          className="card"
          style={{
            background: 'rgba(62,207,142,0.12)',
            border: '1px solid var(--green)',
            padding: 14,
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16 }}>⚡</span>
          <p style={{ fontSize: 13, color: 'var(--green)' }}>
            This isn't just a listing — once launched, real testers on Telegram can see and claim your campaign in under 2 minutes.
          </p>
        </div>
        {(() => {
          const featured = CAMPAIGN_TYPES.find((t) => t.id === 'testing');
          const others = CAMPAIGN_TYPES.filter((t) => t.id !== 'testing');
          return (
            <>
              <button
                onClick={() => selectType(featured.id)}
                className="card"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: 24,
                  border: '1px solid var(--green)',
                  background: 'rgba(62,207,142,0.08)',
                  marginBottom: 24,
                }}
              >
                <p className="eyebrow" style={{ marginBottom: 8 }}>What TaskGrind is built for</p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ fontSize: 34 }}>{featured.icon}</div>
                  <div>
                    <h3 style={{ fontSize: 19, marginBottom: 6 }}>{featured.label}</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.5 }}>{featured.desc}</p>
                  </div>
                </div>
              </button>

              <p style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Other campaign types
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                {others.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectType(t.id)}
                    className="card"
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: 14,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-raised)',
                      opacity: 0.75,
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{t.icon}</div>
                    <h3 style={{ fontSize: 13, marginBottom: 4 }}>{t.label}</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.35 }}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </>
          );
        })()}
      </div>
    );
  }

  const selectedType = CAMPAIGN_TYPES.find((t) => t.id === campaignType);
  const labels = FIELD_LABELS[campaignType] || FIELD_LABELS.testing;

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
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={labels.titlePlaceholder} required />
        </div>
        <div className="field">
          <label htmlFor="description">{labels.descriptionLabel}</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder={labels.descriptionPlaceholder}
            required
          />
        </div>

        <div className="field">
          <label>Who reviews submissions?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <label
              className="card"
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14, cursor: 'pointer',
                border: handlingMode === 'self' ? '1px solid var(--green)' : '1px solid var(--border)',
              }}
            >
              <input type="radio" name="handlingMode" checked={handlingMode === 'self'} onChange={() => setHandlingMode('self')} style={{ marginTop: 3 }} />
              <span>
                <span style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>I'll review submissions myself — 10% commission</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)' }}>
                  Applications and proof land on your dashboard with approve/reject buttons.
                </span>
              </span>
            </label>
            <label
              className="card"
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14, cursor: 'pointer',
                border: handlingMode === 'admin' ? '1px solid var(--green)' : '1px solid var(--border)',
              }}
            >
              <input type="radio" name="handlingMode" checked={handlingMode === 'admin'} onChange={() => setHandlingMode('admin')} style={{ marginTop: 3 }} />
              <span>
                <span style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>Let TaskGrind admin handle it — 13% commission</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)' }}>
                  Testers submit proof straight to our admin for review — nothing to do on your end.
                </span>
              </span>
            </label>
          </div>
        </div>

        {handlingMode === 'admin' && (
          <div className="field">
            <label htmlFor="successExample">What does success look like? (optional screenshot)</label>
            <input id="successExample" type="file" accept="image/*" onChange={handleSuccessImageChange} />
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
              Helps our admin quickly recognize a correct submission when reviewing testers' proof.
            </p>
            {imageError && <p className="error-text" style={{ fontSize: 12, marginTop: 4 }}>{imageError}</p>}
            {successExampleImage && (
              <img src={successExampleImage} alt="Success example preview" style={{ marginTop: 10, maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid var(--border)' }} />
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="reward">{labels.rewardLabel}</label>
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
            <label htmlFor="slotsTotal">{labels.slotsLabel}</label>
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

                <QuestionBuilder
                  questions={questions}
                  setQuestions={setQuestions}
                  allowQualifying
                  autoMode={screeningMode === 'auto'}
                />

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

        {campaignType === 'testing' && (
          <div style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>Extended testing (optional)</p>
            <div className="field">
              <label htmlFor="durationDays">Duration (days) — leave blank for a normal one-time task</label>
              <input
                id="durationDays"
                type="number"
                min="1"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="e.g. 14"
              />
              {Number(durationDays) >= 14 && (
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
                  Google requires 12 continuously-active testers for Play Store closed testing approval — consider opening a few extra slots to buffer against dropout.
                </p>
              )}
            </div>

            {Number(durationDays) > 0 && (
              <>
                <div className="card" style={{ background: 'rgba(217,164,65,0.1)', border: '1px solid var(--amber)', padding: 14, marginBottom: 12 }}>
                  <p style={{ fontSize: 13, color: 'var(--amber)' }}>
                    Payment only happens after the tester completes the full {durationDays} day{Number(durationDays) === 1 ? '' : 's'} and submits final proof — no partial payment for partial completion. This is shown to testers before they start.
                  </p>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={requiresGmailAccess}
                    onChange={(e) => setRequiresGmailAccess(e.target.checked)}
                  />
                  Require Gmail for closed beta invite (e.g. Play Store closed testing)
                </label>
                {requiresGmailAccess && (
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
                    Testers submit their Gmail before starting. You approve or reject each one — approving starts their countdown, rejecting removes the task from their list. You're responsible for actually adding approved emails as testers on your end (Play Console, TestFlight, etc.) — TaskGrind can't do that part for you.
                  </p>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={requiresDailyReport}
                    onChange={(e) => {
                      setRequiresDailyReport(e.target.checked);
                      if (e.target.checked && dailyReportQuestions.length === 0) {
                        setDailyReportQuestions([newQuestion()]);
                      }
                    }}
                  />
                  Require a written daily report (otherwise testers just get a daily one-tap check-in)
                </label>

                {requiresDailyReport && (
                  <>
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
                      Keep it to 2–3 questions — the more you ask daily, the more testers drop off over {durationDays} days.
                    </p>
                    <QuestionBuilder
                      questions={dailyReportQuestions}
                      setQuestions={setDailyReportQuestions}
                      allowQualifying={false}
                      autoMode={false}
                    />
                    <button
                      type="button"
                      onClick={() => setDailyReportQuestions((qs) => [...qs, newQuestion()])}
                      className="btn"
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', width: '100%' }}
                    >
                      + Add another daily question
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {reward && slotsTotal && Number(reward) > 0 && Number(slotsTotal) > 0 && (() => {
          const rate = COMMISSION_RATES[handlingMode];
          const base = Number(reward) * Number(slotsTotal);
          return (
            <div className="card" style={{ background: 'var(--bg)', marginTop: 8, marginBottom: 16, padding: 16 }}>
              <div className="mono" style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Tester budget ({slotsTotal} × ${Number(reward).toFixed(2)})</span>
                <span>${base.toFixed(2)}</span>
              </div>
              <div className="mono" style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span>Platform commission ({Math.round(rate * 100)}%)</span>
                <span>${(base * rate).toFixed(2)}</span>
              </div>
              <div className="mono" style={{ fontSize: 15, color: 'var(--green)', display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <span>Total charged at launch</span>
                <span>${(base * (1 + rate)).toFixed(2)}</span>
              </div>
            </div>
          );
        })()}

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
