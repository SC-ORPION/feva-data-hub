'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { authError } from '@/lib/auth-errors';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: resetError } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) return setError(authError(resetError.message));
    setSent(true);
  }

  return (
    <AuthShell
      title="Reset your password"
      intro="We’ll email you a link to choose a new one."
      footer={
        <Link href="/login" className="font-semibold text-accent underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Notice tone="success" title="Check your email">
          If {email} has an account, a reset link is on its way. It can take a minute to arrive.
        </Notice>
      ) : (
        <form onSubmit={submit} className="grid gap-5">
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" size="lg" loading={busy}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
