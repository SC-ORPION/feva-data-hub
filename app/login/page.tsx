'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { authError } from '@/lib/auth-errors';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: signInError } = await supabaseBrowser().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setBusy(false);
      return setError(authError(signInError.message));
    }
    router.replace('/dashboard');
  }

  return (
    <AuthShell
      title="Sign in"
      intro="For organizers. Voters don’t need an account: they use the link their organizers share."
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="font-semibold text-accent underline-offset-2 hover:underline">
            Start an election
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-5">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field
          label={
            <span className="flex items-baseline justify-between">
              Password
              <Link href="/forgot-password" className="text-sm font-normal text-accent underline-offset-2 hover:underline">
                Forgot it?
              </Link>
            </span>
          }
          htmlFor="password"
        >
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>
        {error && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" size="lg" loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
