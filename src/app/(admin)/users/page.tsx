'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, UserPlus, Settings, ShieldAlert, Mail, X, Check, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // New user form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password123!');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('creator');
  const [newIdeas, setNewIdeas] = useState(true);
  const [newImages, setNewImages] = useState(true);
  const [newVideos, setNewVideos] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data || []);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
    setLoading(false);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, flags: newFlags })
      });
      
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, ...newFlags } : u));
        setActionSuccess(`Updated permissions for ${currentFlags.full_name || currentFlags.email}`);
        setTimeout(() => setActionSuccess(''), 3000);
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
        headers: { 'Content-Type': 'application/json' },
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setShowInviteModal(false);
      setNewEmail('');
      setNewFullName('');
      setActionSuccess(`User ${newEmail} created successfully.`);
      setTimeout(() => setActionSuccess(''), 4000);
      fetchUsers();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>User Management & Candidate Controls</h1>
          <p className="text-muted">Manage candidates, creators, and toggle AI generation features per user.</p>
        </div>
        <button 
          className="btn-primary flex-center"
          onClick={() => setShowInviteModal(true)}
        >
          <UserPlus size={16} /> Add Candidate / Creator
        </button>
      </div>

      {actionSuccess && (
        <div className="alert success">
          <CheckCircle size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      <div className="users-table-container glass-card">
        {loading ? (
          <div className="loading-state">
            <Loader2 size={32} className="spin text-muted" />
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Candidate / User</th>
                <th>Role</th>
                <th>Idea Gen</th>
                <th>Image Gen</th>
                <th>Video Gen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-name">{user.full_name || 'Pending Name'}</div>
                      <div className="user-email text-muted">{user.email}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${user.role}`}>{user.role.toUpperCase()}</span>
                  </td>
                  <td>
                    <div className="toggle-cell">
                      <ToggleSwitch 
                        checked={user.can_generate_ideas} 
                        disabled={processingId === user.id}
                        onChange={() => handleToggle(user.id, user, 'can_generate_ideas')}
                      />
                      <span className="toggle-label">{user.can_generate_ideas ? 'Active' : 'Off'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="toggle-cell">
                      <ToggleSwitch 
                        checked={user.can_generate_images} 
                        disabled={processingId === user.id}
                        onChange={() => handleToggle(user.id, user, 'can_generate_images')}
                      />
                      <span className="toggle-label">{user.can_generate_images ? 'Active' : 'Off'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="toggle-cell">
                      <ToggleSwitch 
                        checked={user.can_generate_videos} 
                        disabled={processingId === user.id}
                        onChange={() => handleToggle(user.id, user, 'can_generate_videos')}
                      />
                      <span className="toggle-label">{user.can_generate_videos ? 'Active' : 'Off'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <Link href="/settings" className="icon-btn" title="View Account Settings">
                        <Settings size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {showInviteModal && (
        <div className="modal-backdrop">
          <div className="glass-card modal-container">
            <div className="modal-header">
              <h3>Create Candidate Account</h3>
              <button 
                className="close-btn"
                onClick={() => setShowInviteModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="alert error">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="form-group">
                <label>Candidate Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rachel Adams" 
                  className="input-field"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  placeholder="candidate@company.com" 
                  className="input-field"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Initial Password</label>
                <input 
                  type="password" 
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select 
                  className="input-field"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="creator">Creator / Candidate</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="switches-section">
                <label className="section-label">Initial AI Feature Permissions</label>
                <div className="switch-row">
                  <span>Idea Generation</span>
                  <ToggleSwitch checked={newIdeas} disabled={false} onChange={() => setNewIdeas(!newIdeas)} />
                </div>
                <div className="switch-row">
                  <span>Image Generation</span>
                  <ToggleSwitch checked={newImages} disabled={false} onChange={() => setNewImages(!newImages)} />
                </div>
                <div className="switch-row">
                  <span>Video Generation</span>
                  <ToggleSwitch checked={newVideos} disabled={false} onChange={() => setNewVideos(!newVideos)} />
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary flex-center"
                  disabled={modalLoading}
                >
                  {modalLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        h1 {
          font-size: 1.85rem;
          color: var(--color-text-primary);
          margin-bottom: 0.25rem;
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
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .alert {
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .alert.success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .alert.error {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .users-table-container {
          overflow-x: auto;
          border-radius: var(--radius-lg);
        }
        .users-table {
          width: 100%;
          border-collapse: collapse;
        }
        .users-table th, .users-table td {
          padding: 1rem 1.5rem;
          text-align: left;
          border-bottom: 1px solid var(--color-border);
        }
        .users-table th {
          background: rgba(148, 163, 184, 0.05);
          font-weight: 600;
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .user-info {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .user-email {
          font-size: 0.825rem;
        }
        .role-badge {
          font-size: 0.7rem;
          text-transform: uppercase;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-md);
          font-weight: 700;
          letter-spacing: 0.05em;
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
        .toggle-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .toggle-label {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          min-width: 40px;
        }
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .icon-btn {
          padding: 0.4rem;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          transition: 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover {
          background: rgba(148, 163, 184, 0.1);
          color: var(--color-text-primary);
        }
        .loading-state {
          padding: 4rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        /* Modal styling */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }
        .modal-container {
          width: 100%;
          max-width: 480px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
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
          border-radius: var(--radius-md);
        }
        .close-btn:hover {
          color: var(--color-text-primary);
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .switches-section {
          background: rgba(148, 163, 184, 0.05);
          padding: 0.85rem;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.25rem;
        }
        .section-label {
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--color-text-secondary);
        }
        .switch-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
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
        }
        .btn-secondary:hover {
          background: rgba(148, 163, 184, 0.08);
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
        .toggle-switch {
          width: 40px;
          height: 24px;
          border-radius: 12px;
          background: var(--color-border);
          position: relative;
          cursor: pointer;
          transition: background 0.3s;
          border: none;
          padding: 0;
        }
        .toggle-switch.active {
          background: var(--color-brand);
        }
        .toggle-switch.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          transition: transform 0.3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .toggle-switch.active .toggle-thumb {
          transform: translateX(16px);
        }
      `}</style>
    </>
  );
}
