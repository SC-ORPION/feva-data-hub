import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/logo';

export function AuthShell({ title, intro, children, footer }: { title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="px-4 sm:px-6">
      <header className="mx-auto max-w-6xl py-5">
        <Logo />
      </header>
      <main className="mx-auto max-w-md pt-6 pb-20 sm:pt-12">
        <h1 className="text-2xl font-bold">{title}</h1>
        {intro && <div className="mt-2 text-ink-2">{intro}</div>}
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 border-t border-line pt-5 text-sm text-ink-2">{footer}</div>}
      </main>
    </div>
  );
}
