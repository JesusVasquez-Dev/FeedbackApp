import React, { useEffect, useMemo, useRef, useState } from 'react';

export type Option = { value: string; label: string };

export default function SelectList({
  id,
  label,
  hideLabel,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  hint,
  error,
  disabled,
}: {
  id?: string;
  label: string;
  hideLabel?: boolean;
  value?: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
}) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (!menuRef.current || !btnRef.current) return;
      const t = e.target as Node;
      if (!menuRef.current.contains(t) && !btnRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const base = 'w-full rounded-lg border bg-white text-sm h-10 px-3 pl-9 text-left flex items-center justify-between';
  const state = disabled
    ? 'border-gray-200 text-gray-500 bg-gray-50'
    : error
    ? 'border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500'
    : `border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 ${open ? 'border-violet-500 ring-2 ring-violet-500' : ''}`;

  return (
    <div className="relative">
      <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : 'label'}>{label}</label>
      <div className="relative">
        <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border ${disabled ? 'border-gray-200' : error ? 'border-red-500' : 'border-gray-300'}`}></span>
        <button
          id={fieldId}
          ref={btnRef}
          className={`${base} ${state}`}
          disabled={disabled}
          type="button"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`${selected ? 'text-gray-900' : 'text-gray-400'}`}>{selected ? selected.label : placeholder}</span>
          <svg className={`ml-3 h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.17l3.71-2.94a.75.75 0 111.04 1.08l-4.24 3.36a.75.75 0 01-.94 0L5.21 8.31a.75.75 0 01.02-1.1z" clipRule="evenodd" />
          </svg>
        </button>
        {open && (
          <div ref={menuRef} className="z-20 absolute mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="max-h-60 overflow-auto py-1">
              {options.map((o, idx) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 hover:bg-gray-50 ${active ? 'bg-violet-50/60' : ''}`}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full border ${active ? 'border-violet-600' : 'border-gray-300'}`} />
                    <span className="flex-1 text-gray-900">{o.label}</span>
                    {active && <span className="text-violet-600">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
