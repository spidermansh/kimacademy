import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  // Shorthand helpers
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  // Confirm dialog
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ── Icons & styles per type ───────────────────────────────────────────────────
const TYPE_CONFIG: Record<ToastType, { icon: React.ReactNode; bar: string; bg: string; text: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    bar: 'bg-emerald-500',
    bg: 'bg-white border-l-4 border-emerald-500',
    text: 'text-slate-800',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: <XCircle className="w-5 h-5" />,
    bar: 'bg-red-500',
    bg: 'bg-white border-l-4 border-red-500',
    text: 'text-slate-800',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bar: 'bg-amber-500',
    bg: 'bg-white border-l-4 border-amber-500',
    text: 'text-slate-800',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    bar: 'bg-indigo-500',
    bg: 'bg-white border-l-4 border-indigo-500',
    text: 'text-slate-800',
    iconColor: 'text-indigo-500',
  },
};

// ── Single Toast item ─────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const cfg = TYPE_CONFIG[toast.type];
  const duration = toast.duration ?? 4000;

  return (
    <div
      className={`
        relative flex items-start gap-3 rounded-xl shadow-lg p-4 min-w-[280px] max-w-[380px]
        ${cfg.bg} ${cfg.text}
        animate-[slideInRight_0.3s_ease-out]
      `}
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-1 rounded-bl-xl ${cfg.bar} opacity-40`}
        style={{ animation: `shrinkWidth ${duration}ms linear forwards` }}
      />

      {/* Icon */}
      <span className={`shrink-0 mt-0.5 ${cfg.iconColor}`}>{cfg.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 p-6 max-w-sm w-full z-10 animate-[fadeScaleIn_0.2s_ease-out]">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto border ${
          options.danger 
            ? 'bg-red-950/45 border-red-800/40 text-red-400' 
            : 'bg-amber-950/45 border-amber-800/40 text-amber-400'
        }`}>
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Text */}
        <h3 className="text-base font-bold text-white text-center mb-2">{options.title}</h3>
        {options.message && (
          <p className="text-sm text-slate-400 text-center leading-relaxed mb-5">{options.message}</p>
        )}
        {!options.message && <div className="mb-5" />}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl transition-all cursor-pointer"
          >
            {options.cancelText ?? 'Hủy'}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg ${
              options.danger
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30'
            }`}
          >
            {options.confirmText ?? 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    clearTimeout(timerRefs.current[id]);
    delete timerRefs.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const duration = toast.duration ?? 4000;
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]); // max 5 toasts
    timerRefs.current[id] = setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) =>
    addToast({ type: 'success', title, message }), [addToast]);
  const error = useCallback((title: string, message?: string) =>
    addToast({ type: 'error', title, message, duration: 6000 }), [addToast]);
  const warning = useCallback((title: string, message?: string) =>
    addToast({ type: 'warning', title, message }), [addToast]);
  const info = useCallback((title: string, message?: string) =>
    addToast({ type: 'info', title, message }), [addToast]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    confirmState?.resolve(true);
    setConfirmState(null);
  };
  const handleCancel = () => {
    confirmState?.resolve(false);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info, confirm }}>
      {children}

      {/* Toast container — top-right */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <ConfirmDialog
          options={confirmState.options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
