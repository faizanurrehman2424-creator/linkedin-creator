'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { PostStudioModal } from '@/components/PostStudioModal';

export default function CalendarPage() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
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
      const res = await fetch('/api/ideas?status=scheduled,published', { headers });
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
    setIdeas(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    setSelectedPost(null);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleExportMonth = () => {
    if (ideas.length === 0) {
      toast.info('No scheduled or published posts to export for this period.');
      return;
    }

    const headers = ['ID', 'Scheduled Date', 'Status', 'Pillar', 'Headline', 'Caption Body'];
    const rows = ideas.map(i => [
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
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Content Calendar</h1>
          <p className="text-muted">Manage your scheduled and published posts.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary flex-center" onClick={handleExportMonth}>
            <Download size={16} /> Export Month
          </button>
        </div>
      </div>

      <div className="calendar-controls">
        <button className="icon-btn" onClick={prevMonth}><ChevronLeft size={20} /></button>
        <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <button className="icon-btn" onClick={nextMonth}><ChevronRight size={20} /></button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-header-cell">{day}</div>
        ))}
        
        {days.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="calendar-cell empty"></div>;
          
          const dateStr = date.toISOString().split('T')[0];
          const posts = ideas.filter(idea => idea.scheduled_at && idea.scheduled_at.startsWith(dateStr));
          
          return (
            <div key={dateStr} className="calendar-cell">
              <span className="date-number">{date.getDate()}</span>
              <div className="cell-posts">
                {posts.map(post => (
                  <div 
                    key={post.id} 
                    className={`post-badge ${post.status}`}
                    onClick={() => setSelectedPost(post)}
                    title="Click to inspect and edit post"
                    style={{ cursor: 'pointer' }}
                  >
                    {post.pillar ? post.pillar.replace('_', ' ') : 'Post'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
        }
        .btn-secondary:hover {
          background: rgba(148, 163, 184, 0.05);
        }
        .flex-center {
          display: flex;
          align-items: center;
          gap: 0.5rem;
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
        }
        .icon-btn {
          padding: 0.5rem;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
        }
        .icon-btn:hover {
          background: rgba(148, 163, 184, 0.1);
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
          padding: 1rem;
          text-align: center;
          font-weight: 600;
          font-size: 0.875rem;
        }
        .calendar-cell {
          background: var(--color-surface);
          min-height: 120px;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
        }
        .calendar-cell.empty {
          background: rgba(148, 163, 184, 0.02);
        }
        .date-number {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin-bottom: 0.5rem;
          align-self: flex-end;
        }
        .cell-posts {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .post-badge {
          font-size: 0.65rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-brand);
        }
        .post-badge.published {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-success);
        }

        @media (max-width: 768px) {
          .page-header h1 { font-size: 1.5rem; }
          .calendar-header-cell { padding: 0.5rem; font-size: 0.7rem; }
          .calendar-cell { min-height: 60px; padding: 0.25rem; }
          .date-number { font-size: 0.7rem; }
          .post-badge { font-size: 0.55rem; padding: 0.15rem 0.3rem; }
          .calendar-controls h2 { font-size: 1rem; }
        }
      `}</style>
    </div>
  );
}
