import { NextRequest } from 'next/server';
import { supabaseAdmin, supabaseForRequest } from '@/lib/supabase/server';
import { electionVotingUrl } from '@/lib/config';
import { channels, sendEmail, sendSms } from '@/lib/messaging';
import { electionPhase } from '@/lib/voting/phase';
import { fail, formatTime, isUuid, ok } from '@/lib/voting/server';
import type { Election, Voter } from '@/lib/voting/types';

const BATCH = 100;
const COOLDOWN_MINUTES = 30;

// Reminds people on the list who haven't voted. Called in batches like the results email.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await supabaseForRequest(req);
  if (!auth) return fail(401, 'Please sign in again.');
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { offset?: number; count?: boolean; after?: string };
  const offset = Math.max(0, Math.floor(Number(body.offset) || 0));

  const { data } = await auth.db.from('elections').select('*, organizations(slug)').eq('id', id).maybeSingle();
  if (!data) return fail(404, 'We could not find this election.');
  const e = data as Election & { organizations: { slug: string } };
  if (electionPhase(e) !== 'open') return fail(400, 'You can send reminders while voting is open.');
  if (e.voter_method === 'code') return fail(400, 'Voting codes have no contact details to remind.');

  const admin = supabaseAdmin();
  const { count: waiting } = await admin
    .from('voters')
    .select('id', { count: 'exact', head: true })
    .eq('election_id', id)
    .eq('has_voted', false);
  if (body.count) return ok({ waiting: waiting ?? 0 });

  if (offset === 0 && e.reminded_at) {
    const since = (Date.now() - new Date(e.reminded_at).getTime()) / 60000;
    if (since < COOLDOWN_MINUTES) {
      return fail(429, `You sent reminders at ${formatTime(e.reminded_at)}. Wait ${Math.ceil(COOLDOWN_MINUTES - since)} minutes before sending more.`);
    }
  }
  const { email, sms } = channels();

  // Keyset paging on id: people who vote mid-send drop out without shifting the pages.
  const after = isUuid(body.after) ? body.after : null;
  let q = admin.from('voters').select('id, email, phone').eq('election_id', id).eq('has_voted', false).order('id').limit(BATCH);
  if (after) q = q.gt('id', after);
  const { data: batch } = await q;
  const people = (batch ?? []) as Pick<Voter, 'id' | 'email' | 'phone'>[];

  const link = electionVotingUrl(e.organizations.slug, e.slug, req.nextUrl.origin);
  const closes = e.ends_at ? ` Voting closes ${formatTime(e.ends_at)}.` : '';
  let sent = 0;
  for (let i = 0; i < people.length; i += 10) {
    const chunk = people.slice(i, i + 10);
    const outcome = await Promise.allSettled(
      chunk.map((p) => {
        const useEmail = e.voter_method !== 'phone' && p.email && email;
        if (useEmail) {
          return sendEmail(p.email as string, `Reminder: vote in ${e.title}`, [
            `You haven't voted in ${e.title} yet.${closes}`,
            `Vote here: ${link}`,
          ]);
        }
        if (p.phone && sms) return sendSms(p.phone, `You haven't voted in ${e.title} yet.${closes} Vote: ${link}`);
        return Promise.resolve(false);
      }),
    );
    sent += outcome.filter((o) => o.status === 'fulfilled' && o.value).length;
  }

  const done = people.length < BATCH;
  if (done) {
    await admin.from('elections').update({ reminded_at: new Date().toISOString() }).eq('id', id);
    await admin.from('election_events').insert({ election_id: id, actor_id: auth.user.id, kind: 'reminders_sent', detail: String(offset + sent) });
  }
  return ok({ sent, nextOffset: offset + sent, after: people.at(-1)?.id ?? after, done, waiting: waiting ?? 0 });
}
