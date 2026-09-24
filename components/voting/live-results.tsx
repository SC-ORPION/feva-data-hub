'use client';

import { useEffect, useState } from 'react';
import { Meter } from '@/components/ui/meter';
import { formatTime, percent } from '@/lib/format';
import type { ElectionPhase, Results } from '@/lib/voting/types';
import { ResultsView } from './results-view';

interface Props {
  electionId: string;
  phase: ElectionPhase;
  majorityRule: boolean;
  initial: Results | null;
  turnout: { voted: number; eligible: number };
}

function Turnout({ voted, eligible, phase, updated }: { voted: number; eligible: number; phase: ElectionPhase; updated: string | null }) {
  const pct = percent(voted, eligible);
  return (
    <section className="rounded-lg border border-line bg-card p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-2">{phase === 'closed' ? 'Final turnout' : 'Turnout so far'}</p>
          <p className="font-mono text-2xl font-bold tabular">
            {voted.toLocaleString()}
            <span className="text-base font-normal text-ink-2"> of {eligible.toLocaleString()} voted</span>
          </p>
        </div>
        <p className="font-mono text-xl font-bold text-accent tabular">{pct}%</p>
      </div>
      <Meter value={voted} max={eligible} className="mt-3 h-2.5" label="Turnout" />
      {phase === 'open' && (
        <p className="mt-2 text-xs text-ink-3" aria-live="polite">
          Live. Updates every 10 seconds{updated ? `, last at ${formatTime(updated)}` : ''}.
        </p>
      )}
    </section>
  );
}

export function LiveResults({ electionId, phase: initialPhase, majorityRule, initial, turnout: initialTurnout }: Props) {
  const [results, setResults] = useState(initial);
  const [turnout, setTurnout] = useState(initialTurnout);
  const [phase, setPhase] = useState(initialPhase);
  const [updated, setUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'open') return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/results/${electionId}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.results) {
          setResults(json.results);
          setTurnout({ voted: json.results.voted, eligible: json.results.eligible });
        } else if (json.turnout) {
          setTurnout(json.turnout);
        }
        if (json.phase) setPhase(json.phase);
        setUpdated(new Date().toISOString());
      } catch {}
    }, 10000);
    return () => clearInterval(t);
  }, [electionId, phase]);

  return (
    <div className="grid gap-6">
      <Turnout voted={turnout.voted} eligible={turnout.eligible} phase={phase} updated={updated} />
      {results ? (
        <ResultsView results={results} phase={phase} majorityRule={majorityRule} />
      ) : (
        <div className="grid gap-1 rounded-lg border border-line bg-card p-5">
          <h2 className="font-bold">The count is shared after voting closes</h2>
          <p className="text-ink-2">The organizers chose to keep it private until then. Turnout above is live.</p>
        </div>
      )}
    </div>
  );
}
