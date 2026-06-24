import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Văn bản phụ để tìm kiếm (SĐT, mã, lớp...) — không hiển thị. */
  keywords?: string;
}

interface Props {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Nếu có, hiện 1 mục rỗng (vd "-- Tất cả --") cho phép bỏ chọn. */
  emptyOptionLabel?: string;
  disabled?: boolean;
  /** Override class của ô input (mặc định đã khớp style chung). */
  className?: string;
  /** Số kết quả tối đa hiển thị mỗi lần (mặc định 50). */
  maxVisible?: number;
}

/**
 * Ô chọn có tìm kiếm (typeahead): gõ để lọc theo nhãn + keywords, bấm để chọn,
 * nút ✕ để xoá. Dùng cho danh sách dài (học viên, ...). value/onChange theo `value` (id).
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Gõ để tìm & chọn...',
  emptyOptionLabel,
  disabled = false,
  className,
  maxVisible = 50,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value) || null;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const { filtered, truncated } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = q
      ? options.filter(o => `${o.label} ${o.keywords || ''}`.toLowerCase().includes(q))
      : options;
    return { filtered: all.slice(0, maxVisible), truncated: all.length > maxVisible };
  }, [options, query, maxVisible]);

  const inputClass =
    className ||
    'w-full pl-9 pr-8 py-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          disabled={disabled}
          value={open ? query : selected ? selected.label : ''}
          placeholder={selected ? selected.label : placeholder}
          onFocus={() => !disabled && setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          className={inputClass}
        />
        {selected && !disabled && (
          <button
            type="button"
            onClick={() => { onChange(''); setQuery(''); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Xoá lựa chọn"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && !disabled && (
        <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-56 overflow-y-auto divide-y divide-slate-100">
          {emptyOptionLabel && (
            <div onClick={() => pick('')} className="px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 cursor-pointer">
              {emptyOptionLabel}
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-400 text-center">Không tìm thấy kết quả phù hợp</div>
          ) : (
            filtered.map(o => (
              <div
                key={o.value}
                onClick={() => pick(o.value)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 ${o.value === value ? 'bg-indigo-50/60 font-bold text-indigo-900' : 'text-slate-700'}`}
              >
                {o.label}
              </div>
            ))
          )}
          {truncated && (
            <div className="px-3 py-1.5 text-[10px] text-slate-400 text-center">Gõ thêm để thu hẹp kết quả…</div>
          )}
        </div>
      )}
    </div>
  );
}
