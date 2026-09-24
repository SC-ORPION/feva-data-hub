import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Election, Organization, Position, Voter } from './types';

export type ElectionWithOrg = Election & { organizations: Pick<Organization, 'name' | 'slug' | 'status'> };

export function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function ok(body: Record<string, unknown>) {
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export async function loadElection(id: string): Promise<ElectionWithOrg | null> {
  if (!isUuid(id)) return null;
  const { data } = await supabaseAdmin()
    .from('elections')
    .select('*, organizations(name, slug, status)')
    .eq('id', id)
    .neq('status', 'draft')
    .maybeSingle();
  return (data as ElectionWithOrg | null) ?? null;
}

export async function loadElectionBySlug(orgSlug: string, electionSlug: string) {
  const { data } = await supabaseAdmin()
    .from('elections')
    .select('*, organizations!inner(name, slug, status)')
    .eq('organizations.slug', orgSlug)
    .eq('slug', electionSlug)
    .neq('status', 'draft')
    .maybeSingle();
  return (data as ElectionWithOrg | null) ?? null;
}

export async function loadBallot(electionId: string): Promise<Position[]> {
  const { data } = await supabaseAdmin()
    .from('positions')
    .select('id, election_id, title, seats, sort_order, candidates(id, position_id, name, bio, photo_url, sort_order)')
    .eq('election_id', electionId)
    .order('sort_order');
  return ((data ?? []) as Position[]).map((p) => ({
    ...p,
    candidates: [...p.candidates].sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export async function loadVoter(id: string): Promise<(Voter & { election_id: string }) | null> {
  const { data } = await supabaseAdmin().from('voters').select('*').eq('id', id).maybeSingle();
  return data ?? null;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: process.env.DISPLAY_TIMEZONE || 'Africa/Accra',
  }).format(new Date(iso));
}
