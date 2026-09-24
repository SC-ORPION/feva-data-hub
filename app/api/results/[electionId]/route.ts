import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { electionPhase, resultsArePublic } from '@/lib/voting/phase';
import { fail, loadElection, ok } from '@/lib/voting/server';
import type { Results } from '@/lib/voting/types';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ electionId: string }> }) {
  const { electionId } = await ctx.params;
  const election = await loadElection(electionId);
  if (!election) return fail(404, 'We could not find this election.');

  const phase = electionPhase(election);
  const { data, error } = await supabaseAdmin().rpc('election_results', { p_election: election.id });
  if (error || !data) return fail(500, 'Something went wrong on our side. Please try again.');
  const results = data as Results;

  // Turnout is always public; the count only when the organizer allows it.
  if (!resultsArePublic(election)) {
    return ok({ hidden: true, phase, turnout: { voted: results.voted, eligible: results.eligible } });
  }
  return ok({ hidden: false, phase, majorityRule: election.majority_rule, results });
}
