import React, { useEffect, useMemo, useRef, useState } from 'react';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function fmt(date: Date) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`; // ISO (we'll store in yyyy-mm-dd for compatibility with native input)
}

function toLocalISO(date?: string) {
  if (!date) return '';
  // Accept yyyy-mm-dd as stored
  return date;
}

function parseIsoLocal(iso?: string): Date | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  // Construct as LOCAL time to avoid UTC timezone shifts
  return new Date(y, mo, d);
}

export default function DatePicker({
  id,
  label,
  value,
  onChange,
  placeholder = 'mm/dd/yyyy',
  error,
  disabled,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string>(toLocalISO(value));
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [yearBase, setYearBase] = useState<number>(new Date().getFullYear() - 6);

  useEffect(() => setDraft(toLocalISO(value)), [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (!popRef.current || !anchorRef.current) return;
      const t = e.target as Node;
      if (!popRef.current.contains(t) && !anchorRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Calendar state
  const initial = draft ? parseIsoLocal(draft)! : new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth()); // 0-based

  useEffect(() => {
    const d = draft ? parseIsoLocal(draft)! : new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setYearBase(d.getFullYear() - 6);
  }, [open]);

  const monthName = useMemo(() => new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' }), [year, month]);
  const monthText = useMemo(() => new Date(year, month, 1).toLocaleString(undefined, { month: 'long' }), [year, month]);

  function daysInMonth(y: number, m: number) {
    return new Date(y, m + 1, 0).getDate();
  }

  function startWeekday(y: number, m: number) {
    // 0=Sun
    return new Date(y, m, 1).getDay();
  }

  const grid = useMemo(() => {
    const first = startWeekday(year, month);
    const total = daysInMonth(year, month);
    const cells: Array<{ day?: number; date?: string }[]> = [];
    let row: Array<{ day?: number; date?: string }> = [];
    for (let i = 0; i < first; i++) {
      row.push({});
    }
    for (let d = 1; d <= total; d++) {
      const actual = fmt(new Date(year, month, d));
      row.push({ day: d, date: actual });
      if (row.length === 7) {
        cells.push(row);
        row = [];
      }
    }
    if (row.length) {
      while (row.length < 7) row.push({});
      cells.push(row);
    }
    return cells;
  }, [year, month]);

  function apply() {
    onChange(draft || '');
    setOpen(false);
  }

  function clear() {
    setDraft('');
  }

  function today() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setDraft(fmt(now));
  }

  const base = 'w-full rounded-lg border bg-white text-sm h-10 px-3 pl-9 text-left flex items-center justify-between';
  const state = disabled
    ? 'border-gray-200 text-gray-500 bg-gray-50'
    : error
    ? 'border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500'
    : `border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 ${open ? 'border-violet-500 ring-2 ring-violet-500' : ''}`;

  const display = (() => {
    const d = parseIsoLocal(draft);
    return d ? d.toLocaleDateString() : '';
  })();

  return (
    <div className="relative">
      <label htmlFor={fieldId} className="label">{label}</label>
      <div className="relative">
        <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border ${disabled ? 'border-gray-200' : error ? 'border-red-500' : 'border-gray-300'}`}></span>
        <button
          id={fieldId}
          ref={anchorRef}
          className={`${base} ${state}`}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`${display ? 'text-gray-900' : 'text-gray-400'}`}>{display || placeholder}</span>
          <svg className={`ml-3 h-4 w-4 text-gray-400`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM18 9H2v6a2 2 0 002 2h12a2 2 0 002-2V9z"/>
          </svg>
        </button>
        {open && (
          <div ref={popRef} className="z-30 absolute mt-1 w-[280px] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden p-3">
            <div className="mb-2 grid grid-cols-3 items-center">
              <div className="flex items-center">
                <button
                  className="h-7 w-7 rounded-full hover:bg-gray-100 text-gray-700"
                  onClick={() => {
                    if (showYearPicker) {
                      setYearBase((b) => b - 12);
                    } else {
                      setMonth((m) => (m === 0 ? (setYear(year - 1), 11) : m - 1));
                    }
                  }}
                  aria-label="Previous"
                >
                  ‹
                </button>
              </div>
              <div className="text-center font-medium text-gray-900 flex items-center justify-center gap-2 leading-tight">
                <span className="text-base">{monthText}</span>
                <button
                  type="button"
                  className="text-sm underline decoration-dotted text-violet-600 hover:text-violet-700"
                  onClick={() => setShowYearPicker((v) => {
                    const next = !v;
                    if (next) setYearBase(year - 6);
                    return next;
                  })}
                >
                  {year}
                </button>
              </div>
              <div className="flex items-center justify-end">
                <button
                  className="h-7 w-7 rounded-full hover:bg-gray-100 text-gray-700"
                  onClick={() => {
                    if (showYearPicker) {
                      setYearBase((b) => b + 12);
                    } else {
                      setMonth((m) => (m === 11 ? (setYear(year + 1), 0) : m + 1));
                    }
                  }}
                  aria-label="Next"
                >
                  ›
                </button>
              </div>
            </div>
            {showYearPicker ? (
              <div className="mt-1">
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const y = yearBase + i;
                    const active = y === year;
                    return (
                      <button key={y} type="button" onClick={() => { setYear(y); setShowYearPicker(false); }} className={`h-8 rounded-md text-sm ${active ? 'bg-violet-600 text-white' : 'text-gray-900 hover:bg-violet-50'}`}>{y}</button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-500 px-0.5">
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => <div key={d} className="text-center py-1">{d}</div>)}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {grid.flat().map((cell, i) => (
                    <button
                      key={i}
                      disabled={!cell.date}
                      onClick={() => cell.date && setDraft(cell.date!)}
                      className={`h-8 w-8 grid place-items-center rounded-full ${cell.date ? (draft===cell.date ? 'hover:bg-violet-500' : 'hover:bg-violet-50') : 'opacity-40 cursor-default'} ${draft===cell.date ? 'bg-violet-600 text-white' : 'text-gray-900'}`}
                    >
                      <span className="text-sm leading-none">{cell.day || ''}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="mt-3 flex items-center justify-between text-xs">
              <button className="text-gray-500 hover:text-gray-700" onClick={clear} type="button">Clear</button>
              <button className="text-primary-600 hover:text-primary-700" onClick={today} type="button">Today</button>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="btn btn-outline" onClick={()=> setOpen(false)} type="button">Cancel</button>
              <button className="btn btn-cta" onClick={apply} type="button">Apply</button>
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
