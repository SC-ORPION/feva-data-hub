import { Fingerprint } from 'lucide-react';

// The square on a paper ballot where the voter presses their thumb.
export function ThumbBox({ selected, tone = 'accent' }: { selected: boolean; tone?: 'accent' | 'danger' }) {
  const on = tone === 'danger' ? 'border-danger bg-danger text-card' : 'border-accent bg-accent text-accent-ink';
  return (
    <span
      className={`flex size-12 shrink-0 items-center justify-center rounded-md border-2 transition-[background-color,border-color] duration-150 ease-[var(--ease-out)] ${
        selected ? on : 'border-dashed border-line-strong bg-paper'
      }`}
      aria-hidden="true"
    >
      {/* The thumbprint presses in, like ink on a paper ballot. */}
      <Fingerprint
        className={`size-7 transition-[opacity,transform] duration-200 ease-[var(--ease-out)] ${selected ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        strokeWidth={1.75}
      />
    </span>
  );
}

export function Initials({ name, className = 'size-14 text-lg' }: { name: string; className?: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-md bg-sunk font-bold text-ink-2 ${className}`}
      aria-hidden="true"
    >
      {letters || '?'}
    </span>
  );
}
