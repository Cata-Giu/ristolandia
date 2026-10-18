import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.mjs';
import { configuredOrigins } from '../server/origin.mjs';

const codespace = 'demo-restaurant-abc123';
const origin = `https://${codespace}-5173.app.github.dev`;
const origins = configuredOrigins({
  CODESPACE_NAME: codespace,
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev',
});
async function withServer(fn) {
  const { server, db } = createApp({
    dbPath: ':memory:',
    publicOrigins: origins,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await fn(`http://127.0.0.1:${server.address().port}/api/`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
}

test('Codespaces: login, lettura autenticata e logout dietro host interno', () =>
  withServer(async (base) => {
    const response = await fetch(base + 'login', {
      method: 'POST',
      headers: { Origin: origin, 'X-Forwarded-Host': 'localhost:5173' },
      body: JSON.stringify({ userId: 'manager', password: 'Demo2026!' }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /; Secure/);
    const headers = {
      Cookie: cookie.split(';')[0],
      Origin: origin,
      'X-Forwarded-Host': 'localhost:5173',
    };
    assert.equal(
      (await fetch(base + 'state?venue=centro', { headers })).status,
      200,
    );
    assert.equal(
      (await fetch(base + 'logout', { method: 'POST', headers, body: '{}' }))
        .status,
      200,
    );
  }));

test('origine locale accettata anche con forwarded-host differente', () =>
  withServer(async (base) => {
    const response = await fetch(base + 'login', {
      method: 'POST',
      headers: {
        Origin: new URL(base).origin,
        'X-Forwarded-Host': 'localhost:5173',
      },
      body: JSON.stringify({ userId: 'waiter', password: 'Demo2026!' }),
    });
    assert.equal(response.status, 200);
    assert.doesNotMatch(response.headers.get('set-cookie'), /; Secure/);
  }));

test('altri Codespaces, altre porte e origini non valide sono rifiutati', () =>
  withServer(async (base) => {
    for (const bad of [
      'https://another-5173.app.github.dev',
      `https://${codespace}-9999.app.github.dev`,
      'https://example.invalid',
      'null',
      'invalid-origin',
      origin + '/path',
    ]) {
      const response = await fetch(base + 'login', {
        method: 'POST',
        headers: {
          Origin: bad,
          'X-Forwarded-Host': bad.replace('https://', ''),
        },
        body: JSON.stringify({ userId: 'admin', password: 'Demo2026!' }),
      });
      assert.equal(response.status, 403, bad);
    }
  }));

test('configurazione cloud esatta senza wildcard e APP_ORIGIN validata', () => {
  assert.deepEqual(
    [...origins],
    [origin, `https://${codespace}-3001.app.github.dev`],
  );
  assert.deepEqual(
    [...configuredOrigins({ APP_ORIGIN: 'https://demo.example.com/' })],
    ['https://demo.example.com'],
  );
  assert.throws(() =>
    configuredOrigins({ APP_ORIGIN: 'https://demo.example.com/path' }),
  );
  assert.throws(() => configuredOrigins({ APP_ORIGIN: 'null' }));
  assert.equal(configuredOrigins({}).size, 0);
});
