import { NextResponse } from 'next/server';
import { channels } from '@/lib/messaging';

export function GET() {
  return NextResponse.json(channels(), { headers: { 'Cache-Control': 'no-store' } });
}
