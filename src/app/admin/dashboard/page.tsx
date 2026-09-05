'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Lightbulb, Image as ImageIcon, Video,
  Send, Calendar, Bell, Shield, UserPlus,
  Loader2, ChevronRight, Settings, LogOut,
  ToggleLeft, ToggleRight, CheckCircle, X, Check
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'requests'>('dashboard');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const router = useRouter();
  const toast = useToast();

  // New user form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password123!');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('creator');
  const [newIdeas, setNewIdeas] = useState(true);
  const [newImages, setNewImages] = useState(true);
  const [newVideos, setNewVideos] = useState(false);
  const [masterToggles, setMasterToggles] = useState<any>({
    idea_gen: true,
    image_gen: true,
    video_gen: true,
    apify: true,
  });
  const [savingMaster, setSavingMaster] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const getAdminHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAdminHeaders();
      const [metricsRes, usersRes, requestsRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/password-requests', { headers }),
      ]);

      if (metricsRes.status === 401) {
        router.push('/admin/login');
        return;
      }

      const metricsData = await metricsRes.json();
      setMetrics(metricsData);
      if (metricsData.masterToggles) {
        setMasterToggles({
          idea_gen: metricsData.masterToggles.ideaGeneration ?? true,
          image_gen: metricsData.masterToggles.imageGeneration ?? true,
          video_gen: metricsData.masterToggles.videoGeneration ?? true,
          apify: metricsData.masterToggles.apifyEnabled ?? true,
        });
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      if (requestsRes.ok) {
        const reqData = await requestsRes.json();
        setPendingRequests(reqData.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMasterToggle = async (key: string, currentValue: boolean) => {
    const newToggles = { ...masterToggles, [key]: !currentValue };
    setSavingMaster(true);
    try {
      const res = await fetch('/api/admin/master-toggles', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ toggles: newToggles })
      });
      if (res.ok) {
        setMasterToggles(newToggles);
        showSuccess(`Master switch updated successfully.`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update master switch');
      }
    } catch (err) {
      toast.error('Network error updating switch');
    } finally {
      setSavingMaster(false);
    }
  };

  const handleToggle = async (userId: string, currentFlags: any, field: string) => {
    setProcessingId(userId);
    const newFlags = {
      can_generate_ideas: currentFlags.can_generate_ideas,
      can_generate_images: currentFlags.can_generate_images,
      can_generate_videos: currentFlags.can_generate_videos,
      [field]: !currentFlags[field]
    };

    try {
      const res = await fetch('/api/admin/update-user-flags', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ userId, flags: newFlags })
      });

      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, ...newFlags } : u));
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, ...newFlags });
        }
        showSuccess(`Updated permissions successfully.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusToggle = async (userId: string, isActive: boolean) => {
    setProcessingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ userId, isActive })
      });

      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_active: isActive } : u));
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, is_active: isActive });
        }
        showSuccess(`User status updated successfully.`);
      } else {
         const data = await res.json();
         setError(`Error updating user: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to update user status');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePasswordAction = async (requestId: string, action: 'approve' | 'decline') => {
    setProcessingId(requestId);
    try {
      const res = await fetch('/api/admin/password-requests', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ requestId, action }),
      });

      if (res.ok) {
        setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
        showSuccess(`Password request ${action === 'approve' ? 'approved' : 'declined'}.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          fullName: newFullName,
          role: newRole,
          flags: {
            can_generate_ideas: newIdeas,
            can_generate_images: newImages,
            can_generate_videos: newVideos
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setShowInviteModal(false);
      setNewEmail('');
      setNewFullName('');
      showSuccess(`User ${newEmail} created. Invitation email sent.`);
      fetchData();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
    }
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/admin/login');
  };

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    toast.success(msg);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const pendingCount = pendingRequests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="admin-loading">
        <Loader2 size={32} className="spin" />
        <style jsx>{`
          .admin-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: var(--color-brand);
          }
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar glass-card">
        <div className="sidebar-header">
          <Shield size={20} />
          <strong>Admin Panel</strong>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveView('dashboard'); setSelectedUser(null); }}
          >
            <Lightbulb size={16} /> Dashboard
          </button>
          <button
            className={`sidebar-link ${activeView === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveView('users'); setSelectedUser(null); }}
          >
            <Users size={16} /> User Management
          </button>
          <button
            className={`sidebar-link ${activeView === 'requests' ? 'active' : ''}`}
            onClick={() => { setActiveView('requests'); setSelectedUser(null); }}
          >
            <Bell size={16} /> Password Requests
            {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
          </button>
        </nav>
        <div className="sidebar-footer">
          <Link href="/ideas" className="sidebar-link">
            <ChevronRight size={16} /> User View
          </Link>
          <button className="sidebar-link text-danger" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {actionSuccess && (
          <div className="alert success">
            <CheckCircle size={16} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* DASHBOARD VIEW */}
        {activeView === 'dashboard' && metrics && (
          <>
            <div className="view-header">
              <h1>Platform Overview</h1>
              <p className="text-muted">Real-time metrics and system health.</p>
            </div>

            <div className="metrics-grid">
              <button className="glass-card metric-card" onClick={() => setActiveView('users')}>
                <div className="metric-icon users-icon"><Users size={22} /></div>
                <div className="metric-value">{metrics.totalUsers}</div>
                <div className="metric-label">Total Users</div>
              </button>
              <div className="glass-card metric-card">
                <div className="metric-icon ideas-icon"><Lightbulb size={22} /></div>
                <div className="metric-value">{metrics.totalIdeas}</div>
                <div className="metric-label">Ideas Generated</div>
              </div>
              <div className="glass-card metric-card">
                <div className="metric-icon images-icon"><ImageIcon size={22} /></div>
                <div className="metric-value">{metrics.totalImages}</div>
                <div className="metric-label">Images Created</div>
              </div>
              <div className="glass-card metric-card">
                <div className="metric-icon videos-icon"><Video size={22} /></div>
                <div className="metric-value">{metrics.totalVideos}</div>
                <div className="metric-label">Videos Created</div>
              </div>
              <div className="glass-card metric-card">
                <div className="metric-icon posted-icon"><Send size={22} /></div>
                <div className="metric-value">{metrics.totalPosted}</div>
                <div className="metric-label">Published Posts</div>
              </div>
              <div className="glass-card metric-card">
                <div className="metric-icon scheduled-icon"><Calendar size={22} /></div>
                <div className="metric-value">{metrics.totalScheduled}</div>
                <div className="metric-label">Scheduled Posts</div>
              </div>
            </div>

            {/* Master Toggles */}
            <div className="glass-card master-toggles-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <h3>Master Feature Toggles</h3>
                  <p className="text-muted">Global overrides that affect all users. When disabled, features appear grayed out system-wide.</p>
                </div>
                {savingMaster && <Loader2 size={18} className="spin text-muted" />}
              </div>
              <div className="toggles-grid">
                <div className="toggle-row">
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Idea Generation</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>Allows creators to generate batches of 15 ideas.</div>
                  </div>
                  <ToggleSwitch
                    checked={masterToggles.idea_gen}
                    disabled={savingMaster}
                    onChange={() => handleMasterToggle('idea_gen', masterToggles.idea_gen)}
                  />
                </div>
                <div className="toggle-row">
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Image Generation</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>Allows creators to generate AI post banners and graphics.</div>
                  </div>
                  <ToggleSwitch
                    checked={masterToggles.image_gen}
                    disabled={savingMaster}
                    onChange={() => handleMasterToggle('image_gen', masterToggles.image_gen)}
                  />
                </div>
                <div className="toggle-row">
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Video Generation</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>Allows creators to generate AI video drafts.</div>
                  </div>
                  <ToggleSwitch
                    checked={masterToggles.video_gen}
                    disabled={savingMaster}
                    onChange={() => handleMasterToggle('video_gen', masterToggles.video_gen)}
                  />
                </div>
                <div className="toggle-row">
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Apify Auto-Scraping</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>Auto-extracts creator tone and pillar topics during onboarding.</div>
                  </div>
                  <ToggleSwitch
                    checked={masterToggles.apify}
                    disabled={savingMaster}
                    onChange={() => handleMasterToggle('apify', masterToggles.apify)}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* USERS VIEW */}
        {activeView === 'users' && !selectedUser && (
          <>
            <div className="view-header">
              <div>
                <h1>User Management</h1>
                <p className="text-muted">Manage candidates and toggle AI features per user.</p>
              </div>
              <button className="btn-primary flex-center" onClick={() => setShowInviteModal(true)}>
                <UserPlus size={16} /> Add User
              </button>
            </div>

            <div className="glass-card users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Usage Metrics</th>
                    <th>Ideas</th>
                    <th>Images</th>
                    <th>Videos</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-info">
                          <div className="user-name">{user.full_name || 'Unnamed'}</div>
                          <div className="user-email text-muted">{user.email}</div>
                        </div>
                      </td>
                      <td><span className={`role-badge ${user.role}`}>{user.role?.toUpperCase()}</span></td>
                      <td>
                        <div className="user-metrics-chips">
                          <span className="metric-chip ideas">{user.ideas_count || 0} ideas</span>
                          <span className="metric-chip images">{user.images_count || 0} imgs</span>
                          <span className="metric-chip videos">{user.videos_count || 0} vids</span>
                        </div>
                      </td>
                      <td>
                        <ToggleSwitch
                          checked={user.can_generate_ideas}
                          disabled={processingId === user.id}
                          onChange={() => handleToggle(user.id, user, 'can_generate_ideas')}
                        />
                      </td>
                      <td>
                        <ToggleSwitch
                          checked={user.can_generate_images}
                          disabled={processingId === user.id}
                          onChange={() => handleToggle(user.id, user, 'can_generate_images')}
                        />
                      </td>
                      <td>
                        <ToggleSwitch
                          checked={user.can_generate_videos}
                          disabled={processingId === user.id}
                          onChange={() => handleToggle(user.id, user, 'can_generate_videos')}
                        />
                      </td>
                      <td>
                        <ToggleSwitch
                          checked={user.is_active ?? true}
                          disabled={processingId === user.id}
                          onChange={() => handleStatusToggle(user.id, !(user.is_active ?? true))}
                        />
                      </td>
                      <td>
                        <button className="icon-btn" onClick={() => setSelectedUser(user)} title="View Details">
                          <Settings size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="empty-state">
                  <p className="text-muted">No users yet. Click "Add User" to create one.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* USER DETAIL VIEW */}
        {activeView === 'users' && selectedUser && (
          <>
            <div className="view-header">
              <div>
                <button className="text-button text-muted" onClick={() => setSelectedUser(null)} style={{ marginBottom: '0.5rem' }}>
                  &larr; Back to Users
                </button>
                <h1>{selectedUser.full_name || 'User Details'}</h1>
                <p className="text-muted">{selectedUser.email}</p>
              </div>
            </div>

            <div className="detail-grid">
              <div className="glass-card detail-card">
                <h3>Account Information</h3>
                <div className="detail-row"><span>Email</span><span>{selectedUser.email}</span></div>
                <div className="detail-row"><span>Role</span><span className={`role-badge ${selectedUser.role}`}>{selectedUser.role?.toUpperCase()}</span></div>
                <div className="detail-row"><span>Timezone</span><span>{selectedUser.timezone || 'Asia/Karachi'}</span></div>
                <div className="detail-row"><span>Created</span><span>{new Date(selectedUser.created_at).toLocaleDateString()}</span></div>
                <div className="detail-row"><span>LinkedIn</span><span>{selectedUser.linkedin_connected ? 'Connected' : 'Not Connected'}</span></div>
              </div>

              <div className="glass-card detail-card">
                <h3>Usage & Activity</h3>
                <div className="detail-row"><span>Ideas Generated</span><strong>{selectedUser.ideas_count || 0}</strong></div>
                <div className="detail-row"><span>Images Created</span><strong>{selectedUser.images_count || 0}</strong></div>
                <div className="detail-row"><span>Videos Created</span><strong>{selectedUser.videos_count || 0}</strong></div>
                <div className="detail-row"><span>Published Posts</span><strong>{selectedUser.published_count || 0}</strong></div>
              </div>

              <div className="glass-card detail-card">
                <h3>Feature Permissions</h3>
                <div className="toggle-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Idea Generation</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Can generate daily batches of 15 ideas</div>
                  </div>
                  <ToggleSwitch
                    checked={selectedUser.can_generate_ideas}
                    disabled={processingId === selectedUser.id}
                    onChange={() => handleToggle(selectedUser.id, selectedUser, 'can_generate_ideas')}
                  />
                </div>
                <div className="toggle-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Image Generation</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Can generate AI post graphics</div>
                  </div>
                  <ToggleSwitch
                    checked={selectedUser.can_generate_images}
                    disabled={processingId === selectedUser.id}
                    onChange={() => handleToggle(selectedUser.id, selectedUser, 'can_generate_images')}
                  />
                </div>
                <div className="toggle-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Video Generation</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Can generate AI video drafts</div>
                  </div>
                  <ToggleSwitch
                    checked={selectedUser.can_generate_videos}
                    disabled={processingId === selectedUser.id}
                    onChange={() => handleToggle(selectedUser.id, selectedUser, 'can_generate_videos')}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* PASSWORD REQUESTS VIEW */}
        {activeView === 'requests' && (
          <>
            <div className="view-header">
              <h1>Password Reset Requests</h1>
              <p className="text-muted">Review and manage user password reset requests.</p>
            </div>

            <div className="glass-card">
              {pendingRequests.length === 0 ? (
                <div className="empty-state">
                  <Bell size={28} />
                  <p className="text-muted">No password reset requests.</p>
                </div>
              ) : (
                <div className="requests-list">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="request-item">
                      <div className="request-info">
                        <div className="request-email">{req.email}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {new Date(req.created_at).toLocaleString()} - Status: {req.status}
                        </div>
                      </div>
                      {req.status === 'pending' && (
                        <div className="request-actions">
                          <button
                            className="btn-approve"
                            onClick={() => handlePasswordAction(req.id, 'approve')}
                            disabled={processingId === req.id}
                          >
                            {processingId === req.id ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Approve
                          </button>
                          <button
                            className="btn-decline"
                            onClick={() => handlePasswordAction(req.id, 'decline')}
                            disabled={processingId === req.id}
                          >
                            <X size={14} /> Decline
                          </button>
                        </div>
                      )}
                      {req.status !== 'pending' && (
                        <span className={`status-pill ${req.status === 'approved' ? 'active' : 'inactive'}`}>
                          {req.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* CREATE USER MODAL */}
      {showInviteModal && (
        <div className="modal-backdrop">
          <div className="glass-card modal-container">
            <div className="modal-header">
              <h3>Create User Account</h3>
              <button className="close-btn" onClick={() => setShowInviteModal(false)}><X size={18} /></button>
            </div>

            {modalError && <div className="alert error">{modalError}</div>}

            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="e.g. John Doe" className="input-field" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="user@company.com" className="input-field" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Initial Password</label>
                <input type="password" className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select className="input-field" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="creator">Creator / Candidate</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="switches-section">
                <label className="section-label">AI Feature Permissions</label>
                <div className="switch-row"><span>Ideas</span><ToggleSwitch checked={newIdeas} disabled={false} onChange={() => setNewIdeas(!newIdeas)} /></div>
                <div className="switch-row"><span>Images</span><ToggleSwitch checked={newImages} disabled={false} onChange={() => setNewImages(!newImages)} /></div>
                <div className="switch-row"><span>Videos</span><ToggleSwitch checked={newVideos} disabled={false} onChange={() => setNewVideos(!newVideos)} /></div>
              </div>
              <div className="invite-note">
                An invitation email with a secure password setup link will be automatically sent to this address upon creation.
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-center" disabled={modalLoading}>
                  {modalLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: var(--color-bg);
        }
        .admin-sidebar {
          width: 240px;
          border-radius: 0;
          border-right: 1px solid var(--color-border);
          border-top: none;
          border-bottom: none;
          border-left: none;
          display: flex;
          flex-direction: column;
          padding: 1.5rem 1rem;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 0.5rem 1.5rem;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-danger);
          font-size: 1.1rem;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding-top: 1rem;
          flex: 1;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.6rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          transition: all 0.2s;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: none;
        }
        .sidebar-link:hover {
          background: rgba(148, 163, 184, 0.08);
          color: var(--color-text-primary);
        }
        .sidebar-link.active {
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-brand);
          font-weight: 600;
        }
        .badge {
          background: var(--color-danger);
          color: white;
          font-size: 0.65rem;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          margin-left: auto;
          font-weight: 700;
        }
        .sidebar-footer {
          border-top: 1px solid var(--color-border);
          padding-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .text-danger { color: var(--color-danger); }

        .admin-main {
          flex: 1;
          padding: 2rem;
          max-width: 1100px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-y: auto;
        }
        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .view-header h1 {
          font-size: 1.85rem;
          color: var(--color-text-primary);
          margin-bottom: 0.25rem;
        }
        .text-muted { color: var(--color-text-muted); font-size: 0.875rem; }
        .flex-center { display: flex; align-items: center; gap: 0.5rem; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Metrics */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
        }
        .metric-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          text-align: center;
          border: none;
        }
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .users-icon { background: rgba(59, 130, 246, 0.1); color: var(--color-brand); }
        .ideas-icon { background: rgba(245, 158, 11, 0.1); color: var(--color-warning); }
        .images-icon { background: rgba(16, 185, 129, 0.1); color: var(--color-success); }
        .videos-icon { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .posted-icon { background: rgba(236, 72, 153, 0.1); color: #ec4899; }
        .scheduled-icon { background: rgba(59, 130, 246, 0.1); color: var(--color-brand); }
        .metric-value { font-size: 2rem; font-weight: 700; color: var(--color-text-primary); }
        .metric-label { font-size: 0.8rem; color: var(--color-text-muted); font-weight: 500; }

        /* Master Toggles */
        .master-toggles-card { padding: 1.5rem; }
        .master-toggles-card h3 { font-size: 1.1rem; margin-bottom: 0.25rem; }
        .toggles-grid { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(148, 163, 184, 0.04);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
        }
        .status-pill {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
        }
        .status-pill.active { background: rgba(16, 185, 129, 0.12); color: var(--color-success); }
        .status-pill.inactive { background: rgba(239, 68, 68, 0.12); color: var(--color-danger); }

        /* Users Table */
        .users-table-container { overflow-x: auto; border-radius: var(--radius-lg); }
        .users-table { width: 100%; border-collapse: collapse; }
        .users-table th, .users-table td { padding: 1rem 1.25rem; text-align: left; border-bottom: 1px solid var(--color-border); }
        .users-table th { background: rgba(148, 163, 184, 0.05); font-weight: 600; font-size: 0.8rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
        .user-info { display: flex; flex-direction: column; }
        .user-name { font-weight: 600; color: var(--color-text-primary); }
        .user-email { font-size: 0.825rem; }
        .role-badge { font-size: 0.7rem; text-transform: uppercase; padding: 0.2rem 0.55rem; border-radius: var(--radius-md); font-weight: 700; letter-spacing: 0.05em; }
        .role-badge.admin { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.2); }
        .role-badge.creator { background: rgba(59, 130, 246, 0.1); color: var(--color-brand); border: 1px solid rgba(59, 130, 246, 0.2); }
        .icon-btn { padding: 0.4rem; border-radius: var(--radius-md); color: var(--color-text-secondary); transition: 0.2s; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; }
        .user-metrics-chips { display: flex; gap: 0.35rem; flex-wrap: wrap; }
        .metric-chip {
          font-size: 0.72rem;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-sm);
          font-weight: 500;
          background: rgba(148, 163, 184, 0.08);
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border);
        }
        .metric-chip.ideas { color: var(--color-warning); border-color: rgba(245, 158, 11, 0.2); background: rgba(245, 158, 11, 0.06); }
        .metric-chip.images { color: var(--color-success); border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.06); }
        .metric-chip.videos { color: #8b5cf6; border-color: rgba(139, 92, 246, 0.2); background: rgba(139, 92, 246, 0.06); }

        /* Detail Grid */
        .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
        .detail-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .detail-card h3 { font-size: 1.05rem; color: var(--color-text-primary); }
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--color-border); font-size: 0.875rem; }
        .detail-row span:first-child { color: var(--color-text-secondary); }
        .detail-row span:last-child { font-weight: 500; color: var(--color-text-primary); }
        .invite-note { font-size: 0.8rem; color: var(--color-brand); background: rgba(59, 130, 246, 0.08); padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 1px solid rgba(59, 130, 246, 0.2); line-height: 1.4; }

        /* Password Requests */
        .requests-list { display: flex; flex-direction: column; }
        .request-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border); }
        .request-item:last-child { border-bottom: none; }
        .request-email { font-weight: 600; font-size: 0.9rem; }
        .request-actions { display: flex; gap: 0.5rem; }
        .btn-approve { display: flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.75rem; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.1); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.2); font-size: 0.8rem; font-weight: 500; cursor: pointer; }
        .btn-approve:hover { background: rgba(16, 185, 129, 0.2); }
        .btn-decline { display: flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.75rem; border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.2); font-size: 0.8rem; font-weight: 500; cursor: pointer; }
        .btn-decline:hover { background: rgba(239, 68, 68, 0.2); }

        /* Alerts */
        .alert { padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
        .alert.success { background: rgba(16, 185, 129, 0.1); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.2); }
        .alert.error { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.2); }

        /* Modal */
        .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
        .modal-container { width: 100%; max-width: 480px; padding: 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid var(--color-border); }
        .modal-header h3 { font-size: 1.2rem; font-weight: 600; color: var(--color-text-primary); }
        .close-btn { color: var(--color-text-muted); padding: 0.25rem; border-radius: var(--radius-md); background: none; border: none; cursor: pointer; }
        .close-btn:hover { color: var(--color-text-primary); }
        .modal-form { display: flex; flex-direction: column; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-group label { font-size: 0.85rem; font-weight: 500; color: var(--color-text-secondary); }
        .switches-section { background: rgba(148, 163, 184, 0.05); padding: 0.85rem; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 0.75rem; }
        .section-label { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-secondary); }
        .switch-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; }
        .btn-secondary { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-primary); padding: 0.5rem 1rem; border-radius: var(--radius-md); font-weight: 500; cursor: pointer; }
        .btn-secondary:hover { background: rgba(148, 163, 184, 0.08); }
        .text-button { background: none; border: none; cursor: pointer; font-size: 0.875rem; }

        @media (max-width: 768px) {
          .admin-layout { flex-direction: column; }
          .admin-sidebar { width: 100%; height: auto; position: relative; flex-direction: row; padding: 0.75rem; overflow-x: auto; }
          .sidebar-header { padding: 0 0.5rem 0 0; border-bottom: none; border-right: 1px solid var(--color-border); }
          .sidebar-nav { flex-direction: row; padding-top: 0; gap: 0.25rem; }
          .sidebar-footer { flex-direction: row; border-top: none; border-left: 1px solid var(--color-border); padding-top: 0; padding-left: 0.5rem; }
          .admin-main { padding: 1rem; }
          .metrics-grid { grid-template-columns: repeat(2, 1fr); }
          .detail-grid { grid-template-columns: 1fr; }
          .view-header { flex-direction: column; gap: 1rem; }
        }
      `}</style>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean, onChange: () => void, disabled: boolean }) {
  return (
    <>
      <button
        type="button"
        className={`toggle-switch ${checked ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={onChange}
        disabled={disabled}
      >
        <span className="toggle-thumb" />
      </button>
      <style jsx>{`
        .toggle-switch { width: 40px; height: 24px; border-radius: 12px; background: var(--color-border); position: relative; cursor: pointer; transition: background 0.3s; border: none; padding: 0; }
        .toggle-switch.active { background: var(--color-brand); }
        .toggle-switch.disabled { opacity: 0.5; cursor: not-allowed; }
        .toggle-thumb { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: white; transition: transform 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .toggle-switch.active .toggle-thumb { transform: translateX(16px); }
      `}</style>
    </>
  );
}
