'use client';

import { ArrowLeft, BellRing, CheckCircle2, Circle, Eye, GitBranch, Lock, Mail, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BallotEditor } from '@/components/admin/ballot-editor';
import { ShareBox } from '@/components/admin/share-box';
import { VotersTab } from '@/components/admin/voters-tab';
import { Button, buttonClass } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { Meter } from '@/components/ui/meter';
import { Notice } from '@/components/ui/notice';
import { PageLoading } from '@/components/ui/spinner';
import { PhasePill } from '@/components/ui/status';
import { Initials } from '@/components/voting/thumb-box';
import { ResultsView } from '@/components/voting/results-view';
import { adminFetch, useAdmin } from '@/lib/admin-context';
import { ballotPayload, ballotProblem, fromPositions, type DraftPosition } from '@/lib/ballot-draft';
import { electionVotingUrl } from '@/lib/config';
import { downloadCsv, formatDateTime, formatTime, fromLocalInput, percent, plural, toLocalInput } from '@/lib/format';
import { supabaseBrowser } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/voting/errors';
import { electionPhase } from '@/lib/voting/phase';
import { checkCount, positionOutcome, runoffsNeeded } from '@/lib/voting/tally';
import type { Election, ElectionEvent, Position, Results } from '@/lib/voting/types';

