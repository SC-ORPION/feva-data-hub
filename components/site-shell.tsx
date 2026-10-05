import Link from 'next/link';
import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { APP_NAME } from '@/lib/config';

const LINKS = [
  ['/pricing', 'Pricing'],
  ['/help', 'Help'],
  ['/about', 'About'],
  ['/contact', 'Contact'],
] as const;

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl border-t border-line py-6 text-sm text-ink-3">
      <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
        {[...LINKS, ['/terms', 'Terms'], ['/privacy', 'Privacy']].map(([href, label]) => (
          <Link key={href} href={href} className="hover:text-ink hover:underline">
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <span>
          © {new Date().getFullYear()} {APP_NAME}
        </span>
        <span>Made for elections in Ghana</span>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 sm:px-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 py-5">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <Link href="/pricing" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-ink-2 hover:bg-sunk hover:text-ink sm:block">
            Pricing
          </Link>
          <Link href="/help" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-ink-2 hover:bg-sunk hover:text-ink sm:block">
            Help
          </Link>
          <ButtonLink href="/login" variant="ghost">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup" className="hidden sm:inline-flex">
            Start an election
          </ButtonLink>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl pt-6 pb-20 sm:pt-10">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function Article({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <article className="max-w-2xl">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {intro && <p className="mt-4 text-lg text-ink-2">{intro}</p>}
      <div className="[&_a]:font-semibold [&_a]:text-accent [&_a]:hover:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:text-ink-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-ink-2">
        {children}
      </div>
    </article>
  );
}
