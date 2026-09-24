'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { authError } from '@/lib/auth-errors';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [org, setOrg] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (org.trim().length < 2) return setError('Enter the name of your organization.');
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    setBusy(true);
    const supabase = supabaseBrowser();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim(), org_name: org.trim() },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (signUpError) {
      setBusy(false);
      return setError(authError(signUpError.message));
    }
    if (data.session) {
      await supabase.rpc('create_organization', { p_name: org.trim() });
      router.replace('/dashboard');
      return;
    }
    setBusy(false);
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email">
        <Notice tone="success" title={`We sent a link to ${sentTo}`}>
          Open it on this device to finish setting up {org}. It can take a minute to arrive. Check your spam folder if you
          don’t see it.
        </Notice>
        <MailCheck className="mt-10 size-16 text-accent" strokeWidth={1.25} aria-hidden="true" />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Start an election"
      intro="Create an account for your organization. You can set up elections right away."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-accent underline-offset-2 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <Field
          label=”Organization name”
          htmlFor=”org”
          hint=”Voters will see this name when they vote.”
        >
          <Input id=”org” value={org} onChange={(e) => setOrg(e.target.value)} required maxLength={120} autoComplete=”organization” />
        </Field>
        <Field label="Your name" htmlFor="name">
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </Field>
        <Field
          label="Your email"
          htmlFor="email"
          hint="An organization email helps us approve you faster."
        >
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
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
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
