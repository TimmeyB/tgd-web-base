export default function TermsPage() {
  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: 48, paddingBottom: 80 }}>
      <a href="/" className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}>← Back</a>
      <p className="eyebrow" style={{ marginTop: 16 }}>Legal</p>
      <h1 style={{ fontSize: 26, marginTop: 4, marginBottom: 24 }}>Terms of Service</h1>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>Last updated: {new Date().toLocaleDateString()}</p>

      <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-dim)' }}>
        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>1. What TaskGrind is</h3>
        <p>TaskGrind connects brands with real, screened testers for beta testing, feedback, engagement, upvotes, and survey campaigns. Brands create campaigns and pay for completed work; testers complete tasks and get paid for approved submissions.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>2. Accounts</h3>
        <p>You're responsible for keeping your login credentials and any API keys secure. You're responsible for activity that happens through your account, including campaigns created through an API key or connected third-party tool.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>3. Payments</h3>
        <p>Campaign costs (reward × testers, plus a commission) are charged in advance, either via direct payment or from a pre-loaded wallet balance. Subscription fees renew monthly. Commission rates depend on how your campaign is handled (self-reviewed, admin-reviewed, or created via API) and are shown before you pay.</p>
        <p>Payments are non-refundable once a campaign goes live and testers begin work, except where required by law or at TaskGrind's discretion.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>4. Acceptable use</h3>
        <p>Don't use TaskGrind for anything illegal, to collect data you don't have a right to collect, or to harass, deceive, or harm testers or other brands. TaskGrind can remove campaigns or suspend accounts that violate this.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>5. Testers</h3>
        <p>Testers are independent participants, not employees or contractors of TaskGrind or any brand. Payment to testers depends on submitting genuine proof of completed work and passing review.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>6. No guarantees</h3>
        <p>TaskGrind provides the platform as-is. We don't guarantee any specific outcome from a campaign, the availability of testers, or that the service will be uninterrupted or error-free.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>7. Limitation of liability</h3>
        <p>To the extent permitted by law, TaskGrind isn't liable for indirect, incidental, or consequential damages arising from your use of the platform.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>8. Changes</h3>
        <p>These terms may be updated as TaskGrind evolves. Continued use after a change means you accept the updated terms.</p>

        <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>9. Contact</h3>
        <p>Questions about these terms: reach out via the support contact listed on the dashboard.</p>

      
      </div>
    </div>
  );
}
