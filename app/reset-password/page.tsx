'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { PageLoading } from '@/components/ui/spinner';
import { authError } from '@/lib/auth-errors';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    // The link's token is read from the URL on load; give it a moment before giving up.
    const timer = setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      setReady(Boolean(s.session));
    }, 1500);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    setError(null);
    setBusy(true);
    const { error: updateError } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(authError(updateError.message));
    router.replace('/dashboard');
  }

  if (ready === null) return <PageLoading label="Checking your link" />;

  return (
    <AuthShell title="Choose a new password">
      {ready ? (
        <form onSubmit={submit} className="grid gap-5">
          <Field label="New password" htmlFor="password" hint="At least 8 characters.">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" size="lg" loading={busy}>
            Save password
          </Button>
        </form>
      ) : (
        <Notice
          tone="warn"
          title="This link has expired or was already used"
          action={
            <Link href="/forgot-password" className="font-semibold text-accent underline-offset-2 hover:underline">
              Send a new link
            </Link>
          }
        />
      )}
    </AuthShell>
  );
}
