import { ButtonLink } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

export default function NotFound() {
  return (
    <div className="px-4 sm:px-6">
      <header className="mx-auto max-w-6xl py-5">
        <Logo />
      </header>
      <main className="mx-auto max-w-md pt-12 pb-20">
        <p className="font-mono text-sm font-bold text-ink-3">404</p>
        <h1 className="mt-2 text-2xl font-bold">We couldn’t find that page</h1>
        <p className="mt-2 text-ink-2">
          If someone sent you a voting link, check that you typed it exactly. Voting links look like
          <span className="font-mono text-ink"> /v/your-school/src-elections</span>.
        </p>
        <ButtonLink href="/" variant="secondary" className="mt-6">
          Go to the home page
        </ButtonLink>
      </main>
    </div>
  );
}
