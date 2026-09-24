import type { ElectionPhase } from '@/lib/voting/types';
import { PHASE_LABEL } from '@/lib/voting/phase';

const STYLES: Record<ElectionPhase, { pill: string; dot: string }> = {
  draft: { pill: 'bg-sunk text-ink-2', dot: 'bg-ink-3' },
  scheduled: { pill: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  open: { pill: 'bg-accent-soft text-accent', dot: 'bg-accent animate-pulse' },
  closed: { pill: 'bg-ink text-paper', dot: 'bg-paper' },
};

export function PhasePill({ phase }: { phase: ElectionPhase }) {
  const s = STYLES[phase];
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${s.pill}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {PHASE_LABEL[phase]}
    </span>
  );
}
