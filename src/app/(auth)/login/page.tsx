'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Mail, 
  Lock, 
  User, 
  Loader2, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Share2, 
  Calendar, 
  TrendingUp,
  Shield 
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthContent() {
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get('tab') === 'admin' || searchParams.get('mode') === 'admin') ? 'admin' : 'client';

  const [mode, setMode] = useState<'client' | 'admin' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Interactive Live Showcase State
  const [activeHookIndex, setActiveHookIndex] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (searchParams.get('disabled') === 'true') {
      supabase.auth.signOut().catch(console.error);
      setError('Your account has been disabled by the administrator.');
    }
  }, [searchParams, supabase.auth]);
  
  const showcaseHooks = [
    'Most founders post on LinkedIn to be visible. Top 1% founders post to build pipeline.',
    'I audited 142 viral B2B LinkedIn posts. Every single winner had this exact structure.',
    'Stop writing generic company updates. Here is the 3-part framework that converts lurkers into buyers.'
  ];

  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'reset') {
        const res = await fetch('/api/auth/request-password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to request reset');
        setMessage('Password reset request submitted. The administrator will review and issue your link.');
      } else if (mode === 'admin') {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: adminIdentifier, password: adminPassword }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid administrator credentials.');

        if (data.token) {
          localStorage.setItem('admin_token', data.token);
        }

        router.push('/admin/dashboard');
        router.refresh();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        router.push('/ideas');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-screen">
      {/* Left: Product Showcase & Interactive Simulator */}
      <div className="showcase-column">
        <div className="showcase-badge">
          <Sparkles size={14} />
          <span>Enterprise LinkedIn Intelligence</span>
        </div>

        <h1 className="showcase-title">
          Scale your authority on LinkedIn with precision.
        </h1>

        <p className="showcase-subtitle">
          Generate high-signal post concepts grounded in your actual voice, preview pixel-perfect formatting, and publish directly to LinkedIn.
        </p>

        {/* Live Interactive Post Simulator Card */}
        <div className="glass-card preview-card">
          <div className="preview-card-header">
            <div className="author-avatar">AR</div>
            <div className="author-meta">
              <div className="author-name-row">
                <span className="author-name">Alex Rivera</span>
                <span className="author-dot">·</span>
                <span className="author-degree">1st</span>
              </div>
              <p className="author-headline">Founder @ ApexScale | B2B Growth Architect</p>
              <div className="author-time">Just now · LinkedIn AI Engine</div>
            </div>
          </div>

          <div className="preview-body">
            {/* Realtime Hook Switcher Indicator */}
            <div className="preview-hook-switch-bar">
              <span className="hook-switch-label">Live Hook Switcher:</span>
              <div className="hook-buttons-group">
                {showcaseHooks.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`hook-switch-pill ${activeHookIndex === i ? 'active' : ''}`}
                    onClick={() => setActiveHookIndex(i)}
                  >
                    Variant {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Hook Text */}
            <p className="preview-hook-text">
              {showcaseHooks[activeHookIndex]}
            </p>

            <p className="preview-body-text">
              When we onboard executive clients, the biggest bottleneck is never ideas. It is consistency and positioning.
            </p>

            <div className="preview-framework-box">
              <div className="framework-line">1. Hook with counter-intuitive data</div>
              <div className="framework-line">2. Deliver 1 concrete operational breakdown</div>
              <div className="framework-line">3. Conclude with a tactical discussion prompt</div>
            </div>

            <p className="preview-tags">#B2BMarketing #Leadership #GrowthStrategy</p>
          </div>

          <div className="preview-footer">
            <div className="metric-pill">
              <TrendingUp size={13} />
              <span>4.8x Expected Reach</span>
            </div>
            <div className="metric-pill">
              <Share2 size={13} />
              <span>1-Click Direct Publish</span>
            </div>
            <div className="metric-pill">
              <Calendar size={13} />
              <span>Automated Schedule</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Glassmorphic Auth Form */}
      <div className="form-column">
        <div className="glass-card auth-card">
          <div className="auth-header-copy">
            <h2>
              {mode === 'reset' 
                ? 'Request Password Reset' 
                : 'Client Workspace Login'}
            </h2>
            <p className="text-muted">
              {mode === 'reset'
                ? 'Enter your registered email to request access.'
                : 'Sign in with your email to access your content engine and schedule.'}
            </p>
          </div>

          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <form onSubmit={handleAuth} className="auth-form">
            {mode === 'reset' ? (
              <>
                <div className="field-block">
                  <label>Registered Work Email</label>
                  <div className="input-wrap">
                    <Mail size={17} className="input-icon" />
                    <input
                      type="email"
                      placeholder="name@company.com"
                      className="input-field with-icon"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    'Submit Reset Request'
                  )}
                  {!loading && <ArrowRight size={17} />}
                </button>
              </>
            ) : (
              <>
                <div className="field-block">
                  <label>Work Email</label>
                  <div className="input-wrap">
                    <Mail size={17} className="input-icon" />
                    <input
                      type="email"
                      placeholder="name@company.com"
                      className="input-field with-icon"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field-block">
                  <div className="field-label-row">
                    <label>Password</label>
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => { setMode('reset'); setError(''); setMessage(''); }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="input-wrap">
                    <Lock size={17} className="input-icon" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      className="input-field with-icon"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    'Sign In to Workspace'
                  )}
                  {!loading && <ArrowRight size={17} />}
                </button>

                <div className="client-access-notice">
                  <span>Private SaaS Workspace. Client accounts are provisioned and managed by your administrator.</span>
                </div>
              </>
            )}
          </form>

          {mode === 'reset' && (
            <div className="auth-card-footer">
              <button
                type="button"
                className="inline-link"
                onClick={() => { setMode('client'); setError(''); setMessage(''); }}
              >
                Back to Client Sign In
              </button>
            </div>
          )}

          <div className="auth-card-footnote">
            <CheckCircle2 size={15} className="footnote-icon" />
            <span>Encrypted with Supabase Row Level Security</span>
            <span className="footnote-dot">·</span>
            <Link href="/admin/login" className="footnote-admin-link">
              Admin Access
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .showcase-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .showcase-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: var(--color-brand-light);
          border: 1px solid var(--color-brand-border);
          color: var(--color-brand);
          padding: 0.3rem 0.85rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          width: fit-content;
        }
        .showcase-title {
          font-size: 2.65rem;
          line-height: 1.15;
          letter-spacing: -0.035em;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .showcase-subtitle {
          font-size: 1.05rem;
          color: var(--color-text-secondary);
          line-height: 1.6;
          max-width: 52ch;
        }
        .preview-card {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          border-radius: var(--radius-xl);
          background: var(--color-surface);
        }
        .preview-card-header {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
        }
        .author-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--color-brand);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.95rem;
          flex-shrink: 0;
        }
        .author-meta {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .author-name-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .author-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--color-text-primary);
        }
        .author-dot {
          color: var(--color-text-muted);
        }
        .author-badge {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .author-headline {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }
        .author-time {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .preview-content {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .preview-hook {
          font-weight: 600;
          color: var(--color-text-primary);
          font-size: 0.95rem;
          line-height: 1.45;
          padding-left: 0.75rem;
          border-left: 3px solid var(--color-brand);
        }
        .preview-body {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          line-height: 1.55;
        }
        .preview-tags {
          display: flex;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--color-brand);
          font-weight: 500;
        }
        .hook-switcher {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: rgba(148, 163, 184, 0.06);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .hook-label {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .hook-pills {
          display: flex;
          gap: 0.4rem;
        }
        .hook-pill {
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          transition: all 0.15s;
        }
        .hook-pill:hover {
          border-color: var(--color-brand);
          color: var(--color-brand);
        }
        .hook-pill.active {
          background: var(--color-brand);
          color: #ffffff;
          border-color: var(--color-brand);
        }
        .preview-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.85rem;
          border-top: 1px solid var(--color-border);
        }
        .preview-metric {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: var(--color-text-muted);
          font-family: var(--font-mono);
        }

        /* Form Column */
        .form-column {
          display: flex;
          justify-content: center;
        }
        .auth-card {
          width: 100%;
          max-width: 440px;
          padding: 2.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: rgba(148, 163, 184, 0.08);
          padding: 0.25rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }
        .auth-tab {
          padding: 0.5rem;
          text-align: center;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          border-radius: var(--radius-sm);
          transition: all 0.18s;
        }
        .auth-tab.active {
          background: var(--color-surface-elevated);
          color: var(--color-text-primary);
          box-shadow: var(--shadow-sm);
        }
        .auth-header-copy h2 {
          font-size: 1.4rem;
          letter-spacing: -0.02em;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        .auth-header-copy p {
          font-size: 0.875rem;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }
        .field-block {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .field-block label {
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .field-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .inline-link {
          font-size: 0.8rem;
          color: var(--color-brand);
          font-weight: 500;
        }
        .inline-link:hover {
          text-decoration: underline;
        }
        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 0.85rem;
          color: var(--color-text-muted);
          pointer-events: none;
        }
        .with-icon {
          padding-left: 2.6rem;
          height: 44px;
        }
        .auth-submit-btn {
          height: 46px;
          margin-top: 0.5rem;
          font-size: 0.925rem;
        }
        .auth-card-footer {
          text-align: center;
          padding-top: 0.5rem;
        }
        .auth-card-footnote {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          font-size: 0.775rem;
          color: var(--color-text-muted);
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }
        .footnote-icon {
          color: var(--color-success);
        }
        .footnote-dot {
          color: var(--color-text-muted);
          opacity: 0.5;
        }
        .footnote-admin-link {
          color: var(--color-brand);
          text-decoration: none;
          font-weight: 500;
        }
        .footnote-admin-link:hover {
          text-decoration: underline;
        }
        .client-access-notice {
          padding: 0.65rem 0.85rem;
          background: rgba(148, 163, 184, 0.05);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 0.775rem;
          color: var(--color-text-muted);
          line-height: 1.45;
          text-align: center;
        }

        @media (max-width: 960px) {
          .showcase-title { font-size: 2rem; }
          .preview-footer { display: none; }
        }
      `}</style>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex-center" style={{ minHeight: '80dvh' }}>
        <Loader2 className="spin" size={32} style={{ color: 'var(--color-brand)' }} />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
