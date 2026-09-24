'use client';

import { ArrowLeft, ArrowRight, Check, IdCard, Mail, Smartphone, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BallotEditor } from '@/components/admin/ballot-editor';
import { VoterImport } from '@/components/admin/voter-import';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { useAdmin } from '@/lib/admin-context';
import { ballotPayload, ballotProblem, newPosition, tidyBallot, type DraftPosition } from '@/lib/ballot-draft';
import { formatDateTime, fromLocalInput, plural } from '@/lib/format';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { ImportResult } from '@/lib/voter-import';
import { uniqueCodes } from '@/lib/voting/codes';
import { friendlyError } from '@/lib/voting/errors';
import type { ResultsVisibility, VoterMethod, VoterRow } from '@/lib/voting/types';

const STEPS = ['About this vote', 'How voters sign in', 'Voter list', 'Positions and candidates', 'Timing and results', 'Check and create'];

type Template = 'school' | 'church' | 'group' | 'other';
const TEMPLATES: Record<Template, { label: string; example: string; positions: [string, number][] }> = {
  school: { label: 'School or college', example: 'SRC Elections 2026', positions: [['President', 1], ['Vice President', 1], ['General Secretary', 1], ['Treasurer', 1]] },
  church: { label: 'Church', example: 'Church Council Elections 2026', positions: [['Chairperson', 1], ['Secretary', 1], ['Treasurer', 1], ['Committee Members', 3]] },
  group: { label: 'Association or club', example: 'Executive Elections 2026', positions: [['Chairperson', 1], ['Vice Chairperson', 1], ['Secretary', 1], ['Organizer', 1]] },
  other: { label: 'Something else', example: 'Annual Elections', positions: [['', 1]] },
};

const METHODS: { id: VoterMethod; icon: typeof Mail; title: string; body: string }[] = [
  { id: 'email', icon: Mail, title: 'Email', body: 'We email each voter a 6-digit code to sign in.' },
  { id: 'phone', icon: Smartphone, title: 'Phone number', body: 'We text each voter a 6-digit code to sign in.' },
  { id: 'member_id', icon: IdCard, title: 'ID number', body: 'Voters type their student or member ID. We send the code to the email or phone on your list.' },
  { id: 'code', icon: Ticket, title: 'Voting codes', body: 'We make a private code for each person. You print or share them. No personal details needed.' },
];

