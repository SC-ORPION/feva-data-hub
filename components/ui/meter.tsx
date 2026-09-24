// A progress/turnout bar. The fill slides in from the left inside a clipped track,
// which keeps its rounded end and animates on the compositor instead of re-laying out.
export function Meter({
  value,
  max = 100,
  tone = 'accent',
  className = 'h-2',
  label,
}: {
  value: number;
  max?: number;
  tone?: 'accent' | 'muted';
  className?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={`overflow-hidden rounded-full bg-sunk ${className}`}
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(pct) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-hidden={label ? undefined : true}
    >
      <div
        className={`meter h-full w-full rounded-full ${tone === 'accent' ? 'bg-accent' : 'bg-line-strong'}`}
        style={{ transform: `translateX(${pct - 100}%)` }}
      />
    </div>
  );
}
