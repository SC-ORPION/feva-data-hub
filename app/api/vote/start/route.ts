import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';
import { channels, sendEmail, sendSms } from '@/lib/messaging';
import {
  isEmail,
  isPhone,
  maskEmail,
  maskPhone,
  normalizeCode,
  normalizeEmail,
  normalizeMemberId,
  normalizePhone,
} from '@/lib/voting/normalize';
import { electionPhase } from '@/lib/voting/phase';
import { ballotCookieName, hashOtp, newOtp, readToken, signToken } from '@/lib/voting/security';
import { fail, formatTime, isUuid, loadElection, loadVoter, ok } from '@/lib/voting/server';
import type { Voter, VoterMethod } from '@/lib/voting/types';

const RESEND_SECONDS = 60;
const OTP_MINUTES = 10;

const NOT_FOUND: Record<VoterMethod, string> = {
  email: "We couldn't find that email on the voter list. Check the spelling, or ask your organizers to add you.",
  phone: "We couldn't find that phone number on the voter list. Check the number, or ask your organizers to add you.",
  member_id: "We couldn't find that ID on the voter list. Check it, or ask your organizers to add you.",
  code: "That voting code didn't work. Check each letter and number, or ask your organizers for help.",
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { electionId?: string; value?: string; ticket?: string }
    | null;
  const electionId = body?.electionId;
  if (!isUuid(electionId)) return fail(400, 'This voting link is not complete.');

  const election = await loadElection(electionId);
  if (!election) return fail(404, 'We could not find this election.');

  const phase = electionPhase(election);
  if (phase === 'scheduled' && election.starts_at) {
    return fail(403, `Voting opens on ${formatTime(election.starts_at)}.`, { code: 'not_open' });
  }
  if (phase !== 'open') return fail(403, 'Voting has closed.', { code: 'closed' });

  const db = supabaseAdmin();
  const method = election.voter_method;
  let voter: Voter | null = null;
  const resending = typeof body?.ticket === 'string';

  if (resending) {
    const ticket = readToken(body.ticket, 'otp', election.id);
    if (!ticket) return fail(400, 'Your sign-in timed out. Please start again.', { code: 'restart' });
    voter = await loadVoter(ticket.voterId);
  } else {
    const raw = typeof body?.value === 'string' ? body.value.trim().slice(0, 254) : '';
    if (!raw) return fail(400, 'Fill this in to continue.');

    let column: string;
    let value: string;
    if (method === 'email') {
      if (!isEmail(raw)) return fail(400, 'Enter a full email address, like ama@example.com.');
      [column, value] = ['email', normalizeEmail(raw)];
    } else if (method === 'phone') {
      if (!isPhone(raw)) return fail(400, 'Enter your phone number, like 024 123 4567.');
      [column, value] = ['phone', normalizePhone(raw)];
    } else if (method === 'member_id') {
      [column, value] = ['member_id', normalizeMemberId(raw)];
    } else {
      [column, value] = ['access_code', normalizeCode(raw)];
    }
    const { data } = await db
      .from('voters')
      .select('*')
      .eq('election_id', election.id)
      .eq(column, value)
      .maybeSingle();
    voter = data;
  }

  if (!voter) return fail(404, NOT_FOUND[method], { code: 'not_found' });
  if (voter.has_voted) {
    return fail(409, 'You have already voted in this election.', {
      code: 'already_voted',
      votedAt: voter.voted_at,
    });
  }

  if (method === 'code') {
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

  // Where does the sign-in code go?
  let channel: 'email' | 'sms';
  let destination: string;
  if (method === 'email' && voter.email) {
    [channel, destination] = ['email', voter.email];
  } else if (method === 'phone' && voter.phone) {
    [channel, destination] = ['sms', voter.phone];
  } else if (method === 'member_id' && voter.email) {
    [channel, destination] = ['email', voter.email];
  } else if (method === 'member_id' && voter.phone) {
    [channel, destination] = ['sms', voter.phone];
  } else {
    return fail(422, 'There is no email or phone number on the list for you. Ask your organizers to add one.');
  }
  const sentTo = channel === 'email' ? maskEmail(destination) : maskPhone(destination);
  const ticket = signToken('otp', voter.id, election.id, 20 * 60);

  const { data: existing } = await db
    .from('voter_otps')
    .select('sent_at, expires_at')
    .eq('voter_id', voter.id)
    .maybeSingle();
  if (existing) {
    const wait = RESEND_SECONDS - Math.floor((Date.now() - new Date(existing.sent_at).getTime()) / 1000);
    const stillValid = new Date(existing.expires_at).getTime() > Date.now();
    if (wait > 0 && stillValid) {
      if (resending) return fail(429, `Please wait ${wait} seconds before asking for another code.`, { wait });
      // They reloaded the page: reuse the code we just sent.
      return ok({ step: 'otp', ticket, sentTo, channel, resendIn: wait });
    }
  }

  const code = newOtp();
  const { error: saveError } = await db.from('voter_otps').upsert({
    voter_id: voter.id,
    code_hash: hashOtp(voter.id, code),
    expires_at: new Date(Date.now() + OTP_MINUTES * 60_000).toISOString(),
    attempts: 0,
    sent_at: new Date().toISOString(),
  });
  if (saveError) return fail(500, 'Something went wrong on our side. Please try again.');

  let delivered = false;
  try {
    delivered =
      channel === 'email'
        ? await sendEmail(destination, `${code} is your voting code`, [
            `Use this code to vote in ${election.title}:`,
            `  ${code}`,
            `It works for ${OTP_MINUTES} minutes. If you did not ask for it, you can ignore this email.`,
          ])
        : await sendSms(
            destination,
            `${code} is your code to vote in ${election.title}. It works for ${OTP_MINUTES} minutes.`,
          );
  } catch (err) {
    console.error('Could not send voting code', err);
    await db.from('voter_otps').delete().eq('voter_id', voter.id);
    return fail(502, "We couldn't send your code just now. Please try again in a minute.");
  }

  const { testMode } = channels();
  if (!delivered && !testMode) {
    await db.from('voter_otps').delete().eq('voter_id', voter.id);
    return fail(503, `Codes can't be sent by ${channel === 'email' ? 'email' : 'text message'} yet. Please tell your organizers.`);
  }

  return ok({
    step: 'otp',
    ticket,
    sentTo,
    channel,
    resendIn: RESEND_SECONDS,
    testCode: delivered ? undefined : code,
  });
}
