import { useState } from 'react';
import {
  Package,
  Plus,
  ArrowLeftRight,
  ClipboardCheck,
  History,
  TriangleAlert,
} from 'lucide-react';
import { useApp } from '../context';
import { number, money, time } from '../api';
import {
  ActionForm,
  Badge,
  Empty,
  Field,
  Modal,
  PageTitle,
  Panel,
  Pagination,
  SearchBox,
  silently,
} from '../components/ui';
export function Inventory() {
  const { state: s, act, busy, navigate } = useApp();
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(0),
    [category, setCategory] = useState('all'),
    [tab, setTab] = useState('stock'),
    [modal, setModal] = useState<'receive' | 'inventory' | 'transfer' | null>(
      null,
    );
  const rows = (s.ingredients ?? []).filter(
      (i) =>
        i.name.toLowerCase().includes(query.toLowerCase()) &&
        (category === 'all' || i.catalogCategory === category),
    ),
    movements = [...(s.movements ?? [])].reverse().filter(
      (m) =>
        !query ||
        s.ingredients
          ?.find((i) => i.id === m.ingredientId)
          ?.name.toLowerCase()
          .includes(query.toLowerCase()),
    );
  const venueId = s.venueId === 'all' ? 'centro' : s.venueId;
  const types: Record<string, string> = {
    opening: 'Inventario iniziale',
    consumption: 'Consumo teorico',
    receipt: 'Ricezione',
    inventory: 'Rettifica inventario',
    'transfer-out': 'Trasferimento in uscita',
    'transfer-in': 'Trasferimento ricevuto',
  };
  return (
    <>
      <PageTitle
        eyebrow="MAGAZZINO E ACQUISTI"
        title="Sai cosa c’è. E cosa serve."
        description="Giacenze teoriche, fabbisogno e movimenti con un’origine verificabile."
        actions={
          <>
            <button className="button" onClick={() => navigate('documents')}>
              Bolle e documenti
            </button>
            <button className="button" onClick={() => setModal('inventory')}>
              <ClipboardCheck size={16} />
              Inventario
            </button>
            {s.user.role === 'admin' && (
              <button className="button" onClick={() => setModal('transfer')}>
                <ArrowLeftRight size={16} />
                Trasferisci
              </button>
            )}
            <button
              className="button primary"
              onClick={() => setModal('receive')}
            >
              <Plus size={16} />
              Ricevi merce
            </button>
          </>
        }
      />
      <div className="mini-metrics">
        <div>
          <Package size={19} />
          <span>Articoli a magazzino</span>
          <strong>{s.ingredients?.length ?? 0}</strong>
        </div>
        <div>
          <TriangleAlert size={19} />
          <span>Sotto soglia</span>
          <strong>
            {s.ingredients?.filter(
              (i) => i.quantity < i.min * (s.venueId === 'all' ? 5 : 1),
            ).length ?? 0}
          </strong>
        </div>
        <div>
          <History size={19} />
          <span>Movimenti tracciati</span>
          <strong>{s.movements?.length ?? 0}</strong>
        </div>
      </div>
      <Panel
        title="Controllo scorte"
        subtitle="Valorizzazione demo al costo unitario fisso iniziale · non è contabilità di magazzino."
      >
        <div className="toolbar">
          <div className="filter-tabs">
            {[
              ['stock', 'Giacenze'],
              ['movements', 'Movimenti'],
              ['transfers', 'Trasferimenti'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={tab === id ? 'active' : ''}
                onClick={() => {
                  setTab(id);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'stock' && (
            <select
              className="inventory-category"
              aria-label="Categoria magazzino"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">Tutte le categorie</option>
              <option value="kitchen">Cucina</option>
              <option value="beverage">Bevande / bar</option>
              <option value="supplies">Materiali di sala</option>
            </select>
          )}
          <SearchBox
            value={query}
            onChange={(q) => {
              setQuery(q);
              setPage(0);
            }}
            placeholder="Cerca articolo"
          />
        </div>
        {tab === 'stock' ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Articolo</th>
                    <th>Giacenza teorica</th>
                    <th>Fabbisogno aperto</th>
                    <th>Soglia minima</th>
                    <th>Costo unitario</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(page * 8, page * 8 + 8).map((i) => (
                    <tr key={i.id}>
                      <td>
                        <strong>{i.name}</strong>
                        <small className="block muted">
                          {i.id.toUpperCase()}
                        </small>
                      </td>
                      <td className="numeric">
                        {number(i.quantity)} {i.unit}
                      </td>
                      <td>
                        {number(i.expected)} {i.unit}
                      </td>
                      <td>
                        {number(i.min * (s.venueId === 'all' ? 5 : 1))} {i.unit}
                      </td>
                      <td>
                        {i.costMissing
                          ? 'Da definire'
                          : new Intl.NumberFormat('it-IT', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 5,
                            }).format(i.cost / 100)}{' '}
                        €/{i.unit}
                      </td>
                      <td>
                        <Badge
                          status={
                            i.quantity < i.min * (s.venueId === 'all' ? 5 : 1)
                              ? 'pending'
                              : 'free'
                          }
                        >
                          {i.quantity < 0
                            ? 'Giacenza negativa'
                            : i.quantity < i.min * (s.venueId === 'all' ? 5 : 1)
                              ? 'Sotto soglia'
                              : 'Disponibile'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && <Empty title="Nessun articolo trovato" />}
            <Pagination count={rows.length} page={page} setPage={setPage} />
          </>
        ) : tab === 'movements' ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Ora</th>
                    <th>Articolo</th>
                    <th>Tipo</th>
                    <th>Quantità</th>
                    <th>Origine</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(page * 8, page * 8 + 8).map((m) => (
                    <tr key={m.id}>
                      <td>{time(m.at)}</td>
                      <td>
                        {
                          s.ingredients?.find((i) => i.id === m.ingredientId)
                            ?.name
                        }
                      </td>
                      <td>{types[m.type] ?? m.type}</td>
                      <td
                        className={
                          m.quantity < 0 ? 'danger-text' : 'success-text'
                        }
                      >
                        {m.quantity > 0 ? '+' : ''}
                        {number(m.quantity)}
                      </td>
                      <td className="source-cell" title={m.source}>
                        {m.documentId ? (
                          <a
                            className="text-button"
                            href={`?view=documents&venue=${m.venueId}&document=${m.documentId}`}
                          >
                            Apri bolla
                          </a>
                        ) : (
                          m.source
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              count={movements.length}
              page={page}
              setPage={setPage}
            />
          </>
        ) : (
          <div className="transfer-list">
            {s.transfers?.length ? (
              s.transfers.map((t) => (
                <div className="transfer-row" key={t.id}>
                  <ArrowLeftRight size={18} />
                  <div>
                    <strong>
                      {
                        s.ingredients?.find((i) => i.id === t.ingredientId)
                          ?.name
                      }{' '}
                      · {number(t.quantity)}
                    </strong>
                    <small>
                      {s.venues.find((v) => v.id === t.from)?.name ?? t.from} →{' '}
                      {s.venues.find((v) => v.id === t.to)?.name ?? t.to}
                    </small>
                  </div>
                  <Badge status={t.status} />
                  {t.status === 'transit' &&
                    (s.user.role === 'admin' || t.to === s.venueId) && (
                      <button
                        className="button small"
                        disabled={busy}
                        onClick={() =>
                          silently(
                            act('transfer', {
                              venueId: t.to,
                              transferId: t.id,
                            }),
                          )
                        }
                      >
                        Conferma ricezione
                      </button>
                    )}
                </div>
              ))
            ) : (
              <Empty
                title="Nessun trasferimento"
                description="Un trasferimento passa da uscita a transito, poi a ricezione."
              />
            )}
          </div>
        )}
      </Panel>
      {modal && (
        <Modal
          title={
            modal === 'receive'
              ? 'Ricevi merce'
              : modal === 'inventory'
                ? 'Conteggio e rettifica'
                : 'Trasferimento tra sedi'
          }
          description={
            modal === 'receive'
              ? 'Un documento già registrato non può generare un secondo carico. Demo: un articolo per documento.'
              : modal === 'inventory'
                ? 'Inserisci il conteggio fisico fittizio. La differenza viene registrata con la tua motivazione.'
                : 'La quantità esce dalla sede di origine e rimane in transito fino alla ricezione.'
          }
          onClose={() => setModal(null)}
        >
          <ActionForm
            label={
              modal === 'receive'
                ? 'Conferma ricezione'
                : modal === 'inventory'
                  ? 'Approva rettifica'
                  : 'Invia in transito'
            }
            onCancel={() => setModal(null)}
            onSubmit={async (f) => {
              const common = {
                venueId: String(f.get('venueId')),
                ingredientId: f.get('ingredientId'),
                quantity: Number(f.get('quantity')),
              };
              await act(modal, {
                ...common,
                ...(modal === 'receive'
                  ? { supplier: f.get('supplier'), document: f.get('document') }
                  : modal === 'inventory'
                    ? { reason: f.get('reason') }
                    : { to: f.get('to') }),
              });
              setModal(null);
            }}
          >
            <div className="form-grid">
              <Field
                label={modal === 'transfer' ? 'Sede di origine' : 'Sede'}
                name="venueId"
              >
                <select id="venueId" name="venueId" defaultValue={venueId}>
                  {s.venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Articolo" name="ingredientId">
                <select id="ingredientId" name="ingredientId">
                  {s.ingredients?.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={
                  modal === 'inventory'
                    ? 'Quantità fisica contata'
                    : 'Quantità nell’unità dell’articolo'
                }
                name="quantity"
                type="number"
                min="0"
                step="any"
                placeholder="0"
              />
              {modal === 'transfer' && (
                <Field label="Sede di destinazione" name="to">
                  <select id="to" name="to" defaultValue="navigli">
                    {s.venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {modal === 'receive' && (
                <>
                  <Field
                    label="Fornitore demo"
                    name="supplier"
                    maxLength={60}
                    placeholder="Es. Dispensa Demo"
                  />
                  <Field
                    label="Numero documento demo"
                    name="document"
                    maxLength={60}
                    placeholder="Es. DDT-001"
                  />
                </>
              )}
            </div>
            {modal === 'inventory' && (
              <Field
                label="Motivazione della rettifica"
                name="reason"
                maxLength={200}
                placeholder="Es. differenza rilevata nel conteggio demo"
              />
            )}
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
