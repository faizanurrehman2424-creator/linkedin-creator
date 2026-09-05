'use client';

import { useState, useRef } from 'react';
import {
  X, Wand2, Copy, Image as ImageIcon, Video, Calendar,
  Check, Loader2, Save, Heart, Trash2, Upload, FileVideo,
  ClipboardCopy, Send, ExternalLink, Globe
} from 'lucide-react';
import { useToast } from '@/components/Toast';

interface Idea {
  id: string;
  pillar: string;
  headline: string;
  hook_options: string[];
  selected_hook_index: number;
  caption_body: string;
  hashtags: string[];
  notes: string;
  media_url?: string;
  media_type?: string;
  status?: string;
  scheduled_at?: string;
}

export function PostStudioModal({ idea, userProfile, onClose, onSave }: {
  idea: Idea,
  userProfile?: any,
  onClose: () => void,
  onSave: (idea: Idea) => void
}) {
  const [editedIdea, setEditedIdea] = useState<Idea>({ ...idea });
  const [refining, setRefining] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [mediaPrompt, setMediaPrompt] = useState((idea.notes || '').replace('Image Prompt: ', ''));
  const [mediaUrl, setMediaUrl] = useState<string | null>(idea.media_url || null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>(idea.media_type === 'video' ? 'video' : 'image');
  const [generatingMedia, setGeneratingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<'generate' | 'upload'>('generate');
  const [scheduleDate, setScheduleDate] = useState(idea.scheduled_at ? idea.scheduled_at.split('T')[0] : '');
  const [scheduleTime, setScheduleTime] = useState(idea.scheduled_at ? idea.scheduled_at.split('T')[1]?.substring(0, 5) || '09:00' : '09:00');
  const [saving, setSaving] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [publishingLinkedIn, setPublishingLinkedIn] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleRefine = async (field: 'hook' | 'caption_body' | 'hashtags', currentText: string) => {
    if (!refinePrompt.trim()) return;
    setRefining(field);
    try {
      const res = await fetch('/api/ideas/refine-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldToRefine: field, currentText, userPrompt: refinePrompt })
      });
      const data = await res.json();
      if (res.ok && data.refinedText) {
        if (field === 'hook') {
          const newHooks = [...editedIdea.hook_options];
          newHooks[editedIdea.selected_hook_index] = data.refinedText;
          setEditedIdea({ ...editedIdea, hook_options: newHooks });
        } else if (field === 'hashtags') {
          setEditedIdea({ ...editedIdea, hashtags: data.refinedText.split(' ') });
        } else {
          setEditedIdea({ ...editedIdea, [field]: data.refinedText });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefining(null);
      setRefinePrompt('');
    }
  };

  const handleGenerateImage = async () => {
    if (!mediaPrompt.trim()) return;
    setGeneratingMedia(true);
    try {
      const res = await fetch('/api/media/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: mediaPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate visual');
      
      setMediaUrl(data.url);
      setMediaType('image');
      toast.success('Visual generated successfully.');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Image service error.');
    } finally {
      setGeneratingMedia(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!mediaPrompt.trim()) return;
    setGeneratingMedia(true);
    try {
      const res = await fetch('/api/media/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: mediaPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start video generation');

      if (data.videoUrl) {
        setMediaUrl(data.videoUrl);
        setMediaType('video');
        toast.success('Video clip generated.');
      } else {
        toast.info('Video rendering submitted. Task queued.');
      }
    } catch (e: any) {
      console.error('Video generation error:', e);
      toast.error(e.message || 'Video generation failed.');
    } finally {
      setGeneratingMedia(false);
    }
  };

  const handlePublishLinkedIn = async () => {
    setPublishingLinkedIn(true);
    try {
      const res = await fetch('/api/linkedin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId: editedIdea.id,
          hookIndex: editedIdea.selected_hook_index,
          customText: fullPostText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish post to LinkedIn');

      setPublishedUrl(data.postUrl || 'https://www.linkedin.com/feed/');
      const updated = { ...editedIdea, status: 'published' };
      setEditedIdea(updated);
      onSave(updated);
      toast.success('Post published live to your LinkedIn profile!');
    } catch (err: any) {
      console.error('LinkedIn publishing error:', err);
      toast.error(err.message || 'Failed to publish to LinkedIn.');
    } finally {
      setPublishingLinkedIn(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setMediaUrl(data.url);
        setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (newStatus?: string) => {
    setSaving(true);
    const updatedIdea = {
      ...editedIdea,
      media_url: mediaUrl || undefined,
      media_type: mediaUrl ? mediaType : 'none',
      status: newStatus || editedIdea.status,
    };

    if (newStatus === 'scheduled' && scheduleDate) {
      (updatedIdea as any).scheduled_at = `${scheduleDate}T${scheduleTime}:00`;
    }

    onSave(updatedIdea);
    setSaving(false);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(type === 'all' ? 'Full post copied to clipboard.' : type === 'publish' ? 'Post copied for publishing.' : 'Copied to clipboard.');
    setTimeout(() => setCopied(null), 2000);
  };

  const fullPostText = `${editedIdea.hook_options[editedIdea.selected_hook_index]}\n\n${editedIdea.caption_body}\n\n${editedIdea.hashtags.join(' ')}`;

  const canImage = !userProfile || userProfile.can_generate_images !== false;
  const canVideo = !userProfile || userProfile.can_generate_videos !== false;

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content">
        {/* Header */}
        <div className="modal-header">
          <div className="header-titles">
            <h2>Post Studio</h2>
            <span className="text-muted">{editedIdea.headline}</span>
          </div>
          <div className="header-actions">
            <button className="btn-primary flex-center" onClick={() => copyToClipboard(fullPostText, 'all')}>
              {copied === 'all' ? <Check size={16} /> : <ClipboardCopy size={16} />}
              Copy Post
            </button>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* LEFT: Editor Column */}
          <div className="editor-col">
            {/* HOOK */}
            <div className="field-group">
              <div className="field-header">
                <label>Opening Hook</label>
                <div className="hook-selector">
                  {editedIdea.hook_options.map((_, i) => (
                    <button
                      key={i}
                      className={`hook-tab ${editedIdea.selected_hook_index === i ? 'active' : ''}`}
                      onClick={() => setEditedIdea({ ...editedIdea, selected_hook_index: i })}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button className="icon-btn sm" onClick={() => copyToClipboard(editedIdea.hook_options[editedIdea.selected_hook_index], 'hook')}>
                  {copied === 'hook' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <textarea
                className="input-field"
                rows={2}
                value={editedIdea.hook_options[editedIdea.selected_hook_index]}
                onChange={(e) => {
                  const newHooks = [...editedIdea.hook_options];
                  newHooks[editedIdea.selected_hook_index] = e.target.value;
                  setEditedIdea({ ...editedIdea, hook_options: newHooks });
                }}
              />
              <div className="refine-bar">
                <input
                  type="text"
                  className="input-field sm"
                  placeholder="e.g. Make it punchier..."
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRefine('hook', editedIdea.hook_options[editedIdea.selected_hook_index])}
                />
                <button
                  className="icon-btn sm refine-btn"
                  onClick={() => handleRefine('hook', editedIdea.hook_options[editedIdea.selected_hook_index])}
                  disabled={refining === 'hook'}
                >
                  {refining === 'hook' ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />} Refine
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="field-group">
              <div className="field-header">
                <label>Caption Body</label>
                <button className="icon-btn sm" onClick={() => copyToClipboard(editedIdea.caption_body, 'body')}>
                  {copied === 'body' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <textarea
                className="input-field"
                rows={8}
                value={editedIdea.caption_body}
                onChange={(e) => setEditedIdea({ ...editedIdea, caption_body: e.target.value })}
              />
              <div className="refine-bar">
                <input
                  type="text"
                  className="input-field sm"
                  placeholder="e.g. Make paragraphs shorter..."
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRefine('caption_body', editedIdea.caption_body)}
                />
                <button
                  className="icon-btn sm refine-btn"
                  onClick={() => handleRefine('caption_body', editedIdea.caption_body)}
                  disabled={refining === 'caption_body'}
                >
                  {refining === 'caption_body' ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />} Refine
                </button>
              </div>
            </div>

            {/* TAGS */}
            <div className="field-group">
              <div className="field-header">
                <label>Hashtags</label>
                <button className="icon-btn sm" onClick={() => copyToClipboard(editedIdea.hashtags.join(' '), 'tags')}>
                  {copied === 'tags' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <input
                className="input-field"
                value={editedIdea.hashtags.join(' ')}
                onChange={(e) => setEditedIdea({ ...editedIdea, hashtags: e.target.value.split(' ') })}
              />
            </div>

            {/* NOTES */}
            <div className="field-group">
              <div className="field-header">
                <label>Notes</label>
              </div>
              <textarea
                className="input-field"
                rows={2}
                placeholder="Add personal notes about this post..."
                value={editedIdea.notes || ''}
                onChange={(e) => setEditedIdea({ ...editedIdea, notes: e.target.value })}
              />
            </div>

            {/* MEDIA STUDIO */}
            <div className="field-group media-studio">
              <div className="field-header">
                <label>Media Studio</label>
                <div className="media-tabs">
                  <button
                    className={`media-tab ${activeMediaTab === 'generate' ? 'active' : ''}`}
                    onClick={() => setActiveMediaTab('generate')}
                  >
                    <Wand2 size={13} /> Generate
                  </button>
                  <button
                    className={`media-tab ${activeMediaTab === 'upload' ? 'active' : ''}`}
                    onClick={() => setActiveMediaTab('upload')}
                  >
                    <Upload size={13} /> Upload
                  </button>
                </div>
              </div>

              {activeMediaTab === 'generate' && (
                <>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={mediaPrompt}
                    onChange={(e) => setMediaPrompt(e.target.value)}
                    placeholder="Describe the visual you want to generate..."
                  />
                  <div className="media-gen-buttons">
                    <button
                      className="btn-primary sm flex-center media-gen-btn"
                      onClick={handleGenerateImage}
                      disabled={generatingMedia || !canImage}
                      title={!canImage ? 'Image generation disabled by admin' : ''}
                    >
                      {generatingMedia && mediaType !== 'video' ? <Loader2 size={14} className="spin" /> : <ImageIcon size={14} />}
                      Generate Image
                    </button>
                    <button
                      className="btn-video sm flex-center media-gen-btn"
                      onClick={handleGenerateVideo}
                      disabled={generatingMedia || !canVideo}
                      title={!canVideo ? 'Video generation disabled by admin' : ''}
                    >
                      {generatingMedia && mediaType === 'video' ? <Loader2 size={14} className="spin" /> : <FileVideo size={14} />}
                      Generate Video
                    </button>
                  </div>
                </>
              )}

              {activeMediaTab === 'upload' && (
                <div className="upload-area">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 size={20} className="spin" /> : <Upload size={20} />}
                    <span>{uploading ? 'Uploading...' : 'Click to upload image or video'}</span>
                    <span className="upload-hint">JPG, PNG, GIF, MP4, WebM</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Preview Column */}
          <div className="preview-col">
            <div className="preview-header">
              <span className="text-sm font-medium">LinkedIn Preview</span>
            </div>
            <div className="linkedin-preview">
              <div className="preview-author">
                <div className="avatar-placeholder"></div>
                <div>
                  <div className="author-name">{userProfile?.full_name || 'Your Name'}</div>
                  <div className="author-headline">{userProfile?.headline || 'Professional'}</div>
                  <div className="author-time">Just now - Public</div>
                </div>
              </div>
              <div className="preview-text">
                <p className="hook-text">{editedIdea.hook_options[editedIdea.selected_hook_index]}</p>
                <br />
                <p className="whitespace-pre-wrap">{editedIdea.caption_body}</p>
                <br />
                <p className="preview-tags">{editedIdea.hashtags.join(' ')}</p>
              </div>
              {mediaUrl && (
                <div className="preview-media">
                  {mediaType === 'video' ? (
                    <video src={mediaUrl} controls style={{ width: '100%' }} />
                  ) : (
                    <img src={mediaUrl} alt="Post media" />
                  )}
                  <button className="icon-btn media-remove" onClick={() => { setMediaUrl(null); }}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-left">
            <button
              className="footer-btn like-btn flex-center"
              onClick={() => handleSave('liked')}
            >
              <Heart size={15} /> Like
            </button>
            <button
              className="footer-btn trash-btn flex-center"
              onClick={() => handleSave('trashed')}
            >
              <Trash2 size={15} /> Trash
            </button>
          </div>

          <div className="footer-right">
            {/* Schedule */}
            <div className="schedule-section">
              <button
                className="footer-btn schedule-btn flex-center"
                onClick={() => setShowSchedulePicker(!showSchedulePicker)}
              >
                <Calendar size={15} /> Schedule
              </button>
              {showSchedulePicker && (
                <div className="schedule-picker glass-card">
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      className="input-field sm"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label>Time</label>
                    <input
                      type="time"
                      className="input-field sm"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn-primary sm flex-center"
                    onClick={() => { handleSave('scheduled'); setShowSchedulePicker(false); }}
                    disabled={!scheduleDate}
                    style={{ width: '100%' }}
                  >
                    <Check size={14} /> Confirm Schedule
                  </button>
                </div>
              )}
            </div>

            <button className="btn-secondary flex-center" onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              Save
            </button>
            <button className="btn-secondary flex-center" onClick={() => copyToClipboard(fullPostText, 'publish')}>
              {copied === 'publish' ? <Check size={16} /> : <ClipboardCopy size={16} />}
              Copy Post
            </button>
            {publishedUrl ? (
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-linkedin flex-center"
              >
                <ExternalLink size={15} /> View on LinkedIn
              </a>
            ) : (
              <button
                className="btn-linkedin flex-center"
                onClick={handlePublishLinkedIn}
                disabled={publishingLinkedIn}
                title={userProfile?.linkedin_connected ? 'Publish live to your LinkedIn profile' : 'Connect LinkedIn in Settings to publish'}
              >
                {publishingLinkedIn ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                Publish to LinkedIn
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .btn-linkedin {
          background: #0a66c2;
          color: #ffffff;
          padding: 0.55rem 1.15rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.875rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 8px rgba(10, 102, 194, 0.3);
          transition: all 0.18s;
        }
        .btn-linkedin:hover:not(:disabled) {
          background: #004182;
          transform: translateY(-1px);
        }
        .btn-linkedin:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: overlayFadeIn 0.2s ease-out;
        }
        .modal-content {
          width: 100%;
          max-width: 1200px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalScaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-header {
          padding: 1.25rem 1.75rem;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-titles h2 { font-size: 1.2rem; margin: 0; }
        .text-muted { color: var(--color-text-muted); font-size: 0.825rem; }
        .header-actions { display: flex; gap: 0.75rem; align-items: center; }
        .flex-center { display: flex; align-items: center; gap: 0.4rem; justify-content: center; }
        .icon-btn { padding: 0.4rem; border-radius: var(--radius-md); color: var(--color-text-secondary); transition: 0.2s; display: flex; align-items: center; justify-content: center; }
        .icon-btn:hover { background: rgba(148, 163, 184, 0.1); color: var(--color-text-primary); }
        .icon-btn.sm { padding: 0.25rem; }

        .modal-body { display: flex; flex: 1; overflow: hidden; }
        .editor-col {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          border-right: 1px solid var(--color-border);
        }
        .field-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .field-header { display: flex; justify-content: space-between; align-items: center; }
        .field-header label { font-weight: 600; font-size: 0.825rem; }
        .input-field { font-family: inherit; resize: vertical; }
        .input-field.sm { padding: 0.25rem 0.5rem; font-size: 0.825rem; }
        .refine-bar { display: flex; gap: 0.5rem; align-items: stretch; }
        .refine-bar .input-field { flex: 1; }
        .refine-btn { border: 1px solid var(--color-brand); color: var(--color-brand); font-weight: 500; padding: 0 0.65rem; font-size: 0.8rem; white-space: nowrap; }
        .refine-btn:hover:not(:disabled) { background: rgba(59, 130, 246, 0.1); }

        .hook-selector { display: flex; gap: 0.25rem; }
        .hook-tab { width: 26px; height: 26px; border-radius: 50%; font-size: 0.7rem; font-weight: 600; background: rgba(148,163,184,0.1); color: var(--color-text-muted); display: flex; align-items: center; justify-content: center; transition: 0.2s; border: 1px solid transparent; }
        .hook-tab.active { background: rgba(59,130,246,0.15); color: var(--color-brand); border-color: var(--color-brand); }

        .media-studio { background: rgba(148, 163, 184, 0.04); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
        .media-tabs { display: flex; gap: 0.35rem; }
        .media-tab { display: flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; padding: 0.25rem 0.5rem; border-radius: var(--radius-md); color: var(--color-text-muted); transition: 0.2s; }
        .media-tab.active { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-primary); }
        .media-gen-buttons { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
        .media-gen-btn { flex: 1; padding: 0.5rem; font-size: 0.8rem; }
        .btn-video { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: var(--radius-md); font-weight: 500; font-size: 0.8rem; padding: 0.5rem; cursor: pointer; }
        .btn-video:hover:not(:disabled) { background: rgba(139, 92, 246, 0.25); }
        .btn-video:disabled { opacity: 0.5; cursor: not-allowed; }

        .upload-area { margin-top: 0.5rem; }
        .upload-btn { width: 100%; padding: 1.5rem; border: 2px dashed var(--color-border); border-radius: var(--radius-md); display: flex; flex-direction: column; align-items: center; gap: 0.35rem; color: var(--color-text-secondary); background: transparent; cursor: pointer; transition: 0.2s; }
        .upload-btn:hover { border-color: var(--color-brand); color: var(--color-brand); }
        .upload-hint { font-size: 0.7rem; color: var(--color-text-muted); }

        .preview-col { flex: 1; background: rgba(148, 163, 184, 0.02); padding: 1.5rem; overflow-y: auto; }
        .preview-header { margin-bottom: 0.75rem; font-weight: 500; font-size: 0.825rem; }
        .linkedin-preview { background: white; color: #000; border-radius: var(--radius-md); padding: 1rem; box-shadow: var(--shadow-md); font-size: 0.825rem; }
        [data-theme="dark"] .linkedin-preview { background: #1d2226; color: #e9e9df; }
        .preview-author { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
        .avatar-placeholder { width: 44px; height: 44px; border-radius: 50%; background: #e2e8f0; flex-shrink: 0; }
        [data-theme="dark"] .avatar-placeholder { background: #38434f; }
        .author-name { font-weight: 600; font-size: 0.9rem; }
        .author-headline, .author-time { font-size: 0.7rem; color: #666; }
        [data-theme="dark"] .author-headline, [data-theme="dark"] .author-time { color: #9ca3af; }
        .hook-text { font-weight: 600; }
        .whitespace-pre-wrap { white-space: pre-wrap; }
        .preview-tags { color: #0a66c2; font-weight: 600; }
        [data-theme="dark"] .preview-tags { color: #70b5f9; }
        .preview-media { margin-top: 0.75rem; border-radius: var(--radius-md); overflow: hidden; position: relative; }
        .preview-media img, .preview-media video { width: 100%; height: auto; display: block; }
        .media-remove { position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; padding: 0.25rem; }

        .modal-footer {
          padding: 1rem 1.75rem;
          border-top: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(148, 163, 184, 0.02);
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .footer-left, .footer-right { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
        .footer-btn { padding: 0.4rem 0.7rem; border-radius: var(--radius-md); font-size: 0.8rem; font-weight: 500; border: 1px solid var(--color-border); color: var(--color-text-secondary); background: transparent; cursor: pointer; transition: 0.2s; }
        .footer-btn:hover { color: var(--color-text-primary); }
        .like-btn:hover { color: #ec4899; border-color: #ec4899; background: rgba(236,72,153,0.08); }
        .trash-btn:hover { color: var(--color-danger); border-color: var(--color-danger); background: rgba(239,68,68,0.08); }
        .schedule-btn:hover { color: var(--color-brand); border-color: var(--color-brand); background: rgba(59,130,246,0.08); }
        .btn-secondary { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-primary); padding: 0.45rem 0.85rem; border-radius: var(--radius-md); font-weight: 500; font-size: 0.825rem; cursor: pointer; transition: 0.2s; }
        .btn-secondary:hover { background: rgba(148, 163, 184, 0.08); }

        .schedule-section { position: relative; }
        .schedule-picker {
          position: absolute;
          bottom: calc(100% + 0.5rem);
          right: 0;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-width: 220px;
          z-index: 10;
          box-shadow: var(--shadow-lg);
        }
        .schedule-picker .form-group { display: flex; flex-direction: column; gap: 0.3rem; }
        .schedule-picker label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary); }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .modal-overlay { padding: 0; align-items: flex-end; }
          .modal-content { max-width: 100%; max-height: 95vh; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
          .modal-body { flex-direction: column; }
          .editor-col { border-right: none; border-bottom: 1px solid var(--color-border); padding: 1rem; }
          .preview-col { padding: 1rem; max-height: 300px; }
          .modal-header { padding: 1rem; }
          .modal-footer { padding: 0.75rem 1rem; }
          .header-titles h2 { font-size: 1rem; }
          .media-gen-buttons { flex-direction: column; }
          .footer-right { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
