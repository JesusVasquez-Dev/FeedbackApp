import React from 'react';

export type CheckboxFieldProps = {
  id?: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

export default function CheckboxField({ id, label, description, checked, onChange, disabled }: CheckboxFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={fieldId} className={`flex items-start gap-3 ${disabled ? 'opacity-60' : ''}`}>
      <span className="relative mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
        <input
          id={fieldId}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span
          className={`pointer-events-none box-content inline-flex h-4 w-4 items-center justify-center rounded-md border transition-colors
          ${checked ? 'border-violet-600 bg-violet-600' : 'border-gray-300 bg-white'}
          peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 peer-focus-visible:ring-offset-2
          peer-hover:ring-2 peer-hover:ring-violet-100`}
        >
          {/* Check glyph */}
          <svg
            className={`h-3 w-3 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      </span>
      <span className="select-none">
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </span>
    </label>
  );
}
