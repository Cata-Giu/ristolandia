export const DENOMINATIONS = [
  50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1,
];
export const MAX_CHANGE = 200000;
export function parseEuro(value) {
  const raw = String(value ?? '')
    .trim()
    .replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return NaN;
  const [whole, fraction = ''] = raw.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : NaN;
}
export function lineAmounts(line) {
  const gross = (line.billQuantity ?? line.quantity) * (line.price ?? 0);
  const discount =
    line.discount?.kind === 'percent'
      ? Math.floor((gross * line.discount.value + 5000) / 10000)
      : line.discount?.kind === 'euro'
        ? line.discount.value
        : 0;
  return { gross, discount, total: gross - discount };
}
export function taxOnTip(tip, basisPoints) {
  return Math.floor((tip * basisPoints + 5000) / 10000);
}
export function validCounts(counts) {
  return (
    !!counts &&
    typeof counts === 'object' &&
    !Array.isArray(counts) &&
    Object.entries(counts).every(
      ([d, n]) =>
        DENOMINATIONS.includes(Number(d)) &&
        String(Number(d)) === d &&
        Number.isSafeInteger(n) &&
        n >= 0 &&
        n <= 100000000,
    )
  );
}
export function countTotal(counts) {
  return Object.entries(counts).reduce((a, [d, n]) => a + Number(d) * n, 0);
}
export function addCounts(a, b) {
  return Object.fromEntries(
    DENOMINATIONS.map((d) => [d, (a[d] ?? 0) + (b[d] ?? 0)]),
  );
}
// Bounded minimum-piece change, O(denominations × amount), using a monotone
// queue per residue. Greedy change is incorrect with limited denominations.
export function suggestChange(amount, counts) {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    amount > MAX_CHANGE ||
    !validCounts(counts)
  )
    return null;
  if (amount === 0) return {};
  const types = DENOMINATIONS.filter(
      (d) => d <= amount && (counts[d] ?? 0) > 0,
    ),
    inf = 1000000000;
  let previous = new Int32Array(amount + 1).fill(inf);
  previous[0] = 0;
  const choices = [];
  for (const d of types) {
    const current = new Int32Array(amount + 1).fill(inf),
      take = new Int32Array(amount + 1),
      capacity = counts[d];
    const indexes = new Int32Array(Math.floor(amount / d) + 1),
      values = new Int32Array(indexes.length);
    for (let residue = 0; residue < d && residue <= amount; residue++) {
      let head = 0,
        tail = 0;
      for (let k = 0, pos = residue; pos <= amount; k++, pos += d) {
        while (head < tail && indexes[head] < k - capacity) head++;
        if (previous[pos] < inf) {
          const candidate = previous[pos] - k;
          while (head < tail && values[tail - 1] >= candidate) tail--;
          indexes[tail] = k;
          values[tail++] = candidate;
        }
        if (head < tail) {
          current[pos] = k + values[head];
          take[pos] = k - indexes[head];
        }
      }
    }
    previous = current;
    choices.push(take);
  }
  if (previous[amount] === inf) return null;
  const result = {};
  let rest = amount;
  for (let i = types.length - 1; i >= 0; i--) {
    const n = choices[i][rest];
    if (n) result[types[i]] = n;
    rest -= n * types[i];
  }
  return result;
}
