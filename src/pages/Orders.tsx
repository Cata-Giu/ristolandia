import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Send,
  GlassWater,
  ChevronDown,
  ChevronUp,
  Info,
  Users,
  UtensilsCrossed,
  Check,
  X,
} from 'lucide-react';
import { useApp } from '../context';
import { money } from '../api';
import { OrderDraftLine } from '../components/OrderDraftLine';
import type { Product } from '../types';
import rules from '../../shared/service-rounds.json';
import {
  ServiceRoundSelect,
  serviceRoundLabel,
} from '../components/ServiceRoundSelect';
import {
  ActionForm,
  Badge,
  Empty,
  Field,
  Modal,
  PageTitle,
  Panel,
  SearchBox,
  silently,
} from '../components/ui';
interface Draft {
  id: string;
  serviceRound: number;
  productId: string;
  quantity: number;
  note: string;
}
const menuFilters = [
  ['ayce', 'AYCE'],
  ['glutenFree', 'Gluten free'],
  ['lactoseFree', 'Lactose free'],
  ['vegan', 'Vegan'],
  ['vegetarian', 'Vegetarian'],
] as const;
export function Orders() {
  const { state: s, act, busy, navigate } = useApp();
  const sessions = s.sessions.filter((se) => se.status === 'open'),
    [sid, setSid] = useState(
      sessionStorage.getItem('ristolandia-session') ?? sessions[0]?.id ?? '',
    ),
    [category, setCategory] = useState('Tutti'),
    [selectedRound, setSelectedRound] = useState(rules.default),
    [query, setQuery] = useState(''),
    [drafts, setDrafts] = useState<Record<string, Draft[]>>(() => {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem('ristolandia-drafts-' + s.user.id) ?? '{}',
        );
        return Object.fromEntries(
          Object.entries(saved).map(([key, rows]) => [
            key,
            (rows as Draft[]).map((l) => ({
              ...l,
              id: l.id ?? crypto.randomUUID(),
              serviceRound: l.serviceRound ?? rules.default,
            })),
          ]),
        );
      } catch {
        return {};
      }
    }),
    [editing, setEditing] = useState<string | null>(null),
    [confirm, setConfirm] = useState<Draft[] | null>(null),
    [drinkOnly, setDrinkOnly] = useState(false),
    [confirmationTable, setConfirmationTable] = useState({ id: '', code: '' }),
    [filters, setFilters] = useState<string[]>([]),
    [details, setDetails] = useState<Product | null>(null),
    [sheet, setSheet] = useState<'collapsed' | 'open' | 'expanded'>('open'),
    [roundCount, setRoundCount] = useState(3);
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);
  const session = sessions.find((se) => se.id === sid) ?? sessions[0],
    draft = drafts[session?.id ?? ''] ?? [],
    table = s.tables.find((t) => t.id === session?.tableId),
    cats = ['Tutti', ...new Set(s.products.map((p) => p.category))],
    products = s.products.filter(
      (p) =>
        (category === 'Tutti' || p.category === category) &&
        p.name.toLowerCase().includes(query.toLowerCase()) &&
        filters.every((f) =>
          f === 'ayce' ? p.ayce === true : p.dietary?.includes(f),
        ),
    );
  const rounds = Array.from(
    {
      length: Math.min(
        rules.max,
        Math.max(
          roundCount,
          selectedRound,
          ...draft.map((l) => l.serviceRound),
        ),
      ),
    },
    (_, i) => i + 1,
  );
  const drinks = draft.filter(
    (l) => s.products.find((p) => p.id === l.productId)?.department === 'bar',
  );
  function prepareSend(onlyDrinks = false) {
    if (!session) return;
    setConfirmationTable({ id: session.id, code: table?.code ?? '' });
    setDrinkOnly(onlyDrinks);
    setConfirm(structuredClone(onlyDrinks ? drinks : draft));
  }
  const sent = s.orders
    .filter((o) => o.sessionId === session?.id)
    .flatMap((o) => o.lines);
  function change(pid: string, delta: number, draftId?: string) {
    if (!session) return;
    setDrafts((prev) => {
      const copy = [...(prev[session.id] ?? [])],
        i = copy.findIndex((l) =>
          draftId
            ? l.id === draftId
            : l.productId === pid && l.serviceRound === selectedRound,
        );
      if (i === -1 && delta > 0)
        copy.push({
          id: crypto.randomUUID(),
          serviceRound: selectedRound,
          productId: pid,
          quantity: 1,
          note: '',
        });
      else if (i >= 0) {
        copy[i] = {
          ...copy[i],
          quantity: Math.min(30, copy[i].quantity + delta),
        };
        if (copy[i].quantity <= 0) copy.splice(i, 1);
      }
      return { ...prev, [session.id]: copy };
    });
  }
  function removeDraft(id: string) {
    if (!session) return;
    setDrafts((prev) => ({
      ...prev,
      [session.id]: (prev[session.id] ?? []).filter((l) => l.id !== id),
    }));
  }
  useEffect(() => {
    sessionStorage.setItem(
      'ristolandia-drafts-' + s.user.id,
      JSON.stringify(drafts),
    );
  }, [drafts, s.user.id]);
  const draftTotal = draft.reduce(
    (a, l) =>
      a +
      (s.products.find((p) => p.id === l.productId)?.price ?? 0) * l.quantity,
    0,
  );
  return (
    <div className={`handheld-page sheet-${sheet}`}>
      <div className="handheld-intro">
        <PageTitle
          eyebrow="PALMARE DI SALA"
          title="Un ordine fatto bene."
          description="Solo i nuovi prodotti vengono inviati. Le comande precedenti restano nello storico."
        />
      </div>
      {!session ? (
        <Panel>
          <Empty
            title="Nessun tavolo aperto"
            description="Apri un tavolo dalla sala o registra l’arrivo di una prenotazione."
          >
            <button
              className="button primary"
              onClick={() => navigate('tables')}
            >
              Apri la sala
            </button>
          </Empty>
        </Panel>
      ) : (
        <>
          <div className="handheld-context">
            <h1>Tavolo {table?.code}</h1>
            <span>{session.covers} coperti</span>
            <span>{s.venues.find((v) => v.id === session.venueId)?.name}</span>
          </div>
          <div className="order-table-select">
            <label htmlFor="order-session">Tavolo in servizio</label>
            <select
              id="order-session"
              value={session.id}
              onChange={(e) => {
                setSid(e.target.value);
                sessionStorage.setItem('ristolandia-session', e.target.value);
              }}
            >
              {sessions.map((se) => (
                <option key={se.id} value={se.id}>
                  Tavolo {s.tables.find((t) => t.id === se.tableId)?.code} ·{' '}
                  {s.venues.find((v) => v.id === se.venueId)?.name} ·{' '}
                  {se.covers} coperti
                </option>
              ))}
            </select>
            <span className="inline-icon">
              <Users size={16} />
              {session.covers} coperti
            </span>
          </div>
          <div className="order-layout">
            <div>
              <div className="catalog-toolbar">
                <SearchBox
                  value={query}
                  onChange={setQuery}
                  placeholder="Cerca nel menu"
                />
              </div>
              <div
                className="menu-filters"
                role="group"
                aria-label="Filtri del menu"
              >
                {menuFilters.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="switch"
                    aria-checked={filters.includes(key)}
                    onClick={() =>
                      setFilters((prev) =>
                        prev.includes(key)
                          ? prev.filter((f) => f !== key)
                          : [...prev, key],
                      )
                    }
                  >
                    <span className="filter-switch" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="round-picker">
                <ServiceRoundSelect
                  label="Uscita per i prossimi prodotti"
                  value={selectedRound}
                  onChange={setSelectedRound}
                />
                <p>
                  Scegli quando servire i piatti, indipendentemente dalla
                  categoria del menu.
                </p>
              </div>
              <div className="category-tabs">
                {cats.map((c) => (
                  <button
                    key={c}
                    className={category === c ? 'active' : ''}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="product-grid">
                {products.map((p) => (
                  <article
                    key={p.id}
                    className={`product-card ${!p.available ? 'unavailable' : ''}`}
                  >
                    <button
                      className="product-details-button"
                      aria-label={`Informazioni su ${p.name}`}
                      onClick={() => setDetails(p)}
                    >
                      <div
                        className={`product-art art-${p.category.toLowerCase()}`}
                      >
                        <UtensilsCrossed size={24} strokeWidth={1.5} />
                        <span>{p.category}</span>
                      </div>
                      <h3>{p.name}</h3>
                      <span className="product-info-hint">
                        <Info size={12} /> Dettagli
                      </span>
                    </button>
                    <div className="product-content">
                      <div className="product-bottom">
                        <strong>{money(p.price)}</strong>
                        <button
                          className="add-button"
                          aria-label={`Aggiungi ${p.name}`}
                          disabled={!p.available || busy}
                          onClick={() => change(p.id, 1)}
                        >
                          {p.available ? <Plus size={20} /> : <X size={17} />}
                        </button>
                      </div>
                      {!p.available && <small>Temporaneamente esaurito</small>}
                    </div>
                  </article>
                ))}
              </div>
              {!products.length && (
                <Empty
                  title="Prodotto non trovato"
                  description="Prova un altro nome o cambia categoria."
                />
              )}
            </div>
            <aside
              id="order-summary"
              aria-label="Comanda del tavolo"
              className={`order-summary panel order-sheet ${sheet}`}
            >
              <div
                className="sheet-grip"
                onPointerDown={(e) => {
                  dragged.current = false;
                  dragStart.current = e.clientY;
                  (e.target as HTMLElement)
                    .closest('button')
                    ?.setPointerCapture(e.pointerId);
                }}
                onPointerCancel={() => {
                  dragStart.current = null;
                }}
                onPointerUp={(e) => {
                  if (dragStart.current != null) {
                    const distance = e.clientY - dragStart.current;
                    dragged.current = Math.abs(distance) > 30;
                    if (distance > 30) setSheet('collapsed');
                    else if (distance < -30)
                      setSheet(sheet === 'collapsed' ? 'open' : 'expanded');
                    dragStart.current = null;
                  }
                }}
              >
                <button
                  aria-label={
                    sheet === 'collapsed' ? 'Apri comanda' : 'Riduci comanda'
                  }
                  aria-expanded={sheet !== 'collapsed'}
                  onClick={() => {
                    if (dragged.current) {
                      dragged.current = false;
                      return;
                    }
                    setSheet(sheet === 'collapsed' ? 'open' : 'collapsed');
                  }}
                >
                  <span />
                  <ChevronDown size={16} />
                </button>
              </div>
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">NUOVA COMANDA</span>
                  <h2>Tavolo {table?.code}</h2>
                </div>
                <span className="sheet-count" aria-live="polite">
                  {draft.reduce((a, l) => a + l.quantity, 0)}{' '}
                  {draft.reduce((a, l) => a + l.quantity, 0) === 1
                    ? 'prodotto'
                    : 'prodotti'}{' '}
                  · {money(draftTotal)}
                </span>
                <button
                  className="icon-button sheet-expand"
                  aria-label={
                    sheet === 'expanded'
                      ? 'Riduci altezza comanda'
                      : 'Espandi comanda'
                  }
                  onClick={() =>
                    setSheet(sheet === 'expanded' ? 'open' : 'expanded')
                  }
                >
                  {sheet === 'expanded' ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronUp size={18} />
                  )}
                </button>
              </div>
              <div
                className="round-tabs"
                role="group"
                aria-label="Portata per i prossimi prodotti"
              >
                {rounds.map((round) => (
                  <button
                    key={round}
                    aria-label={`${round}ª portata`}
                    aria-pressed={selectedRound === round}
                    onClick={() => {
                      setSelectedRound(round);
                      if (sheet === 'collapsed') setSheet('open');
                    }}
                  >
                    {' '}
                    {round}
                    <span>ª portata</span>
                    <small>
                      {draft
                        .filter((l) => l.serviceRound === round)
                        .reduce((a, l) => a + l.quantity, 0) || ''}
                    </small>
                  </button>
                ))}
                <button
                  aria-label="Aggiungi portata"
                  disabled={rounds.length >= rules.max}
                  onClick={() => {
                    const next = rounds.length + 1;
                    setRoundCount(next);
                    setSelectedRound(next);
                    if (sheet === 'collapsed') setSheet('open');
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>
              <div
                className="sheet-scroll"
                tabIndex={0}
                role="region"
                aria-label="Righe della comanda e storico"
              >
                {draft.length ? (
                  <>
                    <div className="draft-lines">
                      {draft.map((l) => {
                        const p = s.products.find((p) => p.id === l.productId)!;
                        return (
                          <OrderDraftLine
                            key={l.id}
                            name={p.name}
                            price={p.price}
                            quantity={l.quantity}
                            note={l.note}
                            current={l.serviceRound === selectedRound}
                            onEdit={() => setEditing(l.id)}
                            onQuantity={(delta) => change(p.id, delta, l.id)}
                            onRemove={() => removeDraft(l.id)}
                          >
                            <ServiceRoundSelect
                              label={`Uscita di ${p.name}`}
                              value={l.serviceRound}
                              onChange={(round) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [session.id]: (prev[session.id] ?? []).map(
                                    (row) =>
                                      row.id === l.id
                                        ? { ...row, serviceRound: round }
                                        : row,
                                  ),
                                }))
                              }
                            />
                          </OrderDraftLine>
                        );
                      })}
                    </div>
                    <div className="order-total">
                      <span>Totale nuova comanda</span>
                      <strong>{money(draftTotal)}</strong>
                    </div>
                  </>
                ) : (
                  <Empty
                    title="Componi la comanda"
                    description="Tocca + accanto a un prodotto per aggiungerlo."
                  />
                )}
                {!!draft.length &&
                  !draft.some((l) => l.serviceRound === selectedRound) && (
                    <p className="round-empty">
                      Nessun prodotto nella {selectedRound}ª portata. Scegli un
                      piatto dal menu.
                    </p>
                  )}
                <div className="already-sent">
                  <h3>
                    Già inviati <span>{sent.length}</span>
                  </h3>
                  {sent.length ? (
                    sent.map((l) => (
                      <div className="sent-line" key={l.id}>
                        <div>
                          <strong>
                            {l.quantity} × {l.name}
                          </strong>
                          <small>{serviceRoundLabel(l.serviceRound)}</small>
                          {l.note && <small>{l.note}</small>}
                          <Badge status={l.status} />
                        </div>
                        {l.status === 'ready' && (
                          <button
                            className="button small"
                            disabled={busy}
                            onClick={() =>
                              silently(
                                act('line', { lineId: l.id, status: 'served' }),
                              )
                            }
                          >
                            <Check size={14} />
                            Servito
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="muted small">
                      Non ci sono comande precedenti.
                    </p>
                  )}
                </div>
              </div>
              <div className="sheet-actions">
                <button
                  className="button drinks-send"
                  disabled={busy || !drinks.length}
                  onClick={() => prepareSend(true)}
                >
                  <GlassWater size={17} />
                  Invia bevande
                  {drinks.length
                    ? ` (${drinks.reduce((a, l) => a + l.quantity, 0)})`
                    : ''}
                </button>
                <button
                  className="button primary"
                  disabled={busy || !draft.length}
                  onClick={() => prepareSend()}
                >
                  <Send size={16} />
                  <span>Invia ai reparti</span>
                </button>
              </div>
            </aside>
          </div>
        </>
      )}
      {editing && (
        <Modal
          title={`Nota · ${s.products.find((p) => p.id === draft.find((l) => l.id === editing)?.productId)?.name ?? 'Prodotto'}`}
          description="Indicazioni per la cucina o il bar."
          onClose={() => setEditing(null)}
        >
          <ActionForm
            label="Salva nota"
            onCancel={() => setEditing(null)}
            onSubmit={async (f) => {
              setDrafts((prev) => ({
                ...prev,
                [session.id]: (prev[session.id] ?? []).map((l) =>
                  l.id === editing
                    ? {
                        ...l,
                        serviceRound: Number(f.get('serviceRound')),
                        note: String(f.get('note') ?? ''),
                      }
                    : l,
                ),
              }));
              setEditing(null);
            }}
          >
            <Field label="Portata della voce" name="serviceRound">
              <select
                id="serviceRound"
                name="serviceRound"
                defaultValue={String(
                  draft.find((l) => l.id === editing)?.serviceRound ??
                    selectedRound,
                )}
              >
                {Array.from({ length: rules.max }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {serviceRoundLabel(i + 1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Nota per il reparto"
              name="note"
              maxLength={200}
              defaultValue={draft.find((l) => l.id === editing)?.note}
              placeholder="Es. portare insieme al primo"
            />
          </ActionForm>
          <button
            className="button danger full draft-note-remove"
            onClick={() => {
              removeDraft(editing);
              setEditing(null);
            }}
          >
            Rimuovi dalla comanda
          </button>
        </Modal>
      )}
      {details && (
        <Modal title={details.name} onClose={() => setDetails(null)}>
          <div className="dish-details">
            <p>{details.description}</p>
            <h3>Ingredienti</h3>
            <p>
              {details.ingredients?.join(', ') ||
                'Da verificare con la cucina.'}
            </p>
            <h3>Allergeni</h3>
            <p>
              {details.allergens
                ? details.allergens.join(', ') ||
                  'Nessuno dichiarato nella scheda demo.'
                : 'Informazioni non disponibili: chiedi alla cucina.'}
            </p>
            <h3>Preparazione</h3>
            <p>{details.preparation || 'Da completare con la cucina.'}</p>
            <p className="info-box">
              Scheda dimostrativa. Verificare sempre ingredienti e
              contaminazioni con il reparto in caso di allergie. I filtri non
              certificano l’assenza di allergeni.
            </p>
            <button
              className="button primary full"
              disabled={!details.available || busy || !session}
              onClick={() => {
                change(details.id, 1);
                setDetails(null);
              }}
            >
              Aggiungi alla {selectedRound}ª portata · {money(details.price)}
            </button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={`${drinkOnly ? 'Invia bevande' : 'Invia la comanda'} · Tavolo ${confirmationTable.code}`}
          description="I prodotti saranno suddivisi tra cucina e bar. Puoi aggiungere altre consumazioni con una nuova comanda."
          onClose={() => setConfirm(null)}
        >
          <ActionForm
            label={
              drinkOnly ? 'Conferma invio bevande' : 'Conferma invio ai reparti'
            }
            onCancel={() => setConfirm(null)}
            onSubmit={async () => {
              await act('send', {
                sessionId: confirmationTable.id,
                lines: confirm,
              });
              const sentIds = new Set(confirm.map((l) => l.id));
              setDrafts((prev) => ({
                ...prev,
                [confirmationTable.id]: (
                  prev[confirmationTable.id] ?? []
                ).filter((l) => !sentIds.has(l.id)),
              }));
              setConfirm(null);
            }}
          >
            <ul className="round-confirmation">
              {confirm.map((l) => (
                <li key={l.id}>
                  {l.quantity} ×{' '}
                  {s.products.find((p) => p.id === l.productId)?.name} ·{' '}
                  <strong>{serviceRoundLabel(l.serviceRound)}</strong>
                  {l.note && <small>{l.note}</small>}
                </li>
              ))}
            </ul>
            <div className="info-box">
              {confirm.reduce((a, l) => a + l.quantity, 0)} prodotti ·{' '}
              {money(
                confirm.reduce(
                  (a, l) =>
                    a +
                    (s.products.find((p) => p.id === l.productId)?.price ?? 0) *
                      l.quantity,
                  0,
                ),
              )}{' '}
              · cucina e/o bar secondo il menu.
            </div>
          </ActionForm>
        </Modal>
      )}
    </div>
  );
}
