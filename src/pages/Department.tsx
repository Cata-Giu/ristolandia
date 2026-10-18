import { useState } from 'react';
import {
  ChefHat,
  GlassWater,
  Clock3,
  Printer,
  RotateCw,
  ArrowRight,
  Check,
  TriangleAlert,
} from 'lucide-react';
import { useApp } from '../context';
import { time } from '../api';
import {
  ActionForm,
  Badge,
  Empty,
  Field,
  Modal,
  PageTitle,
  Panel,
  silently,
} from '../components/ui';
import type { Print, Line } from '../types';
export function Department({ department }: { department: 'kitchen' | 'bar' }) {
  const { state: s, act, busy } = useApp();
  const [filter, setFilter] = useState('active'),
    [print, setPrint] = useState<Print | null>(null),
    [cancel, setCancel] = useState<Line | null>(null);
  const orders = s.orders.filter((o) =>
    o.lines.some(
      (l) =>
        l.department === department &&
        (filter === 'all' || !['served', 'cancelled'].includes(l.status)),
    ),
  );
  const jobs = s.prints.filter((p) => p.department === department),
    Icon = department === 'kitchen' ? ChefHat : GlassWater;
  const printOrder = s.orders.find((o) => o.id === print?.orderId),
    printSession = s.sessions.find((se) => se.id === printOrder?.sessionId),
    printTable = s.tables.find((t) => t.id === printSession?.tableId);
  const canCancel = ['admin', 'manager'].includes(s.user.role);
  return (
    <>
      <PageTitle
        eyebrow={department === 'kitchen' ? 'MONITOR CUCINA' : 'MONITOR BAR'}
        title={
          department === 'kitchen'
            ? 'Il prossimo piatto, al momento giusto.'
            : 'Ogni bevanda, al suo tavolo.'
        }
        description="Le comande del tuo reparto, con portate, note e tempi di attesa."
        actions={
          <div className="segmented">
            <button
              className={filter === 'active' ? 'active' : ''}
              onClick={() => setFilter('active')}
            >
              Da lavorare
            </button>
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              Tutte
            </button>
          </div>
        }
      />
      <div className="department-status">
        <span className="inline-icon">
          <Icon size={20} />
          <strong>{orders.length} comande</strong>
        </span>
        <Badge status="simulated">Stampanti simulate</Badge>
        <span className="muted small">
          I consumi teorici si registrano al passaggio a “Pronta”.
        </span>
      </div>
      {orders.length ? (
        <div className="kitchen-grid">
          {orders.map((o) => {
            const se = s.sessions.find((se) => se.id === o.sessionId),
              table = s.tables.find((t) => t.id === se?.tableId),
              elapsed = Math.max(
                0,
                Math.floor((Date.now() - o.createdAt) / 60000),
              );
            return (
              <article
                className={`ticket ${elapsed > 15 ? 'ticket-late' : ''}`}
                key={o.id}
              >
                <header>
                  <div>
                    <span className="eyebrow">
                      {s.venues
                        .find((v) => v.id === o.venueId)
                        ?.name.replace('La Corte · ', '')}
                    </span>
                    <h2>
                      Tavolo {table?.code ?? '—'}
                      <small>{se?.covers} coperti</small>
                    </h2>
                  </div>
                  <span className={`ticket-time ${elapsed > 15 ? 'late' : ''}`}>
                    <Clock3 size={14} />
                    {elapsed} min
                  </span>
                </header>
                <div className="ticket-meta">
                  <span>#{o.id.slice(0, 8)}</span>
                  <span>Inviata alle {time(o.createdAt)}</span>
                </div>
                <div className="ticket-lines">
                  {o.lines
                    .filter((l) => l.department === department)
                    .map((l) => (
                      <div
                        className={`ticket-line ${['served', 'cancelled'].includes(l.status) ? 'done' : ''}`}
                        key={l.id}
                      >
                        <span className="ticket-quantity">{l.quantity}</span>
                        <div className="ticket-item">
                          <span className="eyebrow">{l.course}</span>
                          <h3>{l.name}</h3>
                          {l.note && (
                            <p className="ticket-note">Nota: {l.note}</p>
                          )}
                          {l.status === 'cancelled' && (
                            <p className="ticket-note">
                              Annullamento: {l.reason}
                            </p>
                          )}
                          <div className="ticket-actions">
                            <Badge status={l.status} />
                            {['sent', 'preparing'].includes(l.status) && (
                              <button
                                className={`button small ${l.status === 'preparing' ? 'primary' : ''}`}
                                disabled={busy || se?.status !== 'open'}
                                onClick={() =>
                                  silently(
                                    act('line', {
                                      lineId: l.id,
                                      status:
                                        l.status === 'sent'
                                          ? 'preparing'
                                          : 'ready',
                                    }),
                                  )
                                }
                              >
                                {l.status === 'sent'
                                  ? 'Inizia'
                                  : 'Segna pronta'}
                                {l.status === 'sent' ? (
                                  <ArrowRight size={14} />
                                ) : (
                                  <Check size={14} />
                                )}
                              </button>
                            )}
                            {canCancel &&
                              l.status !== 'cancelled' &&
                              se?.status === 'open' && (
                                <button
                                  className="text-button danger-text"
                                  onClick={() => setCancel(l)}
                                >
                                  Annulla
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <footer>
                  <Printer size={14} />
                  <span>
                    {jobs.filter((p) => p.orderId === o.id).length} lavori di
                    stampa simulati
                  </span>
                  <button
                    className="text-button"
                    onClick={() =>
                      setPrint(
                        jobs.filter((p) => p.orderId === o.id).at(-1) ?? null,
                      )
                    }
                  >
                    Anteprima
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <Panel>
          <Empty
            title="Reparto in pari"
            description="Le nuove comande di questo reparto compariranno qui."
          />
        </Panel>
      )}
      <Panel
        title="Coda di stampa"
        subtitle="Anteprime e tentativi simulati. Una ristampa non genera consumi o vendite."
        className="print-queue"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Comanda</th>
                <th>Invio</th>
                <th>Stato simulato</th>
                <th>Tentativo</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {jobs
                .slice(-8)
                .reverse()
                .map((j) => (
                  <tr key={j.id}>
                    <td>
                      #{j.orderId.slice(0, 8)}
                      {j.reprint && <small className="block">RISTAMPA</small>}
                    </td>
                    <td>{time(j.at)}</td>
                    <td>
                      <Badge status={j.status}>
                        {j.status === 'sent'
                          ? 'Inviata · simulato'
                          : j.status === 'error'
                            ? 'Errore simulato'
                            : 'In coda · simulato'}
                      </Badge>
                    </td>
                    <td>{j.attempt}</td>
                    <td>
                      <button
                        className="button small"
                        onClick={() => setPrint(j)}
                      >
                        <Printer size={14} />
                        Anteprima
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!jobs.length && <Empty title="Nessuna stampa in coda" />}
      </Panel>
      {print && (
        <Modal
          title="Anteprima della comanda"
          description="Simulazione: nessun dispositivo reale è collegato. “Inviata” non significa stampa fisica confermata."
          onClose={() => setPrint(null)}
        >
          <div className="receipt">
            <div className="receipt-center">
              <strong>
                LA CORTE · {department === 'kitchen' ? 'CUCINA' : 'BAR'}
              </strong>
              <p>*** {print.reprint ? 'RISTAMPA' : 'DEMO'} ***</p>
              <h2>TAVOLO {printTable?.code}</h2>
              <p>
                {time(print.at)} · #{print.orderId.slice(0, 8)}
              </p>
            </div>
            <hr />
            {printOrder?.lines
              .filter((l) => l.department === department)
              .map((l) => (
                <div className="receipt-item" key={l.id}>
                  <strong>
                    {l.quantity} × {l.name}
                  </strong>
                  <small>{l.course}</small>
                  {l.note && <p>NOTA: {l.note}</p>}
                  {l.status === 'cancelled' && <p>ANNULLATA · {l.reason}</p>}
                </div>
              ))}
            <hr />
            <p className="receipt-center">NON FISCALE · SIMULAZIONE</p>
          </div>
          <ActionForm
            label="Crea ristampa simulata"
            onCancel={() => setPrint(null)}
            onSubmit={async () => {
              await act('reprint', { printId: print.id });
              setPrint(null);
            }}
          >
            <p className="small muted">
              La ristampa mantiene il riferimento alla comanda originale.
            </p>
          </ActionForm>
        </Modal>
      )}
      {cancel && (
        <Modal
          title="Annulla una preparazione"
          description="I consumi teorici già registrati non vengono ripristinati automaticamente."
          onClose={() => setCancel(null)}
        >
          <ActionForm
            label="Annulla preparazione"
            onCancel={() => setCancel(null)}
            onSubmit={async (f) => {
              await act('cancel', {
                lineId: cancel.id,
                reason: f.get('reason'),
              });
              setCancel(null);
            }}
          >
            <p>
              <strong>
                {cancel.quantity} × {cancel.name}
              </strong>
            </p>
            <Field
              label="Motivazione obbligatoria"
              name="reason"
              maxLength={200}
            />
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
