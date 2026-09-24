import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { APP_NAME } from '@/lib/config';

export function VoterShell({ orgName, homeHref, children }: { orgName: string; homeHref: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-4">
      <header className="mx-auto w-full max-w-xl py-4">
        <Link href={homeHref || '/'} className="text-xs font-bold tracking-wider text-ink-2 uppercase hover:text-ink">
          {orgName}
        </Link>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 pb-10">{children}</main>
      <footer className="mx-auto flex w-full max-w-xl items-center gap-2 border-t border-line py-4 text-xs text-ink-3">
        <ShieldCheck className="size-4" aria-hidden="true" />
        <span>Your vote is secret. Run on {APP_NAME}.</span>
      </footer>
    </div>
  );
}
