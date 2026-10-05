'use client';

import { useState } from 'react';
import { Field, Input, Select } from '@/components/ui/field';
import { estimateCost, money, PRICING } from '@/lib/pricing';

export function PricingCalculator() {
  const [voters, setVoters] = useState(500);
  const [method, setMethod] = useState<'free' | 'sms'>('free');
  const [reminders, setReminders] = useState(1);
  const e = estimateCost(voters, method === 'sms', reminders);

  return (
    <div className="grid gap-6 rounded-lg border border-line bg-card p-5 sm:grid-cols-[1fr_1fr] sm:p-6">
      <div className="grid content-start gap-4">
        <Field label="How many voters?" htmlFor="calc-voters">
          <Input
            id="calc-voters"
            type="number"
            inputMode="numeric"
            min={0}
            max={1000000}
            value={voters}
            onChange={(ev) => setVoters(Number(ev.target.value))}
          />
        </Field>
        <Field label="How will they sign in?" htmlFor="calc-method">
          <Select id="calc-method" value={method} onChange={(ev) => setMethod(ev.target.value as 'free' | 'sms')}>
            <option value="free">Email or printed voting codes</option>
            <option value="sms">Phone number (we text a code)</option>
          </Select>
        </Field>
        {method === 'sms' && (
          <Field label="Reminders you plan to send" htmlFor="calc-reminders" hint="Each reminder is one text per person who has not voted. This assumes everyone.">
            <Input
              id="calc-reminders"
              type="number"
              inputMode="numeric"
              min={0}
              max={10}
              value={reminders}
              onChange={(ev) => setReminders(Number(ev.target.value))}
            />
          </Field>
        )}
      </div>
      <div className="grid content-start gap-3" aria-live="polite">
        <p className="text-sm text-ink-2">Estimated cost for one election</p>
        <p className="font-mono text-4xl font-bold tabular">{money(e.total)}</p>
        <dl className="grid gap-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-2">
              {e.billableVoters.toLocaleString()} voters after the first {PRICING.freeVoters}
            </dt>
            <dd className="font-mono tabular">{money(e.voterCost)}</dd>
          </div>
          {method === 'sms' && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">{e.smsCount.toLocaleString()} text messages</dt>
              <dd className="font-mono tabular">{money(e.smsCost)}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
