'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PostStudioModal } from '@/components/PostStudioModal';
import {
  Loader2, Wand2, Heart, Trash2, RotateCcw,
  ChevronLeft, ChevronRight, Calendar, Filter,
  ArrowRight, SlidersHorizontal, CheckSquare, Square,
  Check, X, Clock, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/components/Toast';

const STATUS_TABS = [
  { key: 'fresh', label: 'Fresh Ideas' },
  { key: 'liked', label: 'Liked' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Posted' },
  { key: 'trashed', label: 'Trash' },
];

const PILLAR_COLORS: Record<string, string> = {
  industry_trends: '#3b82f6',
  recruiter_storytelling: '#8b5cf6',
  educational_frameworks: '#10b981',
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
  const [selectedDate, setSelectedDate] = useState('all');
  const [isDailyGenerating, setIsDailyGenerating] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [masterIdeaGen, setMasterIdeaGen] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Edit Context Modal State
  const [showContextModal, setShowContextModal] = useState(false);
  const [contextHeadline, setContextHeadline] = useState('');
  const [contextTopics, setContextTopics] = useState('');
  const [contextAudience, setContextAudience] = useState('');
  const [contextTone, setContextTone] = useState('professional');
  const [contextPillars, setContextPillars] = useState<string[]>([
    'Industry Trends', 'Recruiter War Stories', 'Educational Frameworks'
  ]);
  const [contextSaving, setContextSaving] = useState(false);
  const hasAttemptedAutoGen = useRef(false);

  const supabase = createClient();
  const toast = useToast();

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {};
    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await new Promise(r => setTimeout(r, 100));
        const retry = await supabase.auth.getSession();
        session = retry.data.session;
      }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (e) {
      console.error('Session retrieval error:', e);
    }
    return headers;
  };

  useEffect(() => {
    fetchIdeas();
    fetchProfile();
    fetchSystemStatus();
    setSelectedIdeaIds([]);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchIdeas();
        fetchProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [activeTab, selectedDate]);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/system-status');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.idea_gen === 'boolean') {
          setMasterIdeaGen(data.idea_gen);
        }
      }
    } catch (e) {
      console.error('System status error:', e);
    }
  };

  const fetchProfile = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/profile', { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const profile = data.profile || data;
        if (profile) {
          setUserProfile(profile);
          setContextHeadline(profile.headline || '');
          setContextAudience(profile.target_audience || '');
          setContextTone(profile.tone_of_voice || 'professional');
          if (profile.core_pillars && profile.core_pillars.length > 0) {
            setContextPillars(profile.core_pillars);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
  };

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ status: activeTab });
      if (activeTab === 'fresh' && selectedDate !== 'all') {
        params.set('targetDate', selectedDate);
      }

      const res = await fetch(`/api/ideas?${params.toString()}`, { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const loadedIdeas = data.ideas || [];
        setIdeas(loadedIdeas);

        // Daily morning generation check: only on fresh tab on first visit of day
        const today = getTodayStr();
        const hasTodayIdeas = loadedIdeas.some((i: any) => i.target_date === today);
        if (activeTab === 'fresh' && !hasTodayIdeas && canGenerate && !hasAttemptedAutoGen.current && userProfile) {
          hasAttemptedAutoGen.current = true;
          triggerDailyMorningGeneration(today);
        }
      } else {
        const err = await res.text();
        console.error('fetchIdeas failed:', err);
        setIdeas([]);
      }
    } catch (e) {
      console.error('fetchIdeas error:', e);
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerDailyMorningGeneration = async (todayDate: string) => {
    if (!masterIdeaGen || (userProfile && userProfile.can_generate_ideas === false)) {
      return;
    }
    setIsDailyGenerating(true);
    try {
      const authHeaders = await getAuthHeaders();
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders };

      const res = await fetch('/api/ideas/generate-daily', {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetDate: todayDate }),
      });

      if (res.ok) {
        toast.success('Your 15 daily LinkedIn ideas for today are ready.');
        const params = new URLSearchParams({ status: activeTab });
        if (selectedDate !== 'all') params.set('targetDate', selectedDate);
        const refetch = await fetch(`/api/ideas?${params.toString()}`, { headers, cache: 'no-store' });
        if (refetch.ok) {
          const d = await refetch.json();
          setIdeas(d.ideas || []);
        }
      }
    } catch (err) {
      console.error('Daily generation error:', err);
    } finally {
      setIsDailyGenerating(false);
    }
  };

  const handleGenerate = async (customDate?: string) => {
    if (!masterIdeaGen) {
      toast.error('Idea generation is disabled system-wide by administrator.');
      return;
    }
    if (userProfile && userProfile.can_generate_ideas === false) {
      toast.error('Idea generation is disabled for your account.');
      return;
    }

    const genDate = customDate && customDate !== 'all' ? customDate : getTodayStr();
    setGenerating(true);
    try {
      const authHeaders = await getAuthHeaders();
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders };

      const res = await fetch('/api/ideas/generate-daily', {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetDate: genDate }),
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
      const authHeaders = await getAuthHeaders();
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders };

      const updates: any = { status: newStatus };
      if (newStatus === 'trashed') updates.trashed_at = new Date().toISOString();
      if (newStatus === 'liked') updates.trashed_at = null;

      const res = await fetch('/api/ideas', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ ideaId, updates }),
      });

      if (res.ok) {
        setIdeas(ideas.filter(i => i.id !== ideaId));
        setSelectedIdeaIds(prev => prev.filter(id => id !== ideaId));
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
        setSelectedIdeaIds(prev => prev.filter(id => id !== ideaId));
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

  const handlePermanentDelete = async (ideaId: string) => {
    setActionLoading(ideaId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/ideas?ideaId=${ideaId}`, { method: 'DELETE', headers });
      if (res.ok) {
        setIdeas(ideas.filter(i => i.id !== ideaId));
        setSelectedIdeaIds(prev => prev.filter(id => id !== ideaId));
        toast.success('Idea permanently deleted.');
      } else {
        toast.error('Failed to permanently delete idea.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Delete failed.');
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk operations
  const toggleSelectIdea = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIdeaIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIdeaIds.length === ideas.length) {
      setSelectedIdeaIds([]);
    } else {
      setSelectedIdeaIds(ideas.map(i => i.id));
    }
  };

  const bulkPatch = async (updates: any) => {
    const authHeaders = await getAuthHeaders();
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders };
    // Send each update sequentially (or we can batch via a dedicated endpoint later)
    const results = await Promise.all(
      selectedIdeaIds.map(ideaId =>
        fetch('/api/ideas', { method: 'PATCH', headers, body: JSON.stringify({ ideaId, updates }) })
      )
    );
    return results.every(r => r.ok);
  };

  const handleBulkTrash = async () => {
    if (selectedIdeaIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const ok = await bulkPatch({ status: 'trashed', trashed_at: new Date().toISOString() });
      if (ok) {
        setIdeas(ideas.filter(i => !selectedIdeaIds.includes(i.id)));
        toast.success(`Moved ${selectedIdeaIds.length} ideas to Trash.`);
        setSelectedIdeaIds([]);
      } else {
        toast.error('Failed to move selected ideas to trash.');
      }
    } catch (e) {
      toast.error('Bulk trash failed.');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkLike = async () => {
    if (selectedIdeaIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const ok = await bulkPatch({ status: 'liked', trashed_at: null });
      if (ok) {
        setIdeas(ideas.filter(i => !selectedIdeaIds.includes(i.id)));
        toast.success(`Saved ${selectedIdeaIds.length} ideas to Liked.`);
        setSelectedIdeaIds([]);
      } else {
        toast.error('Failed to like selected ideas.');
      }
    } catch (e) {
      toast.error('Bulk like failed.');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIdeaIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const ok = await bulkPatch({ status: 'fresh', trashed_at: null });
      if (ok) {
        setIdeas(ideas.filter(i => !selectedIdeaIds.includes(i.id)));
        toast.success(`Restored ${selectedIdeaIds.length} ideas.`);
        setSelectedIdeaIds([]);
      } else {
        toast.error('Failed to restore selected ideas.');
      }
    } catch (e) {
      toast.error('Bulk restore failed.');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedIdeaIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/ideas?ideaIds=${selectedIdeaIds.join(',')}`, { method: 'DELETE', headers });
      if (res.ok) {
        setIdeas(ideas.filter(i => !selectedIdeaIds.includes(i.id)));
        toast.success(`Permanently deleted ${selectedIdeaIds.length} ideas.`);
        setSelectedIdeaIds([]);
      } else {
        toast.error('Failed to permanently delete selected ideas.');
      }
    } catch (e) {
      toast.error('Bulk permanent delete failed.');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleSaveContext = async (e: React.FormEvent) => {
    e.preventDefault();
    setContextSaving(true);
    try {
      const combinedAudience = contextTopics.trim()
        ? `${contextAudience.trim()} | Topics: ${contextTopics.trim()}`
        : contextAudience.trim();

      const authHeaders = await getAuthHeaders();
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders };

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          headline: contextHeadline.trim() || null,
          target_audience: combinedAudience || null,
          tone_of_voice: contextTone,
          core_pillars: contextPillars.map(p => p.trim()).filter(Boolean)
        })
      });

      if (res.ok) {
        toast.success('Context and content pillars saved successfully.');
        setShowContextModal(false);
        fetchProfile();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update context');
      }
    } catch (err) {
      toast.error('Error saving context');
    } finally {
      setContextSaving(false);
    }
  };

  const handleHookSelect = (ideaId: string, hookIdx: number) => {
    setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, selected_hook_index: hookIdx } : i));
  };

  const handleSaveFromStudio = async (updatedIdea: any) => {
    try {
      const authHeaders = await getAuthHeaders();
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders };

      const res = await fetch('/api/ideas', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          ideaId: updatedIdea.id,
          updates: {
            hook_options: updatedIdea.hook_options,
            selected_hook_index: updatedIdea.selected_hook_index,
            caption_body: updatedIdea.caption_body,
            hashtags: updatedIdea.hashtags,
            notes: updatedIdea.notes,
            media_url: updatedIdea.media_url,
            media_type: updatedIdea.media_type,
          }
        }),
      });

      if (res.ok) {
        setIdeas(ideas.map(i => i.id === updatedIdea.id ? { ...i, ...updatedIdea } : i));
        toast.success('Post changes saved successfully.');
      } else {
        toast.error('Failed to save post changes.');
      }
    } catch (e) {
      toast.error('Failed to save post changes.');
    }
    setSelectedIdea(null);
  };

  const changeDate = (delta: number) => {
    const base = selectedDate === 'all' ? getTodayStr() : selectedDate;
    const d = new Date(base + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getHoursLeft = (trashedAt: string | null) => {
    if (!trashedAt) return 24;
    const diffHours = (Date.now() - new Date(trashedAt).getTime()) / (1000 * 60 * 60);
    return Math.max(0, Math.round(24 - diffHours));
  };

  const isToday = selectedDate === getTodayStr();

  const getPillarColor = (pillar: string) => {
    const key = pillar.toLowerCase().replace(/\s+/g, '_');
    return PILLAR_COLORS[key] || PILLAR_COLORS.default;
  };

  const canGenerate = masterIdeaGen && (!userProfile || userProfile.can_generate_ideas !== false);

  return (
    <div className="ideas-page">
      {/* Top Header / Bar */}
      <div className="top-action-bar">
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

        <button
          type="button"
          className="btn-context-edit flex-center"
          onClick={() => setShowContextModal(true)}
        >
          <SlidersHorizontal size={15} />
          <span>Edit Context & Pillars</span>
        </button>
      </div>

      {/* Date Navigation & View Mode (only for Fresh) */}
      {activeTab === 'fresh' && (
        <div className="date-filter-container">
          <div className="filter-mode-buttons">
            <button
              type="button"
              className={`mode-btn ${selectedDate === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedDate('all')}
            >
              <span>All Ideas</span>
              <span className="badge-pill">{ideas.length}</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${selectedDate === getTodayStr() ? 'active' : ''}`}
              onClick={() => setSelectedDate(getTodayStr())}
            >
              <span>Today</span>
            </button>
          </div>

          <div className="date-nav">
            <button
              type="button"
              className="date-nav-btn"
              onClick={() => changeDate(-1)}
              title="Previous Day"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="date-display">
              <Calendar size={16} />
              <span>
                {selectedDate === 'all'
                  ? 'All Content History'
                  : selectedDate === getTodayStr()
                  ? 'Today'
                  : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              {selectedDate !== 'all' && <span className="date-value">{selectedDate}</span>}
            </div>
            <button
              type="button"
              className="date-nav-btn"
              onClick={() => changeDate(1)}
              title="Next Day"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="page-header">
        <div>
          <h1>{STATUS_TABS.find(t => t.key === activeTab)?.label || 'Ideas'}</h1>
          <p className="text-muted">
            {activeTab === 'fresh' && (selectedDate === 'all' ? 'Your entire library of fresh LinkedIn ideas.' : `Ideas for ${selectedDate === getTodayStr() ? 'today' : selectedDate}.`)}
            {activeTab === 'liked' && 'Curated ideas saved for future polishing and scheduling.'}
            {activeTab === 'scheduled' && 'Upcoming scheduled LinkedIn posts.'}
            {activeTab === 'published' && 'Posts successfully published to LinkedIn.'}
            {activeTab === 'trashed' && 'Deleted ideas. Restorable for 24 hours before automatic removal.'}
          </p>
        </div>
        {activeTab === 'fresh' && (
          <button
            className="btn-primary flex-center generate-btn"
            onClick={() => handleGenerate(selectedDate !== 'all' ? selectedDate : getTodayStr())}
            disabled={generating || isDailyGenerating || !canGenerate}
            title={!masterIdeaGen ? 'Idea generation disabled system-wide' : userProfile && !userProfile.can_generate_ideas ? 'Idea generation disabled for your account' : ''}
          >
            {generating ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}
            <span>{generating ? 'Generating 15 Ideas...' : 'Generate 15 More Ideas'}</span>
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
            {activeTab === 'fresh' ? 'No ideas generated for this date' : `No ${activeTab} ideas`}
          </h3>
          <p className="text-muted">
            {activeTab === 'fresh'
              ? 'Click "Generate 15 Ideas" to produce your targeted daily batch.'
              : 'Items will appear here as you curate, schedule, and publish posts.'}
          </p>
          {activeTab === 'fresh' && !isToday && (
            <button className="btn-primary flex-center" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
              <ArrowRight size={16} /> Go to Today
            </button>
          )}
        </div>
      ) : (
        <div className="ideas-grid">
          {ideas.map(idea => {
            const isSelected = selectedIdeaIds.includes(idea.id);
            const hoursRemaining = getHoursLeft(idea.trashed_at);

            return (
              <div
                key={idea.id}
                className={`glass-card idea-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="card-header">
                  <div className="header-left">
                    <button
                      type="button"
                      className="select-checkbox"
                      onClick={(e) => toggleSelectIdea(idea.id, e)}
                      title={isSelected ? 'Deselect idea' : 'Select idea'}
                    >
                      {isSelected ? <CheckSquare size={16} className="checked-icon" /> : <Square size={16} />}
                    </button>
                    <span className="pillar-tag" style={{ background: `${getPillarColor(idea.pillar)}18`, color: getPillarColor(idea.pillar), borderColor: `${getPillarColor(idea.pillar)}35` }}>
                      {idea.pillar?.replace(/_/g, ' ') || 'General'}
                    </span>
                    {idea.target_date && (
                      <span className="date-badge">
                        {idea.target_date}
                      </span>
                    )}
                  </div>

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
                      <>
                        <button
                          className="action-btn restore-btn"
                          onClick={(e) => { e.stopPropagation(); handleRestore(idea.id); }}
                          disabled={actionLoading === idea.id}
                          title="Restore to Active Ideas"
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          className="action-btn perm-delete-btn"
                          onClick={(e) => { e.stopPropagation(); handlePermanentDelete(idea.id); }}
                          disabled={actionLoading === idea.id}
                          title="Permanently Delete"
                        >
                          <X size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="card-body" onClick={() => setSelectedIdea(idea)}>
                  {activeTab === 'trashed' && (
                    <div className="trash-expiry-badge">
                      <Clock size={12} />
                      <span>{hoursRemaining}h left to restore</span>
                    </div>
                  )}

                  <h3 className="idea-headline">{idea.headline}</h3>
                  <p className="idea-hook">
                    {idea.hook_options?.[idea.selected_hook_index || 0]?.substring(0, 140)}
                    {idea.hook_options?.[idea.selected_hook_index || 0]?.length > 140 ? '...' : ''}
                  </p>
                  {idea.hook_options && idea.hook_options.length > 1 && (
                    <div className="hook-pill-row" onClick={(e) => e.stopPropagation()}>
                      <span className="hook-pill-label">Hook:</span>
                      {idea.hook_options.map((_: any, idx: number) => (
                        <button
                          key={idx}
                          className={`hook-mini-pill ${(idea.selected_hook_index || 0) === idx ? 'active' : ''}`}
                          onClick={() => handleHookSelect(idea.id, idx)}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
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
            );
          })}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIdeaIds.length > 0 && (
        <div className="bulk-floating-bar glass-card">
          <div className="bulk-left">
            <span className="bulk-count">{selectedIdeaIds.length} selected</span>
            <button className="bulk-text-btn" onClick={toggleSelectAll}>
              {selectedIdeaIds.length === ideas.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="bulk-actions">
            {activeTab !== 'trashed' && (
              <>
                <button
                  className="bulk-btn like flex-center"
                  onClick={handleBulkLike}
                  disabled={bulkProcessing}
                >
                  <Heart size={14} /> Save to Liked
                </button>
                <button
                  className="bulk-btn delete flex-center"
                  onClick={handleBulkTrash}
                  disabled={bulkProcessing}
                >
                  <Trash2 size={14} /> Move to Trash
                </button>
              </>
            )}
            {activeTab === 'trashed' && (
              <>
                <button
                  className="bulk-btn restore flex-center"
                  onClick={handleBulkRestore}
                  disabled={bulkProcessing}
                >
                  <RotateCcw size={14} /> Restore Selected
                </button>
                <button
                  className="bulk-btn perm-delete flex-center"
                  onClick={handleBulkPermanentDelete}
                  disabled={bulkProcessing}
                >
                  <X size={14} /> Permanently Delete
                </button>
              </>
            )}
            <button className="bulk-close-btn" onClick={() => setSelectedIdeaIds([])} title="Cancel Selection">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Daily morning generation full-screen loading overlay */}
      {isDailyGenerating && (
        <div className="daily-modal-overlay">
          <div className="daily-modal-card glass-card">
            <div className="daily-spinner-wrap">
              <Loader2 size={36} className="spin" />
            </div>
            <h2>Generating Today&apos;s 15 LinkedIn Ideas</h2>
            <p className="text-muted">
              Analyzing your profile context and defined pillars to curate 15 high-converting post ideas for today...
            </p>
            <div className="daily-progress-track">
              <div className="daily-progress-bar" />
            </div>
            <span className="daily-notice">Automatic daily generation on your first login of the day.</span>
          </div>
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

      {/* Quick Edit Context & Pillars Modal */}
      {showContextModal && (
        <div className="modal-backdrop">
          <div className="glass-card context-modal-container">
            <div className="modal-header">
              <div>
                <h3>Edit Context & Content Pillars</h3>
                <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>
                  These parameters guide your daily AI idea generation algorithms.
                </p>
              </div>
              <button className="close-btn" onClick={() => setShowContextModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveContext} className="context-modal-form">
              <div className="form-group">
                <label>Professional Headline & Role</label>
                <input
                  type="text"
                  className="input-field"
                  value={contextHeadline}
                  onChange={(e) => setContextHeadline(e.target.value)}
                  placeholder="e.g. VP of Product at ScaleUp"
                />
              </div>

              <div className="form-group">
                <label>Core Topics You Post About</label>
                <input
                  type="text"
                  className="input-field"
                  value={contextTopics}
                  onChange={(e) => setContextTopics(e.target.value)}
                  placeholder="e.g. AI infrastructure, recruitment strategies, engineering leadership"
                />
              </div>

              <div className="form-group">
                <label>Target Audience</label>
                <input
                  type="text"
                  className="input-field"
                  value={contextAudience}
                  onChange={(e) => setContextAudience(e.target.value)}
                  placeholder="e.g. Tech Founders, CTOs, Talent Leaders"
                />
              </div>

              <div className="form-group">
                <label>Tone of Voice</label>
                <select
                  className="input-field"
                  value={contextTone}
                  onChange={(e) => setContextTone(e.target.value)}
                >
                  <option value="professional">Professional & Authoritative</option>
                  <option value="conversational">Conversational & Engaging</option>
                  <option value="inspirational">Inspirational & Visionary</option>
                  <option value="educational">Educational & Analytical</option>
                  <option value="bold">Bold & Contrarian</option>
                </select>
              </div>

              <div className="pillars-section">
                <label className="section-label">3 Daily Content Pillars (5 Ideas Each)</label>
                {contextPillars.map((p, idx) => (
                  <input
                    key={idx}
                    type="text"
                    className="input-field"
                    value={p}
                    onChange={(e) => {
                      const updated = [...contextPillars];
                      updated[idx] = e.target.value;
                      setContextPillars(updated);
                    }}
                    placeholder={`Pillar ${idx + 1}`}
                    required
                  />
                ))}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowContextModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-center" disabled={contextSaving}>
                  {contextSaving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  <span>Save Context</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .ideas-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
        }

        .top-action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        /* Tabs */
        .tabs-bar {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
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
          background: none;
          border: none;
          cursor: pointer;
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

        .btn-context-edit {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: transparent;
          border: 1px solid var(--color-border);
          padding: 0.45rem 0.85rem;
          border-radius: var(--radius-md);
          font-size: 0.825rem;
          font-weight: 500;
          color: var(--color-text-primary);
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-context-edit:hover {
          background: rgba(148, 163, 184, 0.08);
          border-color: var(--color-brand);
        }

        /* Date Filter Container & Mode Buttons */
        .date-filter-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .filter-mode-buttons {
          display: flex;
          gap: 0.5rem;
          background: rgba(148, 163, 184, 0.08);
          padding: 0.25rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }
        .mode-btn {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.4rem 0.85rem;
          border-radius: var(--radius-md);
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .mode-btn:hover {
          color: var(--color-text-primary);
        }
        .mode-btn.active {
          background: var(--color-surface);
          color: var(--color-brand);
          box-shadow: var(--shadow-sm);
        }
        .badge-pill {
          font-size: 0.72rem;
          padding: 0.1rem 0.45rem;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.12);
          color: var(--color-brand);
        }
        .date-badge {
          font-size: 0.725rem;
          font-family: var(--font-mono);
          color: var(--color-text-muted);
          background: rgba(148, 163, 184, 0.08);
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
        }

        /* Date Nav */
        .date-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.85rem;
          padding: 0.5rem 0.85rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }
        .date-nav-btn {
          padding: 0.35rem;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          background: none;
          border: none;
          cursor: pointer;
          transition: 0.2s;
        }
        .date-nav-btn:hover {
          background: rgba(148, 163, 184, 0.1);
          color: var(--color-text-primary);
        }
        .date-display {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .date-value {
          font-size: 0.78rem;
          color: var(--color-text-muted);
          font-weight: 400;
        }

        /* Daily Generation Overlay */
        .daily-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1.5rem;
          animation: fadeIn 0.25s ease-out;
        }
        .daily-modal-card {
          width: 100%;
          max-width: 480px;
          padding: 2.5rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.15rem;
          border-radius: var(--radius-xl);
          background: var(--color-surface);
          border: 1px solid var(--color-brand-border);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .daily-spinner-wrap {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.12);
          color: var(--color-brand);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .daily-modal-card h2 {
          font-size: 1.45rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-text-primary);
          margin: 0;
        }
        .daily-progress-track {
          width: 100%;
          height: 6px;
          background: rgba(148, 163, 184, 0.15);
          border-radius: 999px;
          overflow: hidden;
        }
        .daily-progress-bar {
          height: 100%;
          width: 60%;
          background: var(--color-brand);
          border-radius: 999px;
          animation: progressIndeterminate 1.8s ease-in-out infinite;
        }
        @keyframes progressIndeterminate {
          0% { transform: translateX(-100%); width: 30%; }
          50% { width: 60%; }
          100% { transform: translateX(250%); width: 30%; }
        }
        .daily-notice {
          font-size: 0.775rem;
          color: var(--color-text-muted);
        }

        /* Page Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-header h1 {
          font-size: 1.5rem;
          color: var(--color-text-primary);
          margin-bottom: 0.2rem;
        }
        .text-muted { color: var(--color-text-muted); font-size: 0.85rem; }
        .generate-btn { padding: 0.6rem 1.25rem; }
        .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Ideas Grid */
        .ideas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.25rem;
        }
        .idea-card {
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          gap: 1rem;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          position: relative;
        }
        .idea-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .idea-card.selected {
          border-color: var(--color-brand);
          background: rgba(59, 130, 246, 0.03);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .select-checkbox {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-text-muted);
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.2s;
        }
        .select-checkbox:hover { color: var(--color-brand); }
        .checked-icon { color: var(--color-brand); }

        .pillar-tag {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          border: 1px solid;
          text-transform: capitalize;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .action-btn {
          padding: 0.35rem;
          border-radius: var(--radius-md);
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--color-text-secondary);
          transition: 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-btn:hover { background: rgba(148, 163, 184, 0.1); color: var(--color-text-primary); }
        .like-btn:hover { color: var(--color-danger); background: rgba(239, 68, 68, 0.1); }
        .trash-btn:hover { color: var(--color-danger); background: rgba(239, 68, 68, 0.1); }
        .restore-btn:hover { color: var(--color-success); background: rgba(16, 185, 129, 0.1); }
        .perm-delete-btn:hover { color: var(--color-danger); background: rgba(239, 68, 68, 0.1); }

        .card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          cursor: pointer;
        }
        .trash-expiry-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          color: var(--color-warning);
          background: rgba(245, 158, 11, 0.1);
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
          width: fit-content;
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

        .hook-pill-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.25rem;
        }
        .hook-pill-label {
          font-size: 0.72rem;
          color: var(--color-text-muted);
          font-weight: 500;
        }
        .hook-mini-pill {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          font-size: 0.72rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--color-border);
          background: transparent;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: 0.2s;
        }
        .hook-mini-pill:hover { border-color: var(--color-brand); }
        .hook-mini-pill.active {
          background: var(--color-brand);
          color: white;
          border-color: var(--color-brand);
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid var(--color-border);
        }
        .tags-preview { display: flex; gap: 0.35rem; }
        .mini-tag {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          background: rgba(148, 163, 184, 0.08);
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-sm);
        }
        .open-studio-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-brand);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          transition: 0.2s;
        }
        .open-studio-btn:hover { background: rgba(59, 130, 246, 0.08); }

        /* Floating Bulk Action Bar */
        .bulk-floating-bar {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 0.85rem 1.5rem;
          border-radius: 999px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          border: 1px solid var(--color-brand);
          background: var(--color-surface);
          z-index: 50;
        }
        .bulk-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .bulk-count {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-brand);
        }
        .bulk-text-btn {
          background: none;
          border: none;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          cursor: pointer;
          text-decoration: underline;
        }
        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .bulk-btn {
          padding: 0.45rem 0.85rem;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: 0.2s;
        }
        .bulk-btn.like { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); }
        .bulk-btn.like:hover { background: rgba(239, 68, 68, 0.2); }
        .bulk-btn.delete { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); }
        .bulk-btn.delete:hover { background: rgba(239, 68, 68, 0.2); }
        .bulk-btn.restore { background: rgba(16, 185, 129, 0.1); color: var(--color-success); }
        .bulk-btn.restore:hover { background: rgba(16, 185, 129, 0.2); }
        .bulk-btn.perm-delete { background: rgba(239, 68, 68, 0.15); color: var(--color-danger); }
        .bulk-btn.perm-delete:hover { background: rgba(239, 68, 68, 0.25); }
        .bulk-close-btn {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0.25rem;
        }

        /* Modals */
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }
        .context-modal-container {
          width: 100%;
          max-width: 520px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--color-border);
        }
        .modal-header h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .close-btn {
          color: var(--color-text-muted);
          padding: 0.25rem;
          background: none;
          border: none;
          cursor: pointer;
        }
        .context-modal-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .form-group label {
          font-size: 0.825rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .pillars-section {
          background: rgba(148, 163, 184, 0.05);
          padding: 0.85rem;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .section-label {
          font-size: 0.78rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--color-text-secondary);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        .btn-secondary {
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
        }
        .btn-secondary:hover { background: rgba(148, 163, 184, 0.08); }

        .empty-state {
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .skeleton-card { height: 210px; padding: 1.25rem; }
        .skeleton {
          background: rgba(148, 163, 184, 0.1);
          border-radius: var(--radius-sm);
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .ideas-grid { grid-template-columns: 1fr; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .top-action-bar { flex-direction: column; align-items: stretch; }
          .bulk-floating-bar { width: 90%; flex-direction: column; border-radius: var(--radius-lg); gap: 0.75rem; }
        }
      `}</style>
    </div>
  );
}
