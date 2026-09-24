'use client';

import { CheckCircle2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';

// Confirms a ballot is in the count. It never shows choices, so it can't prove a vote to anyone.
export function ReceiptCheck({ electionId, closed = false }: { electionId: string; closed?: boolean }) {
  const [code, setCode] = useState('');
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFingerprint(null);
    try {
      const res = await fetch('/api/vote/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ electionId, receipt: code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error || 'Something went wrong. Please try again.');
      else setFingerprint(json.fingerprint);
    } catch {
      setError('We could not reach the server. Check your internet connection and try again.');
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={submit} className="grid gap-2">
        <label htmlFor="receipt" className="text-sm font-semibold">
          Your receipt code
        </label>
        <div className="flex gap-2">
          <Input
            id="receipt"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="K7QM2-XP9RT"
            className="font-mono tracking-wider"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
          <Button type="submit" variant="secondary" loading={busy} className="!h-11">
            Check
          </Button>
        </div>
      </form>
      {error && <Notice tone="danger">{error}</Notice>}
      {fingerprint && (
        <div className="rise-in flex gap-3 rounded-lg bg-accent-soft px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold">Your ballot is in the count.</p>
            <p className="mt-0.5 text-ink-2">
              Its public fingerprint is <span className="font-mono font-bold text-ink">{fingerprint}</span>.{' '}
              {closed
                ? 'You can find it in the list of counted ballots below.'
                : 'Once voting closes, anyone can find it in the published list of counted ballots.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
