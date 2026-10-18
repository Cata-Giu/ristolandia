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
    page.getByRole('heading', { name: 'Un ordine fatto bene.' }),
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
    'customers',
    'temperatures',
    'notifications',
    'settings',
  ];
  for (const route of routes) {
    await page.goto('/?view=' + route + '&venue=centro');
    await expect(page.locator('main h1')).toBeVisible();
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
