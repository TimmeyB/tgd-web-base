// Reads NEXT_PUBLIC_SUPPORT_EMAIL — set it in Vercel's Environment
// Variables once you have a support address, then redeploy. Falls back to
// a muted placeholder so nothing breaks if it isn't set yet.
export default function SupportLink() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  if (!email) {
    return (
      <p className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 32 }}>
        Support contact not set up yet.
      </p>
    );
  }

  return (
    <p className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 32 }}>
      Need help? <a href={`mailto:${email}`} style={{ color: 'var(--green)' }}>{email}</a>
    </p>
  );
}
