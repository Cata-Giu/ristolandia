import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function login(page, role = 'Amministrazione') {
  await page.goto('/');
  await page.getByRole('button', { name: role, exact: true }).click();
  await page.getByRole('button', { name: 'Accedi alla demo' }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
}
test('desktop: dashboard, navigazione, focus dialogo e assenza risultati', async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole('heading', { name: 'Ogni sede, una sola visione.' }),
  ).toBeVisible();
  await page.screenshot({ path: 'docs/dashboard-desktop.png', fullPage: true });
  await page.getByRole('link', { name: /Prenotazioni/ }).click();
  await page
    .getByRole('textbox', { name: 'Cerca nome o orario' })
    .fill('nessun-risultato');
  await expect(
    page.getByRole('heading', { name: 'Nessuna prenotazione trovata' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancella ricerca' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Cerca nome o orario' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Nuova prenotazione' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Nuova prenotazione' }),
  ).toBeFocused();
});
test('flusso UI: richiesta, conferma, arrivo, ordine, preparazione e cassa', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('link', { name: 'Impostazioni' }).click();
  await page
    .getByRole('button', { name: 'Ripristina dati demo', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Ripristina dati demo', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('link', { name: /Prenotazioni/ }).click();
  await page.getByRole('button', { name: 'Nuova prenotazione' }).click();
  await page.getByLabel('Nome ospite demo').fill('Ospite Browser');
  await page.getByLabel('Telefono demo').fill('000 000');
  await page.getByLabel('Orario', { exact: true }).selectOption('12:00');
  await page.getByRole('button', { name: 'Registra richiesta' }).click();
  const row = page.getByRole('row').filter({ hasText: 'Ospite Browser' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Conferma', exact: true }).click();
  await page
    .getByRole('button', { name: 'Conferma prenotazione', exact: true })
    .click();
  await row.getByRole('button', { name: 'Registra arrivo' }).click();
  await page.getByRole('button', { name: 'Apri sessione tavolo' }).click();
  await page.getByRole('link', { name: 'Ordinazioni' }).click();
  const options = await page.locator('#order-session option').allTextContents();
  const last = await page
    .locator('#order-session option')
    .last()
    .getAttribute('value');
  await page.getByLabel('Tavolo in servizio').selectOption(last!);
  await page
    .getByRole('button', { name: 'Aggiungi Spaghettoni alla carbonara' })
    .click();
  await page.getByRole('button', { name: 'Aggiungi Acqua naturale' }).click();
  await page
    .getByRole('button', { name: 'Invia ai reparti', exact: true })
    .click();
  await page.getByRole('button', { name: 'Conferma invio ai reparti' }).click();
  await expect(
    page.getByRole('heading', { name: 'Componi la comanda' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Cucina', exact: true }).click();
  const ticket = page.locator('.ticket').last();
  await ticket.getByRole('button', { name: 'Inizia', exact: true }).click();
  await ticket.getByRole('button', { name: 'Segna pronta' }).click();
  await page.getByRole('link', { name: 'Cassa', exact: true }).click();
  await page.locator('.session-card').last().click();
  await page
    .getByRole('button', { name: 'Registra pagamento simulato', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Registra pagamento simulato', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Conti chiusi', exact: true }).click();
  await expect(page.locator('.session-card').last()).toContainText('Chiuso');
});
test('mobile sala: navigazione dedicata e nessun overflow pagina', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'Sala');
  await expect(
    page.locator('.handheld-context').getByRole('heading', { name: /Tavolo/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Panoramica', exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: 'docs/sala-mobile.png', fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Apri navigazione' }).click();
  await page.getByRole('link', { name: 'Sala e tavoli' }).click();
  await expect(
    page.getByRole('heading', { name: 'Spazio a un buon servizio.' }),
  ).toBeVisible();
});
test('accessibilità: accesso e dashboard WCAG AA', async ({ page }) => {
  await page.goto('/');
  const loginScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(loginScan.violations).toEqual([]);
  await login(page);
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test('tutte le sezioni: accessibilità e layout desktop e smartphone', async ({
  page,
}) => {
  await login(page);
  const routes = [
    'bookings',
    'tables',
    'orders',
    'kitchen',
    'bar',
    'cashier',
    'menu',
    'inventory',
    'documents',
    'customers',
    'temperatures',
    'notifications',
    'settings',
  ];
  for (const route of routes) {
    await page.goto('/?view=' + route + '&venue=centro');
    await expect(page.locator('main h1:visible')).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      scan.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      route,
    ).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        { message: route },
      )
      .toBe(true);
    await page.setViewportSize({ width: 1280, height: 800 });
  }
});
test('form: errore associato, password visibile e richiesta pubblica', async ({
  page,
}) => {
  await page.goto('/?public=booking');
  await page
    .getByRole('button', { name: 'Invia richiesta dimostrativa' })
    .click();
  await expect(page.getByLabel('Nome fittizio')).toBeFocused();
  await expect(page.getByLabel('Nome fittizio')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Nome fittizio').fill('Cliente Pubblico');
  await page.getByLabel('Telefono fittizio').fill('000');
  await page.getByLabel('Orario', { exact: true }).selectOption('13:30');
  await page
    .getByRole('button', { name: 'Invia richiesta dimostrativa' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Richiesta demo ricevuta.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Apri accesso Accoglienza' }).click();
  await page.getByRole('button', { name: 'Mostra password' }).click();
  await expect(
    page.getByLabel('Password dimostrativa', { exact: true }),
  ).toHaveAttribute('type', 'text');
});

test('palmare: stesso piatto su uscite distinte, note, bozza, cucina e stampa', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('link', { name: 'Ordinazioni', exact: true }).click();
  await page.getByLabel('Uscita per i prossimi prodotti').selectOption('2');
  await page
    .getByRole('button', {
      name: 'Aggiungi Spaghettoni alla carbonara',
      exact: true,
    })
    .click();
  await page.getByLabel('Uscita per i prossimi prodotti').selectOption('1');
  await page
    .getByRole('button', {
      name: 'Aggiungi Spaghettoni alla carbonara',
      exact: true,
    })
    .click();
  await expect(page.locator('.draft-line')).toHaveCount(2);
  await page
    .locator('.draft-line')
    .first()
    .getByLabel('Uscita di Spaghettoni alla carbonara')
    .selectOption('3');
  await page
    .locator('.draft-line')
    .last()
    .getByRole('button', { name: 'Aumenta Spaghettoni alla carbonara' })
    .click();
  await page
    .locator('.draft-line')
    .first()
    .getByRole('button', { name: 'Aggiungi nota di preparazione' })
    .click();
  await page
    .getByLabel('Nota per il reparto')
    .fill('Servire dopo le altre portate');
  await page.getByRole('button', { name: 'Salva nota', exact: true }).click();
  await page.reload();
  await expect(page.locator('.draft-line')).toHaveCount(2);
  await expect(
    page
      .locator('.draft-line')
      .first()
      .getByLabel('Uscita di Spaghettoni alla carbonara'),
  ).toHaveValue('3');
  await expect(
    page.locator('.draft-line').last().locator('.quantity span'),
  ).toHaveText('2');
  await page
    .getByRole('button', { name: 'Invia ai reparti', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('3ª uscita');
  await expect(page.getByRole('dialog')).toContainText('1ª uscita');
  await page.getByRole('button', { name: 'Conferma invio ai reparti' }).click();
  await page.getByRole('link', { name: 'Cucina', exact: true }).click();
  const ticket = page.locator('.ticket').last();
  await expect(ticket.locator('.service-round-heading')).toHaveText([
    '1ª uscita',
    '3ª uscita',
  ]);
  await expect(ticket).toContainText('Servire dopo le altre portate');
  await ticket.getByRole('button', { name: 'Anteprima', exact: true }).click();
  await expect(page.locator('.receipt')).toContainText('1ª uscita');
  await expect(page.locator('.receipt')).toContainText('3ª uscita');
  const printed = await page.locator('.receipt').innerText();
  expect(printed.indexOf('1ª uscita')).toBeLessThan(
    printed.indexOf('3ª uscita'),
  );
});

test('cassa: correzioni, sconti, annullamento e aggiunta dal conto', async ({
  page,
}) => {
  await login(page, 'Cassa');
  await page
    .getByRole('button', { name: 'Aggiungi voce', exact: true })
    .click();
  await page.getByLabel('Prodotto del menu').selectOption('burrata');
  await page
    .getByRole('button', { name: 'Aggiungi e invia al reparto' })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const line = page
    .locator('.bill-line-detail')
    .filter({ hasText: 'Burrata e pomodori' })
    .last();
  await line.getByRole('button', { name: 'Sconto € / %', exact: true }).click();
  await page.getByLabel('Prezzo unitario in euro').fill('10,00');
  await page.getByLabel('Quantità da addebitare').fill('2');
  await page.getByLabel('Sconto sulla riga').selectOption('percent');
  await page.getByLabel('Percentuale di sconto').fill('10');
  await page
    .getByLabel('Motivazione della correzione')
    .fill('Correzione demo prezzo e quantità');
  await page.getByRole('button', { name: 'Salva correzione' }).click();
  await expect(line).toContainText('18,00');
  await line.getByRole('button', { name: 'Modifica', exact: true }).click();
  await page.getByLabel('Sconto sulla riga').selectOption('euro');
  await page.getByLabel('Sconto totale in euro').fill('5');
  await page
    .getByLabel('Motivazione della correzione')
    .fill('Sconto riga demo');
  await page.getByRole('button', { name: 'Salva correzione' }).click();
  await expect(line).toContainText('15,00');
  await line.getByRole('button', { name: 'Annulla voce' }).click();
  await page
    .getByLabel('Motivazione dell’annullamento')
    .fill('Voce aggiunta erroneamente');
  await page
    .getByRole('button', { name: 'Conferma annullamento voce' })
    .click();
  await expect(line).toContainText('Annullata');
});
test('cassa: fondo, calcolatrice, tagli resto e aliquota mancia', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('link', { name: 'Impostazioni', exact: true }).click();
  await page.getByRole('button', { name: 'Configura aliquota mance' }).click();
  await page.getByLabel('Aliquota percentuale (0–100)').fill('5');
  await page
    .getByLabel('Motivazione della configurazione')
    .fill('Aliquota simulata nel test');
  await page.getByRole('button', { name: 'Salva aliquota simulata' }).click();
  await page.getByRole('link', { name: 'Cassa', exact: true }).click();
  await page.getByRole('button', { name: 'Aggiungi fondo contanti' }).click();
  await page.getByLabel('Tagli del fondo: 20,00').fill('2');
  await page.getByLabel('Tagli del fondo: 10,00').fill('1');
  await page.getByRole('button', { name: 'Registra fondo per taglio' }).click();
  await page
    .getByRole('button', { name: 'Registra pagamento simulato', exact: true })
    .click();
  await page.getByLabel('Metodo simulato').selectOption('cash');
  await page.getByLabel('Importo in euro', { exact: true }).fill('1,00');
  await page.getByLabel('Mancia in euro (0 se assente)').fill('1,00');
  await page.getByRole('button', { name: 'Inserisci 5', exact: true }).click();
  await page.getByRole('button', { name: 'Inserisci 0', exact: true }).click();
  await page.getByLabel('Tagli ricevuti: 50,00').fill('1');
  await expect(page.locator('.change-preview')).toContainText('48,00');
  // Add coins/notes for the 8 euros beyond the seeded 20/10 notes.
  await page.getByRole('button', { name: 'Annulla', exact: true }).click();
  await page.getByRole('button', { name: 'Aggiungi fondo contanti' }).click();
  await page.getByLabel('Tagli del fondo: 2,00').fill('4');
  await page.getByRole('button', { name: 'Registra fondo per taglio' }).click();
  await page
    .getByRole('button', { name: 'Registra pagamento simulato', exact: true })
    .click();
  await page.getByLabel('Metodo simulato').selectOption('cash');
  await page.getByLabel('Importo in euro', { exact: true }).fill('1');
  await page.getByLabel('Mancia in euro (0 se assente)').fill('1');
  await page.getByLabel('Contanti consegnati dal cliente').fill('50');
  await page.getByLabel('Tagli ricevuti: 50,00').fill('1');
  await expect(page.locator('.change-preview')).toContainText('48,00');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Registra pagamento simulato', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.payment-history')).toContainText('Mancia 1,00');
  await expect(page.locator('.payment-history')).toContainText('0,05');
});
test('bolle: PDF letto, carico multiriga, archivio e originale', async ({
  page,
}) => {
  const { deliveryPdf } = await import('../fixtures/delivery.mjs');
  await login(page);
  await page
    .getByRole('link', { name: 'Bolle e documenti', exact: true })
    .click();
  await page.getByLabel('File bolla JPEG PNG o PDF').setInputFiles({
    name: 'Consegna demo.pdf',
    mimeType: 'application/pdf',
    buffer: deliveryPdf('BROWSER-88'),
  });
  await expect(
    page.getByRole('heading', {
      name: 'Verifica la lettura prima di caricare',
    }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel('Fornitore verificato')).toHaveValue(
    'Dispensa Demo',
  );
  await expect(page.getByLabel('Quantità riga 1')).toHaveValue('2500');
  await expect(page.getByLabel('Destinazione riga 3')).toHaveValue('supplies');
  await page
    .getByLabel('Fornitore verificato')
    .fill('Dispensa Demo verificata');
  await page.reload();
  await expect(page.getByLabel('Fornitore verificato')).toHaveValue(
    'Dispensa Demo verificata',
  );
  await page.getByRole('button', { name: 'Conferma carico merce' }).click();
  await expect(
    page.getByRole('heading', { name: 'Bolla caricata e archiviata' }),
  ).toBeVisible();
  const original = page.getByRole('link', { name: 'Apri originale' });
  const response = await page.request.get(
    (await original.getAttribute('href'))!,
  );
  expect(response.status()).toBe(200);
  expect(Buffer.from(await response.body())).toEqual(deliveryPdf('BROWSER-88'));
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Bolla caricata e archiviata' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Torna all’archivio' }).click();
  await page
    .getByRole('textbox', { name: 'Cerca fornitore, bolla o data' })
    .fill('BROWSER-88');
  await expect(
    page.getByRole('row').filter({ hasText: 'BROWSER-88' }),
  ).toContainText('Caricata');
  await page.getByRole('link', { name: 'Magazzino', exact: true }).click();
  await page.getByLabel('Categoria magazzino').selectOption('supplies');
  await expect(
    page.getByRole('row').filter({ hasText: 'Tovaglioli' }),
  ).toBeVisible();
});
test('foto: OCR locale di una bolla immagine', async ({ page, context }) => {
  const fixture = await context.newPage();
  await fixture.setViewportSize({ width: 1600, height: 1000 });
  await fixture.setContent(
    '<main style="padding:40px;font:32px Arial;line-height:2;color:black;background:white"><div>FORNITORE: Dispensa Demo</div><div>DDT n. FOTO-91</div><div>Data: 18/10/2026</div><div>Acqua naturale pz 6 0,55</div></main>',
  );
  const image = await fixture.screenshot();
  await fixture.close();
  await login(page);
  await page
    .getByRole('link', { name: 'Bolle e documenti', exact: true })
    .click();
  await page.getByLabel('File bolla JPEG PNG o PDF').setInputFiles({
    name: 'Foto bolla.png',
    mimeType: 'image/png',
    buffer: image,
  });
  await expect(
    page.getByRole('heading', {
      name: 'Verifica la lettura prima di caricare',
    }),
  ).toBeVisible({ timeout: 60000 });
  await expect(page.getByText('Lettura OCR', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Quantità riga 1')).toHaveValue('6');
});

test('cassa su telefono: pagamento accessibile, errore conservato e resto insufficiente', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'Cassa');
  await page
    .getByRole('button', { name: 'Registra pagamento simulato', exact: true })
    .click();
  await page.getByLabel('Metodo simulato').selectOption('cash');
  await page.getByLabel('Importo in euro', { exact: true }).fill('1');
  await page.getByLabel('Contanti consegnati dal cliente').fill('100');
  await page.getByLabel('Tagli ricevuti: 100,00').fill('1');
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Registra pagamento simulato', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Resto non componibile',
  );
  await expect(page.getByLabel('Contanti consegnati dal cliente')).toHaveValue(
    '100',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('palmare mobile: dettagli, filtri, portate e invio bevande preservano il cibo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'Sala');
  await expect(page.locator('.handheld-intro')).toBeHidden();
  await expect(page.locator('#order-session')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Vai ai tavoli' })).toHaveCount(
    0,
  );
  expect(
    await page
      .locator('.product-grid')
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
      ),
  ).toBe(3);
  const sheet = page.locator('.order-sheet');
  expect((await sheet.boundingBox())!.height).toBeLessThan(844 * 0.38);
  await page
    .getByRole('button', {
      name: 'Informazioni su Spaghettoni alla carbonara',
      exact: true,
    })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Pecorino');
  await expect(page.getByRole('dialog')).toContainText('Glutine');
  await expect(page.getByRole('dialog')).toContainText('Preparazione');
  await page.keyboard.press('Escape');
  await page.getByRole('switch', { name: 'Gluten free', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Aggiungi Spaghettoni alla carbonara',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', {
      name: 'Aggiungi Burrata e pomodori',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('switch', { name: 'Vegan', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Aggiungi Burrata e pomodori',
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole('switch', { name: 'AYCE', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Aggiungi Acqua naturale', exact: true }),
  ).toHaveCount(0);
  for (const name of ['AYCE', 'Vegan', 'Gluten free'])
    await page.getByRole('switch', { name, exact: true }).click();
  await page
    .getByRole('button', { name: 'Aggiungi portata', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '4ª portata', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', {
      name: 'Aggiungi Spaghettoni alla carbonara',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Espandi comanda', exact: true })
    .click();
  await sheet
    .getByRole('button', { name: 'Aggiungi nota di preparazione' })
    .click();
  await page
    .getByLabel('Nota per il reparto')
    .fill('Portare dopo gli antipasti');
  await page.getByRole('button', { name: 'Salva nota', exact: true }).click();
  await page.getByRole('button', { name: 'Riduci altezza comanda' }).click();
  await page.getByRole('button', { name: '1ª portata', exact: true }).click();
  await page
    .getByRole('button', { name: 'Aggiungi Acqua naturale', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Espandi comanda', exact: true })
    .click();
  await sheet
    .getByRole('button', { name: 'Aggiungi nota di preparazione' })
    .click();
  await page.getByLabel('Nota per il reparto').fill('Senza bicchieri');
  await page.getByRole('button', { name: 'Salva nota', exact: true }).click();
  await page.getByRole('button', { name: /Invia bevande/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Acqua naturale');
  await expect(page.getByRole('dialog')).not.toContainText('Spaghettoni');
  await page.route(
    '**/api/actions/send',
    (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invio di prova non riuscito' }),
      }),
    { times: 1 },
  );
  await page.getByRole('button', { name: 'Conferma invio bevande' }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Invio di prova non riuscito',
  );
  await page.getByRole('button', { name: 'Conferma invio bevande' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(sheet.locator('.draft-line')).toHaveCount(1);
  await expect(sheet.locator('.already-sent')).toContainText('Senza bicchieri');
  await page.getByRole('button', { name: '4ª portata', exact: true }).click();
  await expect(sheet.locator('.draft-line')).toContainText(
    'Portare dopo gli antipasti',
  );
  await page.reload();
  await page.getByRole('button', { name: '4ª portata', exact: true }).click();
  await page
    .getByRole('button', { name: 'Espandi comanda', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Invia ai reparti', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('4ª uscita');
  await page.getByRole('button', { name: 'Conferma invio ai reparti' }).click();
  await expect(sheet.locator('.draft-line')).toHaveCount(0);
  await expect(sheet.locator('.already-sent')).toContainText(
    'Portare dopo gli antipasti',
  );
  await page.getByRole('button', { name: 'Riduci altezza comanda' }).click();
  await page
    .getByRole('button', { name: 'Aggiungi Burrata e pomodori', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Espandi comanda', exact: true })
    .click();
  await sheet
    .getByRole('button', { name: 'Rimuovi Burrata e pomodori' })
    .click();
  await expect(sheet.locator('.draft-line')).toHaveCount(0);
  const grip = page.locator('.sheet-grip');
  const box = (await grip.boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 90, { steps: 8 });
  await page.mouse.up();
  await expect(sheet).toHaveClass(/collapsed/);
  await page.getByRole('button', { name: 'Apri comanda', exact: true }).click();
  await expect(sheet).toHaveClass(/open/);
  await page
    .getByRole('textbox', { name: 'Cerca nel menu' })
    .fill('Nessun piatto');
  await expect(
    page.getByRole('heading', { name: 'Prodotto non trovato' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancella ricerca' }).click();
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  const closeToast = page.getByRole('button', { name: 'Chiudi notifica' });
  if (await closeToast.isVisible()) await closeToast.click();
  await page
    .getByRole('button', {
      name: 'Aggiungi Spaghettoni alla carbonara',
      exact: true,
    })
    .click();
  await page.screenshot({ path: 'docs/palmare-portate.png', fullPage: false });
  for (const width of [320, 600, 820]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
