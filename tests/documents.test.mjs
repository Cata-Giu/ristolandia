import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/index.mjs';
import {
  parseDeliveryText,
  extractDocument,
  inspectUpload,
} from '../server/documents.mjs';
import { stock, apply, USERS } from '../server/domain.mjs';
import { seed } from '../server/seed.mjs';
import { deliveryPdf } from './fixtures/delivery.mjs';
const admin = USERS.find((u) => u.role === 'admin');
test('parser bolla: righe, conversioni coerenti e categorie cucina/bevande/sala', () => {
  const result = parseDeliveryText(
    'FORNITORE: Dispensa Demo\nDDT n. DEMO-42\nData: 18/10/2026\nSpaghettoni kg 2,5 2,80\nAcqua naturale 12 pz 0,55\nTovaglioli pz 200 0,03\nTovaglie conf 2',
    seed().ingredients,
  );
  assert.equal(result.supplier, 'Dispensa Demo');
  assert.equal(result.documentNumber, 'DEMO-42');
  assert.equal(result.documentDay, '2026-10-18');
  assert.equal(result.rows[0].ingredientId, 'pasta');
  assert.equal(result.rows[0].quantity, 2500);
  assert.equal(result.rows[0].unit, 'g');
  assert.equal(result.rows[1].catalogCategory, 'beverage');
  assert.equal(result.rows[2].catalogCategory, 'supplies');
  assert.equal(result.rows[3].unit, 'conf');
  assert(result.warnings.some((w) => w.includes('Confezioni')));
});
test('lettura reale PDF testuale e rifiuto file falsi o sovradimensionati', async () => {
  const pdf = deliveryPdf();
  assert.equal(inspectUpload(pdf.toString('base64')).type, 'application/pdf');
  const extracted = await extractDocument(pdf, 'application/pdf');
  assert.equal(extracted.mode, 'pdf-text');
  assert.equal(
    parseDeliveryText(extracted.text, seed().ingredients).rows.length,
    3,
  );
  assert.throws(
    () => inspectUpload(Buffer.from('<html>no</html>').toString('base64')),
    /Formato/,
  );
  assert.throws(() => inspectUpload('a'.repeat(15 * 1024 * 1024)), /grande/);
});
test('archivio protetto, upload idempotente, revisione e carico unico con riapertura', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ristolandia-archive-test-')),
    dbPath = join(root, 'demo.sqlite'),
    documentDirectory = join(root, 'originals');
  let app = createApp({ dbPath, documentDirectory });
  const start = async () => {
    await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
    return `http://127.0.0.1:${app.server.address().port}/api/`;
  };
  let base = await start();
  const login = async (role) => {
    const r = await fetch(base + 'login', {
      method: 'POST',
      body: JSON.stringify({ userId: role, password: 'Demo2026!' }),
    });
    return r.headers.get('set-cookie').split(';')[0];
  };
  try {
    let cookie = await login('admin');
    const pdf = deliveryPdf(),
      body = {
        venueId: 'centro',
        name: 'Bolla demo.pdf',
        base64: pdf.toString('base64'),
      };
    const upload = async (data) => {
      const r = await fetch(base + 'documents/upload', {
        method: 'POST',
        headers: { cookie },
        body: JSON.stringify(data),
      });
      assert.equal(r.status, 200);
      return r.json();
    };
    const uploaded = await upload(body),
      again = await upload(body);
    assert.equal(uploaded.id, again.id);
    assert.equal(app.db.read().documents.length, 1);
    let doc = await (
      await fetch(base + 'documents/' + uploaded.id, { headers: { cookie } })
    ).json();
    assert.equal(doc.status, 'review');
    assert.equal(app.db.read().receipts.length, 0);
    const before = stock(app.db.read(), 'centro', 'pasta');
    app.db.mutate((s) =>
      apply(
        s,
        admin,
        'receive-document',
        {
          documentId: doc.id,
          supplier: doc.supplier,
          documentNumber: doc.documentNumber,
          documentDay: doc.documentDay,
          rows: doc.suggestedRows,
        },
        'receive-doc-1',
      ),
    );
    assert.equal(stock(app.db.read(), 'centro', 'pasta'), before + 2500);
    assert(
      app.db
        .read()
        .ingredients.some(
          (i) => i.name === 'Tovaglioli' && i.catalogCategory === 'supplies',
        ),
    );
    assert.throws(
      () =>
        app.db.mutate((s) =>
          apply(
            s,
            admin,
            'receive-document',
            { documentId: doc.id },
            'receive-doc-2',
          ),
        ),
      /già caricata/,
    );
    const second = await upload({
      ...body,
      name: 'Altra copia.pdf',
      base64: deliveryPdf('DEMO-42', 'Seconda scansione').toString('base64'),
    });
    const secondDoc = app.db.read().documents.find((d) => d.id === second.id);
    assert.throws(
      () =>
        app.db.mutate((s) =>
          apply(
            s,
            admin,
            'receive-document',
            {
              documentId: second.id,
              supplier: secondDoc.supplier,
              documentNumber: secondDoc.documentNumber,
              documentDay: secondDoc.documentDay,
              rows: secondDoc.suggestedRows,
            },
            'duplicate-doc-number',
          ),
        ),
      /già ricevuto/,
    );
    const cashier = await login('cashier');
    assert.equal(
      (
        await fetch(base + 'documents/' + doc.id + '/file', {
          headers: { cookie: cashier },
        })
      ).status,
      403,
    );
    assert.equal(
      (await fetch(base + 'documents/' + doc.id + '/file')).status,
      401,
    );
    const foreign = await upload({ ...body, venueId: 'navigli' }),
      warehouse = await login('warehouse');
    assert.equal(
      (
        await fetch(base + 'documents/' + foreign.id + '/file', {
          headers: { cookie: warehouse },
        })
      ).status,
      403,
    );
    await new Promise((r) => app.server.close(r));
    app.db.close();
    app = createApp({ dbPath, documentDirectory });
    base = await start();
    cookie = await login('admin');
    const file = await fetch(base + 'documents/' + doc.id + '/file', {
      headers: { cookie },
    });
    assert.equal(file.status, 200);
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), pdf);
    doc = await (
      await fetch(base + 'documents/' + doc.id, { headers: { cookie } })
    ).json();
    assert.equal(doc.status, 'received');
    assert.equal(doc.reviewedRows.length, 3);
  } finally {
    await new Promise((r) => app.server.close(r));
    app.db.close();
    rmSync(root, { recursive: true, force: true });
  }
});
test('bolla incompleta o unità incompatibile non alterano scorte', () => {
  const s = seed();
  s.documents = [{ id: 'doc', venueId: 'centro', status: 'review' }];
  const initial = stock(s, 'centro', 'pasta');
  assert.throws(
    () =>
      apply(
        s,
        admin,
        'receive-document',
        {
          documentId: 'doc',
          supplier: 'Demo',
          documentNumber: 'D1',
          documentDay: '2026-10-18',
          rows: [
            {
              ingredientId: 'pasta',
              name: 'Spaghettoni',
              quantity: 1,
              unit: 'pz',
              cost: 100,
              catalogCategory: 'kitchen',
            },
          ],
        },
        'bad-unit',
      ),
    /unità/,
  );
  assert.equal(stock(s, 'centro', 'pasta'), initial);
});
