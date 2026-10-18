import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  apply,
  view,
  totals,
  balance,
  stock,
  USERS,
} from '../server/domain.mjs';
import { seed } from '../server/seed.mjs';
import { repository } from '../server/repository.mjs';
const admin = USERS.find((u) => u.role === 'admin'),
  user = (role) => USERS.find((u) => u.role === role);
const go = (s, action, p, key = crypto.randomUUID(), u = admin) =>
  apply(s, u, action, p, key);
function emptyTable(s) {
  return s.tables.find(
    (t) =>
      t.venueId === 'centro' &&
      t.status === 'free' &&
      !s.bookings.some(
        (b) =>
          b.tableId === t.id && b.day === s.day && b.status === 'confirmed',
      ),
  );
}
function send(s) {
  const t = emptyTable(s);
  const { id: sessionId } = go(s, 'open', { tableId: t.id, covers: 2 });
  const result = go(s, 'send', {
    sessionId,
    lines: [
      { productId: 'carbonara', quantity: 2, note: 'Portare insieme' },
      { productId: 'spritz', quantity: 1, note: '' },
    ],
  });
  return { sessionId, order: s.orders.find((o) => o.id === result.id) };
}
test('percorso prenotazione → tavolo → reparti → consumi → pagamento e riassetto', () => {
  const s = seed();
  const table = emptyTable(s);
  const b = go(s, 'book', {
    venueId: 'centro',
    name: 'Ospite Demo',
    phone: '000',
    day: s.day,
    time: '12:00',
    covers: 2,
  });
  go(s, 'confirm', { bookingId: b.id, tableId: table.id });
  const arrival = go(s, 'arrive', { bookingId: b.id });
  const customer = s.customers[0];
  s.sessions.find((se) => se.id === arrival.id).customerId = customer.id;
  const initialStock = stock(s, 'centro', 'pasta'),
    initialPoints = balance(s, customer.id, 'points');
  const sent = go(s, 'send', {
    sessionId: arrival.id,
    lines: [
      { productId: 'carbonara', quantity: 1, note: 'Portata insieme' },
      { productId: 'acqua', quantity: 1, note: '' },
    ],
  });
  const o = s.orders.find((o) => o.id === sent.id);
  assert.equal(stock(s, 'centro', 'pasta'), initialStock);
  assert.equal(s.prints.filter((p) => p.orderId === o.id).length, 2);
  for (const l of o.lines) {
    go(s, 'line', { lineId: l.id, status: 'preparing' });
    go(s, 'line', { lineId: l.id, status: 'ready' });
    go(
      s,
      'line',
      { lineId: l.id, status: 'served' },
      undefined,
      user('waiter'),
    );
  }
  assert.equal(stock(s, 'centro', 'pasta'), initialStock - 100);
  const previousLines = o.lines.length;
  go(s, 'send', {
    sessionId: arrival.id,
    lines: [{ productId: 'vino', quantity: 1, note: '' }],
  });
  assert.equal(o.lines.length, previousLines);
  const se = s.sessions.find((se) => se.id === arrival.id),
    total = totals(s, se).total;
  go(s, 'pay', { sessionId: se.id, amount: 1000, method: 'cash' });
  assert.equal(se.status, 'open');
  assert.equal(totals(s, se).due, total - 1000);
  go(s, 'pay', { sessionId: se.id, amount: total - 1000, method: 'credit' });
  assert.equal(se.status, 'closed');
  assert.equal(s.tables.find((t) => t.id === table.id).status, 'cleaning');
  assert.equal(
    balance(s, customer.id, 'points'),
    initialPoints + Math.floor(total / 100),
  );
  assert.equal(s.bookings.find((x) => x.id === b.id).status, 'completed');
  go(s, 'clean', { tableId: table.id });
  assert.equal(table.status, 'free');
});
test('doppio invio idempotente e chiave con contenuto differente respinta', () => {
  const s = seed(),
    { sessionId } = send(s),
    key = 'send-repeat',
    payload = {
      sessionId,
      lines: [{ productId: 'acqua', quantity: 1, note: '' }],
    };
  const before = s.orders.length;
  const a = go(s, 'send', payload, key),
    b = go(s, 'send', payload, key);
  assert.equal(a.id, b.id);
  assert.equal(s.orders.length, before + 1);
  assert.throws(
    () =>
      go(
        s,
        'send',
        { ...payload, lines: [{ productId: 'acqua', quantity: 2 }] },
        key,
      ),
    /contenuto differente/,
  );
});
test('ristampa e annullamento post preparazione non restituiscono ingredienti', () => {
  const s = seed(),
    { order } = send(s),
    l = order.lines[0];
  const initial = stock(s, 'centro', 'pasta');
  go(s, 'line', { lineId: l.id, status: 'preparing' });
  go(s, 'line', { lineId: l.id, status: 'ready' });
  const after = stock(s, 'centro', 'pasta');
  assert.equal(after, initial - 200);
  const job = s.prints.find((p) => p.orderId === order.id);
  const count = s.orders.length;
  go(s, 'reprint', { printId: job.id });
  assert.equal(stock(s, 'centro', 'pasta'), after);
  assert.equal(s.orders.length, count);
  go(s, 'cancel', { lineId: l.id, reason: 'Errore di comanda demo' });
  assert.equal(stock(s, 'centro', 'pasta'), after);
  assert.equal(l.cancelledFrom, 'ready');
});
test('annullamento prima della preparazione rimuove fabbisogno e non genera consumo', () => {
  const s = seed(),
    { order } = send(s),
    l = order.lines[0],
    before = stock(s, 'centro', 'pasta');
  go(s, 'cancel', { lineId: l.id, reason: 'Richiesta demo' });
  assert.equal(stock(s, 'centro', 'pasta'), before);
  assert.throws(
    () => go(s, 'line', { lineId: l.id, status: 'preparing' }),
    /Stato modificato/,
  );
});
test('reparti separati e dati economici esclusi dalla sala', () => {
  const s = seed(),
    k = view(s, user('kitchen'), 'centro'),
    w = view(s, user('waiter'), 'centro');
  assert(
    k.orders.every((o) =>
      o.lines.every((l) => l.department === 'kitchen' && !('price' in l)),
    ),
  );
  assert(!('payments' in k));
  assert(!('customers' in w));
  assert(w.sessions.every((se) => !('total' in se)));
  assert.throws(() => view(s, user('waiter'), 'navigli'), /non autorizzata/);
  assert.throws(() => view(s, user('waiter'), 'all'), /riservato/);
  assert.equal(view(s, admin, 'all').venues.length, 5);
  assert.throws(
    () =>
      go(
        s,
        'pay',
        { sessionId: 'active-0', amount: 100, method: 'cash' },
        undefined,
        user('waiter'),
      ),
    /non autorizzata/,
  );
  const barLine = s.orders
    .find((o) => o.id === 'live-0')
    .lines.find((l) => l.department === 'bar');
  assert.throws(
    () =>
      go(
        s,
        'line',
        { lineId: barLine.id, status: 'preparing' },
        undefined,
        user('kitchen'),
      ),
    /altro reparto/,
  );
});
test('credito, bonus e punti distinti; ricarica non genera vendita o payment', () => {
  const s = seed(),
    initial = balance(s, 'c0'),
    bonus = balance(s, 'c0', 'bonus'),
    payments = s.payments.length,
    orders = s.orders.length;
  go(s, 'topup', { venueId: 'centro', customerId: 'c0', amount: 5000 });
  assert.equal(balance(s, 'c0'), initial + 5000);
  assert.equal(balance(s, 'c0', 'bonus'), bonus);
  assert.equal(s.payments.length, payments);
  assert.equal(s.orders.length, orders);
});
test('pagamenti ripetuti non duplicano incasso e saldo insufficiente respinto', () => {
  const s = seed(),
    { sessionId } = send(s);
  s.sessions.find((se) => se.id === sessionId).customerId = 'c1';
  assert.throws(
    () => go(s, 'pay', { sessionId, amount: 100, method: 'credit' }),
    /insufficiente/,
  );
  const key = 'payment',
    p = { sessionId, amount: 100, method: 'card' },
    before = s.payments.length;
  go(s, 'pay', p, key);
  go(s, 'pay', p, key);
  assert.equal(s.payments.length, before + 1);
  assert.throws(
    () => go(s, 'pay', { sessionId, amount: 999999, method: 'card' }),
    /supera/,
  );
});
test('ricezione duplicata impedita indipendentemente dalla chiave richiesta', () => {
  const s = seed(),
    p = {
      venueId: 'centro',
      ingredientId: 'pasta',
      quantity: 1000,
      supplier: 'Demo',
      document: 'DDT-1',
    },
    before = stock(s, 'centro', 'pasta');
  go(s, 'receive', p);
  assert.equal(stock(s, 'centro', 'pasta'), before + 1000);
  assert.throws(() => go(s, 'receive', p), /già ricevuto/);
  assert.equal(stock(s, 'centro', 'pasta'), before + 1000);
});
test('inventario zero e trasferimento transitano con movimenti distinti', () => {
  const s = seed(),
    before = stock(s, 'navigli', 'pasta');
  go(s, 'transfer', {
    venueId: 'centro',
    to: 'navigli',
    ingredientId: 'pasta',
    quantity: 500,
  });
  const tr = s.transfers.at(-1);
  assert.equal(stock(s, 'navigli', 'pasta'), before);
  go(s, 'transfer', { venueId: 'navigli', transferId: tr.id });
  assert.equal(stock(s, 'navigli', 'pasta'), before + 500);
  assert.throws(
    () => go(s, 'transfer', { venueId: 'navigli', transferId: tr.id }),
    /non ricevibile/,
  );
  go(s, 'inventory', {
    venueId: 'centro',
    ingredientId: 'pasta',
    quantity: 0,
    reason: 'Conteggio demo',
  });
  assert.equal(stock(s, 'centro', 'pasta'), 0);
});
test('disponibilità, capienza, turni, doppia conferma e doppio arrivo', () => {
  const s = seed();
  assert.throws(
    () =>
      go(s, 'book', {
        venueId: 'centro',
        name: 'Demo',
        phone: '000',
        day: s.day,
        time: '03:00',
        covers: 2,
      }),
    /fuori dai turni/,
  );
  const b = go(s, 'book', {
    venueId: 'centro',
    name: 'Demo',
    phone: '000',
    day: s.day,
    time: '12:00',
    covers: 6,
  });
  const small = s.tables.find((t) => t.venueId === 'centro' && t.seats === 2);
  assert.throws(
    () => go(s, 'confirm', { bookingId: b.id, tableId: small.id }),
    /capienza/,
  );
  const table = s.tables.find((t) => t.id === 'centro-t12');
  go(s, 'confirm', { bookingId: b.id, tableId: table.id });
  assert.throws(
    () => go(s, 'confirm', { bookingId: b.id, tableId: table.id }),
    /già gestita/,
  );
  go(s, 'arrive', { bookingId: b.id });
  assert.throws(() => go(s, 'arrive', { bookingId: b.id }), /Conferma prima/);
});
test('SQLite rollback, backup/ripristino e reset mantengono consistenza', () => {
  const db = repository(':memory:');
  const initial = db.read();
  assert.throws(() =>
    db.mutate((s) => {
      s.orders = [];
      throw new Error('Errore simulato');
    }),
  );
  assert.equal(db.read().orders.length, initial.orders.length);
  const backup = db.backup();
  db.mutate((s) => go(s, 'reset', {}));
  assert.equal(db.read().revision, initial.revision + 1);
  db.restore(backup);
  assert.deepEqual(db.read(), initial);
  db.close();
});
test('organizzazione differente respinta e seed indipendenti', () => {
  const s = seed();
  assert.throws(
    () => view(s, { ...admin, organizationId: 'altro-gruppo' }, 'centro'),
    /Organizzazione non autorizzata/,
  );
  s.products[0].price = 1;
  assert.equal(seed().products[0].price, 1400);
});
