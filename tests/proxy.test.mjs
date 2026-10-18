import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createApp } from '../server/index.mjs';
import { configuredOrigins } from '../server/origin.mjs';

async function forwardedLogin(devMode) {
  const { server, db } = createApp({
    dbPath: ':memory:',
    publicOrigins: configuredOrigins(
      devMode ? { RISTOLANDIA_DEV_MODE: '1' } : {},
    ),
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let vite;
  try {
    const target = `http://127.0.0.1:${server.address().port}`;
    vite = await createServer({
      configFile: 'vite.config.ts',
      logLevel: 'silent',
      server: {
        host: '127.0.0.1',
        port: 0,
        hmr: false,
        proxy: { '/api': { target, changeOrigin: true } },
      },
    });
    await vite.listen();
    const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
    const response = await fetch(base + '/api/login', {
      method: 'POST',
      headers: {
        Host: 'localhost:5173',
        Origin: 'http://127.0.0.1:5173',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: 'manager', password: 'Demo2026!' }),
    });
    assert.equal(response.status, devMode ? 200 : 403);
    if (devMode) {
      const cookie = response.headers.get('set-cookie');
      assert.match(cookie, /HttpOnly/);
      assert.doesNotMatch(cookie, /; Secure/);
      const state = await fetch(base + '/api/state?venue=centro', {
        headers: { Cookie: cookie.split(';')[0], Host: 'localhost:5173' },
      });
      assert.equal(state.status, 200);
      assert.equal((await state.json()).user.role, 'manager');
      const blocked = await fetch(base + '/api/logout', {
        method: 'POST',
        headers: {
          Host: 'localhost:5173',
          Origin: 'https://example.invalid',
          Cookie: cookie.split(';')[0],
        },
        body: '{}',
      });
      assert.equal(blocked.status, 403);
    }
  } finally {
    await vite?.close();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
}

test('VS Code: login attraverso proxy Vite con Origin 127.0.0.1 e Host riscritto', () =>
  forwardedLogin(true));
test('produzione: proxy non abilita automaticamente origini locali di sviluppo', () =>
  forwardedLogin(false));
test('sviluppo: origini loopback esatte, senza porte alternative o siti esterni', () => {
  const origins = configuredOrigins({ RISTOLANDIA_DEV_MODE: '1' });
  assert.deepEqual(
    [...origins],
    ['http://127.0.0.1:5173', 'http://localhost:5173', 'http://[::1]:5173'],
  );
  assert.equal(origins.has('http://127.0.0.1:5174'), false);
  assert.equal(origins.has('http://127.0.0.1.attacker.invalid:5173'), false);
  assert.equal(configuredOrigins({}).size, 0);
});
