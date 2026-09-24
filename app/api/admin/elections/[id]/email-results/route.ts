import { NextRequest } from 'next/server';
import { supabaseAdmin, supabaseForRequest } from '@/lib/supabase/server';
import { electionVotingUrl } from '@/lib/config';
import { channels, sendEmail } from '@/lib/messaging';
import { electionPhase } from '@/lib/voting/phase';
import { fail, ok } from '@/lib/voting/server';
import { summaryLines } from '@/lib/voting/tally';
import type { Election, Results } from '@/lib/voting/types';

const BATCH = 150;

// Sends one batch per call so a large list never runs into a server time limit.
// The dashboard keeps calling with the next offset until `done` is true.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await supabaseForRequest(req);
  if (!auth) return fail(401, 'Please sign in again.');
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { offset?: number };
  const offset = Math.max(0, Math.floor(Number(body.offset) || 0));

  // Row level security makes this return nothing unless the caller runs this election.
  const { data: election } = await auth.db
    .from('elections')
    .select('*, organizations(slug)')
    .eq('id', id)
    .maybeSingle();
  if (!election) return fail(404, 'We could not find this election.');
  const e = election as Election & { organizations: { slug: string } };
  if (electionPhase(e) !== 'closed') return fail(400, 'You can email results once voting has closed.');
  if (e.voter_data_deleted_at) return fail(400, 'Voter details were deleted, so there is no one to email.');
  if (!channels().email) return fail(503, 'Email is not set up on this server yet.');

  const { data: results, error } = await auth.db.rpc('election_results', { p_election: id });
  if (error || !results) return fail(500, 'Could not count the results. Please try again.');

  const admin = supabaseAdmin();
  const { count: total } = await admin
    .from('voters')
    .select('id', { count: 'exact', head: true })
    .eq('election_id', id)
    .not('email', 'is', null);
  const { data: voters } = await admin
    .from('voters')
    .select('email')
    .eq('election_id', id)
    .not('email', 'is', null)
    .order('id')
    .range(offset, offset + BATCH - 1);

  const link = `${electionVotingUrl(e.organizations.slug, e.slug, req.nextUrl.origin)}/results`;
  const paragraphs = [
    `Voting in ${e.title} has closed. Here are the results:`,
    ...summaryLines(results as Results),
    `See the full count: ${link}`,
  ];

  let sent = 0;
  const emails = (voters ?? []).map((v) => v.email as string);
  for (let i = 0; i < emails.length; i += 10) {
    const chunk = emails.slice(i, i + 10);
    const outcome = await Promise.allSettled(
      chunk.map((to) => sendEmail(to, `Results: ${e.title}`, paragraphs)),
    );
    sent += outcome.filter((o) => o.status === 'fulfilled').length;
  }

  const nextOffset = offset + emails.length;
  const done = emails.length < BATCH || nextOffset >= (total ?? 0);
  if (done) {
    await admin.from('elections').update({ results_emailed_at: new Date().toISOString() }).eq('id', id);
    await admin.from('election_events').insert({
      election_id: id,
      actor_id: auth.user.id,
      kind: 'results_emailed',
      detail: String(total ?? nextOffset),
    });
  }
  return ok({ sent, nextOffset, total: total ?? 0, done });
}
