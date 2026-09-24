import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { ballotCookieName, readToken } from '@/lib/voting/security';
import { isUuid, loadVoter, ok } from '@/lib/voting/server';

export async function GET(req: NextRequest) {
  const electionId = req.nextUrl.searchParams.get('election');
  if (!isUuid(electionId)) return ok({ verified: false });
  const jar = await cookies();
  const token = readToken(jar.get(ballotCookieName(electionId))?.value, 'ballot', electionId);
  if (!token) return ok({ verified: false });
  const voter = await loadVoter(token.voterId);
  if (!voter || voter.has_voted) return ok({ verified: false });
  return ok({ verified: true, name: voter.name });
}
