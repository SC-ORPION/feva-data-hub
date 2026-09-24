import { after, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';
import { electionVotingUrl } from '@/lib/config';
import { channels, sendEmail } from '@/lib/messaging';
import { randomCode } from '@/lib/voting/codes';
import { errorCode, friendlyError } from '@/lib/voting/errors';
import { formatCode } from '@/lib/voting/normalize';
import { ballotCookieName, hashReceipt, readToken } from '@/lib/voting/security';
import { fail, formatTime, isUuid, loadElection, loadVoter, ok } from '@/lib/voting/server';
import type { BallotChoice } from '@/lib/voting/types';

function parseChoices(input: unknown): BallotChoice[] | null {
  if (!Array.isArray(input) || input.length > 200) return null;
  const out: BallotChoice[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') return null;
    const { position_id, candidate_ids, approve } = item as Record<string, unknown>;
    if (!isUuid(position_id) || !Array.isArray(candidate_ids) || candidate_ids.length > 50) return null;
    if (!candidate_ids.every(isUuid)) return null;
    if (approve !== undefined && typeof approve !== 'boolean') return null;
    out.push({ position_id, candidate_ids, ...(approve === undefined ? {} : { approve }) });
  }
  return out;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { electionId?: string; choices?: unknown } | null;
  if (!isUuid(body?.electionId)) return fail(400, 'This voting link is not complete.');
  const electionId = body.electionId;

  const jar = await cookies();
  const cookieName = ballotCookieName(electionId);
  const token = readToken(jar.get(cookieName)?.value, 'ballot', electionId);
  if (!token) return fail(401, 'Your session ended. Please sign in again to vote.', { code: 'restart' });

  const choices = parseChoices(body.choices);
  if (!choices) return fail(400, friendlyError('bad_ballot'));

  const receipt = randomCode(10);
  const { error } = await supabaseAdmin().rpc('cast_ballot', {
    p_voter: token.voterId,
    p_choices: choices,
    p_receipt_hash: hashReceipt(electionId, receipt),
  });

  if (error) {
    const code = errorCode(error);
    if (code === 'already_voted' || code === 'voting_not_open' || code === 'not_on_list') jar.delete(cookieName);
    if (!code) console.error('cast_ballot failed', error);
    return fail(code === 'already_voted' ? 409 : 400, friendlyError(error), { code });
  }
  jar.delete(cookieName);

  const [voter, election] = await Promise.all([loadVoter(token.voterId), loadElection(electionId)]);
  const votedAt = voter?.voted_at ?? new Date().toISOString();

  // A copy of the receipt code, never the choices.
  const emailed = Boolean(voter?.email && election && channels().email);
  if (emailed && voter?.email && election) {
    const to = voter.email;
    const link = electionVotingUrl(election.organizations.slug, election.slug, req.nextUrl.origin);
    after(() =>
      sendEmail(to, `Your vote in ${election.title} was saved`, [
        `Your vote in ${election.title} was saved on ${formatTime(votedAt)}.`,
        'Your receipt code is:',
        `  ${formatCode(receipt)}`,
        `Only you have this code. To see your choices again, open ${link} and choose "Check my vote".`,
      ]).catch((err) => console.error('Receipt email failed', err)),
    );
  }

  return ok({ receipt: formatCode(receipt), votedAt, emailed });
}
