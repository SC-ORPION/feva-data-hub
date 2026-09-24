import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { normalizeCode } from '@/lib/voting/normalize';
import { hashReceipt } from '@/lib/voting/security';
import { fail, isUuid, ok } from '@/lib/voting/server';

// Confirms a ballot is in the count and returns its public fingerprint.
// It never returns choices, so a receipt can't be used to prove a vote to anyone.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { electionId?: string; receipt?: string } | null;
  if (!isUuid(body?.electionId)) return fail(400, 'This link is not complete.');
  const receipt = normalizeCode(String(body.receipt ?? ''));
  if (receipt.length !== 10) return fail(400, 'A receipt code has 10 letters and numbers, like K7QM2-XP9RT.');

  const { data, error } = await supabaseAdmin().rpc('ballot_by_receipt', {
    p_election: body.electionId,
    p_receipt_hash: hashReceipt(body.electionId, receipt),
  });
  if (error) return fail(500, 'Something went wrong on our side. Please try again.');
  if (!data) return fail(404, "We couldn't find a ballot with that receipt code. Check each letter and number.");
  return ok({ fingerprint: (data as { fingerprint: string }).fingerprint });
}
