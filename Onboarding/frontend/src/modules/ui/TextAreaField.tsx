import React from 'react';

export type TextAreaFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
};

export default function TextAreaField({
  id,
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  hint,
  error,
  disabled,
  required,
}: TextAreaFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
  const base = 'block w-full rounded-lg border bg-white text-sm placeholder-gray-400 focus:outline-none px-3 py-2';
  const state = disabled
    ? 'border-gray-200 text-gray-500 bg-gray-50'
    : error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 hover:border-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500';

  return (
    <div>
      <label htmlFor={fieldId} className="label">
        {label}
      </label>
      <textarea
        id={fieldId}
        className={`${base} ${state}`}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
