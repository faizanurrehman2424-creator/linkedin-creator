'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Shield, 
  Sparkles, 
  Clock, 
  Layers, 
  Linkedin, 
  CheckCircle2, 
  ArrowUpRight,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';

interface ProfileData {
  id?: string;
  email?: string;
  role?: string;
  full_name?: string;
  timezone?: string;
  headline?: string;
  target_audience?: string;
  tone_of_voice?: string;
  core_pillars?: string[];
  can_generate_ideas?: boolean;
  can_generate_images?: boolean;
  can_generate_videos?: boolean;
  linkedin_connected?: boolean;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const toast = useToast();
  const supabase = createClient();

  useEffect(() => {
    loadUserData();
  }, []);

  async function getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (e) {
      // Ignore
    }
    return headers;
  }

  async function loadUserData() {
    setLoading(true);
    setErrorMessage('');
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/profile', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          return;
        }
      }

      // Fallback if unauthenticated/demo state
      setProfile({
        email: 'creator@example.com',
        role: 'creator',
        full_name: 'Creator',
        timezone: 'Asia/Karachi',
        can_generate_ideas: true,
        can_generate_images: true,
        can_generate_videos: true,
        headline: '',
        target_audience: '',
        tone_of_voice: 'professional',
        core_pillars: ['', '', ''],
      });
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setErrorMessage('Could not load profile settings. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent, type: 'profile' | 'context' = 'profile') => {
    e.preventDefault();
    if (!profile) return;

    if (type === 'profile') {
      setSavingProfile(true);
    } else {
      setSavingContext(true);
    }
    setSaveSuccess('');
    setErrorMessage('');

    try {
      // Ensure core_pillars is an array of non-empty strings or empty
      const pillars = (profile.core_pillars || []).map(p => p.trim()).filter(Boolean);

      const headers = await getHeaders();
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          full_name: profile.full_name,
          timezone: profile.timezone,
          headline: profile.headline,
          target_audience: profile.target_audience,
          tone_of_voice: profile.tone_of_voice,
          core_pillars: pillars,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      if (data.profile) {
        setProfile(data.profile);
      }

      const msg = type === 'profile' ? 'Profile details updated.' : 'Content context updated.';
      setSaveSuccess(msg);
      toast.success(msg);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      const errMsg = err.message || 'Failed to save settings. Please try again.';
      setErrorMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setSavingProfile(false);
      setSavingContext(false);
    }
  };

  const getPillarValue = (index: number) => {
    return profile?.core_pillars?.[index] || '';
  };

  const handlePillarChange = (index: number, val: string) => {
    const current = [...(profile?.core_pillars || ['', '', ''])];
    // Ensure array has at least 3 items
    while (current.length < 3) {
      current.push('');
    }
    current[index] = val;
    setProfile(prev => prev ? { ...prev, core_pillars: current } : null);
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="skeleton" style={{ width: '280px', height: '36px', marginBottom: '0.5rem' }} />
        <div className="skeleton" style={{ width: '420px', height: '18px', marginBottom: '2rem' }} />
        <div className="settings-grid">
          <div className="glass-card skeleton" style={{ height: '380px' }} />
          <div className="glass-card skeleton" style={{ height: '380px' }} />
          <div className="glass-card skeleton" style={{ height: '280px' }} />
          <div className="glass-card skeleton" style={{ height: '280px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>Account & Engine Settings</h1>
          <p className="text-muted">Configure profile preferences, AI parameters, and platform permissions.</p>
        </div>
        {profile?.role === 'admin' && (
          <Link href="/admin/dashboard" className="btn-primary flex-center">
            <Shield size={16} /> Admin Dashboard
          </Link>
        )}
      </div>

      {saveSuccess && (
        <div className="alert success">
          <CheckCircle2 size={18} /> {saveSuccess}
        </div>
      )}

      {errorMessage && (
        <div className="alert error">
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

      <div className="settings-grid">
        {/* Profile Card */}
        <div className="glass-card section-card">
          <div className="card-header">
            <div className="header-icon">
              <User size={20} />
            </div>
            <div>
              <h3>User Profile</h3>
              <p className="text-muted">Account identification and role</p>
            </div>
          </div>

          <form onSubmit={(e) => handleSave(e, 'profile')} className="form-content">
            <div className="form-group">
              <label htmlFor="user-full-name">Full Name</label>
              <input 
                id="user-full-name"
                type="text" 
                className="input-field" 
                value={profile?.full_name || ''} 
                onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-email">Email Address</label>
              <input 
                id="user-email"
                type="email" 
                className="input-field read-only" 
                value={profile?.email || ''} 
                disabled 
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <div className="role-tag-container">
                <span className={`role-badge ${profile?.role || 'creator'}`}>
                  {profile?.role ? profile.role.toUpperCase() : 'CREATOR'}
                </span>
                <span className="role-description text-muted">
                  {profile?.role === 'admin' 
                    ? 'Full permissions to manage users, templates, and system parameters.' 
                    : 'Creator access to AI studio, post generator, and content calendar.'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="user-timezone">Timezone</label>
              <div className="timezone-select-wrapper">
                <Clock size={16} className="field-icon" />
                <input 
                  id="user-timezone"
                  type="text" 
                  className="input-field with-icon" 
                  value={profile?.timezone || 'Asia/Karachi'} 
                  onChange={(e) => setProfile(prev => prev ? { ...prev, timezone: e.target.value } : null)}
                  placeholder="e.g. Asia/Karachi or America/New_York"
                />
              </div>
            </div>

            <button type="submit" className="btn-secondary flex-center save-btn" disabled={savingProfile}>
              {savingProfile ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Content Context Card */}
        <div className="glass-card section-card">
          <div className="card-header">
            <div className="header-icon icon-success">
              <Layers size={20} />
            </div>
            <div>
              <h3>Content Context</h3>
              <p className="text-muted">This context personalizes your daily AI-generated ideas</p>
            </div>
          </div>

          <form onSubmit={(e) => handleSave(e, 'context')} className="form-content">
            <div className="form-group">
              <label htmlFor="context-headline">Professional Headline</label>
              <input
                id="context-headline"
                type="text"
                className="input-field"
                placeholder="e.g. Senior Recruiter at TechCorp | HR Innovation"
                value={profile?.headline || ''}
                onChange={(e) => setProfile(prev => prev ? { ...prev, headline: e.target.value } : null)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="context-audience">Target Audience</label>
              <input
                id="context-audience"
                type="text"
                className="input-field"
                placeholder="e.g. Tech professionals, HR leaders, job seekers"
                value={profile?.target_audience || ''}
                onChange={(e) => setProfile(prev => prev ? { ...prev, target_audience: e.target.value } : null)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="context-tone">Tone of Voice</label>
              <select
                id="context-tone"
                className="input-field"
                value={profile?.tone_of_voice || 'professional'}
                onChange={(e) => setProfile(prev => prev ? { ...prev, tone_of_voice: e.target.value } : null)}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual and Conversational</option>
                <option value="authoritative">Authoritative and Expert</option>
                <option value="inspirational">Inspirational and Motivational</option>
                <option value="educational">Educational and Informative</option>
              </select>
            </div>

            <div className="form-group">
              <label>Content Pillars (3 core themes for daily ideas)</label>
              {[0, 1, 2].map((idx) => (
                <input
                  key={idx}
                  type="text"
                  className="input-field"
                  placeholder={`Pillar ${idx + 1}, e.g. ${idx === 0 ? 'Industry Insights' : idx === 1 ? 'Talent Acquisition' : 'Leadership Tips'}`}
                  value={getPillarValue(idx)}
                  onChange={(e) => handlePillarChange(idx, e.target.value)}
                  style={{ marginTop: idx > 0 ? '0.4rem' : '0' }}
                />
              ))}
            </div>

            <button type="submit" className="btn-secondary flex-center save-btn" disabled={savingContext}>
              {savingContext ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              {savingContext ? 'Saving...' : 'Save Context'}
            </button>
          </form>
        </div>

        {/* Feature Permissions Status */}
        <div className="glass-card section-card">
          <div className="card-header">
            <div className="header-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h3>AI Generation Permissions</h3>
              <p className="text-muted">Account capabilities set by platform administration</p>
            </div>
          </div>

          <div className="permissions-list">
            <div className="permission-item">
              <div>
                <strong>Daily Idea Generation</strong>
                <p className="text-muted">Receive 15 automated LinkedIn ideas every morning.</p>
              </div>
              <span className={`status-pill ${profile?.can_generate_ideas ? 'active' : 'inactive'}`}>
                {profile?.can_generate_ideas ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="permission-item">
              <div>
                <strong>AI Image Generation</strong>
                <p className="text-muted">Create custom 1:1 and 16:9 post visual graphics.</p>
              </div>
              <span className={`status-pill ${profile?.can_generate_images ? 'active' : 'inactive'}`}>
                {profile?.can_generate_images ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="permission-item">
              <div>
                <strong>AI Video Generation</strong>
                <p className="text-muted">Generate AI video clips for LinkedIn engagement.</p>
              </div>
              <span className={`status-pill ${profile?.can_generate_videos ? 'active' : 'inactive'}`}>
                {profile?.can_generate_videos ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {profile?.role === 'admin' ? (
            <div className="admin-notice">
              <p className="text-muted">You are logged in as Admin. You can adjust permissions for any candidate in the Admin Panel.</p>
              <Link href="/admin/dashboard" className="text-link flex-center">
                Open Admin Dashboard <ArrowUpRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="admin-notice">
              <p className="text-muted">These permissions are managed centrally by your administrator.</p>
            </div>
          )}
        </div>

        {/* Social Publishing Connection */}
        <div className="glass-card section-card">
          <div className="card-header">
            <div className="header-icon">
              <Linkedin size={20} />
            </div>
            <div>
              <h3>LinkedIn Integration</h3>
              <p className="text-muted">Publishing and scheduling authentication</p>
            </div>
          </div>

          <div className="integration-content">
            <div className="connection-status">
              <div className={`status-dot ${profile?.linkedin_connected ? 'online' : 'offline'}`} />
              <span>{profile?.linkedin_connected ? 'LinkedIn Account Linked' : 'No LinkedIn Account Linked'}</span>
            </div>
            <p className="text-muted">
              Connect your LinkedIn profile to publish and schedule drafted posts directly from the Content Studio.
            </p>
            <button className="btn-primary flex-center linkedin-connect-btn" disabled>
              <Linkedin size={16} /> {profile?.linkedin_connected ? 'Reconnect Profile' : 'Connect LinkedIn Profile'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          animation: pageFadeIn 0.25s ease-out;
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 0.25rem;
          letter-spacing: -0.02em;
        }
        .text-muted {
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }
        .flex-center {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));
          gap: 1.5rem;
        }
        .section-card {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .section-card:hover {
          border-color: rgba(148, 163, 184, 0.25);
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--color-border);
        }
        .header-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-lg);
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-brand);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .header-icon.icon-success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-success);
        }
        .card-header h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: 0.15rem;
        }
        .form-content {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .read-only {
          opacity: 0.7;
          cursor: not-allowed;
          background: rgba(148, 163, 184, 0.08);
        }
        .role-tag-container {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .role-badge {
          font-size: 0.725rem;
          text-transform: uppercase;
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-md);
          font-weight: 700;
          letter-spacing: 0.06em;
        }
        .role-badge.admin {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .role-badge.creator {
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-brand);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .role-description {
          font-size: 0.8rem;
          line-height: 1.4;
        }
        .timezone-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .field-icon {
          position: absolute;
          left: 0.85rem;
          color: var(--color-text-muted);
          pointer-events: none;
        }
        .with-icon {
          padding-left: 2.35rem;
        }
        .save-btn {
          align-self: flex-start;
          margin-top: 0.5rem;
        }
        .permissions-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .permission-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1rem;
          background: rgba(148, 163, 184, 0.04);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          transition: background 0.15s ease;
        }
        .permission-item:hover {
          background: rgba(148, 163, 184, 0.07);
        }
        .permission-item strong {
          display: block;
          font-size: 0.925rem;
          color: var(--color-text-primary);
          margin-bottom: 0.15rem;
        }
        .status-pill {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
        }
        .status-pill.active {
          background: rgba(16, 185, 129, 0.12);
          color: var(--color-success);
        }
        .status-pill.inactive {
          background: rgba(239, 68, 68, 0.12);
          color: var(--color-danger);
        }
        .admin-notice {
          padding-top: 0.75rem;
          border-top: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .text-link {
          color: var(--color-brand);
          font-size: 0.875rem;
          font-weight: 500;
        }
        .text-link:hover {
          text-decoration: underline;
        }
        .integration-content {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          font-size: 0.9rem;
        }
        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }
        .status-dot.online {
          background: var(--color-success);
        }
        .status-dot.offline {
          background: var(--color-text-muted);
        }
        .linkedin-connect-btn {
          align-self: flex-start;
          opacity: 0.75;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .settings-header { flex-direction: column; }
          .settings-header h1 { font-size: 1.5rem; }
          .settings-grid { grid-template-columns: 1fr; }
          .section-card { padding: 1.25rem; }
          .permission-item { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
          .role-tag-container { flex-direction: column; gap: 0.5rem; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
