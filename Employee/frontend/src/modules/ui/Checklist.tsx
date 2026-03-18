import React from 'react';
import CheckboxField from './CheckboxField';

type Item = { id: string; label: string; checked: boolean };

export default function Checklist({ items, onChange }: { items: Item[]; onChange: (id: string, checked: boolean) => void }) {
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <CheckboxField
          key={it.id}
          id={`chk-${it.id}`}
          label={it.label}
          checked={it.checked}
          onChange={(v) => onChange(it.id, v)}
        />
      ))}
    </div>
  );
}
