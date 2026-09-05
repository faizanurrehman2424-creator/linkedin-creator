'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Moon, 
  Sun, 
  User, 
  Settings, 
  LogOut, 
  Clock, 
  Shield, 
  Calendar as CalendarIcon, 
  Lightbulb, 
  ChevronDown,
  LogIn,
  Menu,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function Header() {
  const [isDark, setIsDark] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('creator');
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    
    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Fetch Supabase session user
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role) {
          setUserRole(profile.role);
        }
      }
    }
    getUser();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.setAttribute('data-theme', newDark ? 'dark' : 'light');
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    setIsMobileNavOpen(false);
    router.push('/login');
    router.refresh();
  };

  const isActive = (path: string) => pathname === path;

  // Don't render header on admin pages (admin has its own layout)
  if (pathname?.startsWith('/admin')) return null;

  return (
    <header className="glass-card header-container">
      <div className="header-content">
        <div className="header-left">
          <Link href="/ideas" className="brand-logo">
            <strong>LinkedIn AI Engine</strong>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="nav-links desktop-nav">
            <Link 
              href="/ideas" 
              className={`nav-link ${isActive('/ideas') ? 'active' : ''}`}
            >
              <Lightbulb size={16} />
              <span>Ideas Studio</span>
            </Link>

            <Link 
              href="/calendar" 
              className={`nav-link ${isActive('/calendar') ? 'active' : ''}`}
            >
              <CalendarIcon size={16} />
              <span>Calendar</span>
            </Link>
          </nav>
        </div>
        
        <div className="header-actions">
          <div className="timezone-badge">
            <Clock size={14} />
            <span>Asia/Karachi</span>
          </div>

          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Admin Icon */}
          <Link href="/admin/login" className="admin-btn" title="Admin Panel">
            <Shield size={18} />
          </Link>

          {/* Mobile hamburger */}
          <button 
            className="hamburger-btn"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            aria-label="Toggle navigation"
          >
            {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* User Profile Dropdown Menu */}
          <div className="user-dropdown" ref={menuRef}>
            <button 
              className={`avatar-btn ${isMenuOpen ? 'active' : ''}`} 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="User menu"
            >
              <User size={18} />
              <ChevronDown size={14} className={`chevron-icon ${isMenuOpen ? 'open' : ''}`} />
            </button>

            {isMenuOpen && (
              <div className="dropdown-menu glass-card">
                <div className="dropdown-header">
                  <div className="user-email text-muted">
                    {currentUser?.email || 'Not signed in'}
                  </div>
                  <span className={`role-badge ${userRole}`}>
                    {userRole.toUpperCase()}
                  </span>
                </div>

                <Link 
                  href="/settings" 
                  className={`dropdown-item ${isActive('/settings') ? 'active-item' : ''}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings size={16} /> Settings
                </Link>

                <div className="dropdown-divider" />

                {currentUser ? (
                  <button onClick={handleLogout} className="dropdown-item text-danger">
                    <LogOut size={16} /> Logout
                  </button>
                ) : (
                  <Link 
                    href="/login" 
                    className="dropdown-item text-brand"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <LogIn size={16} /> Sign In
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMobileNavOpen && (
        <div className="mobile-nav-overlay">
          <nav className="mobile-nav glass-card">
            <Link 
              href="/ideas" 
              className={`mobile-nav-link ${isActive('/ideas') ? 'active' : ''}`}
              onClick={() => setIsMobileNavOpen(false)}
            >
              <Lightbulb size={18} /> Ideas Studio
            </Link>
            <Link 
              href="/calendar" 
              className={`mobile-nav-link ${isActive('/calendar') ? 'active' : ''}`}
              onClick={() => setIsMobileNavOpen(false)}
            >
              <CalendarIcon size={18} /> Calendar
            </Link>
            <Link 
              href="/settings" 
              className={`mobile-nav-link ${isActive('/settings') ? 'active' : ''}`}
              onClick={() => setIsMobileNavOpen(false)}
            >
              <Settings size={18} /> Settings
            </Link>
            <Link 
              href="/admin/login" 
              className="mobile-nav-link"
              onClick={() => setIsMobileNavOpen(false)}
            >
              <Shield size={18} /> Admin Panel
            </Link>
            <div className="mobile-nav-divider" />
            {currentUser ? (
              <button className="mobile-nav-link text-danger" onClick={handleLogout}>
                <LogOut size={18} /> Logout
              </button>
            ) : (
              <Link href="/login" className="mobile-nav-link text-brand" onClick={() => setIsMobileNavOpen(false)}>
                <LogIn size={18} /> Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
      
      <style jsx>{`
        .header-container {
          position: sticky;
          top: 0;
          z-index: 50;
          border-radius: 0;
          border-left: none;
          border-right: none;
          border-top: none;
          padding: 0.85rem 2rem;
        }
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 2.5rem;
        }
        .brand-logo {
          font-size: 1.2rem;
          color: var(--color-brand);
          letter-spacing: -0.01em;
          white-space: nowrap;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.85rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-secondary);
          transition: all 0.2s;
        }
        .nav-link:hover {
          color: var(--color-text-primary);
          background: rgba(148, 163, 184, 0.08);
        }
        .nav-link.active {
          color: var(--color-brand);
          background: rgba(59, 130, 246, 0.1);
          font-weight: 600;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .timezone-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.825rem;
          color: var(--color-text-secondary);
          background: rgba(148, 163, 184, 0.1);
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-xl);
          border: 1px solid var(--color-border);
        }
        .theme-toggle {
          color: var(--color-text-secondary);
          padding: 0.5rem;
          border-radius: 50%;
          transition: background 0.2s, color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .theme-toggle:hover {
          background: rgba(148, 163, 184, 0.1);
          color: var(--color-text-primary);
        }
        .admin-btn {
          color: var(--color-text-secondary);
          padding: 0.45rem;
          border-radius: var(--radius-md);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .admin-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-danger);
        }
        .hamburger-btn {
          display: none;
          color: var(--color-text-secondary);
          padding: 0.4rem;
          border-radius: var(--radius-md);
        }
        .hamburger-btn:hover {
          background: rgba(148, 163, 184, 0.1);
          color: var(--color-text-primary);
        }
        .user-dropdown {
          position: relative;
        }
        .avatar-btn {
          color: var(--color-text-secondary);
          padding: 0.4rem 0.65rem;
          border-radius: var(--radius-lg);
          transition: background 0.2s, color 0.2s;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(148, 163, 184, 0.06);
          border: 1px solid var(--color-border);
        }
        .avatar-btn:hover, .avatar-btn.active {
          background: rgba(148, 163, 184, 0.15);
          color: var(--color-text-primary);
        }
        .chevron-icon {
          transition: transform 0.2s;
        }
        .chevron-icon.open {
          transform: rotate(180deg);
        }
        .dropdown-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          min-width: 220px;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          box-shadow: var(--shadow-lg);
          animation: dropIn 0.15s ease-out;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dropdown-header {
          padding: 0.5rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .user-email {
          font-size: 0.8rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .text-muted { color: var(--color-text-muted); }
        .role-badge {
          align-self: flex-start;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
        }
        .role-badge.admin {
          color: var(--color-danger);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .role-badge.creator {
          color: var(--color-brand);
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .dropdown-divider {
          height: 1px;
          background: var(--color-border);
          margin: 0.35rem 0;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          color: var(--color-text-primary);
          width: 100%;
          text-align: left;
          transition: background 0.15s;
        }
        .dropdown-item:hover {
          background: rgba(148, 163, 184, 0.1);
        }
        .dropdown-item.active-item {
          background: rgba(59, 130, 246, 0.08);
          color: var(--color-brand);
          font-weight: 500;
        }
        .text-danger { color: var(--color-danger); }
        .text-brand { color: var(--color-brand); }

        /* Mobile Nav */
        .mobile-nav-overlay {
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 49;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .mobile-nav {
          margin: 1rem;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          border-radius: var(--radius-lg);
        }
        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          font-weight: 500;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: none;
        }
        .mobile-nav-link:hover {
          background: rgba(148, 163, 184, 0.08);
          color: var(--color-text-primary);
        }
        .mobile-nav-link.active {
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-brand);
        }
        .mobile-nav-divider {
          height: 1px;
          background: var(--color-border);
          margin: 0.5rem 0;
        }

        @media (max-width: 768px) {
          .header-container { padding: 0.75rem 1rem; }
          .desktop-nav { display: none; }
          .hamburger-btn { display: flex; }
          .timezone-badge { display: none; }
          .user-dropdown { display: none; }
          .admin-btn { display: none; }
        }
      `}</style>
    </header>
  );
}
