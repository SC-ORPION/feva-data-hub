'use client';

import { ArrowLeft, ArrowRight, Eye, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, buttonClass } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { inputClass } from '@/components/ui/field';
import { Meter } from '@/components/ui/meter';
import { Notice } from '@/components/ui/notice';
import { formatDateTime, formatTime } from '@/lib/format';
import type { BallotChoice, Candidate, Position, VoterMethod } from '@/lib/voting/types';
import { ReceiptCheck } from './receipt-check';
import { Initials, ThumbBox } from './thumb-box';

interface Props {
  election: { id: string; title: string; description: string | null; voter_method: VoterMethod; resultsLive: boolean };
  positions: Position[];
  base: string;
  slug: string;
  /** Organizer preview: nothing is sent or saved. */
  preview?: boolean;
  /** Other elections of the same organization that are open right now. */
  others?: { title: string; href: string }[];
}

type Step = 'identify' | 'otp' | 'ballot' | 'review' | 'done' | 'voted' | 'receipt';
type Choice = { ids: string[]; approve?: boolean };

const ASK: Record<VoterMethod, { label: string; hint: string; type: string; inputMode: 'email' | 'tel' | 'text'; autoComplete: string; placeholder: string }> = {
  email: { label: 'Your email address', hint: 'Use the email your organizers have on their list.', type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
  phone: { label: 'Your phone number', hint: 'Use the number your organizers have on their list.', type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '024 123 4567' },
  member_id: { label: 'Your ID number', hint: 'Your student, staff or member ID.', type: 'text', inputMode: 'text', autoComplete: 'off', placeholder: '10293847' },
  code: { label: 'Your voting code', hint: 'The 10-character code on your voting slip or message.', type: 'text', inputMode: 'text', autoComplete: 'off', placeholder: 'K7QM2-XP9RT' },
};

async function post<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string; code?: string; votedAt?: string }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error || 'Something went wrong. Please try again.', code: json.code, votedAt: json.votedAt };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: 'We could not reach the server. Check your internet connection and try again.' };
  }
}

function Face({ c, size }: { c: Candidate; size: 'md' | 'lg' }) {
  const px = size === 'lg' ? 64 : 56;
  return c.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- small resized upload
    <img src={c.photo_url} alt="" width={px} height={px} decoding="async" className="size-16 shrink-0 rounded-md object-cover" />
  ) : (
    <Initials name={c.name} className="size-16 text-xl" />
  );
}

