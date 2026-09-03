'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.replace('/admin');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '로그인에 실패했습니다');
    }
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={onSubmit} style={styles.card}>
        <h1 style={styles.title}>SIRIAI Admin</h1>
        <p style={styles.sub}>비밀번호를 입력하세요</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          placeholder="Password"
        />
        {error && <div style={styles.error}>{error}</div>}
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? '확인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0908' },
  card: { width: 320, display: 'flex', flexDirection: 'column', gap: 12, padding: 32, background: '#15130f', border: '1px solid #262019', borderRadius: 12 },
  title: { color: '#f2ede4', fontFamily: 'system-ui, sans-serif', fontSize: 22, margin: 0, fontWeight: 700 },
  sub: { color: '#948e82', fontFamily: 'system-ui, sans-serif', fontSize: 13, margin: '0 0 8px' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #262019', background: '#0a0908', color: '#f2ede4', fontSize: 14 },
  error: { color: '#e08a6b', fontSize: 12, fontFamily: 'system-ui, sans-serif' },
  button: { padding: '10px 12px', borderRadius: 8, border: 'none', background: '#c98a3f', color: '#0a0908', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
};
