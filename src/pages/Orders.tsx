import { useEffect, useState } from 'react';
import {
  Plus,
  Minus,
  Send,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Check,
  X,
} from 'lucide-react';
import { useApp } from '../context';
import { money } from '../api';
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
    [confirm, setConfirm] = useState(false);
  const session = sessions.find((se) => se.id === sid) ?? sessions[0],
    draft = drafts[session?.id ?? ''] ?? [],
    table = s.tables.find((t) => t.id === session?.tableId),
    cats = ['Tutti', ...new Set(s.products.map((p) => p.category))],
    products = s.products.filter(
      (p) =>
        (category === 'Tutti' || p.category === category) &&
        p.name.toLowerCase().includes(query.toLowerCase()),
    );
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
    <>
      <PageTitle
        eyebrow="PALMARE DI SALA"
        title="Un ordine fatto bene."
        description="Solo i nuovi prodotti vengono inviati. Le comande precedenti restano nello storico."
        actions={
          <button className="button" onClick={() => navigate('tables')}>
            Vai ai tavoli
          </button>
        }
      />
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
                    <div
                      className={`product-art art-${p.category.toLowerCase()}`}
                    >
                      <UtensilsCrossed size={30} strokeWidth={1} />
                      <span>{p.category}</span>
                    </div>
                    <div className="product-content">
                      <div className="product-category">
                        {p.department === 'bar' ? 'BAR' : 'CUCINA'}
                      </div>
                      <h3>{p.name}</h3>
                      <p>{p.description}</p>
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
            <aside id="order-summary" className="order-summary panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">NUOVA COMANDA</span>
                  <h2>Tavolo {table?.code}</h2>
                </div>
                <ShoppingBag size={20} />
              </div>
              {draft.length ? (
                <>
                  <div className="draft-lines">
                    {draft.map((l) => {
                      const p = s.products.find((p) => p.id === l.productId)!;
                      return (
                        <div className="draft-line" key={l.id}>
                          <div>
                            <strong>{p.name}</strong>
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
                            <button
                              className="note-link"
                              onClick={() => setEditing(l.id)}
                            >
                              {l.note || 'Aggiungi nota di preparazione'}
                            </button>
                            <div className="quantity">
                              <button
                                aria-label={`Riduci ${p.name}`}
                                onClick={() => change(p.id, -1, l.id)}
                              >
                                <Minus size={13} />
                              </button>
                              <span>{l.quantity}</span>
                              <button
                                aria-label={`Aumenta ${p.name}`}
                                onClick={() => change(p.id, 1, l.id)}
                                disabled={l.quantity >= 30}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                          <strong>{money(p.price * l.quantity)}</strong>
                        </div>
                      );
                    })}
                  </div>
                  <div className="order-total">
                    <span>Totale nuova comanda</span>
                    <strong>{money(draftTotal)}</strong>
                  </div>
                  <button
                    className="button primary full"
                    disabled={busy}
                    onClick={() => setConfirm(true)}
                  >
                    <Send size={16} />
                    Invia ai reparti
                  </button>
                  <p className="small muted">
                    Invio dimostrativo · nessuna stampa reale
                  </p>
                </>
              ) : (
                <Empty
                  title="Componi la comanda"
                  description="Tocca + accanto a un prodotto per aggiungerlo."
                />
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
                  <p className="muted small">Non ci sono comande precedenti.</p>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
      {draft.length > 0 && (
        <div className="mobile-order-bar">
          <div>
            <strong>
              {draft.reduce((a, l) => a + l.quantity, 0)} prodotti
            </strong>
            <span>{money(draftTotal)}</span>
          </div>
          <a className="button primary" href="#order-summary">
            Vedi comanda
          </a>
        </div>
      )}
      {editing && (
        <Modal
          title="Nota di preparazione"
          description="Una nota non cambia prezzo o ricetta. Le varianti con effetti su ingredienti o prezzo sono da progettare nel pilota."
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
                    ? { ...l, note: String(f.get('note') ?? '') }
                    : l,
                ),
              }));
              setEditing(null);
            }}
          >
            <Field
              label="Nota per il reparto"
              name="note"
              maxLength={200}
              defaultValue={draft.find((l) => l.id === editing)?.note}
              placeholder="Es. portare insieme al primo"
            />
          </ActionForm>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={`Invia la comanda · Tavolo ${table?.code}`}
          description="I prodotti saranno suddivisi tra cucina e bar. Puoi aggiungere altre consumazioni con una nuova comanda."
          onClose={() => setConfirm(false)}
        >
          <ActionForm
            label="Conferma invio ai reparti"
            onCancel={() => setConfirm(false)}
            onSubmit={async () => {
              await act('send', { sessionId: session.id, lines: draft });
              setDrafts((prev) => ({ ...prev, [session.id]: [] }));
              setConfirm(false);
            }}
          >
            <ul className="round-confirmation">
              {draft.map((l) => (
                <li key={l.id}>
                  {l.quantity} ×{' '}
                  {s.products.find((p) => p.id === l.productId)?.name} ·{' '}
                  <strong>{serviceRoundLabel(l.serviceRound)}</strong>
                </li>
              ))}
            </ul>
            <div className="info-box">
              {draft.reduce((a, l) => a + l.quantity, 0)} prodotti ·{' '}
              {money(draftTotal)} · cucina e/o bar secondo il menu.
            </div>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