function ChoiceCard({ checked, onSelect, name, children }: { checked: boolean; onSelect: () => void; name: string; children: ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors ${
        checked ? 'border-accent bg-accent-soft' : 'border-line bg-card hover:border-line-strong'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="mt-1 size-4 accent-[var(--accent)]" />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

export default function NewElectionPage() {
  const { org } = useAdmin();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<{ email: boolean; sms: boolean; testMode: boolean } | null>(null);

  const [template, setTemplate] = useState<Template | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState<VoterMethod | null>(null);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [codeMode, setCodeMode] = useState<'count' | 'names'>('count');
  const [codeCount, setCodeCount] = useState(100);
  const [addLater, setAddLater] = useState(false);
  const [positions, setPositions] = useState<DraftPosition[]>([newPosition()]);
  const [timing, setTiming] = useState<'manual' | 'scheduled'>('manual');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [visibility, setVisibility] = useState<ResultsVisibility>('after_close');
  const [emailResults, setEmailResults] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then(setChannels).catch(() => null);
  }, []);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (title && !savedId) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [title, savedId]);

  function chooseTemplate(t: Template) {
    setTemplate(t);
    const untouched = positions.every((p) => p.candidates.every((c) => !c.name.trim()));
    if (untouched) setPositions(TEMPLATES[t].positions.map(([name, seats]) => newPosition(name, seats)));
  }

  const voterRows: VoterRow[] =
    method === 'code'
      ? codeMode === 'count'
        ? []
        : imported?.voters ?? []
      : imported?.voters ?? [];
  const voterCount = method === 'code' && codeMode === 'count' ? codeCount : voterRows.length;
  const canEmailResults = (method === 'email' || method === 'member_id') && voterRows.some((v) => v.email);

  function problem(at: number): string | null {
    if (at === 0) {
      if (title.trim().length < 3) return 'Give this election a name, like “SRC Elections 2026”.';
    }
    if (at === 1 && !method) return 'Choose how voters will sign in.';
    if (at === 2 && !addLater) {
      if (method === 'code' && codeMode === 'count') {
        if (!Number.isInteger(codeCount) || codeCount < 1 || codeCount > 5000) return 'Make between 1 and 5,000 codes.';
      } else if (!voterRows.length) {
        return 'Add your voter list, or tick “I’ll add voters later”.';
      }
    }
    if (at === 3) return ballotProblem(positions);
    if (at === 4 && timing === 'scheduled') {
      const end = fromLocalInput(endsAt);
      const start = fromLocalInput(startsAt);
      if (!end) return 'Choose when voting closes.';
      if (new Date(end) <= new Date()) return 'The closing time has already passed.';
      if (start && new Date(start) >= new Date(end)) return 'Voting must open before it closes.';
    }
    return null;
  }

  function go(to: number) {
    setError(null);
    if (to > step) {
      for (let i = step; i < to; i++) {
        const p = problem(i);
        if (p) {
          setStep(i);
          return setError(p);
        }
      }
    }
    setStep(to);
    setReached((r) => Math.max(r, to));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function create() {
    if (!org || !method) return;
    for (let i = 0; i < 5; i++) {
      const p = problem(i);
      if (p) {
        setStep(i);
        return setError(p);
      }
    }
    setError(null);
    const supabase = supabaseBrowser();
    try {
      setSaving('Uploading photos');
      const ballot = await ballotPayload(org.id, positions);
      setSaving('Saving the ballot');
      const { data: id, error: createError } = await supabase.rpc('create_election', {
        p_org: org.id,
        p: {
          title: title.trim(),
          description: description.trim(),
          voter_method: method,
          starts_at: timing === 'scheduled' ? fromLocalInput(startsAt) : null,
          ends_at: timing === 'scheduled' ? fromLocalInput(endsAt) : null,
          results_visibility: visibility,
          email_results: canEmailResults && emailResults,
          positions: ballot,
        },
      });
      if (createError || !id) throw createError ?? new Error('not saved');
      setSavedId(id as string);

      let rows: VoterRow[] = voterRows;
      if (method === 'code' && !addLater) {
        const codes = uniqueCodes(codeMode === 'count' ? codeCount : voterRows.length);
        rows = codeMode === 'count' ? codes.map((access_code) => ({ access_code })) : voterRows.map((v, i) => ({ ...v, access_code: codes[i] }));
      }
      if (addLater) rows = [];
      for (let i = 0; i < rows.length; i += 1000) {
        setSaving(`Adding voters (${Math.min(i + 1000, rows.length).toLocaleString()} of ${rows.length.toLocaleString()})`);
        const { error: votersError } = await supabase.rpc('add_voters', { p_election: id, p_rows: rows.slice(i, i + 1000) });
        if (votersError) {
          setSaving(null);
          return setError(`The election was saved, but adding voters stopped: ${friendlyError(votersError)} You can add them from the election page.`);
        }
      }
      router.push(`/dashboard/elections/${id}`);
    } catch (e) {
      setSaving(null);
      setError(e instanceof Error && !('code' in e) ? e.message : friendlyError(e));
    }
  }

  const pickedTemplate = template ? TEMPLATES[template] : null;
  const methodInfo = METHODS.find((m) => m.id === method);

  return (
    <div className="grid gap-8 md:grid-cols-[14rem_1fr] md:gap-12">
      <aside>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" /> Elections
        </Link>
        <h1 className="mt-4 text-xl font-bold">New election</h1>

        <div className="mt-4 md:hidden">
          <p className="text-sm text-ink-2">
            Step {step + 1} of {STEPS.length}: <span className="font-semibold text-ink">{STEPS[step]}</span>
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-sunk">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        <ol className="mt-6 hidden gap-1 md:grid">
          {STEPS.map((label, i) => {
            const done = i < step || (i <= reached && i !== step && !problem(i));
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={i === step ? 'step' : undefined}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                    i === step ? 'bg-card font-bold text-ink shadow-sm' : 'text-ink-2 hover:bg-sunk hover:text-ink'
                  }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                      i === step ? 'bg-accent text-accent-ink' : done ? 'bg-accent-soft text-accent' : 'bg-sunk text-ink-3'
                    }`}
                  >
                    {done && i !== step ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="min-w-0 max-w-2xl" aria-labelledby="step-title">
        <h2 id="step-title" className="text-2xl font-bold">
          {STEPS[step]}
        </h2>

        <div className="mt-6 grid gap-6">
          {step === 0 && (
            <>
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-semibold">Who is voting?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(TEMPLATES) as Template[]).map((t) => (
                    <ChoiceCard key={t} name="template" checked={template === t} onSelect={() => chooseTemplate(t)}>
                      <span className="font-semibold">{TEMPLATES[t].label}</span>
                    </ChoiceCard>
                  ))}
                </div>
                <p className="text-sm text-ink-2">This only fills in suggested positions. You can change everything.</p>
              </fieldset>
              <Field label="Name of this election" htmlFor="title">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={pickedTemplate?.example ?? 'SRC Elections 2026'}
                  maxLength={140}
                />
              </Field>
              <Field label="A note for voters" htmlFor="description" optional hint="Shown at the top of the voting page.">
                <Textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Voting is open to all registered students. Results will be announced at the SRC office."
                  maxLength={2000}
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <fieldset className="grid gap-3">
              <legend className="sr-only">How voters sign in</legend>
              {METHODS.map(({ id, icon: Icon, title: t, body }) => (
                <ChoiceCard
                  key={id}
                  name="method"
                  checked={method === id}
                  onSelect={() => {
                    if (method !== id) setImported(null);
                    setMethod(id);
                  }}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Icon className="size-4 text-ink-2" aria-hidden="true" /> {t}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-2">{body}</span>
                  {channels && id === 'phone' && !channels.sms && (
                    <span className="mt-1.5 block text-sm text-warn">
                      Text messages are not set up on this server yet{channels.testMode ? ', so codes will show on screen for testing.' : '.'}
                    </span>
                  )}
                  {channels && (id === 'email' || id === 'member_id') && !channels.email && (
                    <span className="mt-1.5 block text-sm text-warn">
                      Email is not set up on this server yet{channels.testMode ? ', so codes will show on screen for testing.' : '.'}
                    </span>
                  )}
                </ChoiceCard>
              ))}
              <p className="text-sm text-ink-2">
                Whichever you choose, each person can vote once. A voter who is not on your list can’t get in.
              </p>
            </fieldset>
          )}

          {step === 2 && method && (
            <>
              {method === 'code' && (
                <fieldset className="grid gap-3">
                  <legend className="sr-only">How to make codes</legend>
                  <ChoiceCard name="codemode" checked={codeMode === 'count'} onSelect={() => setCodeMode('count')}>
                    <span className="font-semibold">Just make codes</span>
                    <span className="mt-0.5 block text-sm text-ink-2">Nobody’s name is stored. Hand out one code per person.</span>
                    {codeMode === 'count' && (
                      <span className="mt-3 flex items-center gap-3">
                        <Input
                          type="number"
                          min={1}
                          max={5000}
                          value={codeCount}
                          onChange={(e) => setCodeCount(Number(e.target.value))}
                          className="!w-32 tabular"
                          aria-label="How many codes"
                        />
                        <span className="text-sm text-ink-2">codes</span>
                      </span>
                    )}
                  </ChoiceCard>
                  <ChoiceCard name="codemode" checked={codeMode === 'names'} onSelect={() => setCodeMode('names')}>
                    <span className="font-semibold">Make a code for each name on my list</span>
                    <span className="mt-0.5 block text-sm text-ink-2">Code slips come out with each person’s name, and you can see who has voted.</span>
                  </ChoiceCard>
                </fieldset>
              )}
              {(method !== 'code' || codeMode === 'names') && !addLater && <VoterImport key={method} method={method} onChange={setImported} />}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={addLater} onChange={(e) => setAddLater(e.target.checked)} className="size-4 accent-[var(--accent)]" />
                I’ll add voters later
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <p className="-mt-2 text-ink-2">
                Voters see one position at a time, in this order. “Winners” is how many people can win that position.
              </p>
              <BallotEditor value={positions} onChange={setPositions} />
            </>
          )}

          {step === 4 && (
            <>
              <fieldset className="grid gap-3">
                <legend className="mb-2 text-sm font-semibold">When does voting happen?</legend>
                <ChoiceCard name="timing" checked={timing === 'manual'} onSelect={() => setTiming('manual')}>
                  <span className="font-semibold">I’ll open and close it myself</span>
                  <span className="mt-0.5 block text-sm text-ink-2">Good for voting during a meeting or a single day.</span>
                </ChoiceCard>
                <ChoiceCard name="timing" checked={timing === 'scheduled'} onSelect={() => setTiming('scheduled')}>
                  <span className="font-semibold">Set a start and end time</span>
                  <span className="mt-0.5 block text-sm text-ink-2">Voting stops by itself at the closing time.</span>
                </ChoiceCard>
                {timing === 'scheduled' && (
                  <div className="grid gap-4 rounded-lg border border-line bg-card p-4 sm:grid-cols-2">
                    <Field label="Opens" htmlFor="starts" optional hint="Empty means as soon as you open it.">
                      <Input id="starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                    </Field>
                    <Field label="Closes" htmlFor="ends" hint="Voting stops at this time.">
                      <Input id="ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                    </Field>
                  </div>
                )}
              </fieldset>
              <fieldset className="grid gap-3">
                <legend className="mb-2 text-sm font-semibold">When can voters see results?</legend>
                <ChoiceCard name="visibility" checked={visibility === 'live'} onSelect={() => setVisibility('live')}>
                  <span className="font-semibold">Live, while people vote</span>
                  <span className="mt-0.5 block text-sm text-ink-2">Counts update as votes come in. Nobody sees who voted for whom.</span>
                </ChoiceCard>
                <ChoiceCard name="visibility" checked={visibility === 'after_close'} onSelect={() => setVisibility('after_close')}>
                  <span className="font-semibold">Only after voting closes</span>
                  <span className="mt-0.5 block text-sm text-ink-2">You can still watch the count from your dashboard.</span>
                </ChoiceCard>
              </fieldset>
              {canEmailResults && (
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={emailResults}
                    onChange={(e) => setEmailResults(e.target.checked)}
                    className="mt-1 size-4 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="font-semibold">Email the results to voters when voting closes</span>
                    <span className="block text-sm text-ink-2">You can also send them later from the election page.</span>
                  </span>
                </label>
              )}
            </>
          )}

          {step === 5 && (
            <dl className="divide-y divide-line rounded-lg border border-line bg-card">
              {[
                { at: 0, label: 'Election', value: <><span className="font-semibold">{title}</span>{description && <span className="block text-sm text-ink-2">{description}</span>}</> },
                { at: 1, label: 'Voters sign in with', value: methodInfo?.title },
                {
                  at: 2,
                  label: 'Voter list',
                  value: addLater
                    ? 'Add later'
                    : method === 'code'
                      ? `${plural(voterCount, 'voting code')}${codeMode === 'names' ? ', one per name' : ''}`
                      : plural(voterCount, 'voter'),
                },
                {
                  at: 3,
                  label: 'Ballot',
                  value: (
                    <ul className="grid gap-0.5">
                      {tidyBallot(positions).map((p) => (
                        <li key={p.key}>
                          <span className="font-semibold">{p.title}</span>
                          <span className="text-ink-2">
                            {' '}
                            · {p.candidates.map((c) => c.name).join(', ')}
                            {p.seats > 1 ? ` · ${p.seats} winners` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ),
                },
                {
                  at: 4,
                  label: 'Timing and results',
                  value: (
                    <>
                      {timing === 'manual'
                        ? 'You open and close voting'
                        : `${startsAt ? `Opens ${formatDateTime(fromLocalInput(startsAt))}, closes` : 'Closes'} ${formatDateTime(fromLocalInput(endsAt))}`}
                      <span className="block text-sm text-ink-2">
                        {visibility === 'live' ? 'Results show live' : 'Results show after voting closes'}
                        {canEmailResults && emailResults ? ' and are emailed to voters' : ''}
                      </span>
                    </>
                  ),
                },
              ].map((row) => (
                <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr_auto] sm:gap-4">
                  <dt className="text-sm text-ink-2">{row.label}</dt>
                  <dd className="min-w-0">{row.value}</dd>
                  <dd>
                    <button type="button" onClick={() => go(row.at)} className="text-sm font-semibold text-accent hover:underline">
                      Change
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {step === 5 && (
            <p className="text-sm text-ink-2">
              Creating the election doesn’t start voting. You’ll get a chance to check everything and share the link first.
            </p>
          )}

          {error && (
            <Notice tone="danger" action={savedId ? <Link href={`/dashboard/elections/${savedId}`} className="font-semibold text-accent hover:underline">Go to the election</Link> : undefined}>
              {error}
            </Notice>
          )}

          <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-6">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => go(step - 1)} disabled={Boolean(saving)}>
                <ArrowLeft className="size-4" aria-hidden="true" /> Back
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => go(step + 1)}>
                Continue <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={create} loading={Boolean(saving)} disabled={Boolean(savedId)}>
                {saving ? `${saving}…` : 'Create election'}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
