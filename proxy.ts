import { NextResponse, type NextRequest } from 'next/server';

const RESERVED = new Set(['www', 'app', 'admin', 'api']);

// With NEXT_PUBLIC_ROOT_DOMAIN=fevavote.com, a visit to achimota.fevavote.com/src-2026
// is served by /v/achimota/src-2026. Everything else passes through untouched.
export function proxy(req: NextRequest) {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (!root) return NextResponse.next();

  const host = (req.headers.get('host') ?? '').toLowerCase();
  if (!host.endsWith(`.${root}`)) return NextResponse.next();

  const sub = host.slice(0, -(root.length + 1));
  if (!sub || sub.includes('.') || RESERVED.has(sub)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/v/${sub}${url.pathname === '/' ? '' : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api/|_next/|favicon.ico|icon.svg|.*\\.[a-z0-9]+$).*)'],
};
