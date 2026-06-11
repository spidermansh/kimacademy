import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils';
import { Notification, NotificationType } from '../types';
import {
  Bell, X, CheckCheck, Trash2, RefreshCw,
  AlertTriangle, CalendarCheck, Info, Clock, ListTodo, ChevronRight,
} from 'lucide-react';

// ─── Type config ─────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<NotificationType, { label: string; color: string; bgColor: string; Icon: any }> = {
  fee_warning:  { label: 'Học phí',    color: 'text-red-600',     bgColor: 'bg-red-50',     Icon: AlertTriangle },
  attendance:   { label: 'Điểm danh',  color: 'text-amber-600',   bgColor: 'bg-amber-50',   Icon: CalendarCheck },
  system:       { label: 'Hệ thống',   color: 'text-indigo-600',  bgColor: 'bg-indigo-50',  Icon: Info },
  reminder:     { label: 'Nhắc nhở',   color: 'text-emerald-600', bgColor: 'bg-emerald-50', Icon: Clock },
  todo:         { label: 'Cần làm',    color: 'text-violet-600',  bgColor: 'bg-violet-50',  Icon: ListTodo },
};

const PRIORITY_INDICATOR: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-400',
  low: 'border-l-slate-300',
};

interface NotificationCenterProps {
  onNavigate?: (tab: string) => void;
}

export default function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Auto-generate + fetch on mount
  useEffect(() => {
    loadAndGenerate();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAndGenerate = async () => {
    setLoading(true);
    try {
      const generated = await api.generateNotifications();
      setNotifications(generated);
    } catch (err) {
      console.error('Error loading notifications:', err);
      try {
        const list = await api.getNotifications();
        setNotifications(list);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const handleNotifClick = (n: Notification) => {
    if (!n.isRead) handleMarkRead(n.id);
    if (n.link && onNavigate) {
      onNavigate(n.link);
      setIsOpen(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  };

  // Group: Today's to-dos vs other notifications
  const todos = notifications.filter(n => n.type === 'todo' && !n.isRead);
  const others = notifications.filter(n => n.type !== 'todo' || n.isRead);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group"
        title="Thông báo"
        id="notification-bell"
      >
        <Bell className={`w-5 h-5 transition-colors ${unreadCount > 0 ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 flex flex-col"
          style={{ animation: 'slideDown 0.15s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-violet-600 shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-200" />
              <h3 className="text-sm font-bold text-white">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={loadAndGenerate}
                title="Làm mới"
                className="p-1.5 rounded-lg hover:bg-white/20 text-indigo-200 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Đánh dấu tất cả đã đọc"
                  className="p-1.5 rounded-lg hover:bg-white/20 text-indigo-200 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-indigo-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Bell className="w-10 h-10 mb-3 text-slate-300" />
                <p className="text-sm font-medium">Không có thông báo</p>
                <p className="text-[11px] mt-1">Mọi thứ đều ổn! 🎉</p>
              </div>
            ) : (
              <>
                {/* Today's to-do section */}
                {todos.length > 0 && (
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <ListTodo className="w-3 h-3" />
                      Việc cần làm hôm nay ({todos.length})
                    </p>
                    <div className="space-y-1.5">
                      {todos.map(n => (
                        <NotifItem
                          key={n.id}
                          notification={n}
                          onClick={() => handleNotifClick(n)}
                          onDelete={() => handleDelete(n.id)}
                          formatTime={formatTime}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other notifications */}
                {others.length > 0 && (
                  <div className="px-3 pt-3 pb-2">
                    {todos.length > 0 && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Thông báo khác
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {others.slice(0, 20).map(n => (
                        <NotifItem
                          key={n.id}
                          notification={n}
                          onClick={() => handleNotifClick(n)}
                          onDelete={() => handleDelete(n.id)}
                          formatTime={formatTime}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Single notification item ─────────────────────────────────────────────────
function NotifItem({
  notification: n,
  onClick,
  onDelete,
  formatTime,
}: {
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
  formatTime: (iso: string) => string;
  key?: string;
}) {
  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
  const { Icon } = config;
  const priorityBorder = PRIORITY_INDICATOR[n.priority || 'low'];

  return (
    <div
      className={`
        flex items-start gap-2.5 p-2.5 rounded-xl border-l-[3px] transition-all cursor-pointer group
        ${priorityBorder}
        ${n.isRead
          ? 'bg-white hover:bg-slate-50 opacity-70'
          : 'bg-indigo-50/50 hover:bg-indigo-50'
        }
      `}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bgColor}`}>
        {n.icon ? (
          <span className="text-sm">{n.icon}</span>
        ) : (
          <Icon className={`w-4 h-4 ${config.color}`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className={`text-xs leading-snug ${n.isRead ? 'text-slate-600' : 'text-slate-800 font-semibold'}`}>
            {n.title}
          </p>
          {!n.isRead && (
            <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1" />
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-slate-300">{formatTime(n.createdAt)}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {n.link && (
              <ChevronRight className="w-3 h-3 text-indigo-400" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
              title="Xóa"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
