export default function PrivacyPage() {
  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: 48, paddingBottom: 80 }}>
      <a href="/" className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}>← Back</a>
      <p className="eyebrow" style={{ marginTop: 16 }}>Legal</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 24 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>Last updated: {new Date().toLocaleDateString()}</p>

      <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-dim)' }}>
        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>What we collect</h3>
        <p>For brands: company name, email, password (stored hashed, never in plain text), campaign details, and payment records via Paystack. For testers: a Telegram identifier and whatever they submit as part of a task (screening answers, proof, check-in responses).</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>What brands and testers never see about each other</h3>
        <p>Brands never see a tester's Telegram username or ID directly. Testers never see a brand's account details beyond the campaign name. In-app chat between the two is relayed through the bot without exposing either side's contact info.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>Payment data</h3>
        <p>Payments are processed by Paystack. TaskGrind doesn't store card numbers or bank credentials directly — that's handled by Paystack. Bank account details submitted by testers for payout are used only to send them their earnings.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>How data is used</h3>
        <p>To run campaigns, process payments, send account-related emails (password resets, submission alerts, security notices), and keep the platform working correctly and securely.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>Data sharing</h3>
        <p>We don't sell personal data. Data is shared only with the services required to run TaskGrind itself — Paystack for payments, Telegram for the bot, and infrastructure providers hosting the app.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>Your data, your control</h3>
        <p>You can request account deletion or a copy of your data by reaching out via the support contact listed on the dashboard.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>Security</h3>
        <p>Passwords are hashed, API keys are hashed, and login attempts are rate-limited. No system is perfectly secure, but we take reasonable steps to protect account data.</p>

      
      </div>
    </div>
  );
}
