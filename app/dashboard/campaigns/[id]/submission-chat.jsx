'use client';

import { useState, useEffect, useRef } from 'react';

export default function SubmissionChat({ submissionId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  async function loadMessages() {
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/messages`);
      const data = await res.json();
      if (res.ok) setMessages(data.messages);
    } catch (err) {
      setError('Could not load messages.');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open) loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/submissions/${submissionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send message.');
        setSending(false);
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      setBody('');
    } catch (err) {
      setError('Could not reach the server.');
    }
    setSending(false);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        className="mono"
        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', padding: 0 }}
      >
        💬 {open ? 'Hide chat' : 'Chat with this tester'}
      </button>

      {open && (
        <div className="card" style={{ marginTop: 10, padding: 14, background: 'var(--bg)' }}>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
            Messages are relayed through the bot — the tester's Telegram identity is never shown to you, and your identity isn't shown to them beyond the campaign name.
          </p>

          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {loading && <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading…</p>}
            {!loading && messages.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>No messages yet — say hi.</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'brand' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  background: m.sender === 'brand' ? 'rgba(62,207,142,0.15)' : 'var(--bg-raised)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '8px 12px',
                }}
              >
                <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>
                  {m.sender === 'brand' ? 'You' : 'Tester'}
                </p>
                <p style={{ fontSize: 13 }}>{m.body}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ask for more detail…"
              style={{
                flex: 1,
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 10px',
                color: 'var(--text)',
                fontSize: 13,
              }}
            />
            <button type="submit" disabled={sending} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
              {sending ? '…' : 'Send'}
            </button>
          </form>
          {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
