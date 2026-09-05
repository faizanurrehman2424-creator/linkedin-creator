'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ChevronLeft, ChevronRight, Download, Calendar as CalendarIcon, Clock, Sparkles, X, Heart, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { PostStudioModal } from '@/components/PostStudioModal';

export default function CalendarPage() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedDateDetail, setSelectedDateDetail] = useState<{ dateStr: string; displayDate: string } | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
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

  const fetchScheduled = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/ideas?status=all', { headers });
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.ideas || []);
      }

      const pRes = await fetch('/api/profile', { headers });
      if (pRes.ok) {
        const pData = await pRes.json();
        const prof = pData.profile || pData;
        if (prof) setUserProfile(prof);
      }
    } catch (e) {
      console.error('Calendar fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduled();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchScheduled();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePostUpdate = (updatedPost: any) => {
    setIdeas(prev => {
      const index = prev.findIndex(p => p.id === updatedPost.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = updatedPost;
        return next;
      }
      return [updatedPost, ...prev];
    });
    setSelectedPost(null);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleExportMonth = () => {
    const exportable = ideas.filter(i => i.status === 'scheduled' || i.status === 'published');
    if (exportable.length === 0) {
      toast.info('No scheduled or published posts to export for this period.');
      return;
    }

    const headers = ['ID', 'Scheduled Date', 'Status', 'Pillar', 'Headline', 'Caption Body'];
    const rows = exportable.map(i => [
      `"${i.id}"`,
      `"${i.scheduled_at || ''}"`,
      `"${i.status}"`,
      `"${i.pillar?.replace(/_/g, ' ') || ''}"`,
      `"${(i.headline || '').replace(/"/g, '""')}"`,
      `"${(i.caption_body || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `linkedin_calendar_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Content calendar exported to CSV.');
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const getDayPosts = (dateStr: string) => {
    return ideas.filter(idea => idea.scheduled_at && idea.scheduled_at.startsWith(dateStr));
  };

  const getDayIdeas = (dateStr: string) => {
    return ideas.filter(idea => {
      const isTarget = idea.target_date === dateStr;
      const isCreated = !idea.target_date && idea.created_at && idea.created_at.startsWith(dateStr);
      return (isTarget || isCreated) && idea.status !== 'scheduled' && idea.status !== 'published';
    });
  };

  const handleCellClick = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const displayDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    setSelectedDateDetail({ dateStr, displayDate });
  };

  const scheduledForSelected = selectedDateDetail ? getDayPosts(selectedDateDetail.dateStr) : [];
  const ideasForSelected = selectedDateDetail ? getDayIdeas(selectedDateDetail.dateStr) : [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Content Calendar</h1>
          <p className="text-muted">Manage your scheduled posts, published content, and daily generated ideas.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary flex-center" onClick={handleExportMonth}>
            <Download size={16} /> Export Month
          </button>
        </div>
      </div>

      <div className="calendar-controls">
        <button className="icon-btn" onClick={prevMonth} title="Previous month"><ChevronLeft size={20} /></button>
        <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <button className="icon-btn" onClick={nextMonth} title="Next month"><ChevronRight size={20} /></button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-header-cell">{day}</div>
        ))}
        
        {days.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="calendar-cell empty"></div>;
          
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          const isToday = dateStr === todayStr;

          const posts = getDayPosts(dateStr);
          const generatedIdeas = getDayIdeas(dateStr);
          
          return (
            <div 
              key={dateStr} 
              className={`calendar-cell ${isToday ? 'is-today' : ''}`}
              onClick={() => handleCellClick(date)}
              title={`Click to view scheduled posts and generated ideas for ${dateStr}`}
            >
              <div className="cell-top-bar">
                {isToday && <span className="today-tag">Today</span>}
                <span className="date-number">{date.getDate()}</span>
              </div>

              <div className="cell-posts">
                {posts.map(post => (
                  <div 
                    key={post.id} 
                    className={`post-badge ${post.status}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPost(post);
                    }}
                    title={`${post.status === 'published' ? 'Published' : 'Scheduled'}: ${post.headline || 'Post'}`}
                  >
                    <Clock size={10} style={{ marginRight: '3px', verticalAlign: 'middle', display: 'inline' }} />
                    {post.pillar ? post.pillar.replace(/_/g, ' ') : 'Post'}
                  </div>
                ))}

                {generatedIdeas.length > 0 && (
                  <div 
                    className="generated-badge"
                    title={`${generatedIdeas.length} idea(s) generated for this date. Click to inspect.`}
                  >
                    <Sparkles size={10} style={{ marginRight: '3px', verticalAlign: 'middle', display: 'inline' }} />
                    {generatedIdeas.length} {generatedIdeas.length === 1 ? 'idea' : 'ideas'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDateDetail && (
        <div className="date-detail-overlay" onClick={() => setSelectedDateDetail(null)}>
          <div className="date-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="date-detail-header">
              <div className="detail-title-group">
                <div className="flex-center date-pill">
                  <CalendarIcon size={16} />
                  <span>{selectedDateDetail.displayDate}</span>
                </div>
                <p className="detail-subtext">Click any post or idea to open and edit in Post Studio.</p>
              </div>
              <button 
                className="close-btn" 
                onClick={() => setSelectedDateDetail(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="date-detail-content">
              {/* Scheduled Posts Section */}
              <div className="detail-section">
                <div className="section-title-row">
                  <h3>Scheduled & Published Posts</h3>
                  <span className="count-badge">{scheduledForSelected.length}</span>
                </div>

                {scheduledForSelected.length === 0 ? (
                  <div className="empty-state-box">
                    <p className="empty-text">No scheduled or published posts on this date.</p>
                  </div>
                ) : (
                  <div className="detail-items-list">
                    {scheduledForSelected.map(post => (
                      <div key={post.id} className="detail-card scheduled-card">
                        <div className="card-top">
                          <div className="flex-center gap-sm">
                            <span className={`status-tag ${post.status}`}>
                              {post.status.toUpperCase()}
                            </span>
                            {post.pillar && (
                              <span className="pillar-tag">
                                {post.pillar.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          {post.scheduled_at && (
                            <span className="time-indicator">
                              <Clock size={12} />
                              {post.scheduled_at.includes('T') ? post.scheduled_at.split('T')[1].substring(0, 5) : ''} UTC
                            </span>
                          )}
                        </div>
                        <h4 className="detail-headline">{post.headline || 'Untitled Post'}</h4>
                        {post.caption_body && (
                          <p className="detail-preview">{post.caption_body.substring(0, 160)}...</p>
                        )}
                        <div className="card-actions">
                          <button 
                            className="btn-action-primary"
                            onClick={() => {
                              setSelectedPost(post);
                            }}
                          >
                            <ExternalLink size={14} /> Open in Studio
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Generated Ideas Section */}
              <div className="detail-section">
                <div className="section-title-row">
                  <h3>Generated Ideas For This Date</h3>
                  <span className="count-badge">{ideasForSelected.length}</span>
                </div>

                {ideasForSelected.length === 0 ? (
                  <div className="empty-state-box">
                    <p className="empty-text">No ideas were generated for this date.</p>
                  </div>
                ) : (
                  <div className="detail-items-list">
                    {ideasForSelected.map(idea => (
                      <div key={idea.id} className="detail-card idea-card">
                        <div className="card-top">
                          <div className="flex-center gap-sm">
                            {idea.pillar && (
                              <span className="pillar-tag">
                                {idea.pillar.replace(/_/g, ' ')}
                              </span>
                            )}
                            {idea.status === 'liked' && (
                              <span className="liked-tag flex-center">
                                <Heart size={10} fill="currentColor" /> Liked
                              </span>
                            )}
                          </div>
                        </div>
                        <h4 className="detail-headline">{idea.headline || 'Untitled Idea'}</h4>
                        {idea.hook_options && idea.hook_options[0] && (
                          <p className="detail-preview">Hook: "{idea.hook_options[0]}"</p>
                        )}
                        <div className="card-actions">
                          <button 
                            className="btn-action-primary"
                            onClick={() => {
                              setSelectedPost(idea);
                            }}
                          >
                            <ExternalLink size={14} /> Open in Studio
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <PostStudioModal
          idea={selectedPost}
          userProfile={userProfile}
          onClose={() => setSelectedPost(null)}
          onSave={handlePostUpdate}
        />
      )}

      <style jsx>{`
        .page-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        h1 {
          font-size: 2rem;
          color: var(--color-text-primary);
          margin-bottom: 0.25rem;
        }
        .text-muted {
          color: var(--color-text-muted);
        }
        .btn-secondary {
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover {
          background: rgba(148, 163, 184, 0.08);
        }
        .flex-center {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .gap-sm {
          gap: 0.35rem;
        }
        
        .calendar-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }
        .calendar-controls h2 {
          font-size: 1.25rem;
          margin: 0;
          font-weight: 600;
        }
        .icon-btn {
          padding: 0.5rem;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .icon-btn:hover {
          background: rgba(148, 163, 184, 0.15);
          color: var(--color-text-primary);
        }
        
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: var(--color-border);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .calendar-header-cell {
          background: var(--color-surface);
          padding: 0.85rem;
          text-align: center;
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }
        .calendar-cell {
          background: var(--color-surface);
          min-height: 125px;
          padding: 0.6rem;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: background 0.15s ease;
          position: relative;
        }
        .calendar-cell:hover:not(.empty) {
          background: rgba(148, 163, 184, 0.08);
        }
        .calendar-cell.is-today {
          background: rgba(59, 130, 246, 0.04);
          border: 1px solid rgba(59, 130, 246, 0.4);
        }
        .calendar-cell.empty {
          background: rgba(148, 163, 184, 0.02);
          cursor: default;
        }
        .cell-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .today-tag {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          background: var(--color-brand);
          color: #ffffff;
          letter-spacing: 0.03em;
        }
        .date-number {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          margin-left: auto;
        }
        .cell-posts {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          overflow: hidden;
        }
        .post-badge {
          font-size: 0.7rem;
          font-weight: 500;
          padding: 0.25rem 0.45rem;
          border-radius: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          background: rgba(59, 130, 246, 0.12);
          color: var(--color-brand);
          border: 1px solid rgba(59, 130, 246, 0.25);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .post-badge:hover {
          transform: translateY(-1px);
        }
        .post-badge.published {
          background: rgba(16, 185, 129, 0.12);
          color: var(--color-success);
          border-color: rgba(16, 185, 129, 0.25);
        }
        .generated-badge {
          font-size: 0.68rem;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          background: rgba(148, 163, 184, 0.12);
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Date Detail Modal */
        .date-detail-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .date-detail-modal {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 680px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          animation: modalPop 0.18s ease-out;
        }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .date-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--color-border);
        }
        .date-pill {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .detail-subtext {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
        }
        .close-btn {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          padding: 0.35rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .close-btn:hover {
          color: var(--color-text-primary);
          background: rgba(148, 163, 184, 0.1);
        }
        .date-detail-content {
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .detail-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .section-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .section-title-row h3 {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }
        .count-badge {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.1rem 0.4rem;
          background: rgba(148, 163, 184, 0.15);
          color: var(--color-text-secondary);
          border-radius: 999px;
        }
        .empty-state-box {
          padding: 1rem;
          border-radius: var(--radius-md);
          background: rgba(148, 163, 184, 0.05);
          border: 1px dashed var(--color-border);
          text-align: center;
        }
        .empty-text {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 0;
        }
        .detail-items-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .detail-card {
          padding: 1rem;
          background: rgba(148, 163, 184, 0.04);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: border-color 0.15s ease;
        }
        .detail-card:hover {
          border-color: rgba(59, 130, 246, 0.4);
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .status-tag {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          background: rgba(59, 130, 246, 0.12);
          color: var(--color-brand);
        }
        .status-tag.published {
          background: rgba(16, 185, 129, 0.12);
          color: var(--color-success);
        }
        .pillar-tag {
          font-size: 0.65rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          background: rgba(148, 163, 184, 0.12);
          color: var(--color-text-secondary);
          text-transform: capitalize;
        }
        .liked-tag {
          font-size: 0.65rem;
          font-weight: 600;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .time-indicator {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .detail-headline {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
          line-height: 1.35;
        }
        .detail-preview {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          margin: 0;
          line-height: 1.4;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.25rem;
        }
        .btn-action-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-md);
          background: var(--color-brand);
          color: #ffffff;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .btn-action-primary:hover {
          background: #2563eb;
        }

        @media (max-width: 768px) {
          .page-header h1 { font-size: 1.5rem; }
          .calendar-header-cell { padding: 0.5rem; font-size: 0.7rem; }
          .calendar-cell { min-height: 70px; padding: 0.3rem; }
          .date-number { font-size: 0.75rem; }
          .post-badge { font-size: 0.6rem; padding: 0.15rem 0.3rem; }
          .calendar-controls h2 { font-size: 1rem; }
        }
      `}</style>
    </div>
  );
}

