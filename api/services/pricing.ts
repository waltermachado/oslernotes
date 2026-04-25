import type { BillingInterval } from './subscriptionPeriods.js';

export type Plan = 'bronze' | 'prata' | 'ouro' | 'silver' | 'gold' | 'platinum';

export function isPlan(value: unknown): value is Plan {
  return (
    value === 'bronze' ||
    value === 'prata' ||
    value === 'ouro' ||
    value === 'silver' ||
    value === 'gold' ||
    value === 'platinum'
  );
}

export function priceCents(plan: Plan, interval: BillingInterval) {
  const normalized: 'bronze' | 'prata' | 'ouro' =
    plan === 'bronze' ? 'bronze' : plan === 'prata' || plan === 'silver' ? 'prata' : 'ouro';

  const monthly: Record<'bronze' | 'prata' | 'ouro', number> = {
    bronze: 34990,
    prata: 54990,
    ouro: 74990,
  };

  if (interval === 'monthly') return monthly[normalized];
  if (interval === 'quarterly') return Math.round(monthly[normalized] * 3 * 0.95);
  return Math.round(monthly[normalized] * 12 * 0.85);
}
