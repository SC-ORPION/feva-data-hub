import { Crown } from 'lucide-react';
import { Meter } from '@/components/ui/meter';
import { percent, plural } from '@/lib/format';
import { positionOutcome } from '@/lib/voting/tally';
import type { ElectionPhase, ResultCandidate, Results } from '@/lib/voting/types';
import { Initials } from './thumb-box';

function Face({ c }: { c: ResultCandidate }) {
  return c.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- small resized upload
    <img src={c.photo_url} alt="" width={44} height={44} decoding="async" className="size-11 shrink-0 rounded-md object-cover" />
  ) : (
    <Initials name={c.name} className="size-11 text-base" />
  );
}

export function ResultsView({ results, phase, majorityRule = false }: { results: Results; phase: ElectionPhase; majorityRule?: boolean }) {
  const final = phase === 'closed';
  return (
    <div className="grid gap-6">
      {results.positions.map((p) => {
        const o = positionOutcome(p, results.ballots, majorityRule);
        const leaderLabel = final ? 'Winner' : 'Leading';
        const majorityApplies = majorityRule && !o.unopposed && p.seats === 1;
        return (
          <section key={p.id} className="rounded-lg border border-line bg-card" aria-labelledby={`pos-${p.id}`}>
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3">
              <h3 id={`pos-${p.id}`} className="text-lg font-bold">
                {p.title}
              </h3>
              <p className="text-sm text-ink-2">
                {o.unopposed ? 'Yes or No' : p.seats > 1 ? `${p.seats} winners` : majorityApplies ? 'Needs more than half' : 'Most votes wins'}
                {o.skipped > 0 && ` · ${plural(o.skipped, 'voter')} skipped`}
              </p>
            </header>

            {o.runoff && (
              <p className="border-b border-line bg-warn-soft px-5 py-2.5 text-sm">
                <span className="font-bold text-warn">{final ? 'Run-off needed.' : 'Heading for a run-off.'}</span>{' '}
                Nobody {final ? 'got' : 'has'} more than half of the {o.totalChoices.toLocaleString()} valid votes
                {final ? ', so the top two go to a run-off.' : ' yet.'}
              </p>
            )}

            {o.unopposed && p.candidates[0] ? (
              <div className="grid gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Face c={p.candidates[0]} />
                  <span className="flex-1 font-semibold">{p.candidates[0].name}</span>
                  {o.tie ? (
                    <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-bold text-warn">Tied</span>
                  ) : o.totalChoices > 0 ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${o.winners.size ? 'bg-accent-soft text-accent' : 'bg-danger-soft text-danger'}`}>
                      {o.winners.size ? (final ? 'Approved' : 'Yes is ahead') : final ? 'Not approved' : 'No is ahead'}
                    </span>
                  ) : null}
                </div>
                {(
                  [
                    ['Yes', p.candidates[0].votes, o.winners.size > 0],
                    ['No', p.candidates[0].no_votes, o.winners.size === 0 && o.totalChoices > 0 && !o.tie],
                  ] as const
                ).map(([label, n, strong]) => (
                  <div key={label} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
                    <span className="text-sm font-semibold">{label}</span>
                    <Meter value={n} max={o.totalChoices} tone={strong ? 'accent' : 'muted'} />
                    <span className="w-24 text-right font-mono text-sm tabular">
                      {n.toLocaleString()} <span className="text-ink-3">{percent(n, o.totalChoices)}%</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <ol className="divide-y divide-line">
                {o.ranked.map((c) => {
                  const won = o.winners.has(c.id);
                  const inRunoff = Boolean(o.runoff?.includes(c.id));
                  const tiedHere = o.tie && c.votes === o.ranked[p.seats - 1]?.votes;
                  const denominator = p.seats > 1 ? p.ballots_with_choice : o.totalChoices;
                  return (
                    <li key={c.id} className="grid gap-2 px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Face c={c} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{c.name}</span>
                          {won && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                              {final && <Crown className="size-3.5" aria-hidden="true" />} {leaderLabel}
                            </span>
                          )}
                          {inRunoff && <span className="text-xs font-bold text-warn">{final ? 'In the run-off' : 'Top two so far'}</span>}
                          {tiedHere && <span className="text-xs font-bold text-warn">Tied</span>}
                        </span>
                        <span className="text-right">
                          <span className="block font-mono text-lg font-bold tabular">{c.votes.toLocaleString()}</span>
                          <span className="block font-mono text-xs text-ink-3 tabular">{percent(c.votes, denominator)}%</span>
                        </span>
                      </div>
                      <Meter value={c.votes} max={denominator} tone={won || inRunoff || tiedHere ? 'accent' : 'muted'} />
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
