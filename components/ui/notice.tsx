import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warn' | 'danger';

const TONES: Record<Tone, { box: string; icon: typeof Info }> = {
  info: { box: 'bg-sunk text-ink', icon: Info },
  success: { box: 'bg-accent-soft text-ink', icon: CheckCircle2 },
  warn: { box: 'bg-warn-soft text-ink', icon: AlertTriangle },
  danger: { box: 'bg-danger-soft text-ink', icon: XCircle },
};

const ICON_COLOR: Record<Tone, string> = {
  info: 'text-ink-2',
  success: 'text-accent',
  warn: 'text-warn',
  danger: 'text-danger',
};

export function Notice({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const { box, icon: Icon } = TONES[tone];
  return (
    <div className={`flex gap-3 rounded-lg px-4 py-3 ${box}`} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon className={`mt-0.5 size-5 shrink-0 ${ICON_COLOR[tone]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 text-ink-2' : ''}>{children}</div>}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}
