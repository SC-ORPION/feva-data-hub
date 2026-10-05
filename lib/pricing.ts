// Prices in Ghana cedis. Change these numbers and every page that shows a price updates.
export const PRICING = {
  currency: 'GH₵',
  freeVoters: 50,
  perVoter: 0.3,
  perSms: 0.1,
};

export interface Estimate {
  billableVoters: number;
  voterCost: number;
  smsCount: number;
  smsCost: number;
  total: number;
}

export function estimateCost(voters: number, usesSms: boolean, reminders: number): Estimate {
  const safe = Math.max(0, Math.floor(voters) || 0);
  const billableVoters = Math.max(0, safe - PRICING.freeVoters);
  const voterCost = billableVoters * PRICING.perVoter;
  const smsCount = usesSms ? safe * (1 + Math.max(0, reminders)) : 0;
  const smsCost = smsCount * PRICING.perSms;
  return { billableVoters, voterCost, smsCount, smsCost, total: voterCost + smsCost };
}

export function money(n: number): string {
  return `${PRICING.currency}${n.toLocaleString('en-GH', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
