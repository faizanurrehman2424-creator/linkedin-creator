'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Linkedin, ChevronRight, ChevronLeft, Loader2,
  CheckCircle, Sparkles, User, Layers
} from 'lucide-react';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [headline, setHeadline] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('professional');
  const [pillars, setPillars] = useState(['Industry Insights', 'Professional Growth', 'Thought Leadership']);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scraped, setScraped] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleScrape = async () => {
    if (!linkedinUrl.trim()) return;
    setScraping(true);
    try {
      const res = await fetch('/api/apify/scrape-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl }),
      });

      const data = await res.json();
      if (res.ok && data.profile) {
        if (data.profile.headline) setHeadline(data.profile.headline);
        if (data.profile.target_audience) setTargetAudience(data.profile.target_audience);
        if (data.profile.core_pillars) setPillars(data.profile.core_pillars);
        setScraped(true);
      }
    } catch (err) {
      console.error('Scrape error:', err);
    } finally {
      setScraping(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({
          headline,
          target_audience: targetAudience,
          tone_of_voice: toneOfVoice,
          core_pillars: pillars.filter(p => p.trim()),
          linkedin_connected: !!linkedinUrl.trim(),
        })
        .eq('id', user.id);

      router.push('/ideas');
      router.refresh();
    } catch (err) {
      console.error('Onboarding save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="glass-card onboarding-card">
        {/* Progress */}
        <div className="progress-bar">
          {[1, 2, 3].map(s => (
            <div key={s} className={`progress-step ${step >= s ? 'active' : ''}`}>
              <div className="step-dot">{step > s ? <CheckCircle size={16} /> : s}</div>
              <span className="step-label">
                {s === 1 ? 'LinkedIn' : s === 2 ? 'Context' : 'Pillars'}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: LinkedIn */}
        {step === 1 && (
          <div className="step-content">
            <div className="step-icon linkedin-icon"><Linkedin size={28} /></div>
            <h2>Connect Your LinkedIn</h2>
            <p className="text-muted">
              Provide your LinkedIn profile URL so we can personalize your content generation.
            </p>

            <div className="form-group">
              <label>LinkedIn Profile URL</label>
              <input
                type="url"
                className="input-field"
                placeholder="https://linkedin.com/in/your-profile"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>

            <button
              className="btn-secondary flex-center"
              onClick={handleScrape}
              disabled={scraping || !linkedinUrl.trim()}
              style={{ width: '100%' }}
            >
              {scraping ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {scraping ? 'Analyzing Profile...' : 'Auto-Fill from LinkedIn'}
            </button>
            {scraped && <div className="alert success"><CheckCircle size={14} /> Profile data imported successfully.</div>}

            <p className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center' }}>
              You can also skip this step and enter your information manually.
            </p>
          </div>
        )}

        {/* Step 2: Context */}
        {step === 2 && (
          <div className="step-content">
            <div className="step-icon context-icon"><User size={28} /></div>
            <h2>Tell Us About Yourself</h2>
            <p className="text-muted">
              This context helps generate relevant, high-quality LinkedIn post ideas tailored to you.
            </p>

            <div className="form-group">
              <label>Professional Headline</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Senior Recruiter at TechCorp | HR Innovation"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Target Audience</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Tech professionals, HR leaders, job seekers"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Tone of Voice</label>
              <select
                className="input-field"
                value={toneOfVoice}
                onChange={(e) => setToneOfVoice(e.target.value)}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual and Conversational</option>
                <option value="authoritative">Authoritative and Expert</option>
                <option value="inspirational">Inspirational and Motivational</option>
                <option value="educational">Educational and Informative</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Pillars */}
        {step === 3 && (
          <div className="step-content">
            <div className="step-icon pillars-icon"><Layers size={28} /></div>
            <h2>Content Pillars</h2>
            <p className="text-muted">
              Choose 3 content pillars for your daily 15 ideas (5 per pillar). You can edit these anytime.
            </p>

            {pillars.map((p, i) => (
              <div key={i} className="form-group">
                <label>Pillar {i + 1}</label>
                <input
                  type="text"
                  className="input-field"
                  value={p}
                  onChange={(e) => {
                    const newPillars = [...pillars];
                    newPillars[i] = e.target.value;
                    setPillars(newPillars);
                  }}
                  placeholder={`Content pillar ${i + 1}`}
                />
              </div>
            ))}

            <div className="recommended-note">
              <strong>Recommended:</strong> Keep all 15 ideas related to your professional context for maximum engagement.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="step-nav">
          {step > 1 && (
            <button className="btn-secondary flex-center" onClick={() => setStep(step - 1)}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <div className="nav-spacer" />
          {step < 3 ? (
            <button className="btn-primary flex-center" onClick={() => setStep(step + 1)}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button className="btn-primary flex-center" onClick={handleComplete} disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
              Complete Setup
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .onboarding-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 80px);
          padding: 2rem;
        }
        .onboarding-card {
          width: 100%;
          max-width: 560px;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .progress-bar {
          display: flex;
          justify-content: center;
          gap: 3rem;
        }
        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
        }
        .step-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 600;
          background: rgba(148, 163, 184, 0.1);
          color: var(--color-text-muted);
          border: 2px solid var(--color-border);
          transition: all 0.3s;
        }
        .progress-step.active .step-dot {
          background: rgba(59, 130, 246, 0.15);
          color: var(--color-brand);
          border-color: var(--color-brand);
        }
        .step-label {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          font-weight: 500;
        }
        .progress-step.active .step-label { color: var(--color-brand); }

        .step-content {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          text-align: center;
        }
        .step-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }
        .linkedin-icon { background: rgba(59, 130, 246, 0.1); color: var(--color-brand); }
        .context-icon { background: rgba(16, 185, 129, 0.1); color: var(--color-success); }
        .pillars-icon { background: rgba(245, 158, 11, 0.1); color: var(--color-warning); }

        .step-content h2 { font-size: 1.35rem; color: var(--color-text-primary); }
        .text-muted { color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.6; }
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; text-align: left; }
        .form-group label { font-size: 0.85rem; font-weight: 500; color: var(--color-text-secondary); }
        .flex-center { display: flex; align-items: center; gap: 0.5rem; justify-content: center; }
        .btn-secondary { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-primary); padding: 0.5rem 1rem; border-radius: var(--radius-md); font-weight: 500; cursor: pointer; }
        .btn-secondary:hover { background: rgba(148, 163, 184, 0.08); }
        .alert { padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; justify-content: center; }
        .alert.success { background: rgba(16, 185, 129, 0.1); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.2); }
        .recommended-note {
          padding: 0.75rem 1rem;
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          text-align: left;
        }

        .step-nav {
          display: flex;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }
        .nav-spacer { flex: 1; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .onboarding-card { padding: 1.5rem; }
          .progress-bar { gap: 1.5rem; }
        }
      `}</style>
    </div>
  );
}
