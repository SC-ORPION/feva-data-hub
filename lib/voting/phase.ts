import type { Election, ElectionPhase } from './types';

// Mirrors public.election_phase() in the database.
export function electionPhase(
  e: Pick<Election, 'status' | 'starts_at' | 'ends_at'>,
  now: Date = new Date(),
): ElectionPhase {
  if (e.status === 'draft') return 'draft';
  if (e.status === 'closed') return 'closed';
  if (e.ends_at && now >= new Date(e.ends_at)) return 'closed';
  if (e.starts_at && now < new Date(e.starts_at)) return 'scheduled';
  return 'open';
}

export function resultsArePublic(
  e: Pick<Election, 'status' | 'starts_at' | 'ends_at' | 'results_visibility'>,
): boolean {
  const phase = electionPhase(e);
  if (phase === 'closed') return true;
  return phase === 'open' && e.results_visibility === 'live';
}

export const PHASE_LABEL: Record<ElectionPhase, string> = {
  draft: 'Draft',
  scheduled: 'Starts soon',
  open: 'Voting open',
  closed: 'Closed',
};
