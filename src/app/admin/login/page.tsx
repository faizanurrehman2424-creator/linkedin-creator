'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, Loader2, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      router.push('/admin/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="glass-card admin-login-card">
        <div className="admin-login-header">
          <div className="admin-icon-wrapper">
            <Shield size={28} />
          </div>
          <h2>Administrator Access</h2>
          <p className="text-muted">
            Enter your admin credentials to access the control panel.
          </p>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          {error && <div className="alert error">{error}</div>}

          <div className="input-group">
            <User size={18} className="input-icon" />
            <input
              type="text"
              placeholder="Admin name or email"
              className="input-field with-icon"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder="Admin password"
              className="input-field with-icon"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? <Loader2 size={18} className="spin" /> : 'Access Control Panel'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/login" className="text-button text-muted">
            Back to user login
          </a>
        </div>
      </div>

      <style jsx>{`
        .admin-login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 1rem;
          background: var(--color-bg);
        }
        .admin-login-card {
          width: 100%;
          max-width: 420px;
          padding: 2.5rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .admin-login-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .admin-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-danger);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }
        .admin-login-header h2 {
          font-size: 1.5rem;
          color: var(--color-text-primary);
        }
        .text-muted {
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }
        .admin-login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 1rem;
          color: var(--color-text-muted);
        }
        .with-icon {
          padding-left: 2.75rem;
          height: 44px;
        }
        .login-btn {
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .alert {
          padding: 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          text-align: center;
        }
        .error {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .admin-login-footer {
          text-align: center;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }
        .text-button {
          font-size: 0.875rem;
          background: none;
          border: none;
          cursor: pointer;
        }
        .text-button:hover {
          color: var(--color-text-primary);
        }
      `}</style>
    </div>
  );
}
