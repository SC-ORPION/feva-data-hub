import type { ResultCandidate, ResultPosition, Results } from './types';

export interface PositionOutcome {
  position: ResultPosition;
  ranked: ResultCandidate[];
  winners: Set<string>;
  tie: boolean;
  unopposed: boolean;
  skipped: number;
  totalChoices: number;
}

export function positionOutcome(position: ResultPosition, ballots: number): PositionOutcome {
  const unopposed = position.candidates.length === 1;
  const ranked = [...position.candidates].sort((a, b) => b.votes - a.votes);
  const winners = new Set<string>();
  let tie = false;

  if (unopposed) {
    const only = ranked[0];
    if (only && only.votes > only.no_votes) winners.add(only.id);
    tie = Boolean(only && only.votes > 0 && only.votes === only.no_votes);
  } else {
    const cutoff = ranked[position.seats - 1]?.votes ?? 0;
    const next = ranked[position.seats]?.votes ?? -1;
    tie = cutoff > 0 && cutoff === next;
    for (const c of ranked.slice(0, position.seats)) {
      if (c.votes > 0 && !(tie && c.votes === cutoff)) winners.add(c.id);
    }
  }

  return {
    position,
    ranked,
    winners,
    tie,
    unopposed,
    skipped: Math.max(0, ballots - position.ballots_with_choice),
    totalChoices: position.candidates.reduce((sum, c) => sum + c.votes + c.no_votes, 0),
  };
}

export interface CountCheck {
  ok: boolean;
  lines: { ok: boolean; text: string }[];
}

// A recount from the raw ballots, checked against the voter list.
export function checkCount(results: Results): CountCheck {
  const lines: CountCheck['lines'] = [];
  lines.push({
    ok: results.ballots === results.voted,
    text:
      results.ballots === results.voted
        ? `${results.ballots.toLocaleString()} ballots match ${results.voted.toLocaleString()} people marked as voted.`
        : `${results.ballots.toLocaleString()} ballots but ${results.voted.toLocaleString()} people marked as voted.`,
  });
  for (const p of results.positions) {
    const votes = p.candidates.reduce((s, c) => s + c.votes + c.no_votes, 0);
    const ok = p.ballots_with_choice <= results.ballots && votes <= p.ballots_with_choice * p.seats;
    lines.push({
      ok,
      text: ok
        ? `${p.title}: ${votes.toLocaleString()} choices on ${p.ballots_with_choice.toLocaleString()} ballots, within the limit.`
        : `${p.title}: more choices than ballots allow.`,
    });
  }
  return { ok: lines.every((l) => l.ok), lines };
}

export function summaryLines(results: Results): string[] {
  return results.positions.map((p) => {
    const o = positionOutcome(p, results.ballots);
    if (o.unopposed) {
      const c = p.candidates[0];
      if (!c) return `${p.title}: no candidate`;
      const verdict = o.tie ? 'tied' : o.winners.has(c.id) ? 'approved' : 'not approved';
      return `${p.title}: ${c.name}, ${verdict} (${c.votes} yes, ${c.no_votes} no)`;
    }
    if (o.tie) return `${p.title}: tie, ${o.ranked.map((c) => `${c.name} ${c.votes}`).join(', ')}`;
    const names = o.ranked.filter((c) => o.winners.has(c.id)).map((c) => `${c.name} (${c.votes} votes)`);
    return `${p.title}: ${names.join(', ') || 'no votes'}`;
  });
}
