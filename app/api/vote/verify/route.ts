import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';
import { electionPhase } from '@/lib/voting/phase';
import { ballotCookieName, otpMatches, readToken, signToken } from '@/lib/voting/security';
import { fail, isUuid, loadElection, loadVoter, ok } from '@/lib/voting/server';

const MAX_TRIES = 5;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { electionId?: string; ticket?: string; code?: string }
    | null;
  if (!isUuid(body?.electionId)) return fail(400, 'This voting link is not complete.');
  const ticket = readToken(body.ticket, 'otp', body.electionId);
  if (!ticket) return fail(400, 'Your sign-in timed out. Please start again.', { code: 'restart' });

  const code = String(body.code ?? '').replace(/\D/g, '');
  if (code.length !== 6) return fail(400, 'Enter the 6 numbers from your message.');

  const db = supabaseAdmin();
  const { data: otp } = await db.from('voter_otps').select('*').eq('voter_id', ticket.voterId).maybeSingle();
  if (!otp || new Date(otp.expires_at).getTime() < Date.now()) {
    return fail(400, 'This code has expired. Ask for a new one.', { code: 'expired' });
  }
  if (otp.attempts >= MAX_TRIES) {
    return fail(429, 'Too many wrong tries. Ask for a new code.', { code: 'expired' });
  }
  if (!otpMatches(ticket.voterId, code, otp.code_hash)) {
    const left = MAX_TRIES - otp.attempts - 1;
    await db.from('voter_otps').update({ attempts: otp.attempts + 1 }).eq('voter_id', ticket.voterId);
    return fail(
      400,
      left > 0
        ? `That code is not right. You have ${left} ${left === 1 ? 'try' : 'tries'} left.`
        : 'Too many wrong tries. Ask for a new code.',
      { code: left > 0 ? 'wrong' : 'expired' },
    );
  }

  await db.from('voter_otps').delete().eq('voter_id', ticket.voterId);

  const [voter, election] = await Promise.all([loadVoter(ticket.voterId), loadElection(body.electionId)]);
  if (!voter || !election || voter.election_id !== election.id) return fail(404, 'We could not find you on this list.');
  if (voter.has_voted) return fail(409, 'You have already voted in this election.', { code: 'already_voted', votedAt: voter.voted_at });
  if (electionPhase(election) !== 'open') return fail(403, 'Voting has closed.', { code: 'closed' });

  const jar = await cookies();
  jar.set(ballotCookieName(election.id), signToken('ballot', voter.id, election.id, 3600), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 3600,
  });
  return ok({ step: 'ballot', name: voter.name });
}
