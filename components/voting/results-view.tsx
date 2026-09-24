import { Crown } from 'lucide-react';
import { percent, plural } from '@/lib/format';
import { positionOutcome } from '@/lib/voting/tally';
import type { ElectionPhase, Results } from '@/lib/voting/types';
import { Initials } from './thumb-box';

function Bar({ value, total, strong }: { value: number; total: number; strong: boolean }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-sunk" aria-hidden="true">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${strong ? 'bg-accent' : 'bg-line-strong'}`}
        style={{ width: `${percent(value, total)}%` }}
      />
    </div>
  );
}

export function ResultsView({ results, phase }: { results: Results; phase: ElectionPhase }) {
  const final = phase === 'closed';
  return (
    <div className="grid gap-6">
      {results.positions.map((p) => {
        const o = positionOutcome(p, results.ballots);
        const leaderLabel = final ? 'Winner' : 'Leading';
        return (
          <section key={p.id} className="rounded-lg border border-line bg-card" aria-labelledby={`pos-${p.id}`}>
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3">
              <h3 id={`pos-${p.id}`} className="text-lg font-bold">
                {p.title}
              </h3>
              <p className="text-sm text-ink-2">
                {o.unopposed ? 'Yes or No' : p.seats > 1 ? `${p.seats} winners` : 'One winner'}
                {o.skipped > 0 && ` · ${plural(o.skipped, 'voter')} skipped`}
              </p>
            </header>

            {o.unopposed && p.candidates[0] ? (
              <div className="grid gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- small resized upload */}
                  {p.candidates[0].photo_url ? <img src={p.candidates[0].photo_url} alt="" className="size-11 rounded-md object-cover" /> : <Initials name={p.candidates[0].name} className="size-11 text-base" />}
                  <span className="flex-1 font-semibold">{p.candidates[0].name}</span>
                  {o.tie ? (
                    <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-bold text-warn">Tied</span>
                  ) : o.totalChoices > 0 ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${o.winners.size ? 'bg-accent-soft text-accent' : 'bg-danger-soft text-danger'}`}>
                      {o.winners.size ? (final ? 'Approved' : 'Yes is ahead') : final ? 'Not approved' : 'No is ahead'}
                    </span>
                  ) : null}
                </div>
                {[
                  ['Yes', p.candidates[0].votes, o.winners.size > 0],
                  ['No', p.candidates[0].no_votes, o.winners.size === 0 && o.totalChoices > 0 && !o.tie],
                ].map(([label, n, strong]) => (
                  <div key={label as string} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
                    <span className="text-sm font-semibold">{label}</span>
                    <Bar value={n as number} total={o.totalChoices} strong={strong as boolean} />
                    <span className="w-24 text-right font-mono text-sm tabular">
                      {(n as number).toLocaleString()} <span className="text-ink-3">{percent(n as number, o.totalChoices)}%</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <ol className="divide-y divide-line">
                {o.ranked.map((c) => {
                  const won = o.winners.has(c.id);
                  const tiedHere = o.tie && c.votes === o.ranked[p.seats - 1]?.votes;
                  const denominator = p.seats > 1 ? p.ballots_with_choice : o.totalChoices;
                  return (
                    <li key={c.id} className="grid gap-2 px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element -- small resized upload */}
                        {c.photo_url ? <img src={c.photo_url} alt="" className="size-11 rounded-md object-cover" /> : <Initials name={c.name} className="size-11 text-base" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{c.name}</span>
                          {won && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                              {final && <Crown className="size-3.5" aria-hidden="true" />} {leaderLabel}
                            </span>
                          )}
                          {tiedHere && <span className="text-xs font-bold text-warn">Tied</span>}
                        </span>
                        <span className="text-right">
                          <span className="block font-mono text-lg font-bold tabular">{c.votes.toLocaleString()}</span>
                          <span className="block font-mono text-xs text-ink-3 tabular">{percent(c.votes, denominator)}%</span>
                        </span>
                      </div>
                      <Bar value={c.votes} total={denominator} strong={won || Boolean(tiedHere)} />
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
