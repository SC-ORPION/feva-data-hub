'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { useAdmin } from '@/lib/admin-context';
import { authError } from '@/lib/auth-errors';
import { orgVotingHome } from '@/lib/config';
import { supabaseBrowser } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/voting/errors';

const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export default function SettingsPage() {
  const { org, session, refreshOrg } = useAdmin();
  // The dashboard only renders pages once the organization has loaded in the browser.
  const [name, setName] = useState(org?.name ?? '');
  const [slug, setSlug] = useState(org?.slug ?? '');
  const [orgMsg, setOrgMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [password, setPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  if (!org) return null;

  async function saveOrg(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    const cleanSlug = slug.trim().toLowerCase();
    if (name.trim().length < 2) return setOrgMsg({ tone: 'danger', text: 'Enter your organization’s name.' });
    if (!SLUG.test(cleanSlug)) {
      return setOrgMsg({ tone: 'danger', text: 'Use 3 to 40 small letters, numbers or dashes for the web address, like “achimota-src”.' });
    }
    setBusy('org');
    const { error } = await supabaseBrowser().from('organizations').update({ name: name.trim(), slug: cleanSlug }).eq('id', org.id);
    setBusy(null);
    if (error) return setOrgMsg({ tone: 'danger', text: friendlyError(error) });
    await refreshOrg();
    setOrgMsg({ tone: 'success', text: 'Saved.' });
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setPwMsg({ tone: 'danger', text: 'Use at least 8 characters.' });
    setBusy('pw');
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(null);
    if (error) return setPwMsg({ tone: 'danger', text: authError(error.message) });
    setPassword('');
    setPwMsg({ tone: 'success', text: 'Password changed.' });
  }

  return (
    <div className="grid max-w-xl gap-10">
      <h1 className="text-2xl font-bold">Settings</h1>

      <form onSubmit={saveOrg} className="grid gap-5">
        <h2 className="text-lg font-bold">Organization</h2>
        <Field label="Name" htmlFor="org-name" hint="Voters see this on every voting page.">
          <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </Field>
        <Field
          label="Web address"
          htmlFor="org-slug"
          hint={
            <>
              Your voting pages live at <span className="font-mono break-all text-ink">{orgVotingHome(slug || 'your-name', origin)}</span>. Changing it
              breaks links you have already shared.
            </>
          }
        >
          <Input id="org-slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} maxLength={40} className="font-mono" />
        </Field>
        <p className="text-sm text-ink-2">
          Status:{' '}
          <span className="font-semibold text-ink">
            {org.status === 'approved' ? 'Approved' : org.status === 'pending' ? 'Waiting for approval' : 'Not approved'}
          </span>
          {org.email_domain && ` · Email domain ${org.email_domain}${org.domain_verified ? ' (confirmed)' : ''}`}
        </p>
        {orgMsg && <Notice tone={orgMsg.tone}>{orgMsg.text}</Notice>}
        <Button type="submit" loading={busy === 'org'} className="justify-self-start">
          Save organization
        </Button>
      </form>

      <form onSubmit={savePassword} className="grid gap-5 border-t border-line pt-8">
        <h2 className="text-lg font-bold">Your account</h2>
        <p className="-mt-2 text-ink-2">Signed in as {session?.user.email}</p>
        <Field label="New password" htmlFor="new-password" hint="At least 8 characters.">
          <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        {pwMsg && <Notice tone={pwMsg.tone}>{pwMsg.text}</Notice>}
        <Button type="submit" variant="secondary" loading={busy === 'pw'} className="justify-self-start">
          Change password
        </Button>
      </form>
    </div>
  );
}
