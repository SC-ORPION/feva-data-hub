import Link from 'next/link';
import { APP_NAME } from '@/lib/config';

export function LogoMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4" y="13" width="24" height="15" rx="2.5" fill="var(--accent)" />
      <rect x="9" y="12" width="14" height="3" rx="1.5" fill="var(--paper)" />
      <path d="M11.5 13.5 13 4h8l1.5 9.5" fill="var(--card)" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m14.2 8.2 1.6 1.7 3-3.3" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-md font-bold tracking-tight text-ink">
      <LogoMark />
      <span className="text-lg">{APP_NAME}</span>
    </Link>
  );
}
