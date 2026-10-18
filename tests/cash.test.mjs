import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, totals, stock, USERS, view } from '../server/domain.mjs';
import { repository } from '../server/repository.mjs';
import {
  lineAmounts,
  parseEuro,
  suggestChange,
  countTotal,
} from '../shared/finance.mjs';
const admin = USERS.find((u) => u.role === 'admin'),
  cashier = USERS.find((u) => u.role === 'cashier');
const command = (db, action, p, key = crypto.randomUUID(), u = cashier) =>
  db.mutate((s) => apply(s, u, action, p, key));
const edit = (lineId, extra = {}) => ({
  lineId,
  quantity: 1,
  price: 1600,
  discount: { kind: 'none', value: 0 },
  reason: 'Correzione demo',
  ...extra,
});
test('centesimi e sconti: percentuale arrotondata, importo riga e niente conversioni ambigue', () => {
  assert.equal(parseEuro('12,34'), 1234);
  assert(Number.isNaN(parseEuro('1.234,50')));
  assert(Number.isNaN(parseEuro('0.001')));
  assert.equal(
    lineAmounts({
      quantity: 3,
      price: 333,
      discount: { kind: 'percent', value: 1250 },
    }).total,
    874,
  );
  assert.equal(
    lineAmounts({
      quantity: 2,
      price: 1000,
      discount: { kind: 'euro', value: 300 },
    }).total,
    1700,
  );
});
test('resto limitato: trova soluzione che il greedy perderebbe e minimizza i pezzi', () => {
  assert.deepEqual(suggestChange(60, { 50: 1, 20: 3 }), { 20: 3 });
  assert.deepEqual(suggestChange(100, { 50: 2, 20: 5 }), { 50: 2 });
  assert.equal(suggestChange(30, { 20: 1 }), null);
  assert.deepEqual(suggestChange(0, {}), {});
  assert.equal(suggestChange(200001, { 50000: 10 }), null);
});
test('cassa aggiunge, modifica e annulla con audit; quantità pronta resta operativa', () => {
  const db = repository(':memory:');
  const add = command(db, 'send', {
    sessionId: 'active-0',
    lines: [{ productId: 'carbonara', quantity: 2, serviceRound: 2 }],
  });
  let s = db.read();
  const line = s.orders.find((o) => o.id === add.id).lines[0];
  command(
    db,
    'adjust-line',
    edit(line.id, {
      quantity: 3,
      price: 1500,
      discount: { kind: 'percent', value: 1000 },
    }),
  );
  s = db.read();
  assert.equal(s.orders.find((o) => o.id === add.id).lines[0].quantity, 3);
  assert.equal(s.prints.at(-1).correction, true);
  command(
    db,
    'line',
    { lineId: line.id, status: 'preparing' },
    undefined,
    admin,
  );
  command(db, 'line', { lineId: line.id, status: 'ready' }, undefined, admin);
  const before = stock(db.read(), 'centro', 'pasta');
  command(db, 'adjust-line', edit(line.id, { quantity: 1 }));
  s = db.read();
  const updated = s.orders.find((o) => o.id === add.id).lines[0];
  assert.equal(updated.quantity, 3);
  assert.equal(updated.billQuantity, 1);
  assert.equal(stock(s, 'centro', 'pasta'), before);
  command(db, 'cancel', {
    lineId: line.id,
    reason: 'Voce inserita per errore',
  });
  assert.equal(stock(db.read(), 'centro', 'pasta'), before);
  assert.equal(db.read().prints.at(-1).cancellation, true);
  assert(
    db
      .read()
      .audit.some((a) => a.action === 'adjust-line' && a.user === cashier.name),
  );
  db.close();
});
test('sconti non validi, riga obsoleta e correzione sotto il pagato sono respinti senza effetti', () => {
  const db = repository(':memory:');
  const line = db.read().orders.find((o) => o.id === 'live-0').lines[0];
  assert.throws(
    () =>
      command(
        db,
        'adjust-line',
        edit(line.id, { discount: { kind: 'percent', value: 10001 } }),
      ),
    /100%/,
  );
  assert.throws(
    () =>
      command(
        db,
        'adjust-line',
        edit(line.id, { discount: { kind: 'euro', value: 999999 } }),
      ),
    /supera/,
  );
  command(db, 'pay', { sessionId: 'active-0', amount: 1800, method: 'card' });
  assert.throws(
    () => command(db, 'cancel', { lineId: line.id, reason: 'Errore' }),
    /pagamenti/,
  );
  assert.throws(
    () => command(db, 'adjust-line', edit(line.id, { price: 0 })),
    /pagamenti/,
  );
  command(
    db,
    'adjust-line',
    edit(line.id, { price: 1600, expectedLineVersion: 0 }),
  );
  assert.throws(
    () => command(db, 'adjust-line', edit(line.id, { expectedLineVersion: 0 })),
    /riapri/,
  );
  db.close();
});
test('contanti, resto e mance conservano tagli e aliquota storica una sola volta', () => {
  const db = repository(':memory:');
  command(
    db,
    'tip-tax',
    { basisPoints: 500, reason: 'Aliquota scelta per test' },
    undefined,
    admin,
  );
  command(db, 'cash-fund', {
    venueId: 'centro',
    counts: { 2000: 2, 1000: 1 },
    reason: 'Fondo demo',
  });
  const p = {
    sessionId: 'active-0',
    amount: 1900,
    method: 'cash',
    tip: 100,
    cashReceived: 5000,
    cashReceivedCounts: { 5000: 1 },
  };
  command(db, 'pay', p, 'cash-tip');
  command(db, 'pay', p, 'cash-tip');
  let s = db.read();
  const payment = s.payments.at(-1);
  assert.equal(payment.changeAmount, 3000);
  assert.equal(countTotal(payment.changeCounts), 3000);
  assert.equal(payment.tipTax, 5);
  assert.equal(view(s, cashier, 'centro').drawers[0].total, 7000);
  assert.equal(
    totals(
      s,
      s.sessions.find((se) => se.id === 'active-0'),
    ).total,
    1900,
  );
  command(
    db,
    'tip-tax',
    { basisPoints: 1000, reason: 'Nuova simulazione' },
    undefined,
    admin,
  );
  assert.equal(db.read().payments.at(-1).tipTax, 5);
  assert.equal(db.read().payments.filter((x) => x.id === payment.id).length, 1);
  assert.throws(
    () =>
      command(db, 'send', {
        sessionId: 'active-0',
        lines: [{ productId: 'acqua', quantity: 1 }],
      }),
    /chiuso/,
  );
  db.close();
});
test('resto impossibile, tagli errati e mancia senza aliquota non registrano pagamenti', () => {
  const db = repository(':memory:');
  const before = db.read().payments.length;
  assert.throws(
    () =>
      command(db, 'pay', {
        sessionId: 'active-0',
        amount: 1900,
        method: 'cash',
        cashReceived: 5000,
        cashReceivedCounts: { 5000: 1 },
      }),
    /non componibile/,
  );
  assert.throws(
    () =>
      command(db, 'pay', {
        sessionId: 'active-0',
        amount: 1900,
        method: 'cash',
        cashReceived: 1900,
        cashReceivedCounts: { 2000: 1 },
      }),
    /corrispondere/,
  );
  assert.throws(
    () =>
      command(db, 'pay', {
        sessionId: 'active-0',
        amount: 1900,
        method: 'card',
        tip: 100,
      }),
    /aliquota/,
  );
  assert.equal(db.read().payments.length, before);
  assert.throws(
    () =>
      command(
        db,
        'tip-tax',
        { basisPoints: 500, reason: 'No' },
        undefined,
        cashier,
      ),
    /non autorizzata/,
  );
  db.close();
});
test('conto interamente annullato si chiude senza pagamento inventato e niente dati finanziari in cucina', () => {
  const db = repository(':memory:');
  const s = db.read();
  for (const l of s.orders.find((o) => o.id === 'live-0').lines)
    command(db, 'cancel', { lineId: l.id, reason: 'Conto errato' });
  const before = db.read().payments.length;
  command(db, 'close-account', {
    sessionId: 'active-0',
    reason: 'Conto annullato',
  });
  assert.equal(db.read().payments.length, before);
  assert.equal(
    db.read().sessions.find((se) => se.id === 'active-0').status,
    'closed',
  );
  const kitchen = view(
    db.read(),
    USERS.find((u) => u.role === 'kitchen'),
    'centro',
  );
  assert(!('drawers' in kitchen));
  assert(
    kitchen.orders.every((o) =>
      o.lines.every((l) => !('discount' in l) && !('billQuantity' in l)),
    ),
  );
  db.close();
});

