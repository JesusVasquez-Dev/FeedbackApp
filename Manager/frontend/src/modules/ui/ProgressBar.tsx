import React from 'react';

export default function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary-600 transition-all"
        style={{ width: `${clamped}%` }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        role="progressbar"
      />
    </div>
  );
}
