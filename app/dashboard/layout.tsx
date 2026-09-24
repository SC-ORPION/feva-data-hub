'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Logo } from '@/components/ui/logo';
import { Notice } from '@/components/ui/notice';
import { PageLoading } from '@/components/ui/spinner';
import { AdminProvider, useAdmin } from '@/lib/admin-context';
import { supabaseBrowser } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/voting/errors';

function OrgSetup() {
  const { refreshOrg } = useAdmin();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Enter the name of your school, church or group.');
    setBusy(true);
    const { error: rpcError } = await supabaseBrowser().rpc('create_organization', { p_name: name.trim() });
    if (rpcError) {
      setBusy(false);
      return setError(friendlyError(rpcError));
    }
    await refreshOrg();
  }

  return (
    <AuthShell title="One more step" intro="What is the name of the school, church or group running elections?">
      <form onSubmit={submit} className="grid gap-5">
        <Field label="Organization name" htmlFor="org" hint="Voters will see this name.">
          <Input id="org" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </Field>
        {error && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" size="lg" loading={busy}>
          Continue
        </Button>
      </form>
    </AuthShell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { loading, session, org, isPlatformAdmin, signOut } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [loading, session, router]);

  if (loading || !session) return <PageLoading />;
  if (!org) return <OrgSetup />;

  const nav = [
    { href: '/dashboard', label: 'Elections', active: pathname === '/dashboard' || pathname.startsWith('/dashboard/elections') || pathname === '/dashboard/new' },
    { href: '/dashboard/settings', label: 'Settings', active: pathname === '/dashboard/settings' },
    ...(isPlatformAdmin ? [{ href: '/dashboard/platform', label: 'Approvals', active: pathname === '/dashboard/platform' }] : []),
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-card print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Logo href="/dashboard" />
          <span className="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-2">{org.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              router.replace('/login');
            }}
          >
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4" aria-label="Dashboard">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={`border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                item.active ? 'border-accent text-ink' : 'border-transparent text-ink-2 hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <Shell>{children}</Shell>
    </AdminProvider>
  );
}
