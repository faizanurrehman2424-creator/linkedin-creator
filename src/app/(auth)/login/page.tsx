'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isReset, setIsReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isReset) {
        const res = await fetch('/api/auth/request-password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to request reset');
        setMessage('If the email exists, a reset request was sent to the admin.');
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (authError) throw authError;
        router.push('/ideas');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="glass-card login-card">
        <div className="login-header">
          <h2>{isReset ? 'Reset Password' : 'Welcome Back'}</h2>
          <p className="text-muted">
            {isReset 
              ? 'Request an admin-approved password reset link.' 
              : 'Sign in to access your AI Content Engine.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="login-form">
          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              placeholder="name@company.com"
              className="input-field with-icon"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {!isReset && (
            <div className="input-group">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                placeholder="••••••••"
                className="input-field with-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? <Loader2 size={18} className="spin" /> : (isReset ? 'Request Reset' : 'Sign In')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="login-footer">
          <button onClick={() => setIsReset(!isReset)} className="text-button text-muted">
            {isReset ? 'Back to sign in' : 'Forgot password?'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 80px);
          padding: 1rem;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 2.5rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .login-header h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: var(--color-text-primary);
        }
        .text-muted {
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }
        .login-form {
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
        .success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .login-footer {
          text-align: center;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }
        .text-button {
          font-size: 0.875rem;
        }
        .text-button:hover {
          color: var(--color-text-primary);
        }
      `}</style>
    </div>
  );
}
