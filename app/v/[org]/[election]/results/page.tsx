import { EyeOff } from 'lucide-react';
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

  let results: Results | null = null;
  if (resultsArePublic(election)) {
    const { data } = await supabaseAdmin().rpc('election_results', { p_election: election.id });
    results = data as Results | null;
  }

  return (
    <VoterShell orgName={election.organizations.name} homeHref={base || '/'}>
      <div className="mt-4 mb-6">
        <p className="text-sm font-semibold text-ink-2">{phase === 'closed' ? 'Final results' : 'Live results'}</p>
        <h1 className="text-2xl font-bold">{election.title}</h1>
      </div>
      {results ? (
        <LiveResults electionId={election.id} initial={results} phase={phase} />
      ) : (
        <div className="grid gap-3 rounded-lg border border-line bg-card p-6">
          <EyeOff className="size-8 text-ink-2" aria-hidden="true" />
          <h2 className="text-lg font-bold">Results are shared after voting closes</h2>
          <p className="text-ink-2">The organizers chose to keep the count private until then.</p>
          {phase === 'open' && (
            <Link href={`${base}/${election.slug}`} className="font-semibold text-accent hover:underline">
              Go and vote
            </Link>
          )}
        </div>
      )}
    </VoterShell>
  );
}
