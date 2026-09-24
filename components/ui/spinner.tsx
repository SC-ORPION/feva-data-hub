export function Spinner({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin [animation-duration:700ms] ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-ink-2" role="status">
      <Spinner className="size-5" />
      <span>{label}…</span>
    </div>
  );
}
