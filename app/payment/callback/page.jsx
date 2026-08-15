import { verifyTransaction } from '@/lib/paystack';

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
  try {
    const tx = await verifyTransaction(reference);
    status = tx.status; // 'success' | 'failed' | 'abandoned'
    purpose = tx.metadata?.purpose || purpose;
  } catch (err) {
    status = 'unknown';
  }

  const dest = DESTINATIONS[purpose] || DESTINATIONS.campaign_payment;

  return (
    <div className="container" style={{ maxWidth: 480, paddingTop: 80, textAlign: 'center' }}>
      {status === 'success' && (
        <>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Payment successful</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>
            This can take a few seconds to fully apply — refresh your {dest.label} if it doesn't show up right away.
          </p>
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
