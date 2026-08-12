'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--text-dim)',
        borderRadius: 8,
        padding: '10px 16px',
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      Log out
    </button>
  );
}
