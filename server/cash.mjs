import { DENOMINATIONS, countTotal, addCounts } from '../shared/finance.mjs';
export function drawer(s, venueId) {
  const movements = (s.cashMovements ?? []).filter(
    (m) => m.venueId === venueId && m.day === s.day,
  );
  const counts = movements.reduce((a, m) => addCounts(a, m.counts), {});
  const untracked = s.payments
    .filter(
      (p) =>
        p.venueId === venueId &&
        p.method === 'cash' &&
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Rome',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(p.at)) === s.day &&
        !p.cashReceivedCounts,
    )
    .reduce((a, p) => a + p.amount, 0);
  return {
    venueId,
    day: s.day,
    counts: Object.fromEntries(DENOMINATIONS.map((d) => [d, counts[d] ?? 0])),
    total: countTotal(counts),
    untracked,
    movements: movements.slice(-20).reverse(),
  };
}
