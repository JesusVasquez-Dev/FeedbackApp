import React from 'react';
import { useLocation } from 'react-router-dom';

export type Step = { path: string; label: string };

export default function Stepper({ steps }: { steps: Step[] }) {
  const { pathname } = useLocation();
  const activeIndex = Math.max(0, steps.findIndex((s) => pathname.startsWith(s.path)));
  const progress = Math.round(((activeIndex + 1) / steps.length) * 100);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {steps.map((s, i) => {
            const active = i === activeIndex;
            const done = i < activeIndex;
            return (
              <div key={s.path} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${done ? 'bg-green-500' : active ? 'bg-primary-600' : 'bg-gray-300'}`} />
                <span
                  aria-disabled
                  className={`text-sm select-none ${active ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && <span className="text-gray-300">•</span>}
              </div>
            );
          })}
        </div>
        <div className="text-xs text-gray-500">{progress}% Complete</div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-indigo-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
