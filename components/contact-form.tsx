'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error || 'Something went wrong. Please try again.');
      else setSent(true);
    } catch {
      setError('We could not reach the server. Check your internet connection and try again.');
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <Notice tone="success" title="Message sent">
        Thank you. We will reply to the email you gave us.
      </Notice>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <Field label="Your name" htmlFor="c-name">
        <Input id="c-name" name="name" required maxLength={120} autoComplete="name" />
      </Field>
      <Field label="Your email" htmlFor="c-email" hint="We reply here.">
        <Input id="c-email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="How can we help?" htmlFor="c-message" hint="For an invoice, tell us your group, the date and how many voters.">
        <Textarea id="c-message" name="message" required rows={6} maxLength={3000} />
      </Field>
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && <Notice tone="danger">{error}</Notice>}
      <Button type="submit" size="lg" loading={busy} className="justify-self-start">
        Send message
      </Button>
    </form>
  );
}
