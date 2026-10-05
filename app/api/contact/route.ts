import { NextResponse } from 'next/server';
import { channels, sendEmail } from '@/lib/messaging';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  // Bots fill the hidden field. Answer as if it worked.
  if (typeof body?.website === 'string' && body.website) return NextResponse.json({ ok: true });

  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: 'Enter your name.' }, { status: 400 });
  if (!EMAIL.test(email) || email.length > 254) return NextResponse.json({ error: 'Enter a valid email so we can reply.' }, { status: 400 });
  if (message.length < 10 || message.length > 3000) {
    return NextResponse.json({ error: 'Write a message between 10 and 3,000 characters.' }, { status: 400 });
  }

  const to = process.env.CONTACT_TO || process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  if (!to || !channels().email) {
    return NextResponse.json({ error: 'Messages are not switched on yet. Please try again later.' }, { status: 503 });
  }

  try {
    await sendEmail(to, `New message from ${name.replace(/[\r\n]+/g, ' ')}`, [`From: ${name} <${email}>`, message]);
  } catch {
    return NextResponse.json({ error: 'We could not send your message. Please try again.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
