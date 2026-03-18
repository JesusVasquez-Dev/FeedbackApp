import React from 'react';

export type ToggleFieldProps = {
  id?: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

export default function ToggleField({ id, label, description, checked, onChange, disabled }: ToggleFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={fieldId} className={`flex w-full items-start gap-3 ${disabled ? 'opacity-60' : ''}`}>
      <span className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full bg-gray-200 transition-colors ring-1 ring-black/5">
        <input
          id={fieldId}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="absolute inset-0 rounded-full peer-checked:bg-violet-600" />
        <span className="absolute left-0.5 top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span className="select-none">
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </span>
    </label>
  );
}
