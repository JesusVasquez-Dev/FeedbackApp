import React from 'react';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<Size, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export default function Avatar({
  src,
  name,
  size = 'md',
  online = false,
}: {
  src?: string;
  name: string;
  size?: Size;
  online?: boolean;
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700 ${sizeMap[size]}`}>
      {src ? (
        <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="font-semibold">{initials}</span>
      )}
      {online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white bg-green-500" />}
    </div>
  );
}
