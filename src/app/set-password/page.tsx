'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Loader2, CheckCircle, ArrowRight } from 'lucide-react';

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set password');

      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="sp-container">
        <div className="glass-card sp-card">
          <h2>Invalid Link</h2>
          <p className="text-muted">This password link is invalid or has expired. Please request a new one.</p>
          <a href="/login" className="btn-primary sp-btn">Go to Login</a>
        </div>
        <style jsx>{`${styles}`}</style>
      </div>
    );
  }

  if (success) {
    return (
      <div className="sp-container">
        <div className="glass-card sp-card">
          <div className="success-icon"><CheckCircle size={32} /></div>
          <h2>Password Set Successfully</h2>
          <p className="text-muted">Redirecting you to the login page...</p>
        </div>
        <style jsx>{`${styles}`}</style>
      </div>
    );
  }

  return (
    <div className="sp-container">
      <div className="glass-card sp-card">
        <div className="sp-header">
          <h2>{type === 'reset' ? 'Reset Your Password' : 'Set Your Password'}</h2>
          <p className="text-muted">
            {type === 'reset' ? 'Enter your new password below.' : 'Welcome! Create a password to activate your account.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="sp-form">
          {error && <div className="alert error">{error}</div>}

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder="New password"
              className="input-field with-icon"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder="Confirm password"
              className="input-field with-icon"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn-primary sp-btn" disabled={loading}>
            {loading ? <Loader2 size={18} className="spin" /> : 'Set Password'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
      <style jsx>{`${styles}`}</style>
    </div>
  );
}

const styles = `
  .sp-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; background: var(--color-bg); }
  .sp-card { width: 100%; max-width: 420px; padding: 2.5rem 2rem; display: flex; flex-direction: column; gap: 2rem; text-align: center; }
  .sp-header { display: flex; flex-direction: column; gap: 0.5rem; }
  .sp-header h2 { font-size: 1.5rem; color: var(--color-text-primary); }
  .text-muted { color: var(--color-text-muted); font-size: 0.875rem; }
  .sp-form { display: flex; flex-direction: column; gap: 1.25rem; }
  .input-group { position: relative; display: flex; align-items: center; }
  .input-icon { position: absolute; left: 1rem; color: var(--color-text-muted); }
  .with-icon { padding-left: 2.75rem; height: 44px; }
  .sp-btn { height: 44px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
  .alert { padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; text-align: center; }
  .error { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.2); }
  .success-icon { color: var(--color-success); margin: 0 auto 0.5rem; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
`;

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Loader2 size={32} className="spin" /></div>}>
      <SetPasswordForm />
    </Suspense>
  );
}
