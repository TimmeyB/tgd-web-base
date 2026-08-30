import { verifyTransaction } from '@/lib/paystack';
import { query } from '@/lib/db';

const DESTINATIONS = {
  subscription: { label: 'billing', href: '/dashboard/billing' },
  campaign_payment: { label: 'dashboard', href: '/dashboard' },
  campaign_edit: { label: 'dashboard', href: '/dashboard' },
};

export default async function PaymentCallbackPage({ searchParams }) {
  const reference = searchParams?.reference || searchParams?.trxref;

  if (!reference) {
    return (
      <div className="container" style={{ maxWidth: 480, paddingTop: 80, textAlign: 'center' }}>
        <p>No payment reference found.</p>
        <a href="/dashboard" className="btn btn-primary" style={{ display: 'inline-block', marginTop: 16, textDecoration: 'none' }}>
          Go to dashboard
        </a>
      </div>
    );
  }

  let status = 'unknown';
  let purpose = 'campaign_payment';
  let metadata = {};
  try {
    const tx = await verifyTransaction(reference);
    status = tx.status; // 'success' | 'failed' | 'abandoned'
    purpose = tx.metadata?.purpose || purpose;
    metadata = tx.metadata || {};
  } catch (err) {
    status = 'unknown';
  }

  const dest = DESTINATIONS[purpose] || DESTINATIONS.campaign_payment;

  // For a campaign launch specifically, tell them plainly whether it's
  // live right now or waiting on a quick admin look first — without this,
  // there's no signal the campaign is doing anything at all.
  let campaignLiveNote = null;
  if (purpose === 'campaign_payment' && status === 'success' && metadata.campaignId) {
    try {
      const result = await query('SELECT status, handling_mode FROM campaigns WHERE id = $1', [metadata.campaignId]);
      const campaign = result.rows[0];
      if (campaign?.status === 'open') {
        campaignLiveNote = "🟢 Your campaign is live now — testers on Telegram can see and claim it within about 2 minutes.";
      } else if (campaign?.status === 'pending_review') {
        campaignLiveNote = "Your campaign is paid and queued for a quick admin check on Telegram — it goes live to testers right after that, usually fast.";
      }
    } catch (err) {
      // Non-critical — skip the note if this lookup fails for any reason.
    }
  }

  return (
    <div className="container" style={{ maxWidth: 480, paddingTop: 80, textAlign: 'center' }}>
      {status === 'success' && (
        <>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Payment successful</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>
            This can take a few seconds to fully apply — refresh your {dest.label} if it doesn't show up right away.
          </p>
          {campaignLiveNote && (
            <div className="card" style={{ background: 'rgba(62,207,142,0.12)', border: '1px solid var(--green)', padding: 16, marginBottom: 24, textAlign: 'left' }}>
              <p style={{ fontSize: 13, color: 'var(--green)' }}>{campaignLiveNote}</p>
            </div>
          )}
        </>
      )}
      {status !== 'success' && (
        <>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Payment not confirmed</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>
            We couldn't confirm this payment went through. If you were charged, contact support before trying again.
          </p>
        </>
      )}
      <a href={dest.href} className="btn btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
        Go to {dest.label}
      </a>
    </div>
  );
}