const TABS = ['overview', 'ballot', 'voters', 'results', 'activity'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { overview: 'Overview', ballot: 'Ballot', voters: 'Voters', results: 'Results', activity: 'Activity' };
const METHOD_LABEL = { email: 'their email', phone: 'their phone number', member_id: 'their ID number', code: 'a voting code' };

const EVENT_TEXT: Record<string, (d: string | null) => string> = {
  created: () => 'Election created',
  voters_added: (d) => `Added ${plural(Number(d), 'voter')}`,
  opened: () => 'Voting opened. The ballot was locked',
  closed: () => 'Voting closed',
  voter_data_deleted: () => 'Voter details deleted',
  results_emailed: (d) => `Results emailed to ${plural(Number(d), 'voter')}`,
  reminders_sent: (d) => `Reminded ${plural(Number(d), 'person', 'people')} who hadn’t voted`,
  runoff_created: () => 'Run-off set up',
  runoff_created_from: (d) => `Set up as a run-off of ${d ?? 'an earlier election'}`,
};

function useNow(ms = 15000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export default function ElectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { org } = useAdmin();
  const supabase = supabaseBrowser();
  const now = useNow();

  const [election, setElection] = useState<Election | null>(null);
  const [missing, setMissing] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [counts, setCounts] = useState({ total: 0, voted: 0 });
  const [results, setResults] = useState<Results | null>(null);
  const [countedAt, setCountedAt] = useState<Date | null>(null);
  const [events, setEvents] = useState<ElectionEvent[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [confirm, setConfirm] = useState<'open' | 'close' | 'delete' | 'runoff' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger' | 'warn'; text: string } | null>(null);
  const [ballotDraft, setBallotDraft] = useState<DraftPosition[] | null>(null);
  const [emailProgress, setEmailProgress] = useState<string | null>(null);
  const [endsEdit, setEndsEdit] = useState<string | null>(null);
  const [parent, setParent] = useState<Pick<Election, 'id' | 'title'> | null>(null);
  const [runoffs, setRunoffs] = useState<Pick<Election, 'id' | 'title'>[]>([]);
  const [remind, setRemind] = useState<{ waiting: number } | null>(null);

  const loadElection = useCallback(async () => {
    const { data } = await supabase.from('elections').select('*').eq('id', id).maybeSingle();
    if (!data) return setMissing(true);
    const e = data as Election;
    setElection(e);
    const [{ data: up }, { data: down }] = await Promise.all([
      e.runoff_of ? supabase.from('elections').select('id, title').eq('id', e.runoff_of).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('elections').select('id, title').eq('runoff_of', e.id).order('created_at'),
    ]);
    setParent(up ?? null);
    setRunoffs(down ?? []);
  }, [supabase, id]);

  const loadCounts = useCallback(async () => {
    const [{ count: total }, { count: voted }] = await Promise.all([
      supabase.from('voters').select('id', { count: 'exact', head: true }).eq('election_id', id),
      supabase.from('voters').select('id', { count: 'exact', head: true }).eq('election_id', id).eq('has_voted', true),
    ]);
    setCounts({ total: total ?? 0, voted: voted ?? 0 });
  }, [supabase, id]);

  const loadBallot = useCallback(async () => {
    const { data } = await supabase
      .from('positions')
      .select('*, candidates(*)')
      .eq('election_id', id)
      .order('sort_order');
    const list = ((data ?? []) as Position[]).map((p) => ({ ...p, candidates: [...p.candidates].sort((a, b) => a.sort_order - b.sort_order) }));
    setPositions(list);
    setBallotDraft(fromPositions(list));
  }, [supabase, id]);

  const loadResults = useCallback(async () => {
    const { data } = await supabase.rpc('election_results', { p_election: id });
    if (data) {
      setResults(data as Results);
      setCountedAt(new Date());
    }
  }, [supabase, id]);

  const loadEvents = useCallback(async () => {
    const { data } = await supabase.from('election_events').select('*').eq('election_id', id).order('created_at', { ascending: false }).limit(100);
    setEvents((data ?? []) as ElectionEvent[]);
  }, [supabase, id]);

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1) as Tab;
      if (TABS.includes(hash)) setTab(hash);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  useEffect(() => {
    loadElection();
    loadCounts();
    loadBallot();
    loadResults();
    loadEvents();
  }, [loadElection, loadCounts, loadBallot, loadResults, loadEvents]);

  const phase = election ? electionPhase(election, now) : 'draft';

  // Keep numbers fresh while people are voting.
  useEffect(() => {
    if (phase !== 'open') return;
    const t = setInterval(() => {
      loadCounts();
      loadResults();
    }, 8000);
    return () => clearInterval(t);
  }, [phase, loadCounts, loadResults]);

  function selectTab(t: Tab) {
    setTab(t);
    history.replaceState(null, '', `#${t}`);
    if (t === 'activity') loadEvents();
    if (t === 'results') loadResults();
  }

  async function refreshAll() {
    await Promise.all([loadElection(), loadCounts(), loadResults(), loadEvents()]);
  }

  async function emailResults() {
    setMessage(null);
    let offset = 0;
    let sent = 0;
    try {
      for (;;) {
        setEmailProgress(`Sending results (${sent.toLocaleString()} sent)`);
        const r = await adminFetch<{ sent: number; nextOffset: number; total: number; done: boolean }>(
          `/api/admin/elections/${id}/email-results`,
          { offset },
        );
        sent += r.sent;
        offset = r.nextOffset;
        if (r.done) break;
      }
      setMessage({ tone: 'success', text: `Results emailed to ${plural(sent, 'voter')}.` });
    } catch (e) {
      setMessage({ tone: 'danger', text: e instanceof Error ? e.message : 'Sending stopped. Try again.' });
    }
    setEmailProgress(null);
    refreshAll();
  }

  async function setStatus(status: 'open' | 'closed') {
    setBusy(status);
    setMessage(null);
    const { error } = await supabase.rpc('set_election_status', { p_election: id, p_status: status });
    setBusy(null);
    setConfirm(null);
    if (error) return setMessage({ tone: 'danger', text: friendlyError(error) });
    await refreshAll();
    if (status === 'closed' && election?.email_results && !election.voter_data_deleted_at) emailResults();
  }

  async function deleteElection() {
    setBusy('delete');
    const { error } = await supabase.from('elections').delete().eq('id', id);
    setBusy(null);
    if (error) {
      setConfirm(null);
      return setMessage({ tone: 'danger', text: friendlyError(error) });
    }
    router.replace('/dashboard');
  }

  async function saveBallot() {
    if (!org || !ballotDraft) return;
    const problem = ballotProblem(ballotDraft);
    if (problem) return setMessage({ tone: 'danger', text: problem });
    setBusy('ballot');
    setMessage(null);
    try {
      const payload = await ballotPayload(org.id, ballotDraft);
      const { error } = await supabase.rpc('update_ballot', { p_election: id, p_positions: payload });
      if (error) throw error;
      await Promise.all([loadBallot(), loadResults()]);
      setMessage({ tone: 'success', text: 'Ballot saved.' });
    } catch (e) {
      setMessage({ tone: 'danger', text: e instanceof Error && !('code' in e) ? e.message : friendlyError(e) });
    }
    setBusy(null);
  }

  async function askRemind() {
    setMessage(null);
    try {
      const r = await adminFetch<{ waiting: number }>(`/api/admin/elections/${id}/remind`, { count: true });
      setRemind(r);
    } catch (e) {
      setMessage({ tone: 'danger', text: e instanceof Error ? e.message : 'Something went wrong.' });
    }
  }

  async function sendReminders() {
    setRemind(null);
    setMessage(null);
    let after: string | undefined;
    let offset = 0;
    try {
      for (;;) {
        setEmailProgress(`Sending reminders (${offset.toLocaleString()} sent)`);
        const r = await adminFetch<{ sent: number; nextOffset: number; after: string | null; done: boolean }>(
          `/api/admin/elections/${id}/remind`,
          { offset, after },
        );
        offset = r.nextOffset;
        after = r.after ?? undefined;
        if (r.done) break;
      }
      setMessage({ tone: 'success', text: `Reminded ${plural(offset, 'person', 'people')} who haven’t voted.` });
    } catch (e) {
      setMessage({ tone: 'danger', text: e instanceof Error ? e.message : 'Sending stopped. Try again.' });
    }
    setEmailProgress(null);
    refreshAll();
  }

  async function createRunoff() {
    if (!results || !election) return;
    setBusy('runoff');
    setMessage(null);
    const needed = runoffsNeeded(results, election.majority_rule);
    const { data, error } = await supabase.rpc('create_runoff', {
      p_election: id,
      p_positions: needed.map((o) => ({ position_id: o.position.id, candidate_ids: o.runoff })),
    });
    setBusy(null);
    setConfirm(null);
    if (error || !data) return setMessage({ tone: 'danger', text: friendlyError(error) });
    router.push(`/dashboard/elections/${data}`);
  }

  async function saveEnds() {
    if (endsEdit === null) return;
    const iso = fromLocalInput(endsEdit);
    if (iso && new Date(iso) <= new Date()) return setMessage({ tone: 'danger', text: 'Pick a closing time in the future.' });
    setBusy('ends');
    const { error } = await supabase.from('elections').update({ ends_at: iso }).eq('id', id);
    setBusy(null);
    if (error) return setMessage({ tone: 'danger', text: friendlyError(error) });
    setEndsEdit(null);
    loadElection();
  }

  if (missing) {
    return (
      <Notice tone="warn" title="We couldn’t find this election" action={<Link href="/dashboard" className="font-semibold text-accent hover:underline">Back to elections</Link>}>
        It may have been deleted, or it belongs to another organization.
      </Notice>
    );
  }
  if (!election || !org) return <PageLoading label="Loading election" />;

  const url = electionVotingUrl(org.slug, election.slug, typeof window === 'undefined' ? '' : window.location.origin);
  const turnout = percent(counts.voted, counts.total);
  const hasEmails = (election.voter_method === 'email' || election.voter_method === 'member_id') && !election.voter_data_deleted_at;
  const scheduled = election.starts_at && new Date(election.starts_at) > now;
  const checks = [
    { ok: positions.length > 0 && positions.every((p) => p.candidates.length > 0), text: positions.length ? `${plural(positions.length, 'position')} on the ballot` : 'Add positions and candidates', tab: 'ballot' as Tab },
    { ok: counts.total > 0, text: counts.total ? `${plural(counts.total, 'voter')} on the list` : 'Add your voters', tab: 'voters' as Tab },
    { ok: org.status === 'approved', text: org.status === 'approved' ? `${org.name} is approved` : `${org.name} is waiting for approval`, tab: null },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" /> Elections
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{election.title}</h1>
          <PhasePill phase={phase} />
        </div>
        <p className="mt-1 text-ink-2">
          Voters sign in with {METHOD_LABEL[election.voter_method]} · {election.majority_rule ? 'winners need more than half' : 'most votes wins'} ·{' '}
          {election.results_visibility === 'live' ? 'results show live' : 'results show after voting closes'}
        </p>
        {parent && (
          <p className="mt-2 text-sm text-ink-2">
            Run-off of{' '}
            <Link href={`/dashboard/elections/${parent.id}`} className="font-semibold text-accent hover:underline">
              {parent.title}
            </Link>
          </p>
        )}
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {emailProgress && <Notice tone="info">{emailProgress}…</Notice>}

      <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Election sections">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => selectTab(t)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap ${
              tab === t ? 'border-accent text-ink' : 'border-transparent text-ink-2 hover:text-ink'
            }`}
          >
            {TAB_LABEL[t]}
            {t === 'voters' && <span className="ml-1.5 font-mono text-xs text-ink-3 tabular">{counts.total.toLocaleString()}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="grid content-start gap-6">
            {phase === 'draft' && (
              <section className="grid gap-4 rounded-lg border border-line bg-card p-5">
                <div>
                  <h2 className="text-lg font-bold">Ready to open voting?</h2>
                  <p className="text-sm text-ink-2">Once voting opens, the ballot is locked so nobody can change it mid-vote.</p>
                </div>
                <ul className="grid gap-2">
                  {checks.map((c) => (
                    <li key={c.text} className="flex items-center gap-2.5">
                      {c.ok ? <CheckCircle2 className="size-5 text-accent" aria-hidden="true" /> : <Circle className="size-5 text-ink-3" aria-hidden="true" />}
                      <span className={c.ok ? '' : 'text-ink-2'}>{c.text}</span>
                      {!c.ok && c.tab && (
                        <button type="button" onClick={() => selectTab(c.tab!)} className="text-sm font-semibold text-accent hover:underline">
                          Fix
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setConfirm('open')} disabled={!checks.every((c) => c.ok)}>
                    {scheduled ? 'Schedule voting' : 'Open voting'}
                  </Button>
                  <Link href={`/dashboard/elections/${id}/preview`} className={buttonClass('secondary')}>
                    <Eye className="size-4" aria-hidden="true" /> Preview as a voter
                  </Link>
                  <Button variant="ghost" onClick={() => setConfirm('delete')} className="hover:!text-danger">
                    <Trash2 className="size-4" aria-hidden="true" /> Delete election
                  </Button>
                </div>
              </section>
            )}

            {phase !== 'draft' && (
              <section className="rounded-lg border border-line bg-card p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-ink-2">{phase === 'closed' ? 'Final turnout' : 'Turnout so far'}</p>
                    <p className="font-mono text-3xl font-bold tabular">
                      {counts.voted.toLocaleString()}
                      <span className="text-lg font-normal text-ink-2"> of {counts.total.toLocaleString()} voted</span>
                    </p>
                  </div>
                  <p className="font-mono text-2xl font-bold text-accent tabular">{turnout}%</p>
                </div>
                <Meter value={counts.voted} max={counts.total} className="mt-3 h-3" label="Turnout" />
                {phase === 'open' && <p className="mt-2 text-xs text-ink-3">Updates by itself every few seconds.</p>}
              </section>
            )}

            {phase === 'scheduled' && (
              <Notice
                tone="warn"
                title={`Voting opens ${formatDateTime(election.starts_at)}`}
                action={
                  <Button variant="secondary" size="sm" onClick={() => setConfirm('close')}>
                    Cancel and close
                  </Button>
                }
              >
                The ballot is locked. Voters who open the link before then will see when voting starts.
              </Notice>
            )}

            {phase === 'open' && (
              <section className="grid gap-3 rounded-lg border border-line bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold">Voting is open</h2>
                    <p className="text-sm text-ink-2">
                      {election.ends_at ? `Closes by itself ${formatDateTime(election.ends_at)}.` : 'It stays open until you close it.'}
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => setConfirm('close')}>
                    Close voting now
                  </Button>
                </div>
                {endsEdit === null ? (
                  <button type="button" onClick={() => setEndsEdit(toLocalInput(election.ends_at))} className="justify-self-start text-sm font-semibold text-accent hover:underline">
                    {election.ends_at ? 'Change closing time' : 'Set a closing time'}
                  </button>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <Field label="Closes at" htmlFor="ends-edit">
                      <Input id="ends-edit" type="datetime-local" value={endsEdit} onChange={(e) => setEndsEdit(e.target.value)} />
                    </Field>
                    <Button onClick={saveEnds} loading={busy === 'ends'}>
                      Save
                    </Button>
                    <Button variant="ghost" onClick={() => setEndsEdit(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
                {election.voter_method !== 'code' && !election.voter_data_deleted_at && counts.total > counts.voted && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                    <p className="text-sm text-ink-2">
                      {plural(counts.total - counts.voted, 'person has', 'people have')} not voted yet.
                      {election.reminded_at && ` Last reminder ${formatDateTime(election.reminded_at)}.`}
                    </p>
                    <Button variant="secondary" size="sm" onClick={askRemind} loading={Boolean(emailProgress)}>
                      <BellRing className="size-4" aria-hidden="true" /> Send a reminder
                    </Button>
                  </div>
                )}
              </section>
            )}

            {phase === 'closed' && (
              <section className="grid gap-3 rounded-lg border border-line bg-card p-5">
                <h2 className="font-bold">Voting closed {formatDateTime(election.closed_at ?? election.ends_at)}</h2>
                <p className="text-sm text-ink-2">
                  Results and a public count check are live at the voting link. Candidates and their agents can check the count there
                  themselves.
                  {election.results_emailed_at && ` Results were emailed on ${formatDateTime(election.results_emailed_at)}.`}
                </p>
                {results && runoffsNeeded(results, election.majority_rule).length > 0 && (
                  <Notice
                    tone="warn"
                    title="A run-off is needed"
                    action={
                      runoffs.length ? (
                        <Link href={`/dashboard/elections/${runoffs[0].id}`} className="font-semibold text-accent hover:underline">
                          Go to {runoffs[0].title}
                        </Link>
                      ) : election.voter_data_deleted_at ? undefined : (
                        <Button size="sm" onClick={() => setConfirm('runoff')}>
                          <GitBranch className="size-4" aria-hidden="true" /> Set up the run-off
                        </Button>
                      )
                    }
                  >
                    {runoffsNeeded(results, election.majority_rule)
                      .map((o) => o.position.title)
                      .join(', ')}{' '}
                    {runoffsNeeded(results, election.majority_rule).length === 1 ? 'has' : 'have'} no candidate with more than half the valid votes.
                    {election.voter_data_deleted_at && ' Voter details were deleted, so add the voter list to a new election by hand.'}
                  </Notice>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => selectTab('results')}>
                    See results
                  </Button>
                  <a href={`${url}/audit`} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
                    <ShieldCheck className="size-4" aria-hidden="true" /> Public count check
                  </a>
                  {hasEmails && (
                    <Button variant="secondary" onClick={emailResults} loading={Boolean(emailProgress)}>
                      <Mail className="size-4" aria-hidden="true" /> {election.results_emailed_at ? 'Email results again' : 'Email results to voters'}
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setConfirm('delete')} className="hover:!text-danger">
                    <Trash2 className="size-4" aria-hidden="true" /> Delete election
                  </Button>
                </div>
              </section>
            )}
          </div>

          <ShareBox url={url} live={phase === 'open' || phase === 'scheduled' || phase === 'closed'} />
        </div>
      )}

      {tab === 'ballot' && (
        <div className="grid max-w-3xl gap-5">
          {phase === 'draft' && ballotDraft ? (
            <>
              <BallotEditor value={ballotDraft} onChange={setBallotDraft} />
              <div className="flex gap-2 border-t border-line pt-5">
                <Button onClick={saveBallot} loading={busy === 'ballot'}>
                  Save ballot
                </Button>
                <Button variant="ghost" onClick={() => setBallotDraft(fromPositions(positions))}>
                  Undo changes
                </Button>
              </div>
            </>
          ) : (
            <>
              <Notice tone="info" title="The ballot is locked">
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-3.5" aria-hidden="true" /> Positions and candidates can’t change once voting has started. This keeps the vote fair.
                </span>
              </Notice>
              {positions.map((p, i) => (
                <section key={p.id} className="rounded-lg border border-line bg-card">
                  <header className="border-b border-line px-5 py-3">
                    <p className="text-xs text-ink-3">Position {i + 1}</p>
                    <h3 className="font-bold">
                      {p.title}
                      {p.seats > 1 && <span className="font-normal text-ink-2"> · {p.seats} winners</span>}
                    </h3>
                  </header>
                  <ul className="divide-y divide-line">
                    {p.candidates.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                        {/* eslint-disable-next-line @next/next/no-img-element -- small resized upload */}
                        {c.photo_url ? <img src={c.photo_url} alt="" className="size-11 rounded-md object-cover" /> : <Initials name={c.name} className="size-11 text-base" />}
                        <span>
                          <span className="block font-semibold">{c.name}</span>
                          {c.bio && <span className="block text-sm text-ink-2">{c.bio}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'voters' && (
        <VotersTab
          election={election}
          phase={phase}
          counts={counts}
          onChanged={() => {
            loadCounts();
            loadElection();
            loadEvents();
          }}
        />
      )}

      {tab === 'results' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="grid content-start gap-4">
            {phase === 'draft' && <Notice tone="info">Results appear here once voting opens.</Notice>}
            {phase === 'open' && election.results_visibility === 'after_close' && (
              <Notice tone="info">Only you can see these numbers. Voters see them when voting closes.</Notice>
            )}
            {results && phase !== 'draft' && <ResultsView results={results} phase={phase} majorityRule={election.majority_rule} />}
          </div>
          {results && phase !== 'draft' && (
            <aside className="grid content-start gap-4">
              <section className="rounded-lg border border-line bg-card p-5">
                <h3 className="font-bold">Count check</h3>
                <p className="mt-1 text-sm text-ink-2">Counted straight from the ballots{countedAt ? ` at ${formatTime(countedAt.toISOString())}` : ''}.</p>
                {(() => {
                  const check = checkCount(results);
                  return (
                    <ul className="mt-3 grid gap-2 text-sm">
                      {check.lines.map((l) => (
                        <li key={l.text} className="flex gap-2">
                          {l.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" /> : <Circle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />}
                          <span>{l.text}</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={loadResults}>
                    <RefreshCw className="size-4" aria-hidden="true" /> Count again
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      downloadCsv(`${election.slug}-results.csv`, [
                        ['Position', 'Candidate', 'Votes', 'No votes', 'Result'],
                        ...results.positions.flatMap((p) => {
                          const o = positionOutcome(p, results.ballots, election.majority_rule);
                          return o.ranked.map((c) => [
                            p.title,
                            c.name,
                            c.votes,
                            o.unopposed ? c.no_votes : '',
                            o.winners.has(c.id) ? (phase === 'closed' ? 'Won' : 'Leading') : o.runoff?.includes(c.id) ? 'Run-off' : o.tie ? 'Tied' : '',
                          ]);
                        }),
                        [],
                        ['Ballots cast', results.ballots],
                        ['On the voter list', results.eligible],
                      ])
                    }
                  >
                    Download
                  </Button>
                </div>
              </section>
              <p className="text-sm text-ink-2">
                {plural(results.ballots, 'ballot')} from {plural(results.eligible, 'eligible voter')}. Nobody, including you, can see who
                voted for whom.
              </p>
            </aside>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <ol className="max-w-2xl divide-y divide-line rounded-lg border border-line bg-card">
          {events.length === 0 && <li className="px-5 py-4 text-ink-2">Nothing yet.</li>}
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap justify-between gap-2 px-5 py-3">
              <span>{(EVENT_TEXT[e.kind] ?? (() => e.kind))(e.detail)}</span>
              <time className="text-sm text-ink-2" dateTime={e.created_at}>
                {formatDateTime(e.created_at)}
              </time>
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={confirm === 'open'}
        title={scheduled ? 'Schedule voting?' : 'Open voting now?'}
        confirmLabel={scheduled ? 'Yes, schedule it' : 'Yes, open voting'}
        busy={busy === 'open'}
        onConfirm={() => setStatus('open')}
        onCancel={() => setConfirm(null)}
      >
        {scheduled ? `Voters can start at ${formatDateTime(election.starts_at)}.` : 'Voters can start right away.'} The ballot will be locked:
        positions and candidates can’t change after this.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'close'}
        title="Close voting now?"
        confirmLabel="Yes, close voting"
        tone="danger"
        busy={busy === 'closed'}
        onConfirm={() => setStatus('closed')}
        onCancel={() => setConfirm(null)}
      >
        Nobody can vote after this, and it can’t be reopened. {counts.total - counts.voted > 0 && `${plural(counts.total - counts.voted, 'person has', 'people have')} not voted yet.`}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'runoff'}
        title="Set up the run-off?"
        confirmLabel="Yes, set it up"
        busy={busy === 'runoff'}
        onConfirm={createRunoff}
        onCancel={() => setConfirm(null)}
      >
        <p>We’ll make a new draft election with the same {plural(counts.total, 'voter')}:</p>
        <ul className="mt-2 grid gap-1">
          {results &&
            runoffsNeeded(results, election.majority_rule).map((o) => (
              <li key={o.position.id}>
                <span className="font-semibold text-ink">{o.position.title}:</span>{' '}
                {o.ranked
                  .filter((c) => o.runoff?.includes(c.id))
                  .map((c) => c.name)
                  .join(' vs ')}
              </li>
            ))}
        </ul>
        <p className="mt-2">
          {election.voter_method === 'code' ? 'The same voting codes work, so voters can use their slips again. ' : ''}You can check it and then open
          voting.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(remind)}
        title={`Remind ${plural(remind?.waiting ?? 0, 'person', 'people')}?`}
        confirmLabel="Send reminders"
        onConfirm={sendReminders}
        onCancel={() => setRemind(null)}
      >
        Everyone on the list who hasn’t voted gets {election.voter_method === 'phone' ? 'a text message' : 'an email'} with the voting link
        {election.ends_at ? ' and the closing time' : ''}.{election.voter_method === 'phone' && ' Each text message costs money.'} You can send
        another reminder after 30 minutes.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete this election?"
        confirmLabel="Yes, delete it"
        tone="danger"
        busy={busy === 'delete'}
        onConfirm={deleteElection}
        onCancel={() => setConfirm(null)}
      >
        The ballot, voter list and results will be removed for good.
      </ConfirmDialog>
    </div>
  );
}
