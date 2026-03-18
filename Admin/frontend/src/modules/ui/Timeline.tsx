import React from 'react';

type Item = {
  day: 1 | 30 | 60 | 90;
  title: string;
  completed?: boolean;
};

export default function Timeline({ items }: { items: Item[] }) {
  // Determine current: first non-completed item
  const firstOpenIndex = items.findIndex((i) => !i.completed);
  return (
    <ol className="relative">
      {/* base vertical track centered on markers */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" aria-hidden="true" />
      {items.map((it, idx) => {
        const current = !it.completed && (idx === firstOpenIndex || firstOpenIndex === -1);
        return (
          <li key={it.day} className={`relative pl-12 pb-5 ${idx === items.length - 1 ? 'pb-0' : ''}`}>
            {/* Marker */}
            <span className="absolute left-5 -translate-x-1/2 mt-0.5 inline-flex h-7 w-7 items-center justify-center transform">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white transition-colors ${
                  it.completed
                    ? 'bg-violet-500 text-white'
                    : current
                    ? 'bg-violet-600 text-white ring-4 ring-violet-200'
                    : 'bg-gray-100'
                }`}
              >
                {it.completed ? (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className={`block h-2 w-2 rounded-full ${current ? 'bg-white' : 'bg-gray-300'}`} />
                )}
              </span>
            </span>
            {/* Connector to next */}
            {idx < items.length - 1 && (
              <span
                className={`absolute left-5 top-7 w-px ${it.completed || current ? 'bg-violet-400' : 'bg-gray-200'}`}
                style={{ height: 'calc(100% - 1.75rem)' }}
                aria-hidden="true"
              />
            )}
            {/* Text */}
            <div className="flex items-start gap-3">
              <div>
                <h4 className={`text-gray-900 font-semibold ${current ? 'text-violet-700' : ''}`}>Day {it.day}: {it.title}</h4>
                {current && <p className="mt-0.5 text-xs text-violet-600">In progress</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
