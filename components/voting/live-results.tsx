'use client';

import { useEffect, useState } from 'react';
import { formatTime, percent } from '@/lib/format';
import type { ElectionPhase, Results } from '@/lib/voting/types';
import { ResultsView } from './results-view';

export function LiveResults({ electionId, initial, phase: initialPhase }: { electionId: string; initial: Results; phase: ElectionPhase }) {
  const [results, setResults] = useState(initial);
  const [phase, setPhase] = useState(initialPhase);
  const [updated, setUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'open') return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/results/${electionId}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.results) setResults(json.results);
        if (json.phase) setPhase(json.phase);
        setUpdated(new Date().toISOString());
      } catch {}
    }, 10000);
    return () => clearInterval(t);
  }, [electionId, phase]);

  const turnout = percent(results.voted, results.eligible);

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-line bg-card p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-ink-2">{phase === 'closed' ? 'Final turnout' : 'Turnout so far'}</p>
            <p className="font-mono text-2xl font-bold tabular">
              {results.voted.toLocaleString()}
              <span className="text-base font-normal text-ink-2"> of {results.eligible.toLocaleString()} voted</span>
            </p>
          </div>
          <p className="font-mono text-xl font-bold text-accent tabular">{turnout}%</p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-sunk">
          <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${turnout}%` }} />
        </div>
        {phase === 'open' && (
          <p className="mt-2 text-xs text-ink-3" aria-live="polite">
            Live. Updates every 10 seconds{updated ? `, last at ${formatTime(updated)}` : ''}.
          </p>
        )}
      </section>
      <ResultsView results={results} phase={phase} />
    </div>
  );
}
