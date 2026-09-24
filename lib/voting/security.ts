import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

function secret(): string {
  const value = process.env.VOTER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error('Set VOTER_SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY).');
  return value;
}

function hmac(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function newOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(voterId: string, code: string): string {
  return hmac(`otp:${voterId}:${code}`);
}

export function otpMatches(voterId: string, code: string, hash: string): boolean {
  return safeEqual(hashOtp(voterId, code), hash);
}

export function hashReceipt(electionId: string, receipt: string): string {
  return hmac(`receipt:${electionId}:${receipt}`);
}

// Signed, expiring tokens. "otp" tickets carry a voter between the two sign-in steps;
// "ballot" tokens (in an httpOnly cookie) let a verified voter submit once.
type TokenKind = 'otp' | 'ballot';

interface TokenBody {
  k: TokenKind;
  v: string;
  e: string;
  x: number;
}

export function signToken(kind: TokenKind, voterId: string, electionId: string, ttlSeconds: number): string {
  const body: TokenBody = { k: kind, v: voterId, e: electionId, x: Date.now() + ttlSeconds * 1000 };
  const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${payload}.${hmac(`token:${payload}`)}`;
}

export function readToken(
  token: string | undefined | null,
  kind: TokenKind,
  electionId: string,
): { voterId: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig || !safeEqual(sig, hmac(`token:${payload}`))) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenBody;
    if (body.k !== kind || body.e !== electionId || body.x < Date.now()) return null;
    return { voterId: body.v };
  } catch {
    return null;
  }
}

export function ballotCookieName(electionId: string): string {
  return `fv_ballot_${electionId.replace(/-/g, '').slice(0, 16)}`;
}
