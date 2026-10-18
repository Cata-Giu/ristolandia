import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.mjs';
const { server, db } = createApp({ dbPath: ':memory:' });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/api/`;
after(() => {
  server.close();
  db.close();
});
async function login(userId) {
  const r = await fetch(base + 'login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password: 'Demo2026!' }),
  });
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}
async function action(cookie, name, p, key = crypto.randomUUID()) {
  return fetch(base + 'actions/' + name, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie,
      'Idempotency-Key': key,
    },
    body: JSON.stringify(p),
  });
}
test('API richiede autenticazione e rifiuta password errata', async () => {
  assert.equal((await fetch(base + 'state')).status, 401);
  const r = await fetch(base + 'login', {
    method: 'POST',
    body: JSON.stringify({ userId: 'admin', password: 'errata' }),
  });
  assert.equal(r.status, 401);
});
test('cookie HttpOnly, isolamento della sede e ruoli lato server', async () => {
  const cookie = await login('waiter');
  let r = await fetch(base + 'state?venue=centro', { headers: { cookie } });
  assert.equal(r.status, 200);
  const s = await r.json();
  assert(!('payments' in s));
  assert.equal(
    (await fetch(base + 'state?venue=navigli', { headers: { cookie } })).status,
    403,
  );
  assert.equal(
    (
      await action(cookie, 'pay', {
        sessionId: 'active-0',
        amount: 100,
        method: 'card',
        expectedRevision: s.revision,
      })
    ).status,
    403,
  );
});
test('richieste contemporanee: una sola scrittura alla stessa revisione, retry idempotente', async () => {
  const cookie = await login('admin');
  const s = await (
    await fetch(base + 'state?venue=all', { headers: { cookie } })
  ).json();
  const p = {
    venueId: 'centro',
    customerId: 'c0',
    amount: 100,
    expectedRevision: s.revision,
  };
  const r = await Promise.all([
    action(cookie, 'topup', p, 'concurrent-a'),
    action(cookie, 'topup', p, 'concurrent-b'),
  ]);
  assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]);
  const successfulKey = r[0].status === 200 ? 'concurrent-a' : 'concurrent-b';
  const retry = await action(cookie, 'topup', p, successfulKey);
  assert.equal(retry.status, 200);
  assert.equal(
    db
      .read()
      .wallet.filter(
        (w) => w.amount === 100 && w.source === 'Ricarica simulata',
      ).length,
    1,
  );
});
test('CSRF cross-origin respinto e logout invalida sessione', async () => {
  const cookie = await login('admin');
  const r = await fetch(base + 'logout', {
    method: 'POST',
    headers: { cookie, Origin: 'https://example.invalid' },
    body: '{}',
  });
  assert.equal(r.status, 403);
  await fetch(base + 'logout', {
    method: 'POST',
    headers: { cookie },
    body: '{}',
  });
  assert.equal(
    (await fetch(base + 'state', { headers: { cookie } })).status,
    401,
  );
});
test('richiesta cliente pubblica diventa prenotazione persistente pending', async () => {
  const s = db.read();
  const r = await fetch(base + 'public/book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'public-1',
    },
    body: JSON.stringify({
      venueId: 'navigli',
      name: 'Ospite Test',
      phone: '000',
      day: s.day,
      time: '12:00',
      covers: 2,
    }),
  });
  assert.equal(r.status, 200);
  assert.equal(db.read().bookings.at(-1).status, 'pending');
  assert.equal(db.read().bookings.at(-1).venueId, 'navigli');
});
test('payload non oggetto respinto come errore di validazione', async () => {
  const r = await fetch(base + 'login', { method: 'POST', body: 'null' });
  assert.equal(r.status, 400);
});
