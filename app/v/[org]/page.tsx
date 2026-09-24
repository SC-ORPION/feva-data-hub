import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PhasePill } from '@/components/ui/status';
import { VoterShell } from '@/components/voting/voter-shell';
import { formatDateTime } from '@/lib/format';
import { supabaseAdmin } from '@/lib/supabase/server';
import { electionPhase } from '@/lib/voting/phase';
import type { Election } from '@/lib/voting/types';
import { voterBase } from '@/lib/voting/voter-base';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  const db = supabaseAdmin();
  const { data: org } = await db.from('organizations').select('id, name, slug').eq('slug', slug.toLowerCase()).maybeSingle();
  if (!org) return null;
  const { data: elections } = await db
    .from('elections')
    .select('id, title, slug, status, starts_at, ends_at, closed_at, results_visibility')
    .eq('org_id', org.id)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });
  return { org, elections: (elections ?? []) as Election[] };
}

export async function generateMetadata({ params }: { params: Promise<{ org: string }> }): Promise<Metadata> {
  const data = await load((await params).org);
  return { title: data?.org.name ?? 'Not found' };
}

export default async function OrgVotingHome({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const base = await voterBase(data.org.slug);

  const groups = [
    { title: 'Voting now', items: data.elections.filter((e) => electionPhase(e) === 'open') },
    { title: 'Coming up', items: data.elections.filter((e) => electionPhase(e) === 'scheduled') },
    { title: 'Finished', items: data.elections.filter((e) => electionPhase(e) === 'closed') },
  ].filter((g) => g.items.length);

  return (
    <VoterShell orgName={data.org.name} homeHref={base || '/'}>
      <h1 className="mt-4 text-2xl font-bold">Elections</h1>
      {!groups.length && <p className="mt-4 text-ink-2">There is nothing to vote on right now. Check back when your organizers share a link.</p>}
      <div className="mt-6 grid gap-8">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="text-sm font-bold text-ink-2">{g.title}</h2>
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-card">
              {g.items.map((e) => {
                const phase = electionPhase(e);
                return (
                  <li key={e.id}>
                    <Link href={`${base}/${e.slug}${phase === 'closed' ? '/results' : ''}`} className="flex items-center gap-3 px-4 py-4 hover:bg-sunk">
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{e.title}</span>
                        <span className="block text-sm text-ink-2">
                          {phase === 'open' && (e.ends_at ? `Closes ${formatDateTime(e.ends_at)}` : 'Open now')}
                          {phase === 'scheduled' && `Opens ${formatDateTime(e.starts_at)}`}
                          {phase === 'closed' && 'See the results'}
                        </span>
                      </span>
                      <PhasePill phase={phase} />
                      <ChevronRight className="size-5 text-ink-3" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </VoterShell>
  );
}
