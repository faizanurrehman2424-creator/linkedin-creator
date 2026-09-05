'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PostStudioModal } from '@/components/PostStudioModal';
import {
  Loader2, Wand2, Heart, Trash2, RotateCcw,
  ChevronLeft, ChevronRight, Calendar, Filter,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/components/Toast';

const STATUS_TABS = [
  { key: 'fresh', label: 'Fresh Ideas', icon: '/' },
  { key: 'liked', label: 'Liked' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Posted' },
  { key: 'trashed', label: 'Trash' },
];

const PILLAR_COLORS: Record<string, string> = {
  industry_insights: '#3b82f6',
  thought_leadership: '#8b5cf6',
  professional_growth: '#10b981',
  career_development: '#f59e0b',
  innovation: '#ec4899',
  leadership: '#6366f1',
  default: '#64748b',
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('fresh');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const supabase = createClient();
  const toast = useToast();

  useEffect(() => {
    fetchIdeas();
    fetchProfile();
  }, [activeTab, selectedDate]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setUserProfile(data);
    }
  };

  const fetchIdeas = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let query = supabase
      .from('content_ideas')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', activeTab)
      .order('created_at', { ascending: false });

    // For fresh, filter by date
    if (activeTab === 'fresh') {
      query = query.eq('target_date', selectedDate);
    }

    const { data, error } = await query;
    if (!error && data) {
      setIdeas(data);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ideas/generate-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate: selectedDate }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Generated 15 fresh content ideas.');
        fetchIdeas();
      } else {
        toast.error(data.error || 'Generation failed');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Generation service error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (ideaId: string, newStatus: string) => {
    setActionLoading(ideaId);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'trashed') {
        updateData.trashed_at = new Date().toISOString();
      }
      if (newStatus === 'liked') {
        updateData.trashed_at = null;
      }

      const { error } = await supabase
        .from('content_ideas')
        .update(updateData)
        .eq('id', ideaId);

      if (!error) {
        setIdeas(ideas.filter(i => i.id !== ideaId));
        toast.success(newStatus === 'liked' ? 'Saved to Liked Ideas.' : newStatus === 'trashed' ? 'Moved to Trash.' : 'Status updated.');
      } else {
        toast.error('Failed to update status.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (ideaId: string) => {
    setActionLoading(ideaId);
    try {
      const res = await fetch('/api/ideas/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
      });

      if (res.ok) {
        setIdeas(ideas.filter(i => i.id !== ideaId));
        toast.success('Idea restored to active ideas.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Restore failed');
      }
    } catch (e) {
      console.error(e);
      toast.error('Restore failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveFromStudio = async (updatedIdea: any) => {
    const { error } = await supabase
      .from('content_ideas')
      .update({
        hook_options: updatedIdea.hook_options,
        selected_hook_index: updatedIdea.selected_hook_index,
        caption_body: updatedIdea.caption_body,
        hashtags: updatedIdea.hashtags,
        notes: updatedIdea.notes,
        media_url: updatedIdea.media_url,
        media_type: updatedIdea.media_type,
      })
      .eq('id', updatedIdea.id);

    if (!error) {
      setIdeas(ideas.map(i => i.id === updatedIdea.id ? { ...i, ...updatedIdea } : i));
      toast.success('Post changes saved successfully.');
    } else {
      toast.error('Failed to save post changes.');
    }
    setSelectedIdea(null);
  };

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const getPillarColor = (pillar: string) => {
    const key = pillar.toLowerCase().replace(/\s+/g, '_');
    return PILLAR_COLORS[key] || PILLAR_COLORS.default;
  };

  return (
    <div className="ideas-page">
      {/* Status Tabs */}
      <div className="tabs-bar">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === 'fresh' && ideas.length > 0 && activeTab === 'fresh' && (
              <span className="tab-count">{ideas.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Date Navigation (only for Fresh) */}
      {activeTab === 'fresh' && (
        <div className="date-nav">
          <button className="date-nav-btn" onClick={() => changeDate(-1)}>
            <ChevronLeft size={18} />
          </button>
          <div className="date-display">
            <Calendar size={16} />
            <span>{isToday ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span className="date-value">{selectedDate}</span>
          </div>
          <button className="date-nav-btn" onClick={() => changeDate(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="page-header">
        <div>
          <h1>{STATUS_TABS.find(t => t.key === activeTab)?.label || 'Ideas'}</h1>
          <p className="text-muted">
            {activeTab === 'fresh' && `Your daily content ideas for ${isToday ? 'today' : selectedDate}.`}
            {activeTab === 'liked' && 'Ideas you saved for later.'}
            {activeTab === 'scheduled' && 'Upcoming scheduled posts.'}
            {activeTab === 'published' && 'Posts published to LinkedIn.'}
            {activeTab === 'trashed' && 'Deleted ideas. Restorable within 24 hours.'}
          </p>
        </div>
        {activeTab === 'fresh' && (
          <button
            className="btn-primary flex-center generate-btn"
            onClick={handleGenerate}
            disabled={generating || (userProfile && !userProfile.can_generate_ideas)}
            title={userProfile && !userProfile.can_generate_ideas ? 'Idea generation disabled by admin' : ''}
          >
            {generating ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}
            {generating ? 'Generating...' : 'Generate 15 Ideas'}
          </button>
        )}
      </div>

      {/* Ideas Grid */}
      {loading || generating ? (
        <div className="ideas-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-card skeleton-card">
              <div className="skeleton" style={{ width: '38%', height: '22px', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ width: '85%', height: '20px', marginBottom: '0.75rem' }} />
              <div className="skeleton" style={{ width: '100%', height: '64px', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ width: '45%', height: '18px' }} />
            </div>
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="empty-state glass-card">
          <Wand2 size={32} />
          <h3>
            {activeTab === 'fresh' ? 'No ideas for this date' : `No ${activeTab} ideas`}
          </h3>
          <p className="text-muted">
            {activeTab === 'fresh' ? 'Click "Generate 15 Ideas" to create your daily content batch.' : 'Items will appear here as you use the platform.'}
          </p>
          {activeTab === 'fresh' && !isToday && (
            <button className="btn-primary flex-center" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
              <ArrowRight size={16} /> Go to Today
            </button>
          )}
        </div>
      ) : (
        <div className="ideas-grid">
          {ideas.map(idea => (
            <div key={idea.id} className="glass-card idea-card">
              <div className="card-header">
                <span className="pillar-tag" style={{ background: `${getPillarColor(idea.pillar)}20`, color: getPillarColor(idea.pillar), borderColor: `${getPillarColor(idea.pillar)}40` }}>
                  {idea.pillar?.replace(/_/g, ' ') || 'General'}
                </span>
                <div className="card-actions">
                  {activeTab === 'fresh' && (
                    <>
                      <button
                        className="action-btn like-btn"
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(idea.id, 'liked'); }}
                        disabled={actionLoading === idea.id}
                        title="Save to Liked"
                      >
                        <Heart size={15} />
                      </button>
                      <button
                        className="action-btn trash-btn"
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(idea.id, 'trashed'); }}
                        disabled={actionLoading === idea.id}
                        title="Move to Trash"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                  {activeTab === 'liked' && (
                    <button
                      className="action-btn trash-btn"
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(idea.id, 'trashed'); }}
                      disabled={actionLoading === idea.id}
                      title="Move to Trash"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  {activeTab === 'trashed' && (
                    <button
                      className="action-btn restore-btn"
                      onClick={(e) => { e.stopPropagation(); handleRestore(idea.id); }}
                      disabled={actionLoading === idea.id}
                      title="Restore"
                    >
                      <RotateCcw size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="card-body" onClick={() => setSelectedIdea(idea)}>
                <h3 className="idea-headline">{idea.headline}</h3>
                <p className="idea-hook">
                  {idea.hook_options?.[idea.selected_hook_index || 0]?.substring(0, 120)}
                  {idea.hook_options?.[idea.selected_hook_index || 0]?.length > 120 ? '...' : ''}
                </p>
              </div>

              <div className="card-footer">
                <div className="tags-preview">
                  {(idea.hashtags || []).slice(0, 3).map((tag: string, i: number) => (
                    <span key={i} className="mini-tag">{tag}</span>
                  ))}
                </div>
                <button className="open-studio-btn" onClick={() => setSelectedIdea(idea)}>
                  Open Studio <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Studio Modal */}
      {selectedIdea && (
        <PostStudioModal
          idea={selectedIdea}
          userProfile={userProfile}
          onClose={() => setSelectedIdea(null)}
          onSave={handleSaveFromStudio}
        />
      )}

      <style jsx>{`
        .ideas-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Tabs */
        .tabs-bar {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }
        .tab-btn {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-lg);
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--color-text-secondary);
          white-space: nowrap;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .tab-btn:hover {
          background: rgba(148, 163, 184, 0.08);
          color: var(--color-text-primary);
        }
        .tab-btn.active {
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-brand);
          font-weight: 600;
        }
        .tab-count {
          background: var(--color-brand);
          color: white;
          font-size: 0.65rem;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          font-weight: 700;
        }

        /* Date Nav */
        .date-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 0.75rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }
        .date-nav-btn {
          padding: 0.4rem;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          transition: 0.2s;
        }
        .date-nav-btn:hover {
          background: rgba(148, 163, 184, 0.1);
          color: var(--color-text-primary);
        }
        .date-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-primary);
          font-weight: 500;
        }
        .date-value {
          color: var(--color-text-muted);
          font-size: 0.8rem;
          font-weight: 400;
        }

        /* Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .page-header h1 {
          font-size: 1.85rem;
          color: var(--color-text-primary);
          margin-bottom: 0.25rem;
        }
        .text-muted { color: var(--color-text-muted); font-size: 0.875rem; }
        .flex-center { display: flex; align-items: center; gap: 0.5rem; justify-content: center; }
        .generate-btn { padding: 0.65rem 1.25rem; }

        /* Loading & Empty */
        .loading-state { display: flex; justify-content: center; padding: 4rem 0; color: var(--color-brand); }
        .empty-state { padding: 4rem 2rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; color: var(--color-text-muted); }
        .empty-state h3 { color: var(--color-text-primary); font-size: 1.1rem; }

        /* Grid */
        .ideas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }
        .idea-card {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .idea-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .pillar-tag {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          text-transform: capitalize;
          border: 1px solid;
        }
        .card-actions {
          display: flex;
          gap: 0.25rem;
        }
        .action-btn {
          padding: 0.35rem;
          border-radius: var(--radius-md);
          color: var(--color-text-muted);
          transition: all 0.2s;
        }
        .action-btn:hover { color: var(--color-text-primary); }
        .like-btn:hover { color: #ec4899; background: rgba(236, 72, 153, 0.1); }
        .trash-btn:hover { color: var(--color-danger); background: rgba(239, 68, 68, 0.1); }
        .restore-btn:hover { color: var(--color-success); background: rgba(16, 185, 129, 0.1); }

        .card-body {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }
        .idea-headline {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--color-text-primary);
          line-height: 1.35;
        }
        .idea-hook {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--color-border);
          padding-top: 0.75rem;
        }
        .tags-preview {
          display: flex;
          gap: 0.3rem;
          flex-wrap: wrap;
        }
        .mini-tag {
          font-size: 0.65rem;
          color: var(--color-brand);
          background: rgba(59, 130, 246, 0.08);
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .open-studio-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.8rem;
          color: var(--color-brand);
          font-weight: 500;
          padding: 0.3rem 0.5rem;
          border-radius: var(--radius-md);
          transition: background 0.2s;
        }
        .open-studio-btn:hover {
          background: rgba(59, 130, 246, 0.08);
        }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .ideas-grid { grid-template-columns: 1fr; }
          .page-header { flex-direction: column; gap: 1rem; }
          .page-header h1 { font-size: 1.5rem; }
          .generate-btn { width: 100%; }
          .tabs-bar { gap: 0.25rem; }
          .tab-btn { padding: 0.4rem 0.75rem; font-size: 0.8rem; }
        }
      `}</style>
    </div>
  );
}
