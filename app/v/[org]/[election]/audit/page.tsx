import { CheckCircle2, Download, XCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buttonClass } from '@/components/ui/button';
import { ReceiptCheck } from '@/components/voting/receipt-check';
import { VoterShell } from '@/components/voting/voter-shell';
import { formatDateTime } from '@/lib/format';
import { supabaseAdmin } from '@/lib/supabase/server';
import { electionPhase } from '@/lib/voting/phase';
import { loadElectionBySlug } from '@/lib/voting/server';
import { checkCount } from '@/lib/voting/tally';
import type { Results } from '@/lib/voting/types';
import { voterBase } from '@/lib/voting/voter-base';

export const dynamic = 'force-dynamic';

type Params = Promise<{ org: string; election: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { org, election } = await params;
  const e = await loadElectionBySlug(org.toLowerCase(), election.toLowerCase());
  return { title: e ? `Check the count: ${e.title}` : 'Not found' };
}

export default async function AuditPage({ params }: { params: Params }) {
  const { org, election: slug } = await params;
  const election = await loadElectionBySlug(org.toLowerCase(), slug.toLowerCase());
  if (!election) notFound();
  const base = await voterBase(election.organizations.slug);
  const phase = electionPhase(election);

  if (phase !== 'closed') {
    return (
      <VoterShell orgName={election.organizations.name} homeHref={base || '/'}>
        <h1 className="mt-4 text-2xl font-bold">Check the count: {election.title}</h1>
        <p className="mt-4 text-ink-2">The count can be checked once voting closes.</p>
        <Link href={`${base}/${election.slug}`} className={buttonClass('secondary', 'lg', 'mt-6')}>
          Back to the election
        </Link>
      </VoterShell>
    );
  }

  const { data } = await supabaseAdmin().rpc('election_results', { p_election: election.id });
  const results = data as Results;
  const check = checkCount(results);

  return (
    <VoterShell orgName={election.organizations.name} homeHref={base || '/'}>
      <h1 className="mt-4 text-2xl font-bold">Check the count: {election.title}</h1>
      <p className="mt-2 text-ink-2">
        Voting closed {formatDateTime(election.closed_at ?? election.ends_at)}. Anyone can use this page: voters, candidates and their
        agents.
      </p>

      <section className="mt-8 grid gap-4" aria-labelledby="numbers">
        <h2 id="numbers" className="text-lg font-bold">
          Do the numbers match?
        </h2>
        <dl className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-card">
          {(
            [
              ['Ballots counted', results.ballots],
              ['Marked as voted', results.voted],
              ['On the voter list', results.eligible],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="flex flex-col justify-between gap-1 px-3 py-3 sm:px-4">
              <dt className="text-xs text-ink-2 sm:text-sm">{label}</dt>
              <dd className="font-mono text-xl font-bold tabular sm:text-2xl">{n.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
        <ul className="grid gap-2 text-sm">
          {check.lines.map((l) => (
            <li key={l.text} className="flex gap-2">
              {l.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
              )}
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-3" aria-labelledby="mine">
        <h2 id="mine" className="text-lg font-bold">
          Was my ballot counted?
        </h2>
        <p className="-mt-1 text-ink-2">Enter the receipt code you got after voting. You’ll see your ballot’s public fingerprint.</p>
        <ReceiptCheck electionId={election.id} closed />
      </section>

      <section className="mt-10 grid gap-3" aria-labelledby="all">
        <h2 id="all" className="text-lg font-bold">
          Every counted ballot
        </h2>
        <p className="-mt-1 text-ink-2">
          Download the fingerprints of all {results.ballots.toLocaleString()} counted ballots. Count the lines, and search for your own. A
          fingerprint shows a ballot was counted, never who it was for.
        </p>
        <a
          href={`/api/audit/${election.id}/fingerprints`}
          download
          className={buttonClass('secondary', 'lg', 'justify-self-start')}
        >
          <Download className="size-5" aria-hidden="true" /> Download fingerprints (CSV)
        </a>
      </section>

      <p className="mt-10 border-t border-line pt-5 text-sm text-ink-2">
        See how many votes each candidate got on the{' '}
        <Link href={`${base}/${election.slug}/results`} className="font-semibold text-accent hover:underline">
          results page
        </Link>
        .
      </p>
    </VoterShell>
  );
}
