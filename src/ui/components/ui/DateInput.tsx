import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { isoToVNDate, vnDateToISO } from '../../../shared/utils';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateInputProps {
  value: string;                         // YYYY-MM-DD
  onChange: (isoDate: string) => void;    // emits YYYY-MM-DD
  className?: string;
  required?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const WEEKDAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Parse dd/mm/yyyy → { day, month, year } or null */
function parseVNDate(text: string): { day: number; month: number; year: number } | null {
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  if (year < 1900 || year > 2100) return null;
  return { day, month, year };
}

/** Format day/month/year → YYYY-MM-DD */
function toISO(day: number, month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Auto-insert slashes: "19" → "19/", "1906" → "19/06/", etc. */
function autoSlash(raw: string): string {
  // Remove all non-digit non-slash
  let digits = raw.replace(/[^\d]/g, '');
  if (digits.length > 8) digits = digits.slice(0, 8);

  let result = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) result += '/';
    result += digits[i];
  }
  return result;
}

/* ─── Calendar Grid ────────────────────────────────────────────────────────── */

function CalendarPopup({
  selectedDate,
  onSelect,
  onClose,
}: {
  selectedDate: string; // YYYY-MM-DD
  onSelect: (iso: string) => void;
  onClose: () => void;
}) {
  const today = useMemo(() => {
    const d = new Date();
    return toISO(d.getDate(), d.getMonth() + 1, d.getFullYear());
  }, []);

  const initYear = selectedDate ? parseInt(selectedDate.slice(0, 4), 10) : new Date().getFullYear();
  const initMonth = selectedDate ? parseInt(selectedDate.slice(5, 7), 10) : new Date().getMonth() + 1;

  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        // Check if click is on the toggle button (parent handles that)
        const target = e.target as HTMLElement;
        if (target.closest('[data-dateinput-toggle]')) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build grid
  const totalDays = daysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=Sun
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday-based

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  // Fill remaining to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];

  return (
    <div
      ref={popupRef}
      className="bg-white rounded-xl shadow-2xl border border-slate-200 p-3 w-[280px] select-none"
      style={{ zIndex: 9999 }}
      onClick={e => e.stopPropagation()}
    >
      {/* Month/Year header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <span className="text-sm font-bold text-slate-800">
          {monthNames[viewMonth - 1]}, {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_HEADERS.map(h => (
          <div key={h} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">
            {h}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-8" />;
          }
          const iso = toISO(day, viewMonth, viewYear);
          const isSelected = iso === selectedDate;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={`h-8 w-full rounded-lg text-xs font-medium transition-all
                ${isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isToday
                    ? 'bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-300'
                    : 'text-slate-700 hover:bg-slate-100'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Today button */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between">
        <button
          type="button"
          onClick={() => {
            onSelect('');
            onClose();
          }}
          className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded transition-colors"
        >
          Xóa
        </button>
        <button
          type="button"
          onClick={() => onSelect(today)}
          className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg transition-colors"
        >
          Hôm nay
        </button>
      </div>
    </div>
  );
}

/* ─── DateInput Component ──────────────────────────────────────────────────── */

/**
 * DateInput — Text input gõ phím dd/mm/yyyy + Calendar popup.
 *
 * - Gõ phím: tự chèn `/` sau dd và mm
 * - Click icon 📅: mở/đóng calendar popup
 * - Chọn ngày từ calendar → cập nhật input
 * - API: value (YYYY-MM-DD), onChange (YYYY-MM-DD)
 */
export default function DateInput({
  value,
  onChange,
  className = '',
  required = false,
  min,
  max,
  placeholder,
  disabled = false,
}: DateInputProps) {
  const [textValue, setTextValue] = useState(() => value ? isoToVNDate(value) : '');
  const [showCalendar, setShowCalendar] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value → textValue
  useEffect(() => {
    const expected = value ? isoToVNDate(value) : '';
    setTextValue(expected);
  }, [value]);

  // Handle text input changes
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = autoSlash(raw);
    setTextValue(formatted);

    // If complete dd/mm/yyyy, try to parse and emit
    if (formatted.length === 10) {
      const parsed = parseVNDate(formatted);
      if (parsed) {
        const iso = toISO(parsed.day, parsed.month, parsed.year);
        onChange(iso);
      }
    }
    // If cleared, emit empty
    if (formatted === '') {
      onChange('');
    }
  }, [onChange]);

  // On blur: validate and revert if invalid
  const handleBlur = useCallback(() => {
    if (textValue === '') {
      if (value) onChange('');
      return;
    }
    const parsed = parseVNDate(textValue);
    if (parsed) {
      const iso = toISO(parsed.day, parsed.month, parsed.year);
      if (iso !== value) onChange(iso);
    } else {
      // Revert to current value
      setTextValue(value ? isoToVNDate(value) : '');
    }
  }, [textValue, value, onChange]);

  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
      setShowCalendar(false);
    }
    if (e.key === 'Escape') {
      setShowCalendar(false);
    }
  }, [handleBlur]);

  // Toggle calendar popup
  const toggleCalendar = useCallback(() => {
    if (disabled) return;
    if (!showCalendar && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const popupHeight = 320;
      const top = spaceBelow >= popupHeight
        ? rect.bottom + 4
        : rect.top - popupHeight - 4;
      setPopupPosition({
        top: Math.max(4, top),
        left: Math.max(4, Math.min(rect.left, window.innerWidth - 290)),
      });
    }
    setShowCalendar(prev => !prev);
  }, [disabled, showCalendar]);

  // Calendar selects a date
  const handleCalendarSelect = useCallback((iso: string) => {
    onChange(iso);
    setTextValue(iso ? isoToVNDate(iso) : '');
    setShowCalendar(false);
    inputRef.current?.focus();
  }, [onChange]);

  // Clean className — strip flex/justify that were from old overlay approach
  const baseClass = className
    .replace(/\bflex\b/g, '')
    .replace(/\bitems-center\b/g, '')
    .replace(/\bjustify-between\b/g, '')
    .trim();

  return (
    <div ref={wrapperRef} className={`relative inline-flex w-full ${disabled ? 'opacity-60' : ''}`}>
      <div className={`flex items-center w-full ${baseClass || 'px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white'}`}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={textValue}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'dd/mm/yyyy'}
          disabled={disabled}
          required={required}
          maxLength={10}
          className="flex-1 bg-transparent border-none outline-none text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal min-w-0"
          style={{ fontSize: 'inherit' }}
        />
        <button
          type="button"
          data-dateinput-toggle="true"
          onClick={toggleCalendar}
          disabled={disabled}
          className="shrink-0 ml-2 p-0.5 rounded hover:bg-slate-100 transition-colors"
          tabIndex={-1}
        >
          <Calendar className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Calendar Popup — rendered via portal-like fixed positioning */}
      {showCalendar && popupPosition && (
        <div
          className="fixed"
          style={{
            top: popupPosition.top,
            left: popupPosition.left,
            zIndex: 9999,
            animation: 'datePickerFadeIn 0.15s ease-out',
          }}
        >
          <CalendarPopup
            selectedDate={value}
            onSelect={handleCalendarSelect}
            onClose={() => setShowCalendar(false)}
          />
        </div>
      )}
    </div>
  );
}
