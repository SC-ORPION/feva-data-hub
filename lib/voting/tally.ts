import type { ResultCandidate, ResultPosition, Results } from './types';

export interface PositionOutcome {
  position: ResultPosition;
  ranked: ResultCandidate[];
  winners: Set<string>;
  tie: boolean;
  unopposed: boolean;
  skipped: number;
  totalChoices: number;
  /** Set when the 50% + 1 rule applies and nobody reached it: who goes to the run-off. */
  runoff: string[] | null;
}

// Under the majority rule a single-winner position needs more than half of the valid votes
// (skipped ballots don't count), as in the UG SRC constitution, Article 30(7).
export function positionOutcome(position: ResultPosition, ballots: number, majorityRule = false): PositionOutcome {
  const unopposed = position.candidates.length === 1;
  const ranked = [...position.candidates].sort((a, b) => b.votes - a.votes);
  const totalChoices = position.candidates.reduce((sum, c) => sum + c.votes + c.no_votes, 0);
  const winners = new Set<string>();
  let tie = false;
  let runoff: string[] | null = null;

  if (unopposed) {
    const only = ranked[0];
    if (only && only.votes > only.no_votes) winners.add(only.id);
    tie = Boolean(only && only.votes > 0 && only.votes === only.no_votes);
  } else if (majorityRule && position.seats === 1) {
    const top = ranked[0];
    if (top && top.votes * 2 > totalChoices) {
      winners.add(top.id);
    } else if (totalChoices > 0) {
      // Top two go through; anyone tied with second place goes through too.
      const second = ranked[1]?.votes ?? 0;
      runoff = ranked.filter((c, i) => i === 0 || (c.votes === second && c.votes > 0)).map((c) => c.id);
      if (runoff.length < 2) runoff = ranked.slice(0, 2).map((c) => c.id);
    }
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
    totalChoices,
    runoff,
  };
}

export function runoffsNeeded(results: Results, majorityRule: boolean): PositionOutcome[] {
  if (!majorityRule) return [];
  return results.positions.map((p) => positionOutcome(p, results.ballots, true)).filter((o) => o.runoff);
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
        ? `${p.title}: ${votes.toLocaleString()} ${votes === 1 ? 'choice' : 'choices'} on ${p.ballots_with_choice.toLocaleString()} ${p.ballots_with_choice === 1 ? 'ballot' : 'ballots'}, within the limit.`
        : `${p.title}: more choices than ballots allow.`,
    });
  }
  return { ok: lines.every((l) => l.ok), lines };
}

export function summaryLines(results: Results, majorityRule = false): string[] {
  return results.positions.map((p) => {
    const o = positionOutcome(p, results.ballots, majorityRule);
    if (o.runoff) {
      const names = o.ranked.filter((c) => o.runoff?.includes(c.id)).map((c) => `${c.name} (${c.votes})`);
      return `${p.title}: nobody passed half the votes. Run-off between ${names.join(' and ')}`;
    }
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
