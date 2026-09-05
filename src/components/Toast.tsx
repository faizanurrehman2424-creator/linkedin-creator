'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast]);
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      <div className="toast-container" aria-live="polite" role="region">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item toast-${t.type} glass-card`}>
            <div className="toast-icon">
              {t.type === 'success' && <CheckCircle2 size={18} className="text-success" />}
              {t.type === 'error' && <AlertCircle size={18} className="text-danger" />}
              {t.type === 'info' && <Info size={18} className="text-brand" />}
            </div>
            <span className="toast-message">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="toast-close"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .toast-container {
          position: fixed;
          top: 1.25rem;
          right: 1.25rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          pointer-events: none;
          max-width: 420px;
          width: calc(100% - 2.5rem);
        }
        .toast-item {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          animation: toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          transition: all 0.2s ease;
        }
        .toast-item.toast-success {
          border-left: 3px solid var(--color-success);
        }
        .toast-item.toast-error {
          border-left: 3px solid var(--color-danger);
        }
        .toast-item.toast-info {
          border-left: 3px solid var(--color-brand);
        }
        .toast-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .toast-message {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-primary);
          flex: 1;
          line-height: 1.4;
        }
        .toast-close {
          color: var(--color-text-muted);
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .toast-close:hover {
          color: var(--color-text-primary);
          background: rgba(148, 163, 184, 0.15);
        }
        .text-success { color: var(--color-success); }
        .text-danger { color: var(--color-danger); }
        .text-brand { color: var(--color-brand); }

        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      toast: (msg: string) => console.log('Toast:', msg),
      success: (msg: string) => console.log('Success Toast:', msg),
      error: (msg: string) => console.error('Error Toast:', msg),
      info: (msg: string) => console.log('Info Toast:', msg),
    };
  }
  return context;
}
