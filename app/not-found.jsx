export default function NotFound() {
  return (
    <>
      <div className="dot-grid-bg" />
      <div className="container" style={{ maxWidth: 480, paddingTop: 100, textAlign: 'center' }}>
        <p className="eyebrow">404</p>
        <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 12 }}>Nothing here</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 28 }}>
          This page doesn't exist, or you don't have access to it.
        </p>
        <a href="/dashboard" className="btn btn-primary">Back to dashboard</a>
      </div>
    </>
  );
}
