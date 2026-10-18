export const VENUES = [
  {
    id: 'centro',
    name: 'La Corte · Centro',
    city: 'Milano',
    address: 'Via della Corte 12',
    initials: 'LC',
  },
  {
    id: 'navigli',
    name: 'La Corte · Navigli',
    city: 'Milano',
    address: 'Alzaia Naviglio 38',
    initials: 'NA',
  },
  {
    id: 'porta',
    name: 'La Corte · Porta Nuova',
    city: 'Milano',
    address: 'Via delle Vigne 8',
    initials: 'PN',
  },
  {
    id: 'monza',
    name: 'La Corte · Monza',
    city: 'Monza',
    address: 'Piazza del Borgo 4',
    initials: 'MO',
  },
  {
    id: 'como',
    name: 'La Corte · Como',
    city: 'Como',
    address: 'Via del Lago 21',
    initials: 'CO',
  },
];
export const ROLES = {
  admin: 'Amministrazione',
  manager: 'Responsabile',
  reception: 'Accoglienza',
  waiter: 'Sala',
  kitchen: 'Cucina',
  bar: 'Bar',
  cashier: 'Cassa',
  warehouse: 'Magazzino',
};
export const USERS = Object.entries(ROLES).map(([role, label], i) => ({
  id: role,
  name: [
    'Simone Riva',
    'Elena Conti',
    'Sofia Villa',
    'Marco Rosi',
    'Andrea Galli',
    'Luca Neri',
    'Giulia Sala',
    'Paolo Rizzi',
  ][i],
  role,
  label,
  organizationId: 'corte',
  venueIds: role === 'admin' ? VENUES.map((v) => v.id) : ['centro'],
}));
export const PRODUCTS = [
  {
    id: 'burrata',
    name: 'Burrata e pomodori',
    category: 'Antipasti',
    department: 'kitchen',
    price: 1400,
    recipe: { pomodoro: 180, burrata: 1 },
    description: 'Pomodori di stagione, basilico e olio EVO',
    available: true,
  },
  {
    id: 'tartare',
    name: 'Tartare di manzo',
    category: 'Antipasti',
    department: 'kitchen',
    price: 1800,
    recipe: { manzo: 150 },
    description: 'Battuta al coltello, capperi e senape',
    available: true,
  },
  {
    id: 'carbonara',
    name: 'Spaghettoni alla carbonara',
    category: 'Primi',
    department: 'kitchen',
    price: 1600,
    recipe: { pasta: 100, guanciale: 30, uova: 1 },
    description: 'Guanciale croccante, pecorino e pepe',
    available: true,
  },
  {
    id: 'risotto',
    name: 'Risotto allo zafferano',
    category: 'Primi',
    department: 'kitchen',
    price: 1700,
    recipe: { riso: 100 },
    description: 'Riso Carnaroli, zafferano e Parmigiano',
    available: true,
  },
  {
    id: 'tagliata',
    name: 'Tagliata di manzo',
    category: 'Secondi',
    department: 'kitchen',
    price: 2400,
    recipe: { manzo: 250 },
    description: 'Rucola, scaglie e riduzione al balsamico',
    available: true,
  },
  {
    id: 'tiramisu',
    name: 'Tiramisù della casa',
    category: 'Dolci',
    department: 'kitchen',
    price: 700,
    recipe: null,
    description: 'Ricetta da completare · costo non disponibile',
    available: true,
  },
  {
    id: 'spritz',
    name: 'Spritz',
    category: 'Aperitivi',
    department: 'bar',
    price: 800,
    recipe: { prosecco: 90, aperitivo: 60 },
    description: 'Prosecco, aperitivo e soda',
    available: true,
  },
  {
    id: 'vino',
    name: 'Calice di Valpolicella',
    category: 'Vini',
    department: 'bar',
    price: 650,
    recipe: { vino: 125 },
    description: 'Valpolicella DOC · mescita da 125 ml',
    available: true,
  },
  {
    id: 'acqua',
    name: 'Acqua naturale',
    category: 'Bevande',
    department: 'bar',
    price: 300,
    recipe: { acqua: 1 },
    description: 'Bottiglia in vetro · 75 cl',
    available: true,
  },
  {
    id: 'limonata',
    name: 'Limonata artigianale',
    category: 'Bevande',
    department: 'bar',
    price: 500,
    recipe: { limonata: 1 },
    description: 'Limone siciliano e menta',
    available: false,
  },
];
export function seed(now = Date.now()) {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));
  const state = {
    version: 1,
    revision: 0,
    day,
    organizationId: 'corte',
    venues: structuredClone(VENUES),
    products: structuredClone(PRODUCTS),
    tables: [],
    bookings: [],
    sessions: [],
    orders: [],
    payments: [],
    movements: [],
    wallet: [],
    customers: [],
    prints: [],
    notifications: [],
    alerts: [],
    audit: [],
    receipts: [],
    transfers: [],
    idempotency: {},
  };
  const stock = {
    pasta: ['Spaghettoni', 'g', 9600, 2000, 0.28],
    guanciale: ['Guanciale', 'g', 480, 700, 1.8],
    uova: ['Uova', 'pz', 80, 20, 35],
    riso: ['Riso Carnaroli', 'g', 12000, 2000, 0.4],
    manzo: ['Manzo', 'g', 8600, 1500, 2.6],
    pomodoro: ['Pomodori', 'g', 7000, 1500, 0.3],
    burrata: ['Burrata', 'pz', 32, 8, 220],
    prosecco: ['Prosecco', 'ml', 9000, 1500, 0.8],
    aperitivo: ['Aperitivo', 'ml', 4500, 700, 1.2],
    vino: ['Valpolicella', 'ml', 15000, 1500, 0.9],
    acqua: ['Acqua naturale', 'pz', 96, 24, 55],
    limonata: ['Limonata', 'pz', 0, 6, 150],
  };
  state.ingredients = Object.entries(stock).map(
    ([id, [name, unit, quantity, min, cost]]) => ({
      id,
      name,
      unit,
      min,
      cost,
      quantity,
    }),
  );
  for (const [vi, v] of VENUES.entries()) {
    for (let i = 1; i <= 12; i++)
      state.tables.push({
        id: `${v.id}-t${i}`,
        venueId: v.id,
        code: String(i).padStart(2, '0'),
        seats: i % 3 === 0 ? 6 : i % 3 === 1 ? 2 : 4,
        area: i <= 8 ? 'Sala principale' : 'Dehors',
        x: (i - 1) % 4,
        y: Math.floor((i - 1) / 4),
        status: 'free',
      });
    for (const ing of state.ingredients)
      state.movements.push({
        id: `opening-${v.id}-${ing.id}`,
        venueId: v.id,
        ingredientId: ing.id,
        quantity: ing.quantity,
        type: 'opening',
        source: 'Inventario iniziale demo',
        at: now - 86400000,
      });
    for (let i = 0; i < 7 + vi; i++) {
      const id = `history-${v.id}-${i}`,
        total = 1600 * (2 + (i % 3)) + (650 + vi * 50) * (1 + (i % 2));
      state.sessions.push({
        id,
        venueId: v.id,
        tableId: `${v.id}-t1`,
        covers: 2 + (i % 3),
        customerId: null,
        status: 'closed',
        openedAt: now - 3600000 * (7 - i * 0.4),
        closedAt: now - 1800000 * (7 - i * 0.4),
        total,
      });
      state.orders.push({
        id: `o-${id}`,
        venueId: v.id,
        sessionId: id,
        createdAt: now - 3600000 * (7 - i * 0.4),
        lines: [
          {
            id: `l-${id}`,
            productId: 'carbonara',
            name: 'Spaghettoni alla carbonara',
            quantity: 2 + (i % 3),
            price: 1600,
            department: 'kitchen',
            course: 'Primi',
            note: '',
            recipe: { pasta: 100, guanciale: 30, uova: 1 },
            status: 'served',
          },
          {
            id: `b-${id}`,
            productId: 'vino',
            name: 'Calice di Valpolicella',
            quantity: 1 + (i % 2),
            price: 650 + vi * 50,
            department: 'bar',
            course: 'Bevande',
            note: '',
            recipe: { vino: 125 },
            status: 'served',
          },
        ],
      });
      state.payments.push({
        id: `p-${id}`,
        venueId: v.id,
        sessionId: id,
        amount: total,
        method: i % 3 === 0 ? 'cash' : 'card',
        at: now - (i + 1) * 1800000,
      });
    }
  }
  const names = [
    'Alice Martini',
    'Lorenzo Bianchi',
    'Francesca Moretti',
    'Davide Greco',
    'Chiara Ferri',
    'Alessandro Costa',
    'Beatrice Ricci',
    'Matteo Romano',
    'Sara De Luca',
    'Tommaso Gallo',
  ];
  state.customers = names.slice(0, 5).map((name, i) => ({
    id: `c${i}`,
    name,
    phone: `+39 000 000 00${i}`,
    visits: 3 + i * 2,
    marketingConsent: i % 2 === 0,
  }));
  state.wallet = [
    {
      id: 'w1',
      customerId: 'c0',
      kind: 'credit',
      amount: 10000,
      source: 'Ricarica demo iniziale',
      at: now - 86400000,
    },
    {
      id: 'w2',
      customerId: 'c0',
      kind: 'bonus',
      amount: 1000,
      source: 'Bonus demo · non spendibile in questa fase',
      at: now - 86400000,
    },
    {
      id: 'w3',
      customerId: 'c0',
      kind: 'points',
      amount: 120,
      source: 'Punti iniziali demo',
      at: now - 86400000,
    },
  ];
  for (let i = 0; i < 10; i++)
    state.bookings.push({
      id: `booking-${i}`,
      venueId: 'centro',
      name: names[i],
      phone: `+39 000 000 0${i}0`,
      day,
      time: [
        '19:30',
        '19:30',
        '20:00',
        '20:00',
        '20:30',
        '20:30',
        '21:00',
        '21:00',
        '21:30',
        '21:30',
      ][i],
      covers: [2, 4, 2, 6, 4, 2, 4, 2, 6, 4][i],
      status:
        i === 1 || i === 5
          ? 'pending'
          : i === 9
            ? 'cancelled'
            : i < 4
              ? 'seated'
              : 'confirmed',
      tableId:
        i === 1 || i === 5 || i === 9
          ? null
          : `centro-t${{ 6: 11, 7: 10, 8: 12 }[i] ?? i + 1}`,
      customerId: i < 5 ? `c${i}` : null,
      note: i === 3 ? 'Preferenza sala interna' : '',
      createdAt: now - i * 600000,
    });
  for (const [i, t] of [1, 3, 4, 6, 8].entries()) {
    const table = state.tables.find((x) => x.id === `centro-t${t}`);
    table.status = i === 4 ? 'bill' : 'occupied';
    const s = {
      id: `active-${i}`,
      venueId: 'centro',
      tableId: table.id,
      covers: table.seats,
      customerId: i === 0 ? 'c0' : null,
      status: 'open',
      openedAt: now - (i + 1) * 600000,
    };
    state.sessions.push(s);
    const ids = i % 2 === 0 ? ['carbonara', 'acqua'] : ['burrata', 'spritz'];
    state.orders.push({
      id: `live-${i}`,
      venueId: 'centro',
      sessionId: s.id,
      createdAt: now - (i + 1) * 180000,
      lines: ids.map((pid, j) => {
        const p = PRODUCTS.find((p) => p.id === pid);
        return {
          id: `live-${i}-${j}`,
          productId: p.id,
          name: p.name,
          quantity: (i % 2) + 1,
          price: p.price,
          department: p.department,
          course: p.category,
          note: i === 1 && j === 0 ? 'Senza basilico' : '',
          recipe: p.recipe,
          status:
            i === 0
              ? 'sent'
              : i === 1
                ? 'preparing'
                : i === 2
                  ? 'ready'
                  : 'served',
        };
      }),
    });
  }
  // Seed historical theoretical consumption as traceable movements.
  for (const o of state.orders)
    for (const l of o.lines)
      if (['ready', 'served'].includes(l.status) && l.recipe)
        for (const [ingredientId, q] of Object.entries(l.recipe))
          state.movements.push({
            id: `cons-${l.id}-${ingredientId}`,
            venueId: o.venueId,
            ingredientId,
            quantity: -q * l.quantity,
            type: 'consumption',
            source: l.id,
            at: o.createdAt + 60000,
          });
  state.prints = state.orders
    .filter((o) => o.id.startsWith('live'))
    .flatMap((o) =>
      ['kitchen', 'bar'].map((department) => ({
        id: `print-${o.id}-${department}`,
        venueId: o.venueId,
        orderId: o.id,
        department,
        status:
          o.id === 'live-1' && department === 'kitchen' ? 'error' : 'sent',
        attempt: 1,
        at: o.createdAt,
      })),
    );
  state.alerts = [
    {
      id: 'cold-1',
      venueId: 'centro',
      name: 'Frigorifero preparazioni',
      type: 'temperature',
      value: 8.2,
      min: 0,
      max: 4,
      lastReading: now - 60000,
      status: 'open',
      note: 'Soglia dimostrativa configurata per questa apparecchiatura',
    },
    {
      id: 'cold-2',
      venueId: 'centro',
      name: 'Cella bevande',
      type: 'offline',
      value: null,
      min: 2,
      max: 8,
      lastReading: now - 5400000,
      status: 'open',
      note: 'Nessuna nuova lettura da 90 minuti',
    },
    {
      id: 'cold-3',
      venueId: 'centro',
      name: 'Cella ortaggi',
      type: 'normal',
      value: 4.1,
      min: 2,
      max: 6,
      lastReading: now - 30000,
      status: 'normal',
      note: 'Lettura generata dal simulatore',
    },
  ];
  state.transfers.push({
    id: 'transfer-demo',
    from: 'centro',
    to: 'navigli',
    ingredientId: 'pasta',
    quantity: 500,
    status: 'transit',
    at: now - 600000,
  });
  state.movements.push(
    {
      id: 'transfer-demo-out',
      venueId: 'centro',
      ingredientId: 'pasta',
      quantity: -500,
      type: 'transfer-out',
      source: 'transfer-demo',
      at: now - 600000,
    },
    {
      id: 'inventory-demo',
      venueId: 'centro',
      ingredientId: 'riso',
      quantity: -200,
      type: 'inventory',
      source: 'Conteggio fisico demo: differenza di 200 g',
      at: now - 300000,
    },
  );
  state.audit.push({
    id: 'audit-inventory-demo',
    user: 'Simone Riva',
    role: 'admin',
    venueId: 'centro',
    action: 'inventory',
    target: 'riso',
    reason: 'Conteggio fisico demo: differenza di 200 g',
    at: now - 300000,
  });
  state.notifications = [
    {
      id: 'n1',
      venueId: 'centro',
      title: 'Richiesta di prenotazione ricevuta',
      body: 'Lorenzo Bianchi · 4 persone · 19:30',
      status: 'simulated',
      at: now - 300000,
    },
  ];
  return state;
}
