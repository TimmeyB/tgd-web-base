import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import SubmissionReviewActions from './submission-review-actions';

const STATUS_STYLES = {
  applied: { bg: 'rgba(217,164,65,0.15)', color: 'var(--amber)', label: 'Applied' },
  approved: { bg: 'rgba(62,207,142,0.15)', color: 'var(--green)', label: 'Approved' },
  rejected: { bg: 'rgba(220,80,80,0.15)', color: 'var(--danger)', label: 'Rejected' },
  completed: { bg: 'rgba(62,207,142,0.25)', color: 'var(--green)', label: 'Completed' },
};

export default async function CampaignDetailPage({ params }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const campaignResult = await query(
    'SELECT * FROM campaigns WHERE id = $1 AND brand_id = $2',
    [params.id, session.brandId]
  );
  const campaign = campaignResult.rows[0];
  if (!campaign) notFound();

  const submissionsResult = await query(
    'SELECT * FROM submissions WHERE campaign_id = $1 ORDER BY applied_at DESC',
    [params.id]
  );
  const submissions = submissionsResult.rows;

  const counts = submissions.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    { applied: 0, approved: 0, rejected: 0, completed: 0 }
  );

  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: 48, paddingBottom: 80 }}>
      <a href="/dashboard" style={{ color: 'var(--text-dim)', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}>
        ← Back to dashboard
      </a>
      <p className="eyebrow">{campaign.status}</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 8 }}>{campaign.title}</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 28 }}>{campaign.description}</p>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div className="mono" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', fontSize: 13 }}>
          <span>Reward: <span style={{ color: 'var(--amber)' }}>${campaign.reward}</span></span>
          <span>Slots filled: <span style={{ color: 'var(--green)' }}>{campaign.slots_filled} / {campaign.slots_total}</span></span>
          <span>Applied: {counts.applied}</span>
          <span>Approved: {counts.approved}</span>
          <span>Completed: {counts.completed}</span>
        </div>
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
          {campaign.handling_mode === 'self'
            ? 'You review submissions yourself — approve or reject each one below.'
            : 'TaskGrind admin reviews submissions for this campaign — nothing to do here except watch progress.'}
        </p>
        {campaign.success_example_image && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Success example on file for admin review:</p>
            <img
              src={`/api/campaigns/${campaign.id}/success-image`}
              alt="Success example"
              style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </div>
        )}
      </div>

      {submissions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
            No tester activity yet. This fills in automatically once testers start applying through the bot.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {submissions.map((s) => {
            const style = STATUS_STYLES[s.status] || STATUS_STYLES.applied;
            return (
              <div key={s.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: 14 }}>{s.tester_handle}</span>
                  <span className="mono" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: style.bg, color: style.color }}>
                    {style.label}
                  </span>
                </div>
                {s.screening_answers && (
                  <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-dim)' }}>
                    <p style={{ marginBottom: 6 }}>Screening answers:</p>
                    {Object.entries(s.screening_answers).map(([question, answer]) => (
                      <div key={question} style={{ marginBottom: 8 }}>
                        <p style={{ fontSize: 12, color: 'var(--text)', marginBottom: 4 }}>{question}</p>
                        {answer && typeof answer === 'object' && answer.telegram_file_id ? (
                          <img
                            src={`/api/media/${answer.telegram_file_id}`}
                            alt="Screening answer"
                            style={{ maxWidth: 220, maxHeight: 220, borderRadius: 8, border: '1px solid var(--border)' }}
                          />
                        ) : (
                          <p style={{ fontSize: 12 }}>{String(answer)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {s.proof_text && (
                  <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-dim)' }}>{s.proof_text}</p>
                )}
                {s.proof_url && (
                  s.proof_url.startsWith('http') ? (
                    <a href={s.proof_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: 'var(--green)' }}>
                      View proof →
                    </a>
                  ) : (
                    <img
                      src={`/api/media/${s.proof_url}`}
                      alt="Submitted proof"
                      style={{ marginTop: 10, maxWidth: 260, maxHeight: 260, borderRadius: 8, border: '1px solid var(--border)' }}
                    />
                  )
                )}
                {campaign.handling_mode === 'self' && s.status === 'applied' && (
                  <SubmissionReviewActions submissionId={s.id} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