test('due pagamenti non possono spendere due volte gli stessi tagli del fondo', () => {
  const db = repository(':memory:');
  command(db, 'cash-fund', {
    venueId: 'centro',
    counts: { 100: 1 },
    reason: 'Moneta disponibile',
  });
  const first = {
    sessionId: 'active-0',
    amount: 1900,
    method: 'cash',
    cashReceived: 2000,
    cashReceivedCounts: { 2000: 1 },
  };
  command(db, 'pay', first);
  const before = db.read().payments.length;
  assert.throws(
    () =>
      command(db, 'pay', {
        sessionId: 'active-1',
        amount: 1900,
        method: 'cash',
        cashReceived: 2000,
        cashReceivedCounts: { 2000: 1 },
      }),
    /non componibile/,
  );
  assert.equal(db.read().payments.length, before);
  db.close();
});
test('reset azzera registri e configurazioni nuove senza riferimenti economici orfani', () => {
  const db = repository(':memory:');
  command(db, 'cash-fund', {
    venueId: 'centro',
    counts: { 100: 1 },
    reason: 'Fondo',
  });
  command(
    db,
    'tip-tax',
    { basisPoints: 500, reason: 'Test' },
    undefined,
    admin,
  );
  db.mutate((s) => {
    s.documents.push({ id: 'fake', venueId: 'centro', status: 'review' });
  });
  command(db, 'reset', {}, undefined, admin);
  assert.equal(db.read().cashMovements.length, 0);
  assert.equal(db.read().documents.length, 0);
  assert.equal(db.read().settings.tipTaxBasisPoints, null);
  db.close();
});