export function VoteFlow({ election, positions, base, slug, preview = false, others = [] }: Props) {
  const storeKey = `fv-choices-${election.id}`;
  const [step, setStep] = useState<Step>('identify');
  const [value, setValue] = useState('');
  const [ticket, setTicket] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [otp, setOtp] = useState('');
  const [testCode, setTestCode] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [name, setName] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [fromReview, setFromReview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [receipt, setReceipt] = useState('');
  const [votedAt, setVotedAt] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Pick up where the voter left off if the page reloads mid-ballot.
  useEffect(() => {
    if (preview) return;
    let active = true;
    fetch(`/api/vote/session?election=${election.id}`)
      .then((r) => r.json())
      .then((s: { verified: boolean; name?: string | null }) => {
        if (!active || !s.verified) return;
        try {
          const saved = sessionStorage.getItem(storeKey);
          if (saved) setChoices(JSON.parse(saved));
        } catch {}
        setName(s.name ?? null);
        setStep('ballot');
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [election.id, storeKey, preview]);

  useEffect(() => {
    if (preview) return;
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(choices));
    } catch {}
  }, [choices, storeKey, preview]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  function show(next: Step) {
    setError(null);
    setStep(next);
    topRef.current?.scrollIntoView({ block: 'start' });
  }

  function handleFailure(r: { error: string; code?: string; votedAt?: string }) {
    if (r.code === 'already_voted') {
      setVotedAt(r.votedAt ?? null);
      return show('voted');
    }
    if (r.code === 'restart') {
      setStep('identify');
      setOtp('');
    }
    setError({ text: r.error, code: r.code });
  }

  async function identify(e?: FormEvent) {
    e?.preventDefault();
    if (preview) {
      setIndex(0);
      return show('ballot');
    }
    setBusy(true);
    setError(null);
    const r = await post<{ step: 'otp' | 'ballot'; ticket?: string; sentTo?: string; channel?: 'email' | 'sms'; resendIn?: number; testCode?: string; name?: string | null }>(
      '/api/vote/start',
      { electionId: election.id, value },
    );
    setBusy(false);
    if (!r.ok) return handleFailure(r);
    if (r.data.step === 'ballot') {
      setName(r.data.name ?? null);
      return show('ballot');
    }
    setTicket(r.data.ticket ?? '');
    setSentTo(r.data.sentTo ?? '');
    setChannel(r.data.channel ?? 'email');
    setWait(r.data.resendIn ?? 60);
    setTestCode(r.data.testCode ?? null);
    setOtp('');
    show('otp');
  }

  async function resend() {
    setBusy(true);
    setError(null);
    const r = await post<{ ticket: string; resendIn: number; testCode?: string }>('/api/vote/start', { electionId: election.id, ticket });
    setBusy(false);
    if (!r.ok) return handleFailure(r);
    setTicket(r.data.ticket);
    setWait(r.data.resendIn);
    setTestCode(r.data.testCode ?? null);
    setOtp('');
  }

  async function verify(code: string) {
    setBusy(true);
    setError(null);
    const r = await post<{ name?: string | null }>('/api/vote/verify', { electionId: election.id, ticket, code });
    setBusy(false);
    if (!r.ok) {
      setOtp('');
      return handleFailure(r);
    }
    setName(r.data.name ?? null);
    setIndex(0);
    show('ballot');
  }

  async function submit() {
    if (preview) {
      setConfirming(false);
      setReceipt('PREVI-EW000');
      setVotedAt(new Date().toISOString());
      return show('done');
    }
    setBusy(true);
    const ballot: BallotChoice[] = positions
      .filter((p) => choices[p.id]?.ids.length)
      .map((p) => ({ position_id: p.id, candidate_ids: choices[p.id].ids, ...(choices[p.id].approve === false ? { approve: false } : {}) }));
    const r = await post<{ receipt: string; votedAt: string; emailed: boolean }>('/api/vote/submit', { electionId: election.id, choices: ballot });
    setBusy(false);
    setConfirming(false);
    if (!r.ok) return handleFailure(r);
    setReceipt(r.data.receipt);
    setVotedAt(r.data.votedAt);
    setEmailed(r.data.emailed);
    try {
      sessionStorage.removeItem(storeKey);
    } catch {}
    show('done');
  }

  const position = positions[index];
  const choice = position ? choices[position.id] : undefined;
  const picked = choice?.ids ?? [];
  const unopposed = position?.candidates.length === 1;

  function toggle(candidateId: string) {
    if (!position) return;
    setChoices((prev) => {
      const current = prev[position.id]?.ids ?? [];
      let ids: string[];
      if (position.seats === 1) ids = current[0] === candidateId ? [] : [candidateId];
      else if (current.includes(candidateId)) ids = current.filter((x) => x !== candidateId);
      else if (current.length < position.seats) ids = [...current, candidateId];
      else ids = current;
      return { ...prev, [position.id]: { ids } };
    });
  }

  function answer(approve: boolean) {
    if (!position) return;
    const only = position.candidates[0].id;
    setChoices((prev) => {
      const same = prev[position.id]?.ids.length && (prev[position.id]?.approve ?? true) === approve;
      return { ...prev, [position.id]: same ? { ids: [] } : { ids: [only], approve } };
    });
  }

  function next() {
    if (fromReview || index === positions.length - 1) {
      setFromReview(false);
      return show('review');
    }
    setIndex(index + 1);
    topRef.current?.scrollIntoView({ block: 'start' });
  }

  function summaryFor(p: Position): { text: string; muted?: boolean } {
    const c = choices[p.id];
    if (!c?.ids.length) return { text: 'No choice. You skipped this.', muted: true };
    if (p.candidates.length === 1) return { text: `${c.approve === false ? 'No' : 'Yes'} to ${p.candidates[0].name}` };
    return { text: c.ids.map((id) => p.candidates.find((x) => x.id === id)?.name).join(', ') };
  }

  const ask = ASK[election.voter_method];
  const resultsHref = `${base}/${slug}/results`;

  return (
    <div ref={topRef} className="scroll-mt-4">
      {preview && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-warn-soft px-3 py-2 text-sm text-ink">
          <Eye className="size-4 shrink-0 text-warn" aria-hidden="true" />
          <span>
            <span className="font-semibold">Preview.</span> This is what voters see. Nothing you do here is sent or counted.
          </span>
        </div>
      )}

      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold">{election.title}</h1>
        {step === 'identify' && election.description && <p className="mt-2 whitespace-pre-line text-ink-2">{election.description}</p>}
      </div>

      {error && (
        <div className="mb-5">
          <Notice tone="danger">{error.text}</Notice>
        </div>
      )}

      {step === 'identify' && (
        <form key="identify" onSubmit={identify} className="rise-in grid gap-5">
          <div className="grid gap-1.5">
            <label htmlFor="who" className="text-lg font-bold">
              {ask.label}
            </label>
            <p id="who-hint" className="text-ink-2">
              {ask.hint}
            </p>
            <input
              id="who"
              type={ask.type}
              inputMode={ask.inputMode}
              autoComplete={ask.autoComplete}
              autoCapitalize={election.voter_method === 'email' ? 'none' : 'characters'}
              spellCheck={false}
              placeholder={ask.placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-describedby="who-hint"
              required={!preview}
              className={`${inputClass} mt-1 h-14 text-lg ${election.voter_method === 'code' ? 'font-mono tracking-wider uppercase' : ''}`}
            />
          </div>
          <Button type="submit" size="lg" loading={busy} className="w-full">
            Continue <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
          <p className="text-sm text-ink-2">
            {election.voter_method === 'code'
              ? 'Your code lets you vote once. Nobody can see who you voted for.'
              : 'We’ll send you a 6-digit code to make sure it’s you. Nobody can see who you voted for.'}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-sm">
            <button type="button" onClick={() => show('receipt')} className="font-semibold text-accent hover:underline">
              Already voted? Check your ballot was counted
            </button>
            {election.resultsLive && (
              <Link href={resultsHref} className="font-semibold text-accent hover:underline">
                See live results
              </Link>
            )}
          </div>
        </form>
      )}

      {step === 'otp' && (
        <form
          key="otp"
          onSubmit={(e) => {
            e.preventDefault();
            verify(otp);
          }}
          className="rise-in grid gap-5"
        >
          <div>
            <h2 className="text-lg font-bold">{channel === 'email' ? 'Check your email' : 'Check your messages'}</h2>
            <p className="mt-1 text-ink-2">
              We sent a 6-digit code to <span className="font-semibold text-ink">{sentTo}</span>. It works for 10 minutes.
            </p>
          </div>
          {testCode && (
            <Notice tone="warn" title="Test mode">
              Sending isn’t set up yet, so here is the code: <span className="font-mono font-bold text-ink">{testCode}</span>. Real voters get it by{' '}
              {channel === 'email' ? 'email' : 'text message'}.
            </Notice>
          )}
          <label htmlFor="otp" className="sr-only">
            6-digit code
          </label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            autoFocus
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOtp(digits);
              if (digits.length === 6 && !busy) verify(digits);
            }}
            placeholder="••••••"
            className={`${inputClass} h-16 text-center font-mono text-3xl tracking-[0.5em]`}
          />
          <Button type="submit" size="lg" loading={busy} disabled={otp.length !== 6} className="w-full">
            Continue
          </Button>
          <div className="flex flex-wrap justify-between gap-3 text-sm">
            <button type="button" onClick={resend} disabled={wait > 0 || busy} className="font-semibold text-accent hover:underline disabled:text-ink-3 disabled:no-underline">
              {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
            </button>
            <button type="button" onClick={() => show('identify')} className="font-semibold text-ink-2 hover:text-ink">
              Use a different {election.voter_method === 'phone' ? 'number' : election.voter_method === 'member_id' ? 'ID' : 'email'}
            </button>
          </div>
        </form>
      )}

      {step === 'ballot' && position && (
        <div className="grid gap-5 pb-24">
          {name && index === 0 && <p className="text-ink-2">Welcome, {name.split(' ')[0]}.</p>}
          <div>
            <div className="flex justify-between text-sm text-ink-2">
              <span>
                Position {index + 1} of {positions.length}
              </span>
              <span>{unopposed ? 'Yes or No' : position.seats === 1 ? 'Choose one' : `Choose up to ${position.seats}`}</span>
            </div>
            <Meter value={index + 1} max={positions.length} className="mt-2 h-1.5" />
          </div>

          <div key={position.id} className="rise-in grid gap-5">
            <h2 className="text-2xl font-bold">{position.title}</h2>

            {unopposed ? (
              <div className="grid gap-4">
                <div className="flex items-center gap-4 rounded-lg border border-line bg-card p-4">
                  <Face c={position.candidates[0]} size="lg" />
                  <div>
                    <p className="text-lg font-bold">{position.candidates[0].name}</p>
                    {position.candidates[0].bio && <p className="text-ink-2">{position.candidates[0].bio}</p>}
                  </div>
                </div>
                <p className="text-ink-2">
                  {position.candidates[0].name} is the only candidate. Do you want them as {position.title}?
                </p>
                <fieldset className="grid grid-cols-2 gap-3">
                  <legend className="sr-only">{position.title}: yes or no</legend>
                  {[true, false].map((yes) => {
                    const on = picked.length > 0 && (choice?.approve ?? true) === yes;
                    return (
                      <label
                        key={String(yes)}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border-2 p-4 text-xl font-bold transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                          on ? (yes ? 'border-accent bg-accent-soft' : 'border-danger bg-danger-soft') : 'border-line bg-card hover:border-line-strong'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`pos-${position.id}`}
                          checked={on}
                          onChange={() => answer(yes)}
                          onClick={(e) => {
                            // Tapping the chosen answer again clears it, so voters can skip.
                            if (on) {
                              e.preventDefault();
                              answer(yes);
                            }
                          }}
                          className="sr-only"
                        />
                        {yes ? 'Yes' : 'No'}
                        <ThumbBox selected={on} tone={yes ? 'accent' : 'danger'} />
                      </label>
                    );
                  })}
                </fieldset>
              </div>
            ) : (
              <fieldset className="grid gap-3">
                <legend className="sr-only">{position.title}</legend>
                {position.candidates.map((c) => {
                  const on = picked.includes(c.id);
                  const full = !on && position.seats > 1 && picked.length >= position.seats;
                  return (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 p-3 transition-[background-color,border-color,opacity,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                        on ? 'border-accent bg-accent-soft' : full ? 'border-line bg-card opacity-55' : 'border-line bg-card hover:border-line-strong'
                      }`}
                    >
                      <input
                        type={position.seats === 1 ? 'radio' : 'checkbox'}
                        name={`pos-${position.id}`}
                        checked={on}
                        disabled={full}
                        onChange={() => toggle(c.id)}
                        onClick={(e) => {
                          // Tapping a chosen radio again clears it, so voters can skip.
                          if (position.seats === 1 && on) {
                            e.preventDefault();
                            toggle(c.id);
                          }
                        }}
                        className="sr-only"
                      />
                      <Face c={c} size="lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg leading-snug font-bold">{c.name}</span>
                        {c.bio && <span className="mt-0.5 block text-sm text-ink-2">{c.bio}</span>}
                      </span>
                      <ThumbBox selected={on} />
                    </label>
                  );
                })}
                {position.seats > 1 && (
                  <p className="text-sm text-ink-2" aria-live="polite">
                    {picked.length} of {position.seats} chosen
                    {picked.length >= position.seats && '. Tap someone you chose to remove them.'}
                  </p>
                )}
              </fieldset>
            )}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur">
            <div className="mx-auto flex max-w-xl gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  if (index === 0) return;
                  setIndex(index - 1);
                  topRef.current?.scrollIntoView({ block: 'start' });
                }}
                disabled={index === 0}
                aria-label="Previous position"
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </Button>
              <Button size="lg" onClick={next} variant={picked.length ? 'primary' : 'secondary'} className="flex-1">
                {fromReview || index === positions.length - 1
                  ? picked.length
                    ? 'Review my choices'
                    : 'Skip and review'
                  : picked.length
                    ? 'Next'
                    : 'Skip this position'}
                <ArrowRight className="size-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div key="review" className="rise-in grid gap-5">
          <div className="flex items-center gap-2">
            <ListChecks className="size-6 text-accent" aria-hidden="true" />
            <h2 className="text-xl font-bold">Check your choices</h2>
          </div>
          <ul className="divide-y divide-line rounded-lg border border-line bg-card">
            {positions.map((p, i) => {
              const s = summaryFor(p);
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink-2">{p.title}</span>
                    <span className={`block font-semibold ${s.muted ? 'text-warn' : ''}`}>{s.text}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIndex(i);
                      setFromReview(true);
                      show('ballot');
                    }}
                  >
                    Change
                  </Button>
                </li>
              );
            })}
          </ul>
          <Notice tone="warn" title="Once you submit, you can’t change your vote">
            Take a moment to check each position above.
          </Notice>
          <Button size="lg" onClick={() => setConfirming(true)} className="w-full">
            Submit my vote
          </Button>
          <ConfirmDialog
            open={confirming}
            title="Submit your vote?"
            confirmLabel="Yes, submit my vote"
            busy={busy}
            onConfirm={submit}
            onCancel={() => setConfirming(false)}
          >
            You can’t change it after this.
          </ConfirmDialog>
        </div>
      )}

      {step === 'done' && (
        <div key="done" className="grid gap-6">
          <div className="flex items-center gap-5 rounded-lg border border-line bg-card p-5">
            <span className="voted-stamp inline-block shrink-0 rounded-md border-[3px] border-double border-mark px-3 py-1.5 font-mono text-xl font-bold tracking-[0.2em] text-mark">
              VOTED
            </span>
            <div>
              <h2 className="text-xl font-bold">Your vote is saved</h2>
              <p className="text-ink-2">{votedAt && `At ${formatTime(votedAt)}. `}Thank you for voting.</p>
            </div>
          </div>

          <section className="grid gap-3 rounded-lg bg-mark-soft p-5">
            <h3 className="font-bold">Your receipt code</h3>
            <p className="font-mono text-3xl font-bold tracking-wider text-mark">{receipt}</p>
            <p className="text-sm text-ink-2">
              Keep it private. With it you can check that your ballot was counted. It never shows how you voted, so nobody can use it to
              pressure you.{emailed && ' We also emailed it to you.'}
            </p>
            <div>
              <CopyButton text={receipt} label="Copy code" />
            </div>
          </section>

          <section className="grid gap-2">
            <h3 className="text-sm font-bold text-ink-2">You voted for</h3>
            <dl className="divide-y divide-line rounded-lg border border-line bg-card">
              {positions.map((p) => {
                const s = summaryFor(p);
                return (
                  <div key={p.id} className="grid gap-0.5 px-4 py-3">
                    <dt className="text-sm text-ink-2">{p.title}</dt>
                    <dd className={`font-semibold ${s.muted ? 'text-warn' : ''}`}>{s.text}</dd>
                  </div>
                );
              })}
            </dl>
            <p className="text-xs text-ink-3">This list is only shown now. It won’t be shown again.</p>
          </section>

          {others.length > 0 && (
            <section className="grid gap-2">
              <h3 className="font-bold">Also open for voting</h3>
              <ul className="grid gap-2">
                {others.map((o) => (
                  <li key={o.href}>
                    <Link href={o.href} className={buttonClass('secondary', 'lg', 'w-full justify-between')}>
                      {o.title} <ArrowRight className="size-5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!preview && (
            <div className="flex flex-wrap gap-3">
              {election.resultsLive && (
                <Link href={resultsHref} className={buttonClass('primary', 'lg')}>
                  See live results
                </Link>
              )}
              <Link href={base || '/'} className={buttonClass('secondary', 'lg')}>
                Done
              </Link>
            </div>
          )}
        </div>
      )}

      {step === 'voted' && (
        <div key="voted" className="rise-in grid gap-5">
          <Notice tone="success" title="You have already voted">
            {votedAt ? `Your vote was saved on ${formatDateTime(votedAt)}.` : 'Your vote was saved.'} Each person can vote once.
          </Notice>
          <div className="grid gap-3">
            <h2 className="font-bold">Check your ballot was counted</h2>
            <p className="-mt-2 text-sm text-ink-2">Enter the receipt code you got after voting.</p>
            <ReceiptCheck electionId={election.id} />
          </div>
          {election.resultsLive && (
            <Link href={resultsHref} className={buttonClass('secondary', 'lg', 'justify-self-start')}>
              See live results
            </Link>
          )}
        </div>
      )}

      {step === 'receipt' && (
        <div key="receipt" className="rise-in grid gap-5">
          <div>
            <h2 className="text-lg font-bold">Check your ballot was counted</h2>
            <p className="text-ink-2">Enter the receipt code you got after voting.</p>
          </div>
          <ReceiptCheck electionId={election.id} />
          <button type="button" onClick={() => show('identify')} className="inline-flex items-center gap-1.5 justify-self-start text-sm font-semibold text-accent hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back
          </button>
        </div>
      )}

      {step === 'ballot' && !position && (
        <Notice tone="warn" title="This ballot is empty">
          Ask your organizers to check the election.
        </Notice>
      )}
    </div>
  );
}
