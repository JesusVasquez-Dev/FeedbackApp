import React from 'react';

export type DateFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
};

export default function DateField({
  id,
  label,
  value,
  onChange,
  placeholder = 'mm/dd/yyyy',
  hint,
  error,
  disabled,
  required,
}: DateFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
  const base = 'peer block w-full rounded-lg border bg-white text-sm placeholder-gray-400 h-10 px-3 pl-9';
  const state = disabled
    ? 'border-gray-200 text-gray-500 bg-gray-50'
    : error
    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500'
    : 'border-gray-300 hover:border-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500';

  return (
    <div className="relative">
      <label htmlFor={fieldId} className="label">
        {label}
      </label>
      <div className="relative">
        <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border ${disabled ? 'border-gray-200' : error ? 'border-red-500' : 'border-gray-300'} peer-focus:border-violet-500`}></span>
        <input
          id={fieldId}
          type="date"
          className={`${base} ${state}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
        />
      </div>
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
