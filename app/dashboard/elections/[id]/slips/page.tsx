'use client';

import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQr } from '@/components/admin/share-box';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { PageLoading } from '@/components/ui/spinner';
import { useAdmin } from '@/lib/admin-context';
import { electionVotingUrl } from '@/lib/config';
import { plural } from '@/lib/format';
import { supabaseBrowser } from '@/lib/supabase/client';
import { formatCode } from '@/lib/voting/normalize';
import type { Election } from '@/lib/voting/types';

interface Slip {
  id: string;
  name: string | null;
  access_code: string;
  has_voted: boolean;
}

export default function SlipsPage() {
  const { id } = useParams<{ id: string }>();
  const { org } = useAdmin();
  const [election, setElection] = useState<Election | null>(null);
  const [slips, setSlips] = useState<Slip[] | null>(null);
  const [onlyUnused, setOnlyUnused] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    (async () => {
      const { data: e } = await supabase.from('elections').select('*').eq('id', id).maybeSingle();
      setElection(e as Election | null);
      const all: Slip[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase
          .from('voters')
          .select('id, name, access_code, has_voted')
          .eq('election_id', id)
          .not('access_code', 'is', null)
          .order('name', { nullsFirst: false })
          .order('created_at')
          .range(from, from + 999);
        all.push(...((data ?? []) as Slip[]));
        if (!data || data.length < 1000) break;
      }
      setSlips(all);
    })();
  }, [id]);

  const url = election && org ? electionVotingUrl(org.slug, election.slug, window.location.origin) : '';
  const qr = useQr(url || 'about:blank', 240);

  if (!election || !slips || !org) return <PageLoading label="Preparing slips" />;
  const shown = onlyUnused ? slips.filter((s) => !s.has_voted) : slips;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 print:hidden">
        <Link href={`/dashboard/elections/${id}#voters`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" /> {election.title}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Code slips</h1>
            <p className="text-ink-2">
              {plural(shown.length, 'slip')}, 10 per A4 page. Cut along the dashed lines and hand one to each voter.
            </p>
          </div>
          <Button onClick={() => window.print()} disabled={!shown.length}>
            <Printer className="size-4" aria-hidden="true" /> Print
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyUnused} onChange={(e) => setOnlyUnused(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Only people who haven’t voted yet
        </label>
        {!slips.length && <Notice tone="warn">There are no codes on this list yet.</Notice>}
      </div>

      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 print:grid-cols-2">
        {shown.map((s) => (
          <article
            key={s.id}
            className="flex gap-4 border border-dashed border-line-strong bg-white p-5 text-[#13201a] break-inside-avoid print:h-[54mm]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-[#46564e] uppercase">{org.name}</p>
              <p className="truncate text-sm font-bold">{election.title}</p>
              {s.name && <p className="mt-2 truncate text-sm">For: {s.name}</p>}
              <p className="mt-2 text-xs text-[#46564e]">Your private voting code</p>
              <p className="font-mono text-2xl font-bold tracking-wider">{formatCode(s.access_code)}</p>
              <p className="mt-2 text-xs leading-snug text-[#46564e]">
                Open <span className="font-semibold break-all text-[#13201a]">{url.replace(/^https?:\/\//, '')}</span>, type this code and vote. Keep it
                to yourself: it works once.
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
            {qr && <img src={qr} alt="" className="size-24 shrink-0 self-center" />}
          </article>
        ))}
      </div>
    </div>
  );
}
