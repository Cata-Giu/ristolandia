import { useState } from 'react';
import {
  CreditCard,
  Wallet,
  Check,
  Receipt,
  Users,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context';
import { money, time } from '../api';
import {
  ActionForm,
  Badge,
  Empty,
  Field,
  Modal,
  PageTitle,
  Panel,
} from '../components/ui';
import type { Session } from '../types';
export function Cashier() {
  const { state: s, act } = useApp();
  const [selected, setSelected] = useState<string | null>(null),
    [pay, setPay] = useState<Session | null>(null),
    [history, setHistory] = useState(false);
  const sessions = s.sessions.filter((se) =>
      history ? se.status === 'closed' : se.status === 'open',
    ),
    se = sessions.find((se) => se.id === selected) ?? sessions[0],
    lines = s.orders
      .filter((o) => o.sessionId === se?.id)
      .flatMap((o) => o.lines),
    payments = (s.payments ?? []).filter((p) => p.sessionId === se?.id),
    customer = s.customers?.find((c) => c.id === se?.customerId);
  return (
    <>
      <PageTitle
        eyebrow="POSTAZIONE CASSA"
        title="Chiudi il conto, con chiarezza."
        description="Pagamenti parziali e misti, credito e saldo residuo sempre distinti."
        actions={
          <Badge status="simulated">
            Nessun pagamento o documento fiscale reale
          </Badge>
        }
      />
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
              description="Le nuove sessioni compariranno qui."
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
        >
          {se ? (
            <>
              <div className="bill-lines">
                {lines.map((l) => (
                  <div
                    className={l.status === 'cancelled' ? 'cancelled' : ''}
                    key={l.id}
                  >
                    <span>
                      {l.quantity} × {l.name}
                      {l.status === 'cancelled' && <Badge status="cancelled" />}
                    </span>
                    <strong>{money((l.price ?? 0) * l.quantity)}</strong>
                  </div>
                ))}
              </div>
              {!lines.length && (
                <Empty
                  title="Nessuna consumazione"
                  description="Il conto si aggiornerà con le comande della sala."
                />
              )}
              <div className="bill-totals">
                <div>
                  <span>Consumazioni</span>
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
              {!history && (
                <button
                  className="button primary full"
                  disabled={se.due <= 0}
                  onClick={() => setPay(se)}
                >
                  <CreditCard size={17} />
                  Registra pagamento simulato
                </button>
              )}
              <div className="payment-history">
                <h3>Registrazioni di questo conto</h3>
                {payments.length ? (
                  payments.map((p) => (
                    <div key={p.id}>
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
      {pay && (
        <Modal
          title="Registra pagamento simulato"
          description={`Residuo: ${money(pay.due)}. Puoi inserire un importo parziale e completare con un altro metodo.`}
          onClose={() => setPay(null)}
        >
          <ActionForm
            label="Registra pagamento simulato"
            onCancel={() => setPay(null)}
            onSubmit={async (f) => {
              const raw = String(f.get('amount')).replace(',', '.');
              const amount = Math.round(Number(raw) * 100);
              await act('pay', {
                sessionId: pay.id,
                amount,
                method: f.get('method'),
              });
              setPay(null);
            }}
          >
            <div className="form-grid">
              <Field
                label="Importo in euro"
                name="amount"
                inputMode="decimal"
                defaultValue={(pay.due / 100).toFixed(2)}
              />
              <Field label="Metodo simulato" name="method">
                <select id="method" name="method">
                  <option value="card">Carta · simulata</option>
                  <option value="cash">Contanti · simulati</option>
                  <option value="credit" disabled={!pay.customerId}>
                    Credito pagato del cliente
                  </option>
                </select>
              </Field>
            </div>
            <div className="info-box">
              Alla chiusura, il tavolo passa a “Da riassettare”. Regola demo: 1
              punto per euro intero di consumazioni, attribuito una sola volta
              al cliente identificato.
            </div>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
