'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageLoading } from '@/components/ui/spinner';
import { VoteFlow } from '@/components/voting/vote-flow';
import { VoterShell } from '@/components/voting/voter-shell';
import { useAdmin } from '@/lib/admin-context';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Election, Position } from '@/lib/voting/types';

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { org } = useAdmin();
  const [data, setData] = useState<{ election: Election; positions: Position[] } | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    Promise.all([
      supabase.from('elections').select('*').eq('id', id).maybeSingle(),
      supabase.from('positions').select('*, candidates(*)').eq('election_id', id).order('sort_order'),
    ]).then(([{ data: election }, { data: positions }]) => {
      if (!election) return;
      setData({
        election: election as Election,
        positions: ((positions ?? []) as Position[]).map((p) => ({ ...p, candidates: [...p.candidates].sort((a, b) => a.sort_order - b.sort_order) })),
      });
    });
  }, [id]);

  if (!data || !org) return <PageLoading label="Loading preview" />;

  return (
    <div className="grid gap-4">
      <Link href={`/dashboard/elections/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to {data.election.title}
      </Link>
      {/* The transform makes this frame the containing block for the ballot's fixed bottom bar,
          so it pins to the bottom of the phone frame instead of the browser window. */}
      <div className="mx-auto h-[min(78vh,52rem)] w-full max-w-[26rem] overflow-hidden rounded-[1.75rem] border-[6px] border-ink bg-paper shadow-[0_24px_60px_-28px_rgba(19,32,26,0.45)] [transform:translateZ(0)]">
        <div className="h-full overflow-y-auto">
          <VoterShell orgName={org.name} homeHref="">
            <VoteFlow
              preview
              election={{
                id: data.election.id,
                title: data.election.title,
                description: data.election.description,
                voter_method: data.election.voter_method,
                resultsLive: false,
              }}
              positions={data.positions}
              base=""
              slug={data.election.slug}
            />
          </VoterShell>
        </div>
      </div>
    </div>
  );
}
