'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
      if (!res.ok) throw new Error(data.error || 'Authentication failed. Invalid admin credentials.');

      if (data.token) {
        localStorage.setItem('admin_token', data.token);
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Admin authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-glow-orb" />
      
      <div className="glass-card admin-auth-card">
        <div className="admin-card-header">
          <div className="admin-badge-icon">
            <Shield size={26} />
          </div>
          <h2>Administrator Portal</h2>
          <p className="text-muted">
            Sign in with master administrator credentials to access the management control center.
          </p>
        </div>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleLogin} className="admin-form">
          <div className="field-block">
            <label>Admin Username or Email</label>
            <div className="input-wrap">
              <User size={17} className="input-icon" />
              <input
                type="text"
                placeholder="e.g. faizan or admin@company.com"
                className="input-field with-icon"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="field-block">
            <label>Master Password</label>
            <div className="input-wrap">
              <Lock size={17} className="input-icon" />
              <input
                type="password"
                placeholder="••••••••••••"
                className="input-field with-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? (
              <Loader2 size={18} className="spin" />
            ) : (
              'Access Control Center'
            )}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <div className="admin-card-footer">
          <Link href="/login" className="back-link">
            <ArrowLeft size={15} />
            <span>Return to Candidate Login</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .admin-login-wrapper {
          min-height: calc(100vh - 70px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          position: relative;
          overflow: hidden;
        }
        .admin-glow-orb {
          position: absolute;
          width: 480px;
          height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0) 70%);
          top: 20%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .admin-auth-card {
          width: 100%;
          max-width: 440px;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
          z-index: 10;
          animation: fadeInUp 0.4s ease-out;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .admin-card-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .admin-badge-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.12);
          border: 1px solid var(--color-brand-border);
          color: var(--color-brand);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }
        .admin-card-header h2 {
          font-size: 1.5rem;
          letter-spacing: -0.025em;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .admin-card-header p {
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .admin-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .field-block {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .field-block label {
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 0.95rem;
          color: var(--color-text-muted);
          pointer-events: none;
        }
        .with-icon {
          padding-left: 2.65rem;
          height: 44px;
        }
        .auth-submit-btn {
          height: 46px;
          margin-top: 0.5rem;
          font-size: 0.925rem;
        }
        .admin-card-footer {
          text-align: center;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.825rem;
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: var(--color-brand);
        }
      `}</style>
    </div>
  );
}
