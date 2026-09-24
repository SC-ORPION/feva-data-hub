import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { electionPhase } from '@/lib/voting/phase';
import { fail, loadElection } from '@/lib/voting/server';

// Every counted ballot's fingerprint, one per line, published once voting has closed.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ electionId: string }> }) {
  const { electionId } = await ctx.params;
  const election = await loadElection(electionId);
  if (!election) return fail(404, 'We could not find this election.');
  if (electionPhase(election) !== 'closed') return fail(403, 'Fingerprints are published when voting closes.');

  const fingerprints: string[] = [];
  const db = supabaseAdmin();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.rpc('ballot_fingerprints', { p_election: election.id }).range(from, from + 999);
    if (error) return fail(500, 'Something went wrong on our side. Please try again.');
    fingerprints.push(...((data ?? []) as string[]));
    if (!data || data.length < 1000) break;
  }

  const body = ['fingerprint', ...fingerprints].join('\r\n') + '\r\n';
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${election.slug}-ballot-fingerprints.csv"`,
      'Cache-Control': 'public, max-age=60',
    },
  });
}
