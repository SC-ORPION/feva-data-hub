import { CalendarClock, Lock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buttonClass } from '@/components/ui/button';
import { VoteFlow } from '@/components/voting/vote-flow';
import { VoterShell } from '@/components/voting/voter-shell';
import { formatDateTime } from '@/lib/format';
import { electionPhase, resultsArePublic } from '@/lib/voting/phase';
import { loadBallot, loadElectionBySlug } from '@/lib/voting/server';
import { voterBase } from '@/lib/voting/voter-base';

export const dynamic = 'force-dynamic';

type Params = Promise<{ org: string; election: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { org, election } = await params;
  const e = await loadElectionBySlug(org.toLowerCase(), election.toLowerCase());
  return { title: e ? `${e.title} · ${e.organizations.name}` : 'Not found', robots: { index: false } };
}

export default async function ElectionVotingPage({ params }: { params: Params }) {
  const { org, election: slug } = await params;
  const election = await loadElectionBySlug(org.toLowerCase(), slug.toLowerCase());
  if (!election) notFound();

  const base = await voterBase(election.organizations.slug);
  const phase = electionPhase(election);
  const resultsHref = `${base}/${election.slug}/results`;

  if (phase !== 'open') {
    return (
      <VoterShell orgName={election.organizations.name} homeHref={base || '/'}>
        <h1 className="mt-4 text-2xl font-bold">{election.title}</h1>
        <div className="mt-6 grid gap-5 rounded-lg border border-line bg-card p-6">
          {phase === 'scheduled' ? (
            <>
              <CalendarClock className="size-8 text-warn" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold">Voting hasn’t started yet</h2>
                <p className="mt-1 text-ink-2">It opens on {formatDateTime(election.starts_at)}. Come back to this page then.</p>
              </div>
            </>
          ) : (
            <>
              <Lock className="size-8 text-ink-2" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold">Voting has closed</h2>
                <p className="mt-1 text-ink-2">
                  {election.closed_at || election.ends_at ? `It closed on ${formatDateTime(election.closed_at ?? election.ends_at)}.` : 'Thank you to everyone who voted.'}
                </p>
              </div>
              <Link href={resultsHref} className={buttonClass('primary', 'lg', 'justify-self-start')}>
                See the results
              </Link>
            </>
          )}
        </div>
      </VoterShell>
    );
  }

  const positions = await loadBallot(election.id);

  return (
    <VoterShell orgName={election.organizations.name} homeHref={base || '/'}>
      <VoteFlow
        election={{
          id: election.id,
          title: election.title,
          description: election.description,
          voter_method: election.voter_method,
          resultsLive: resultsArePublic(election),
        }}
        positions={positions}
        base={base}
        slug={election.slug}
      />
    </VoterShell>
  );
}
