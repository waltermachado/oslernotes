export type BillingInterval = 'monthly' | 'quarterly' | 'yearly';

export function addInterval(start: Date, interval: BillingInterval) {
  const d = new Date(start);
  if (interval === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (interval === 'quarterly') {
    d.setMonth(d.getMonth() + 3);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

