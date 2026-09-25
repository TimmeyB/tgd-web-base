'use client';

import { useState } from 'react';

export default function ResendVerificationButton() {
  const [state, setState] = useState('idle'); // idle | sending | sent | error

  async function handleResend() {
    setState('sending');
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (!res.ok) throw new Error();
      setState('sent');
    } catch {
      setState('error');
    }
  }

  if (state === 'sent') {
    return <p style={{ color: 'var(--green)', fontSize: 14 }}>Sent — check your inbox (and spam folder).</p>;
  }

  return (
    <div>
      <button
        onClick={handleResend}
        disabled={state === 'sending'}
        className="btn btn-primary"
        style={{ opacity: state === 'sending' ? 0.6 : 1 }}
      >
        {state === 'sending' ? 'Sending…' : 'Resend verification email'}
      </button>
      {state === 'error' && (
        <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>
          Couldn't send it — try again in a moment.
        </p>
      )}
    </div>
  );
}
