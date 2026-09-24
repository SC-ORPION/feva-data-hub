import { ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LiveResults } from '@/components/voting/live-results';
import { VoterShell } from '@/components/voting/voter-shell';
import { supabaseAdmin } from '@/lib/supabase/server';
import { electionPhase, resultsArePublic } from '@/lib/voting/phase';
import { loadElectionBySlug } from '@/lib/voting/server';
import type { Results } from '@/lib/voting/types';
import { voterBase } from '@/lib/voting/voter-base';

export const dynamic = 'force-dynamic';

type Params = Promise<{ org: string; election: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { org, election } = await params;
  const e = await loadElectionBySlug(org.toLowerCase(), election.toLowerCase());
  return { title: e ? `Results: ${e.title}` : 'Not found' };
}

export default async function ResultsPage({ params }: { params: Params }) {
  const { org, election: slug } = await params;
  const election = await loadElectionBySlug(org.toLowerCase(), slug.toLowerCase());
  if (!election) notFound();
  const base = await voterBase(election.organizations.slug);
  const phase = electionPhase(election);

  const { data } = await supabaseAdmin().rpc('election_results', { p_election: election.id });
  const all = data as Results;
  const shown = resultsArePublic(election) ? all : null;

  return (
    <VoterShell orgName={election.organizations.name} homeHref={base || '/'}>
      <div className="mt-4 mb-6 grid gap-2">
        <h1 className="text-2xl font-bold">
          {phase === 'closed' ? 'Final results' : 'Live results'}: {election.title}
        </h1>
        {phase === 'open' && (
          <Link href={`${base}/${election.slug}`} className="justify-self-start font-semibold text-accent hover:underline">
            Haven’t voted yet? Vote now
          </Link>
        )}
      </div>
      <LiveResults
        electionId={election.id}
        phase={phase}
        majorityRule={election.majority_rule}
        initial={shown}
        turnout={{ voted: all.voted, eligible: all.eligible }}
      />
      {phase === 'closed' && (
        <Link
          href={`${base}/${election.slug}/audit`}
          className="mt-6 flex items-center gap-3 rounded-lg border border-line bg-card p-4 transition-colors hover:bg-sunk"
        >
          <ShieldCheck className="size-6 shrink-0 text-accent" aria-hidden="true" />
          <span>
            <span className="block font-bold">Check the count yourself</span>
            <span className="block text-sm text-ink-2">Match ballots to turnout, and confirm your own ballot was counted.</span>
          </span>
        </Link>
      )}
    </VoterShell>
  );
}
