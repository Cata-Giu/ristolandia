import {
  lineAmounts,
  validCounts,
  countTotal,
  addCounts,
  suggestChange,
  taxOnTip,
  MAX_CHANGE,
} from '../shared/finance.mjs';
import { drawer } from './cash.mjs';
import menuDetails from '../shared/menu-details.json' with { type: 'json' };
import serviceRounds from '../shared/service-rounds.json' with { type: 'json' };
import { randomUUID } from 'node:crypto';
import { seed, USERS } from './seed.mjs';
export class DomainError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}
const fail = (condition, message, status) => {
  if (!condition) throw new DomainError(message, status);
};
const id = () => randomUUID();
const cents = (n) => Number.isSafeInteger(n) && n > 0 && n <= 100000000;
const text = (s, max = 200) =>
  typeof s === 'string' && s.trim().length > 0 && s.length <= max;
const allowed = {
  book: ['admin', 'manager', 'reception', 'public'],
  confirm: ['admin', 'manager', 'reception'],
  arrive: ['admin', 'manager', 'reception'],
  open: ['admin', 'manager', 'reception', 'waiter'],
  clean: ['admin', 'manager', 'reception', 'waiter'],
  send: ['admin', 'manager', 'waiter', 'cashier'],
  line: ['admin', 'manager', 'kitchen', 'bar', 'waiter'],
  cancel: ['admin', 'manager', 'cashier'],
  'receive-document': ['admin', 'manager', 'warehouse'],
  'adjust-line': ['admin', 'manager', 'cashier'],
  'cash-fund': ['admin', 'manager', 'cashier'],
  'tip-tax': ['admin'],
  'close-account': ['admin', 'manager', 'cashier'],
  pay: ['admin', 'manager', 'cashier'],
  topup: ['admin', 'manager', 'cashier'],
  receive: ['admin', 'manager', 'warehouse'],
  transfer: ['admin', 'manager', 'warehouse'],
  inventory: ['admin', 'manager', 'warehouse'],
  reprint: ['admin', 'manager', 'kitchen', 'bar'],
  alert: ['admin', 'manager', 'kitchen'],
  reset: ['admin'],
};
export function totals(s, session) {
  const orders = s.orders.filter((o) => o.sessionId === session.id);
  const total =
    session.total ??
    orders
      .flatMap((o) => o.lines)
      .filter((l) => l.status !== 'cancelled')
      .reduce((a, l) => a + lineAmounts(l).total, 0);
  const paid = s.payments
    .filter((p) => p.sessionId === session.id)
    .reduce((a, p) => a + p.amount, 0);
  return { total, paid, due: Math.max(0, total - paid) };
}
export function balance(s, customerId, kind = 'credit') {
  return s.wallet
    .filter((w) => w.customerId === customerId && w.kind === kind)
    .reduce((a, w) => a + w.amount, 0);
}
export function stock(s, venueId, ingredientId) {
  return s.movements
    .filter((m) => m.venueId === venueId && m.ingredientId === ingredientId)
    .reduce((a, m) => a + m.quantity, 0);
}
function audit(s, u, venueId, action, target, reason = '') {
  s.audit.push({
    id: id(),
    user: u.name,
    role: u.role,
    venueId,
    action,
    target,
    reason,
    at: Date.now(),
  });
}
function venue(s, u, v) {
  fail(
    u.role === 'public' || u.organizationId === s.organizationId,
    'Organizzazione non autorizzata',
    403,
  );
  fail(
    (v === 'all' && u.role === 'admin') || s.venues.some((x) => x.id === v),
    'Sede non valida',
  );
  fail(
    u.role === 'public' || u.venueIds.includes(v),
    'Sede non autorizzata',
    403,
  );
}
function session(s, u, sessionId) {
  const r = s.sessions.find((x) => x.id === sessionId);
  fail(r, 'Sessione non trovata', 404);
  venue(s, u, r.venueId);
  fail(r.status === 'open', 'Il conto è già chiuso', 409);
  return r;
}
function closeSession(s, se, total) {
  se.status = 'closed';
  se.closedAt = Date.now();
  s.tables.find((t) => t.id === se.tableId).status = 'cleaning';
  for (const b of s.bookings.filter(
    (b) => b.tableId === se.tableId && b.status === 'seated',
  ))
    b.status = 'completed';
  if (se.customerId && total > 0) {
    s.customers.find((c) => c.id === se.customerId).visits++;
    s.wallet.push({
      id: id(),
      customerId: se.customerId,
      kind: 'points',
      amount: Math.floor(total / 100),
      source: se.id,
      at: Date.now(),
    });
  }
}
function matchBooking(a, b) {
  return (
    a.venueId === b.venueId &&
    a.day === b.day &&
    Math.abs(minutes(a.time) - minutes(b.time)) < 120 &&
    !['cancelled', 'completed', 'no-show'].includes(a.status)
  );
}
const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
export function availableTables(s, booking, exclude) {
  return s.tables.filter(
    (t) =>
      t.venueId === booking.venueId &&
      t.seats >= booking.covers &&
      t.status !== 'unavailable' &&
      !s.bookings.some(
        (b) =>
          b.id !== exclude && b.tableId === t.id && matchBooking(b, booking),
      ),
  );
}
export function apply(s, u, action, p, key) {
  fail(
    allowed[action]?.includes(u.role),
    'Operazione non autorizzata per questa postazione',
    403,
  );
  fail(text(key, 100), 'Chiave operazione mancante');
  const token = `${u.id}:${action}:${key}`,
    fingerprint = JSON.stringify(p);
  if (s.idempotency[token]) {
    fail(
      s.idempotency[token].fingerprint === fingerprint,
      'Chiave già usata per un contenuto differente',
      409,
    );
    return s.idempotency[token].result;
  }
  let result = { message: 'Operazione registrata' };
  if (action === 'reset') {
    const revision = s.revision;
    const next = seed();
    Object.assign(s, next);
    s.revision = revision;
    audit(s, u, 'centro', 'reset', 'demo', 'Ripristino dati dimostrativi');
    result.message = 'Dati dimostrativi ripristinati';
  } else if (action === 'book') {
    venue(s, u, p.venueId);
    fail(
      text(p.name, 70) && text(p.phone, 25),
      'Inserisci nome e telefono dimostrativi',
    );
    const parsedDay =
      typeof p.day === 'string'
        ? new Date(p.day + 'T12:00:00Z')
        : new Date(NaN);
    fail(
      /^\d{4}-\d{2}-\d{2}$/.test(p.day) &&
        Number.isFinite(parsedDay.getTime()) &&
        parsedDay.toISOString().slice(0, 10) === p.day &&
        p.day >= s.day,
      'Scegli una data valida da oggi in poi',
    );
    fail(
      [
        '12:00',
        '12:30',
        '13:00',
        '13:30',
        '19:30',
        '20:00',
        '20:30',
        '21:00',
        '21:30',
      ].includes(p.time),
      'Orario fuori dai turni prenotabili',
    );
    fail(
      Number.isInteger(p.covers) && p.covers >= 1 && p.covers <= 6,
      'Sono prenotabili da 1 a 6 coperti per richiesta',
    );
    const b = {
      id: id(),
      venueId: p.venueId,
      name: p.name.trim(),
      phone: p.phone.trim(),
      day: p.day,
      time: p.time,
      covers: p.covers,
      status: 'pending',
      tableId: null,
      customerId: null,
      note: String(p.note ?? '').slice(0, 200),
      createdAt: Date.now(),
    };
    fail(
      availableTables(s, b).length > 0,
      'Nessuna combinazione disponibile in questa fascia. Scegli un altro orario.',
      409,
    );
    s.bookings.push(b);
    s.notifications.push({
      id: id(),
      venueId: p.venueId,
      title: 'Richiesta ricevuta',
      body: `${b.name} · ${b.covers} persone · ${b.time}`,
      status: 'simulated',
      at: Date.now(),
    });
    result = {
      message: 'Richiesta ricevuta. Conferma ancora da assegnare.',
      id: b.id,
    };
  } else if (action === 'confirm' || action === 'arrive') {
    const b = s.bookings.find((x) => x.id === p.bookingId);
    fail(b, 'Prenotazione non trovata', 404);
    venue(s, u, b.venueId);
    if (action === 'confirm') {
      fail(b.status === 'pending', 'Prenotazione già gestita', 409);
      const t = availableTables(s, b, b.id).find((t) => t.id === p.tableId);
      fail(t, 'Tavolo non disponibile o capienza insufficiente', 409);
      b.tableId = t.id;
      b.status = 'confirmed';
      result.message = 'Prenotazione confermata';
    } else {
      fail(b.status === 'confirmed', 'Conferma prima la prenotazione', 409);
      fail(
        b.day === s.day,
        'Arrivo disponibile soltanto nel giorno della prenotazione',
      );
      const t = s.tables.find((t) => t.id === b.tableId);
      fail(
        t && t.status === 'free',
        'Il tavolo è ancora occupato o da riassettare',
        409,
      );
      const se = {
        id: id(),
        venueId: b.venueId,
        tableId: t.id,
        covers: b.covers,
        customerId: b.customerId,
        status: 'open',
        openedAt: Date.now(),
      };
      s.sessions.push(se);
      t.status = 'occupied';
      b.status = 'seated';
      result = {
        message: 'Arrivo registrato. Sessione tavolo aperta.',
        id: se.id,
      };
    }
    audit(s, u, b.venueId, action, b.id);
  } else if (action === 'open' || action === 'clean') {
    const t = s.tables.find((t) => t.id === p.tableId);
    fail(t, 'Tavolo non trovato', 404);
    venue(s, u, t.venueId);
    if (action === 'clean') {
      fail(t.status === 'cleaning', 'Il tavolo non è da riassettare');
      t.status = 'free';
      result.message = 'Tavolo nuovamente disponibile';
    } else {
      fail(t.status === 'free', 'Tavolo già in uso', 409);
      fail(
        Number.isInteger(p.covers) && p.covers > 0 && p.covers <= t.seats,
        'Coperti superiori alla capienza',
      );
      fail(
        !s.bookings.some(
          (b) =>
            b.tableId === t.id && b.day === s.day && b.status === 'confirmed',
        ),
        'Tavolo riservato: registra l’arrivo dalla prenotazione',
        409,
      );
      t.status = 'occupied';
      const se = {
        id: id(),
        venueId: t.venueId,
        tableId: t.id,
        covers: p.covers,
        customerId: null,
        status: 'open',
        openedAt: Date.now(),
      };
      s.sessions.push(se);
      result = { message: 'Tavolo aperto', id: se.id };
    }
    audit(s, u, t.venueId, action, t.id);
  } else if (action === 'send') {
    const se = session(s, u, p.sessionId);
    fail(
      Array.isArray(p.lines) && p.lines.length > 0 && p.lines.length <= 30,
      'Aggiungi almeno un prodotto',
    );
    const lines = p.lines.map((l) => {
      fail(l && typeof l === 'object', 'Riga ordine non valida');
      const serviceRound =
        l.serviceRound === undefined ? serviceRounds.default : l.serviceRound;
      fail(
        Number.isInteger(serviceRound) &&
          serviceRound >= serviceRounds.min &&
          serviceRound <= serviceRounds.max,
        'Scegli un’uscita da 1 a ' + serviceRounds.max,
      );
      const product = s.products.find((x) => x.id === l.productId);
      fail(product?.available, 'Prodotto non disponibile');
      fail(
        Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 30,
        'Quantità non valida',
      );
      fail(
        !l.note || (typeof l.note === 'string' && l.note.length <= 200),
        'Nota troppo lunga',
      );
      return {
        id: id(),
        productId: product.id,
        name: product.name,
        quantity: l.quantity,
        price: product.price,
        department: product.department,
        recipe: structuredClone(product.recipe),
        recipeVersion: 1,
        note: l.note ?? '',
        course: product.category,
        serviceRound,
        status: 'sent',
      };
    });
    const o = {
      id: id(),
      venueId: se.venueId,
      sessionId: se.id,
      createdAt: Date.now(),
      lines,
    };
    s.orders.push(o);
    for (const department of new Set(lines.map((l) => l.department)))
      s.prints.push({
        id: id(),
        venueId: se.venueId,
        orderId: o.id,
        department,
        status: 'queued',
        attempt: 1,
        at: Date.now(),
      });
    audit(s, u, se.venueId, 'send', o.id);
    result = { message: 'Comanda inviata a cucina e/o bar', id: o.id };
  } else if (action === 'line' || action === 'cancel') {
    const o = s.orders.find((x) => x.lines.some((l) => l.id === p.lineId));
    fail(o, 'Riga non trovata', 404);
    venue(s, u, o.venueId);
    const openSession = session(s, u, o.sessionId);
    const l = o.lines.find((l) => l.id === p.lineId);
    fail(
      !['kitchen', 'bar'].includes(u.role) || l.department === u.role,
      'Preparazione di un altro reparto',
      403,
    );
    if (action === 'cancel') {
      fail(l.status !== 'cancelled', 'Riga già annullata', 409);
      fail(text(p.reason), 'La motivazione è obbligatoria');
      fail(
        totals(s, openSession).total - lineAmounts(l).total >=
          totals(s, openSession).paid,
        'La correzione scenderebbe sotto i pagamenti già registrati',
        409,
      );
      l.cancelledAt = Date.now();
      s.prints.push({
        id: id(),
        venueId: o.venueId,
        orderId: o.id,
        department: l.department,
        status: 'queued',
        attempt: 1,
        at: l.cancelledAt,
        cancellation: true,
      });
      l.cancelledFrom = l.status;
      l.status = 'cancelled';
      l.reason = p.reason;
      audit(s, u, o.venueId, 'cancel', l.id, p.reason);
      result.message =
        'Riga annullata; i consumi già registrati restano nello storico';
    } else {
      const next = { sent: 'preparing', preparing: 'ready', ready: 'served' }[
        l.status
      ];
      fail(
        next === p.status,
        'Stato modificato da un altro operatore. Aggiorna e riprova.',
        409,
      );
      fail(
        u.role !== 'waiter' || next === 'served',
        'La sala può soltanto segnare una portata come servita',
        403,
      );
      fail(
        !['kitchen', 'bar'].includes(u.role) || next !== 'served',
        'La consegna al tavolo è di competenza della sala',
        403,
      );
      l.status = next;
      l.updatedAt = Date.now();
      if (next === 'ready' && l.recipe)
        for (const [ingredientId, q] of Object.entries(l.recipe))
          s.movements.push({
            id: id(),
            venueId: o.venueId,
            ingredientId,
            quantity: -q * l.quantity,
            type: 'consumption',
            source: l.id,
            at: Date.now(),
          });
      audit(s, u, o.venueId, 'line', l.id, next);
      result.message =
        next === 'ready'
          ? 'Preparazione pronta. Consumi teorici registrati.'
          : next === 'served'
            ? 'Portata servita'
            : 'Preparazione avviata';
    }
  } else if (action === 'adjust-line') {
    const order = s.orders.find((o) => o.lines.some((l) => l.id === p.lineId));
    fail(order, 'Riga non trovata', 404);
    const se = session(s, u, order.sessionId);
    const l = order.lines.find((l) => l.id === p.lineId);
    fail(
      p.expectedLineVersion === undefined ||
        p.expectedLineVersion === (l.adjustments?.length ?? 0),
      'La riga è stata modificata: riapri la correzione',
      409,
    );
    fail(
      l.status !== 'cancelled',
      'Una riga annullata non può essere modificata',
      409,
    );
    fail(text(p.reason), 'Motivazione della correzione obbligatoria');
    fail(
      Number.isInteger(p.quantity) && p.quantity >= 1 && p.quantity <= 30,
      'Quantità da 1 a 30',
    );
    fail(
      Number.isSafeInteger(p.price) && p.price >= 0 && p.price <= 100000000,
      'Prezzo unitario non valido',
    );
    fail(
      p.discount &&
        ['none', 'percent', 'euro'].includes(p.discount.kind) &&
        Number.isSafeInteger(p.discount.value) &&
        p.discount.value >= 0,
      'Sconto non valido',
    );
    fail(
      p.discount.kind !== 'percent' || p.discount.value <= 10000,
      'Lo sconto percentuale non può superare il 100%',
    );
    fail(
      p.discount.kind !== 'none' || p.discount.value === 0,
      'Sconto non valido',
    );
    const next = {
      ...l,
      billQuantity: p.quantity,
      price: p.price,
      discount: p.discount,
    };
    const amounts = lineAmounts(next);
    fail(amounts.total >= 0, 'Lo sconto in euro supera il totale della riga');
    fail(
      totals(s, se).total - lineAmounts(l).total + amounts.total >=
        totals(s, se).paid,
      'La correzione scenderebbe sotto i pagamenti già registrati',
      409,
    );
    const before = {
      quantity: l.billQuantity ?? l.quantity,
      price: l.price,
      discount: l.discount ?? { kind: 'none', value: 0 },
    };
    if (['sent', 'preparing'].includes(l.status) && l.quantity !== p.quantity) {
      l.operationalChanges ??= [];
      l.operationalChanges.push({
        at: Date.now(),
        from: l.quantity,
        to: p.quantity,
        reason: 'Quantità aggiornata in cassa',
      });
      l.quantity = p.quantity;
      s.prints.push({
        id: id(),
        venueId: order.venueId,
        orderId: order.id,
        department: l.department,
        status: 'queued',
        attempt: 1,
        at: Date.now(),
        correction: true,
      });
    }
    l.billQuantity = p.quantity;
    l.price = p.price;
    l.discount = p.discount;
    l.adjustments ??= [];
    l.adjustments.push({
      at: Date.now(),
      user: u.name,
      reason: p.reason,
      before,
      after: { quantity: p.quantity, price: p.price, discount: p.discount },
    });
    audit(s, u, order.venueId, 'adjust-line', l.id, p.reason);
    result.message = 'Riga corretta e variazione tracciata';
  } else if (action === 'cash-fund') {
    venue(s, u, p.venueId);
    fail(
      validCounts(p.counts) &&
        countTotal(p.counts) > 0 &&
        countTotal(p.counts) <= 100000000,
      'Inserisci i tagli realmente disponibili',
    );
    fail(text(p.reason), 'Motivazione del versamento obbligatoria');
    s.cashMovements ??= [];
    s.cashMovements.push({
      id: id(),
      venueId: p.venueId,
      day: s.day,
      counts: p.counts,
      type: 'fund',
      source: p.reason,
      user: u.name,
      at: Date.now(),
    });
    audit(s, u, p.venueId, 'cash-fund', 'drawer', p.reason);
    result.message = 'Fondo contanti aggiornato per taglio';
  } else if (action === 'tip-tax') {
    fail(
      Number.isInteger(p.basisPoints) &&
        p.basisPoints >= 0 &&
        p.basisPoints <= 10000,
      'Aliquota da 0 a 100%, con massimo due decimali',
    );
    fail(text(p.reason), 'Motivazione della configurazione obbligatoria');
    s.settings ??= {};
    s.settings.tipTaxBasisPoints = p.basisPoints;
    audit(s, u, 'centro', 'tip-tax', 'settings', p.reason);
    result.message =
      'Aliquota simulata mance aggiornata per i prossimi pagamenti';
  } else if (action === 'close-account') {
    const se = session(s, u, p.sessionId),
      t = totals(s, se);
    fail(t.due === 0, 'Il conto ha ancora un residuo', 409);
    fail(text(p.reason), 'Motivazione di chiusura obbligatoria');
    closeSession(s, se, t.total);
    audit(s, u, se.venueId, 'close-account', se.id, p.reason);
    result.message = 'Conto saldato chiuso senza creare nuovi pagamenti';
  } else if (action === 'pay') {
    const se = session(s, u, p.sessionId);
    fail(cents(p.amount), 'Importo non valido');
    fail(
      ['cash', 'card', 'credit'].includes(p.method),
      'Metodo non disponibile',
    );
    const t = totals(s, se),
      tip = p.tip === undefined ? 0 : p.tip;
    fail(
      Number.isSafeInteger(tip) && tip >= 0 && tip <= 100000000,
      'Mancia non valida',
    );
    fail(p.amount <= t.due, 'L’importo supera il residuo da pagare', 409);
    fail(t.total > 0, 'Il conto non contiene consumazioni');
    const rate = s.settings?.tipTaxBasisPoints ?? null;
    fail(
      !tip || rate !== null,
      'Configura prima l’aliquota simulata sulle mance nelle Impostazioni',
    );
    fail(
      p.method !== 'credit' || tip === 0,
      'La mancia non può essere pagata con credito prepagato',
    );
    const paymentId = id();
    let changeCounts,
      changeAmount = 0;
    if (p.method === 'cash') {
      fail(
        cents(p.cashReceived) &&
          validCounts(p.cashReceivedCounts) &&
          countTotal(p.cashReceivedCounts) === p.cashReceived,
        'I tagli ricevuti devono corrispondere alla somma consegnata',
      );
      changeAmount = p.cashReceived - p.amount - tip;
      fail(
        changeAmount >= 0,
        'Contanti consegnati insufficienti per conto e mancia',
      );
      fail(
        changeAmount <= MAX_CHANGE,
        'Il resto supera il limite demo di 2.000 euro',
      );
      const available = addCounts(
        drawer(s, se.venueId).counts,
        p.cashReceivedCounts,
      );
      changeCounts = suggestChange(changeAmount, available);
      fail(
        changeCounts !== null,
        'Resto non componibile con i tagli disponibili: modifica il contante ricevuto o integra il fondo',
        409,
      );
    }
    if (p.method === 'credit') {
      fail(se.customerId, 'Nessun cliente identificato su questo tavolo');
      fail(
        balance(s, se.customerId) >= p.amount,
        'Credito pagato insufficiente',
        409,
      );
      s.wallet.push({
        id: id(),
        customerId: se.customerId,
        kind: 'credit',
        amount: -p.amount,
        source: se.id,
        at: Date.now(),
      });
    }
    const payment = {
      id: paymentId,
      venueId: se.venueId,
      sessionId: se.id,
      amount: p.amount,
      method: p.method,
      tip,
      tipTaxBasisPoints: tip ? rate : null,
      tipTax: tip ? taxOnTip(tip, rate) : 0,
      at: Date.now(),
    };
    if (p.method === 'cash') {
      Object.assign(payment, {
        cashReceived: p.cashReceived,
        cashReceivedCounts: p.cashReceivedCounts,
        changeAmount,
        changeCounts,
      });
      s.cashMovements ??= [];
      s.cashMovements.push({
        id: id(),
        venueId: se.venueId,
        day: s.day,
        type: 'payment',
        source: paymentId,
        user: u.name,
        at: Date.now(),
        counts: addCounts(
          p.cashReceivedCounts,
          Object.fromEntries(
            Object.entries(changeCounts).map(([d, n]) => [d, -n]),
          ),
        ),
      });
    }
    s.payments.push(payment);
    if (p.amount === t.due) closeSession(s, se, t.total);
    audit(s, u, se.venueId, 'pay', se.id);
    result.message =
      se.status === 'closed'
        ? 'Pagamento simulato registrato. Conto chiuso.'
        : 'Pagamento parziale simulato registrato';
  } else if (action === 'topup') {
    venue(s, u, p.venueId);
    fail(cents(p.amount), 'Importo non valido');
    fail(
      s.customers.some((c) => c.id === p.customerId) &&
        (u.role === 'admin' ||
          s.sessions.some(
            (se) => se.venueId === p.venueId && se.customerId === p.customerId,
          ) ||
          s.bookings.some(
            (b) => b.venueId === p.venueId && b.customerId === p.customerId,
          )),
      'Cliente non autorizzato in questa sede',
      403,
    );
    s.wallet.push({
      id: id(),
      venueId: p.venueId,
      customerId: p.customerId,
      kind: 'credit',
      amount: p.amount,
      source: 'Ricarica simulata',
      at: Date.now(),
    });
    audit(s, u, p.venueId, 'topup', p.customerId);
    result.message = 'Ricarica simulata registrata, separata dalle vendite';
  } else if (action === 'receive-document') {
    const document = (s.documents ?? []).find((d) => d.id === p.documentId);
    fail(document, 'Documento non trovato', 404);
    venue(s, u, document.venueId);
    fail(
      document.status !== 'received',
      'Bolla già caricata: duplicazione impedita',
      409,
    );
    fail(
      text(p.supplier, 100) && text(p.documentNumber, 60),
      'Fornitore e numero bolla obbligatori',
    );
    const parsed = new Date(p.documentDay + 'T12:00:00Z');
    fail(
      typeof p.documentDay === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(p.documentDay) &&
        Number.isFinite(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === p.documentDay,
      'Data documento non valida',
    );
    const normalized = (v) => v.trim().toLowerCase().replace(/\s+/g, ' ');
    const source = `${document.venueId}|${normalized(p.supplier)}|${normalized(p.documentNumber)}|${p.documentDay.slice(0, 4)}`;
    fail(
      !s.receipts.some(
        (r) =>
          r.source === source ||
          (!r.documentDay &&
            r.venueId === document.venueId &&
            normalized(r.supplier ?? '') === normalized(p.supplier) &&
            normalized(r.document ?? '') === normalized(p.documentNumber)),
      ),
      'Documento del fornitore già ricevuto: verifica numero e anno',
      409,
    );
    fail(
      Array.isArray(p.rows) && p.rows.length > 0 && p.rows.length <= 100,
      'Conferma da 1 a 100 righe per bolla',
    );
    const reviewed = p.rows.map((row, index) => {
      fail(row && typeof row === 'object', `Riga ${index + 1} non valida`);
      fail(
        Number.isFinite(row.quantity) &&
          row.quantity > 0 &&
          row.quantity <= 1000000,
        `Quantità non valida alla riga ${index + 1}`,
      );
      fail(
        ['g', 'kg', 'ml', 'l', 'pz'].includes(row.unit),
        `Specifica unità e contenuto della confezione alla riga ${index + 1}`,
      );
      fail(
        row.cost === null ||
          (Number.isFinite(row.cost) && row.cost >= 0 && row.cost <= 100000000),
        `Costo non valido alla riga ${index + 1}`,
      );
      fail(
        ['kitchen', 'beverage', 'supplies'].includes(row.catalogCategory),
        `Categoria non valida alla riga ${index + 1}`,
      );
      const item = s.ingredients.find((i) => i.id === row.ingredientId);
      if (row.ingredientId !== 'new') {
        fail(item, `Articolo non trovato alla riga ${index + 1}`);
        fail(
          row.unit === item.unit,
          `Usa l’unità ${item.unit} dell’articolo ${item.name}`,
        );
      } else {
        fail(
          text(row.name, 100),
          `Nome articolo obbligatorio alla riga ${index + 1}`,
        );
        fail(
          !s.ingredients.some(
            (i) =>
              normalized(i.name) === normalized(row.name) &&
              i.unit === row.unit,
          ),
          `L’articolo ${row.name} è già presente: selezionalo dal catalogo`,
        );
      }
      return { ...row, ingredientId: item?.id ?? null };
    });
    const receiptId = id();
    for (const row of reviewed) {
      if (!row.ingredientId) {
        let item = s.ingredients.find(
          (i) =>
            normalized(i.name) === normalized(row.name) && i.unit === row.unit,
        );
        if (!item) {
          item = {
            id: id(),
            name: row.name.trim(),
            unit: row.unit,
            min: 0,
            cost: row.cost ?? 0,
            costMissing: row.cost === null,
            catalogCategory: row.catalogCategory,
            quantity: 0,
          };
          s.ingredients.push(item);
        }
        row.ingredientId = item.id;
      }
      s.movements.push({
        id: id(),
        venueId: document.venueId,
        ingredientId: row.ingredientId,
        quantity: row.quantity,
        type: 'receipt',
        source: receiptId,
        documentId: document.id,
        at: Date.now(),
      });
    }
    s.receipts.push({
      id: receiptId,
      source,
      venueId: document.venueId,
      supplier: p.supplier.trim(),
      document: p.documentNumber.trim(),
      documentDay: p.documentDay,
      documentId: document.id,
      rows: reviewed,
      at: Date.now(),
      user: u.name,
    });
    Object.assign(document, {
      status: 'received',
      receiptId,
      supplier: p.supplier.trim(),
      documentNumber: p.documentNumber.trim(),
      documentDay: p.documentDay,
      receivedAt: Date.now(),
      reviewedRows: reviewed,
    });
    audit(
      s,
      u,
      document.venueId,
      'receive-document',
      document.id,
      'Carico confermato dopo verifica della bolla',
    );
    result.message = 'Bolla archiviata e merce caricata una sola volta';
  } else if (action === 'receive' || action === 'inventory') {
    venue(s, u, p.venueId);
    fail(
      s.ingredients.some((i) => i.id === p.ingredientId),
      'Articolo non trovato',
    );
    fail(
      Number.isFinite(p.quantity) &&
        p.quantity >= (action === 'inventory' ? 0 : 0.000001) &&
        p.quantity < 1000000,
      'Quantità non valida',
    );
    if (action === 'receive') {
      fail(
        text(p.supplier, 60) && text(p.document, 60),
        'Fornitore e numero documento obbligatori',
      );
      const source = `${p.venueId}|${p.supplier.trim().toLowerCase()}|${p.document.trim().toLowerCase()}`;
      fail(
        !s.receipts.some((r) => r.source === source),
        'Documento già ricevuto: carico duplicato impedito',
        409,
      );
      s.receipts.push({
        id: id(),
        source,
        venueId: p.venueId,
        supplier: p.supplier,
        document: p.document,
        at: Date.now(),
      });
      s.movements.push({
        id: id(),
        venueId: p.venueId,
        ingredientId: p.ingredientId,
        quantity: p.quantity,
        type: 'receipt',
        source,
        at: Date.now(),
      });
      result.message = 'Ricezione confermata. Giacenza aggiornata';
    } else {
      fail(text(p.reason), 'Motivazione della rettifica obbligatoria');
      const delta = p.quantity - stock(s, p.venueId, p.ingredientId);
      s.movements.push({
        id: id(),
        venueId: p.venueId,
        ingredientId: p.ingredientId,
        quantity: delta,
        type: 'inventory',
        source: p.reason,
        at: Date.now(),
      });
      audit(s, u, p.venueId, 'inventory', p.ingredientId, p.reason);
      result.message = 'Conteggio approvato e rettifica registrata';
    }
  } else if (action === 'transfer') {
    venue(s, u, p.venueId);
    if (p.transferId) {
      const tr = s.transfers.find((t) => t.id === p.transferId);
      fail(
        tr && tr.to === p.venueId && tr.status === 'transit',
        'Trasferimento non ricevibile',
        409,
      );
      tr.status = 'received';
      s.movements.push({
        id: id(),
        venueId: tr.to,
        ingredientId: tr.ingredientId,
        quantity: tr.quantity,
        type: 'transfer-in',
        source: tr.id,
        at: Date.now(),
      });
      result.message = 'Trasferimento ricevuto';
    } else {
      venue(s, u, p.to);
      fail(p.venueId !== p.to, 'Scegli due sedi diverse');
      fail(
        s.ingredients.some((i) => i.id === p.ingredientId) &&
          Number.isFinite(p.quantity) &&
          p.quantity > 0 &&
          p.quantity <= stock(s, p.venueId, p.ingredientId),
        'Giacenza insufficiente o quantità non valida',
      );
      const tr = {
        id: id(),
        from: p.venueId,
        to: p.to,
        ingredientId: p.ingredientId,
        quantity: p.quantity,
        status: 'transit',
        at: Date.now(),
      };
      s.transfers.push(tr);
      s.movements.push({
        id: id(),
        venueId: p.venueId,
        ingredientId: p.ingredientId,
        quantity: -p.quantity,
        type: 'transfer-out',
        source: tr.id,
        at: Date.now(),
      });
      result.message = 'Materiale in transito: ricezione ancora da confermare';
    }
  } else if (action === 'reprint') {
    const job = s.prints.find((j) => j.id === p.printId);
    fail(job, 'Stampa non trovata', 404);
    venue(s, u, job.venueId);
    fail(
      !['kitchen', 'bar'].includes(u.role) || job.department === u.role,
      'Reparto non autorizzato',
      403,
    );
    s.prints.push({
      ...job,
      id: id(),
      at: Date.now(),
      status: 'queued',
      attempt: job.attempt + 1,
      reprint: true,
    });
    result.message = 'Ristampa simulata aggiunta alla coda';
  } else if (action === 'alert') {
    const a = s.alerts.find((a) => a.id === p.alertId);
    fail(a, 'Avviso non trovato', 404);
    venue(s, u, a.venueId);
    fail(a.type !== 'normal', 'Nessuna anomalia da gestire');
    fail(text(p.note), 'Scrivi una nota di presa in carico');
    a.status = 'acknowledged';
    a.operator = u.name;
    a.operatorNote = p.note;
    a.acknowledgedAt = Date.now();
    audit(s, u, a.venueId, 'alert', a.id, p.note);
    result.message = 'Anomalia presa in carico; risoluzione da verificare';
  }
  s.revision++;
  s.idempotency[token] = { fingerprint, result };
  return result;
}
const econ = ['admin', 'manager', 'cashier'];
export function project(s, u, venueId) {
  venue(s, u, venueId);
  const venues =
    u.role === 'admin' && venueId === 'all' ? u.venueIds : [venueId];
  const filter = (xs) => xs.filter((x) => venues.includes(x.venueId));
  const base = {
    revision: s.revision,
    day: s.day,
    user: u,
    venues: s.venues.filter((v) => u.venueIds.includes(v.id)),
    venueId,
    tables: filter(s.tables),
    sessions: filter(s.sessions).map((se) =>
      econ.includes(u.role)
        ? { ...se, ...totals(s, se) }
        : {
            id: se.id,
            venueId: se.venueId,
            tableId: se.tableId,
            covers: se.covers,
            status: se.status,
            openedAt: se.openedAt,
          },
    ),
    products: s.products.map((product) => {
      const p = { ...menuDetails[product.id], ...product };
      return u.role === 'warehouse' || econ.includes(u.role)
        ? p
        : (({ recipe, ...rest }) => rest)(p);
    }),
    orders: filter(s.orders)
      .filter(
        (o) =>
          !['kitchen', 'bar'].includes(u.role) ||
          o.lines.some((l) => l.department === u.role),
      )
      .map((o) => ({
        ...o,
        lines: o.lines
          .filter(
            (l) =>
              !['kitchen', 'bar'].includes(u.role) || l.department === u.role,
          )
          .map((l) =>
            econ.includes(u.role)
              ? l
              : (({
                  recipe,
                  price,
                  billQuantity,
                  discount,
                  adjustments,
                  ...rest
                }) => rest)(l),
          ),
      })),
    bookings: ['admin', 'manager', 'reception'].includes(u.role)
      ? filter(s.bookings)
      : [],
    prints: filter(s.prints).filter(
      (j) => !['kitchen', 'bar'].includes(u.role) || j.department === u.role,
    ),
    alerts: ['admin', 'manager', 'kitchen'].includes(u.role)
      ? filter(s.alerts)
      : [],
    notifications: ['admin', 'manager', 'reception'].includes(u.role)
      ? filter(s.notifications)
      : [],
  };
  if (econ.includes(u.role)) {
    base.payments = filter(s.payments);
    base.tipTaxBasisPoints = s.settings?.tipTaxBasisPoints ?? null;
    base.drawers = s.venues
      .filter((v) => venues.includes(v.id))
      .map((v) => drawer(s, v.id));
    base.customers = s.customers
      .filter(
        (c) =>
          u.role === 'admin' ||
          filter(s.sessions).some((se) => se.customerId === c.id) ||
          filter(s.bookings).some((b) => b.customerId === c.id),
      )
      .map((c) => ({
        ...c,
        credit: balance(s, c.id),
        bonus: balance(s, c.id, 'bonus'),
        points: balance(s, c.id, 'points'),
      }));
    base.wallet = s.wallet.filter((w) =>
      base.customers.some((c) => c.id === w.customerId),
    );
  }
  if (['admin', 'manager', 'warehouse'].includes(u.role)) {
    base.ingredients = s.ingredients.map((i) => ({
      ...i,
      catalogCategory:
        i.catalogCategory ??
        (s.products.some((p) => p.department === 'bar' && p.recipe?.[i.id]) &&
        !s.products.some((p) => p.department === 'kitchen' && p.recipe?.[i.id])
          ? 'beverage'
          : 'kitchen'),
      quantity: venues.reduce((a, v) => a + stock(s, v, i.id), 0),
      expected: filter(s.orders)
        .flatMap((o) => o.lines)
        .filter((l) => ['sent', 'preparing'].includes(l.status))
        .reduce((a, l) => a + (l.recipe?.[i.id] ?? 0) * l.quantity, 0),
    }));
    base.documents = filter(s.documents ?? []).map(
      ({ text, suggestedRows, hash, reviewedRows, ...document }) => ({
        ...document,
        rowCount: (reviewedRows ?? suggestedRows ?? []).length,
      }),
    );
    base.movements = filter(s.movements);
    base.receipts = filter(s.receipts);
    base.transfers = s.transfers.filter(
      (t) => venues.includes(t.from) || venues.includes(t.to),
    );
    base.audit = filter(s.audit);
  }
  if (['kitchen', 'bar'].includes(u.role)) {
    base.products = [];
    base.sessions = base.sessions.map(
      ({ id, venueId, tableId, covers, status, openedAt }) => ({
        id,
        venueId,
        tableId,
        covers,
        status,
        openedAt,
      }),
    );
    base.tables = base.tables.map(({ id, code, venueId }) => ({
      id,
      code,
      venueId,
    }));
  }
  return base;
}
export function view(s, u, v) {
  if (v === 'all') {
    fail(u.role === 'admin', 'Consolidato riservato all’amministrazione', 403);
    return project(s, { ...u, venueIds: [...u.venueIds, 'all'] }, v);
  }
  return project(s, u, v);
}
export { USERS, venue as authorizeVenue, audit as recordAudit };
