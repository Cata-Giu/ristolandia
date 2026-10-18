import { useState } from 'react';
import {
  CreditCard,
  Wallet,
  ArrowRight,
  Plus,
  Pencil,
  Percent,
  Trash2,
  Coins,
} from 'lucide-react';
import { useApp } from '../context';
import { money, time } from '../api';
import { lineAmounts, parseEuro, countTotal } from '../../shared/finance.mjs';
import {
  ActionForm,
  Badge,
  Empty,
  Field,
  Modal,
  PageTitle,
  Panel,
} from '../components/ui';
import { DenominationInput, ChangeBreakdown } from '../components/CashTools';
import {
  ServiceRoundSelect,
  serviceRoundLabel,
} from '../components/ServiceRoundSelect';
import { CashPayment } from './CashPayment';
import type { Line, Session } from '../types';
function EditBillLine({ line, onClose }: { line: Line; onClose: () => void }) {
  const { act } = useApp();
  const [quantity, setQuantity] = useState(line.billQuantity ?? line.quantity),
    [price, setPrice] = useState(((line.price ?? 0) / 100).toFixed(2)),
    [kind, setKind] = useState(line.discount?.kind ?? 'none'),
    [value, setValue] = useState(
      ((line.discount?.value ?? 0) / 100).toFixed(2),
    );
  const unitPrice = parseEuro(price),
    discount = { kind, value: kind === 'none' ? 0 : parseEuro(value) },
    preview = lineAmounts({
      ...line,
      billQuantity: quantity,
      price: unitPrice,
      discount: discount as Line['discount'],
    });
  return (
    <Modal
      title={`Modifica voce · ${line.name}`}
      description="La variazione conserva lo storico. Uno sconto in euro si applica al totale della riga; lo sconto percentuale viene arrotondato al centesimo."
      onClose={onClose}
    >
      <ActionForm
        label="Salva correzione"
        onCancel={onClose}
        onSubmit={async (f) => {
          await act('adjust-line', {
            lineId: line.id,
            quantity,
            price: unitPrice,
            discount,
            reason: f.get('reason'),
            expectedLineVersion: line.adjustments?.length ?? 0,
          });
          onClose();
        }}
      >
        <div className="form-grid">
          <Field
            label="Quantità da addebitare"
            name="quantity"
            type="number"
            min={1}
            max={30}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <Field
            label="Prezzo unitario in euro"
            name="unitPrice"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Field label="Sconto sulla riga" name="discountKind">
            <select
              id="discountKind"
              name="discountKind"
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              <option value="none">Nessuno sconto</option>
              <option value="percent">Sconto percentuale (%)</option>
              <option value="euro">Sconto in euro (€)</option>
            </select>
          </Field>
          {kind !== 'none' && (
            <Field
              label={
                kind === 'percent'
                  ? 'Percentuale di sconto'
                  : 'Sconto totale in euro'
              }
              name="discountValue"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
        </div>
        <div className="bill-preview">
          <span>Nuovo totale riga</span>
          <strong>
            {Number.isFinite(preview.total) ? money(preview.total) : '—'}
          </strong>
        </div>
        <Field
          label="Motivazione della correzione"
          name="reason"
          maxLength={200}
        />
        <p className="muted small">
          Se la preparazione è già pronta o servita, la quantità cambia solo sul
          conto: i consumi restano registrati. Per nuove pietanze usa “Aggiungi
          voce”. Prima della preparazione la quantità viene aggiornata anche al
          reparto.
        </p>
      </ActionForm>
    </Modal>
  );
}
function AddBillLine({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const { state: s, act } = useApp();
  const [round, setRound] = useState(1);
  return (
    <Modal
      title="Aggiungi voce al conto"
      description="Il prodotto viene inserito come nuova comanda e inviato al reparto competente, mantenendo ricetta e tracciamento."
      onClose={onClose}
    >
      <ActionForm
        label="Aggiungi e invia al reparto"
        onCancel={onClose}
        onSubmit={async (f) => {
          await act('send', {
            sessionId: session.id,
            lines: [
              {
                productId: f.get('productId'),
                quantity: Number(f.get('quantity')),
                note: f.get('note'),
                serviceRound: round,
              },
            ],
          });
          onClose();
        }}
      >
        <Field label="Prodotto del menu" name="productId">
          <select id="productId" name="productId">
            {s.products
              .filter((p) => p.available)
              .map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name} · {money(p.price)}
                </option>
              ))}
          </select>
        </Field>
        <Field
          label="Quantità"
          name="quantity"
          type="number"
          min={1}
          max={30}
          defaultValue={1}
        />
        <ServiceRoundSelect
          label="Uscita della nuova voce"
          value={round}
          onChange={setRound}
        />
        <Field
          label="Nota per il reparto (facoltativa)"
          name="note"
          maxLength={200}
        />
      </ActionForm>
    </Modal>
  );
}
export function Cashier() {
  const { state: s, act } = useApp();
  const [selected, setSelected] = useState<string | null>(null),
    [pay, setPay] = useState<Session | null>(null),
    [history, setHistory] = useState(false),
    [edit, setEdit] = useState<Line | null>(null),
    [cancel, setCancel] = useState<Line | null>(null),
    [add, setAdd] = useState<Session | null>(null),
    [closing, setClosing] = useState<Session | null>(null),
    [fund, setFund] = useState(false),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [drawerId, setDrawerId] = useState(s.drawers?.[0]?.venueId ?? 'centro');
  const sessions = s.sessions.filter((se) =>
      history ? se.status === 'closed' : se.status === 'open',
    ),
    se = sessions.find((se) => se.id === selected) ?? sessions[0],
    lines = s.orders
      .filter((o) => o.sessionId === se?.id)
      .flatMap((o) => o.lines),
    payments = (s.payments ?? []).filter((p) => p.sessionId === se?.id),
    customer = s.customers?.find((c) => c.id === se?.customerId),
    drawer = s.drawers?.find((d) => d.venueId === drawerId) ?? s.drawers?.[0],
    tips = (s.payments ?? []).reduce((a, p) => a + (p.tip ?? 0), 0),
    tax = (s.payments ?? []).reduce((a, p) => a + (p.tipTax ?? 0), 0);
  return (
    <>
      <PageTitle
        eyebrow="POSTAZIONE CASSA"
        title="Chiudi il conto, con chiarezza."
        description="Voci, sconti, pagamenti e contanti tracciati nello stesso servizio."
        actions={
          <Badge status="simulated">
            Nessun pagamento o documento fiscale reale
          </Badge>
        }
      />
      <Panel
        title="Fondo cassa e mance"
        subtitle="Disponibilità per taglio: solo conteggi inseriti e pagamenti tracciati. Nessuna disponibilità presunta."
        className="cash-overview"
        action={
          <button
            className="button"
            onClick={() => {
              setCounts({});
              setFund(true);
            }}
          >
            <Coins size={16} />
            Aggiungi fondo contanti
          </button>
        }
      >
        <div className="cash-overview-body">
          <div>
            <label className="field">
              <span>Sede del cassetto</span>
              <select
                aria-label="Sede del cassetto"
                value={drawer?.venueId ?? ''}
                onChange={(e) => setDrawerId(e.target.value)}
              >
                {s.drawers?.map((d) => (
                  <option key={d.venueId} value={d.venueId}>
                    {s.venues.find((v) => v.id === d.venueId)?.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="bill-preview">
              <span>Contanti tracciati disponibili</span>
              <strong>{money(drawer?.total ?? 0)}</strong>
            </div>
            <ChangeBreakdown
              counts={drawer?.counts ?? {}}
              emptyLabel="Nessun taglio ancora contato"
            />
            {!!drawer?.untracked && (
              <p className="cash-inline-warning">
                {money(drawer.untracked)} di incassi precedenti senza dettaglio
                dei tagli: esclusi dal suggerimento del resto.
              </p>
            )}
          </div>
          <div className="tips-summary">
            <span>Mance registrate nella selezione</span>
            <strong>{money(tips)}</strong>
            <small>Imposta stimata storicizzata: {money(tax)}</small>
            <small>Netto stimato: {money(tips - tax)}</small>
            <p>
              Aliquota per le prossime mance:{' '}
              {s.tipTaxBasisPoints == null
                ? 'non configurata nelle Impostazioni'
                : (s.tipTaxBasisPoints / 100).toLocaleString('it-IT') + '%'}
              . Solo stima dimostrativa da validare fiscalmente.
            </p>
          </div>
        </div>
      </Panel>
      {!!drawer?.movements.length && (
        <details className="drawer-ledger">
          <summary>
            Ultimi movimenti del cassetto · {drawer.movements.length}{' '}
            registrazioni
          </summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ora</th>
                  <th>Operatore</th>
                  <th>Tipo</th>
                  <th>Variazione contanti</th>
                </tr>
              </thead>
              <tbody>
                {drawer.movements.map((m) => (
                  <tr key={m.id}>
                    <td>{time(m.at)}</td>
                    <td>{m.user}</td>
                    <td>
                      {m.type === 'fund'
                        ? 'Fondo / versamento'
                        : 'Pagamento al netto del resto'}
                    </td>
                    <td>{money(countTotal(m.counts))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <div className="overview-tabs">
        <button
          className={!history ? 'active' : ''}
          onClick={() => {
            setHistory(false);
            setSelected(null);
          }}
        >
          Conti aperti
        </button>
        <button
          className={history ? 'active' : ''}
          onClick={() => {
            setHistory(true);
            setSelected(null);
          }}
        >
          Conti chiusi
        </button>
      </div>
      <div className="cashier-layout">
        <Panel
          title={history ? 'Storico conti' : 'Da riscuotere'}
          subtitle={`${sessions.length} sessioni tavolo`}
        >
          <div className="session-list">
            {sessions.map((session) => (
              <button
                key={session.id}
                className={`session-card ${session.id === se?.id ? 'active' : ''}`}
                onClick={() => setSelected(session.id)}
              >
                <div>
                  <strong>
                    Tavolo{' '}
                    {s.tables.find((t) => t.id === session.tableId)?.code}
                  </strong>
                  <small>
                    {s.venues
                      .find((v) => v.id === session.venueId)
                      ?.name.replace('La Corte · ', '')}{' '}
                    · {session.covers} coperti
                  </small>
                </div>
                <div>
                  <strong>
                    {money(history ? session.total : session.due)}
                  </strong>
                  <small>{history ? 'Chiuso' : 'Residuo'}</small>
                </div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
          {!sessions.length && (
            <Empty
              title={history ? 'Nessun conto chiuso' : 'Nessun conto aperto'}
            />
          )}
        </Panel>
        <Panel
          title={
            se
              ? `Conto · Tavolo ${s.tables.find((t) => t.id === se.tableId)?.code}`
              : 'Dettaglio conto'
          }
          subtitle={
            se
              ? `${se.covers} coperti · apertura ${time(se.openedAt)}`
              : undefined
          }
          action={
            se && !history ? (
              <button className="button small" onClick={() => setAdd(se)}>
                <Plus size={14} />
                Aggiungi voce
              </button>
            ) : undefined
          }
        >
          {se ? (
            <>
              <div className="bill-lines">
                {lines.map((l) => {
                  const amount = lineAmounts(l);
                  return (
                    <div
                      className={`bill-line-detail ${l.status === 'cancelled' ? 'cancelled' : ''}`}
                      key={l.id}
                    >
                      <div className="bill-line-main">
                        <span>
                          <strong>
                            {l.billQuantity ?? l.quantity} × {l.name}
                          </strong>
                          <small>
                            {serviceRoundLabel(l.serviceRound)} ·{' '}
                            {money(l.price ?? 0)} ciascuno
                          </small>
                          {amount.discount > 0 && (
                            <small>
                              Sconto riga: −{money(amount.discount)}{' '}
                              {l.discount?.kind === 'percent'
                                ? `(${(l.discount.value / 100).toLocaleString('it-IT')}%)`
                                : ''}
                            </small>
                          )}
                          {l.billQuantity != null &&
                            l.billQuantity !== l.quantity && (
                              <small>
                                Quantità preparata: {l.quantity} · nessun
                                reintegro automatico
                              </small>
                            )}
                          {l.status === 'cancelled' && (
                            <Badge status="cancelled" />
                          )}
                        </span>
                        <strong>
                          {money(l.status === 'cancelled' ? 0 : amount.total)}
                        </strong>
                      </div>
                      {!history && l.status !== 'cancelled' && (
                        <div className="bill-line-actions">
                          <button
                            className="button small"
                            onClick={() => setEdit(l)}
                          >
                            <Pencil size={13} />
                            Modifica
                          </button>
                          <button
                            className="button small"
                            onClick={() => setEdit(l)}
                          >
                            <Percent size={13} />
                            Sconto € / %
                          </button>
                          <button
                            className="button small danger-outline"
                            onClick={() => setCancel(l)}
                          >
                            <Trash2 size={13} />
                            Annulla voce
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {!lines.length && (
                <Empty
                  title="Nessuna consumazione"
                  description="Aggiungi una voce dalla cassa o invia una comanda dalla sala."
                />
              )}
              <div className="bill-totals">
                <div>
                  <span>Consumazioni dopo sconti</span>
                  <strong>{money(se.total)}</strong>
                </div>
                <div>
                  <span>Già registrato</span>
                  <strong>{money(se.paid)}</strong>
                </div>
                <div className="bill-due">
                  <span>Residuo da pagare</span>
                  <strong>{money(se.due)}</strong>
                </div>
              </div>
              {customer && (
                <div className="customer-credit">
                  <Wallet size={20} />
                  <div>
                    <strong>{customer.name}</strong>
                    <small>
                      Credito pagato {money(customer.credit)} · bonus{' '}
                      {money(customer.bonus)} separato e non spendibile
                    </small>
                  </div>
                </div>
              )}
              {!history &&
                (se.due > 0 ? (
                  <button
                    className="button primary full"
                    onClick={() => setPay(se)}
                  >
                    <CreditCard size={17} />
                    Registra pagamento simulato
                  </button>
                ) : (
                  <button
                    className="button primary full"
                    onClick={() => setClosing(se)}
                  >
                    Chiudi conto saldato
                  </button>
                ))}
              <div className="payment-history">
                <h3>Registrazioni di questo conto</h3>
                {payments.length ? (
                  payments.map((p) => (
                    <div className="payment-entry" key={p.id}>
                      <div>
                        <Badge status="simulated">
                          {p.method === 'cash'
                            ? 'Contanti'
                            : p.method === 'card'
                              ? 'Carta'
                              : 'Credito pagato'}
                        </Badge>
                        <span>{time(p.at)}</span>
                        <strong>{money(p.amount)}</strong>
                      </div>
                      {!!p.tip && (
                        <small>
                          Mancia {money(p.tip)} · imposta stimata{' '}
                          {money(p.tipTax ?? 0)} · aliquota{' '}
                          {((p.tipTaxBasisPoints ?? 0) / 100).toLocaleString(
                            'it-IT',
                          )}
                          %
                        </small>
                      )}
                      {p.method === 'cash' && p.changeCounts && (
                        <small>
                          Ricevuti {money(p.cashReceived ?? 0)} · resto{' '}
                          {money(p.changeAmount ?? 0)}{' '}
                          <ChangeBreakdown counts={p.changeCounts} />
                        </small>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="muted small">Nessun pagamento registrato.</p>
                )}
              </div>
            </>
          ) : (
            <Empty title="Seleziona un conto" />
          )}
        </Panel>
      </div>
      {pay && <CashPayment session={pay} onClose={() => setPay(null)} />}{' '}
      {edit && <EditBillLine line={edit} onClose={() => setEdit(null)} />}{' '}
      {add && <AddBillLine session={add} onClose={() => setAdd(null)} />}{' '}
      {cancel && (
        <Modal
          title={`Annulla voce · ${cancel.name}`}
          description="La voce resta nello storico. Ingredienti già consumati non vengono rimessi in magazzino."
          onClose={() => setCancel(null)}
        >
          <ActionForm
            label="Conferma annullamento voce"
            onCancel={() => setCancel(null)}
            onSubmit={async (f) => {
              await act('cancel', {
                lineId: cancel.id,
                reason: f.get('reason'),
              });
              setCancel(null);
            }}
          >
            <Field
              label="Motivazione dell’annullamento"
              name="reason"
              maxLength={200}
            />
          </ActionForm>
        </Modal>
      )}
      {closing && (
        <Modal
          title="Chiudi conto saldato"
          description="Il conto non ha residui: non verrà creato un pagamento fittizio. Il tavolo passerà a Da riassettare."
          onClose={() => setClosing(null)}
        >
          <ActionForm
            label="Chiudi conto saldato"
            onCancel={() => setClosing(null)}
            onSubmit={async (f) => {
              await act('close-account', {
                sessionId: closing.id,
                reason: f.get('reason'),
              });
              setClosing(null);
            }}
          >
            <Field
              label="Motivazione della chiusura"
              name="reason"
              defaultValue="Conto saldato o azzerato dopo correzioni"
              maxLength={200}
            />
          </ActionForm>
        </Modal>
      )}
      {fund && (
        <Modal
          title="Aggiungi fondo contanti"
          description="Registra solo i nuovi tagli che stai aggiungendo ora al cassetto della demo. Non reinserire quelli già conteggiati nel saldo. Il fondo non è una vendita o un incasso."
          onClose={() => setFund(false)}
        >
          <ActionForm
            label="Registra fondo per taglio"
            onCancel={() => setFund(false)}
            onSubmit={async (f) => {
              await act('cash-fund', {
                venueId: drawer?.venueId,
                counts,
                reason: f.get('reason'),
              });
              setFund(false);
            }}
          >
            <p className="muted small">
              {s.venues.find((v) => v.id === drawer?.venueId)?.name}
            </p>
            <DenominationInput
              id="fund"
              label="Tagli del fondo"
              counts={counts}
              onChange={setCounts}
            />
            <Field
              label="Motivazione del versamento"
              name="reason"
              defaultValue="Fondo iniziale demo"
              maxLength={200}
            />
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
