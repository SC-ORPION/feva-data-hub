'use client';

import { Plus, Vote } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { PageLoading } from '@/components/ui/spinner';
import { PhasePill } from '@/components/ui/status';
import { useAdmin } from '@/lib/admin-context';
import { formatDate, formatDateTime, percent } from '@/lib/format';
import { supabaseBrowser } from '@/lib/supabase/client';
import { electionPhase } from '@/lib/voting/phase';
import type { Election } from '@/lib/voting/types';

type Row = Election & { total: { count: number }[]; voted: { count: number }[] };

function whenText(e: Election): string {
  const phase = electionPhase(e);
  if (phase === 'draft') return `Created ${formatDate(e.created_at)}`;
  if (phase === 'scheduled') return `Opens ${formatDateTime(e.starts_at)}`;
  if (phase === 'open') return e.ends_at ? `Closes ${formatDateTime(e.ends_at)}` : 'Open until you close it';
  return `Closed ${formatDateTime(e.closed_at ?? e.ends_at)}`;
}

export default function ElectionsPage() {
  const { org, isPlatformAdmin } = useAdmin();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!org) return;
    supabaseBrowser()
      .from('elections')
      .select('*, total:voters(count), voted:voters(count)')
      .eq('org_id', org.id)
      .eq('voted.has_voted', true)
      .order('created_at', { ascending: false })
      .then(({ data, error: e }) => {
        if (e) setError(true);
        else setRows((data ?? []) as Row[]);
      });
  }, [org]);

  if (!org) return null;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Elections</h1>
          <p className="mt-1 text-ink-2">Everything {org.name} is voting on.</p>
        </div>
        <ButtonLink href="/dashboard/new">
          <Plus className="size-4" aria-hidden="true" /> New election
        </ButtonLink>
      </div>

      {org.status === 'pending' && (
        <Notice
          tone="warn"
          title="Waiting for approval"
          action={
            isPlatformAdmin ? (
              <Link href="/dashboard/platform" className="font-semibold text-accent underline-offset-2 hover:underline">
                You run this platform. Approve it now
              </Link>
            ) : undefined
          }
        >
          You can set up elections now. You’ll be able to open voting once we confirm {org.name} is real. This
          usually takes less than a day.
        </Notice>
      )}
      {org.status === 'rejected' && (
        <Notice tone="danger" title="We could not approve this organization">
          Voting can’t be opened. If you think this is a mistake, reply to your sign-up email and we’ll look again.
        </Notice>
      )}

      {error && <Notice tone="danger">We couldn’t load your elections. Refresh the page to try again.</Notice>}
      {!rows && !error && <PageLoading label="Loading elections" />}

      {rows && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-line-strong px-6 py-14 text-center">
          <Vote className="mx-auto size-10 text-ink-3" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="mt-4 text-lg font-bold">No elections yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-ink-2">
            Set up the positions, candidates and voter list. Nothing goes live until you open voting.
          </p>
          <ButtonLink href="/dashboard/new" className="mt-6">
            Set up your first election
          </ButtonLink>
        </div>
      )}

      {rows && rows.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
          {rows.map((e) => {
            const total = e.total[0]?.count ?? 0;
            const voted = e.voted[0]?.count ?? 0;
            const phase = electionPhase(e);
            return (
              <li key={e.id}>
                <Link
                  href={`/dashboard/elections/${e.id}`}
                  className="grid gap-x-6 gap-y-1 px-5 py-4 transition-colors hover:bg-sunk sm:grid-cols-[1fr_auto_10rem] sm:items-center"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{e.title}</span>
                    <span className="block text-sm text-ink-2">{whenText(e)}</span>
                  </span>
                  <span>
                    <PhasePill phase={phase} />
                  </span>
                  <span className="text-sm text-ink-2 tabular sm:text-right">
                    {phase === 'draft' ? (
                      `${total.toLocaleString()} on the list`
                    ) : (
                      <>
                        <span className="font-semibold text-ink">{voted.toLocaleString()}</span> of {total.toLocaleString()} voted
                        <span className="text-ink-3"> · {percent(voted, total)}%</span>
                      </>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
