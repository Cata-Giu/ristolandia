import { useState } from 'react';
import { LayoutGrid, List, Users, ArrowRight, Check } from 'lucide-react';
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
} from '../components/ui';
import type { Table } from '../types';
export function Tables() {
  const { state: s, act, busy, navigate } = useApp();
  const [area, setArea] = useState('Sala principale'),
    [layout, setLayout] = useState('map'),
    [modal, setModal] = useState<Table | null>(null);
  const current = s.venueId === 'all' ? 'centro' : s.venueId;
  const tables = s.tables.filter(
      (t) => t.venueId === current && t.area === area,
    ),
    active = s.sessions.find(
      (se) => se.tableId === modal?.id && se.status === 'open',
    );
  const canOrder = ['admin', 'manager', 'waiter'].includes(s.user.role);
  return (
    <>
      <PageTitle
        eyebrow="REGIA DELLA SALA"
        title="Spazio a un buon servizio."
        description="Una vista chiara dei tavoli, dall’accoglienza al riassetto."
        actions={
          <div className="segmented">
            <button
              className={layout === 'map' ? 'active' : ''}
              onClick={() => setLayout('map')}
            >
              <LayoutGrid size={16} />
              Pianta
            </button>
            <button
              className={layout === 'list' ? 'active' : ''}
              onClick={() => setLayout('list')}
            >
              <List size={16} />
              Elenco
            </button>
          </div>
        }
      />
      {s.venueId === 'all' && (
        <div className="info-box">
          La pianta mostra La Corte · Centro. Seleziona una sede nella barra
          superiore per cambiarla.
        </div>
      )}
      <Panel
        title="La sala"
        subtitle={`${s.venues.find((v) => v.id === current)?.name} · ${s.tables.filter((t) => t.venueId === current).length} tavoli`}
        action={
          <div className="segmented">
            {['Sala principale', 'Dehors'].map((a) => (
              <button
                key={a}
                className={a === area ? 'active' : ''}
                onClick={() => setArea(a)}
              >
                {a}
              </button>
            ))}
          </div>
        }
      >
        <div className="table-legend">
          {['free', 'occupied', 'bill', 'cleaning'].map((t) => (
            <Badge key={t} status={t} />
          ))}
        </div>
        {layout === 'map' ? (
          <div className="floor-plan">
            <div className="plan-label">
              {area === 'Dehors' ? 'DEHORS · AREA ESTERNA' : 'SALA PRINCIPALE'}
            </div>
            <div className="floor-grid">
              {tables.map((t) => {
                const se = s.sessions.find(
                  (se) => se.tableId === t.id && se.status === 'open',
                );
                const reserved = s.bookings.some(
                  (b) =>
                    b.tableId === t.id &&
                    b.day === s.day &&
                    b.status === 'confirmed',
                );
                return (
                  <button
                    key={t.id}
                    className={`floor-table table-${t.status} ${reserved && t.status === 'free' ? 'table-reserved' : ''}`}
                    onClick={() => setModal(t)}
                    aria-label={`Tavolo ${t.code}, ${t.seats} posti, ${reserved && t.status === 'free' ? 'riservato' : t.status}`}
                  >
                    <span className="chair chair-top" />
                    <span className="chair chair-bottom" />
                    <span className="table-number">{t.code}</span>
                    <span className="table-seats">
                      <Users size={13} />
                      {se?.covers ?? t.seats}
                    </span>
                    <span className="table-state">
                      {reserved && t.status === 'free'
                        ? 'Riservato'
                        : t.status === 'occupied'
                          ? 'Al tavolo'
                          : t.status === 'free'
                            ? 'Libero'
                            : t.status === 'bill'
                              ? 'Al conto'
                              : 'Riassetto'}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="plan-entry">
              <span />
              INGRESSO
              <span />
            </div>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tavolo</th>
                  <th>Posti</th>
                  <th>Stato</th>
                  <th>Sessione</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => {
                  const se = s.sessions.find(
                    (se) => se.tableId === t.id && se.status === 'open',
                  );
                  return (
                    <tr key={t.id}>
                      <td>
                        <strong>Tavolo {t.code}</strong>
                      </td>
                      <td>{t.seats}</td>
                      <td>
                        <Badge status={t.status} />
                      </td>
                      <td>{se ? `Dalle ${time(se.openedAt)}` : '—'}</td>
                      <td>
                        <button
                          className="button small"
                          onClick={() => setModal(t)}
                        >
                          Apri dettagli
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {modal && (
        <Modal
          title={`Tavolo ${modal.code}`}
          description={`${modal.area} · ${modal.seats} posti`}
          onClose={() => setModal(null)}
        >
          {active ? (
            <>
              <div className="table-detail">
                <Badge status={modal.status} />
                <p>
                  {active.covers} ospiti · aperto alle {time(active.openedAt)}
                </p>
              </div>
              {canOrder ? (
                <button
                  className="button primary full"
                  onClick={() => {
                    sessionStorage.setItem('ristolandia-session', active.id);
                    navigate('orders');
                    setModal(null);
                  }}
                >
                  Prendi un’ordinazione
                  <ArrowRight size={16} />
                </button>
              ) : (
                <p className="info-box">
                  Il tavolo è occupato. Le ordinazioni vengono gestite dalla
                  sala.
                </p>
              )}
            </>
          ) : modal.status === 'cleaning' ? (
            <ActionForm
              label="Conferma riassetto"
              onCancel={() => setModal(null)}
              onSubmit={async () => {
                await act('clean', { tableId: modal.id });
                setModal(null);
              }}
            >
              <p>
                Conferma che il tavolo è stato riassettato prima di renderlo
                disponibile.
              </p>
            </ActionForm>
          ) : (
            <ActionForm
              label="Apri tavolo senza prenotazione"
              onCancel={() => setModal(null)}
              onSubmit={async (f) => {
                await act('open', {
                  tableId: modal.id,
                  covers: Number(f.get('covers')),
                });
                setModal(null);
              }}
            >
              <Field
                label="Coperti"
                name="covers"
                type="number"
                min={1}
                max={modal.seats}
                defaultValue={modal.seats}
              />
              <p className="muted small">
                Per gli ospiti prenotati registra l’arrivo dalla sezione
                Prenotazioni. Il server verifica le assegnazioni prima di aprire
                il tavolo.
              </p>
            </ActionForm>
          )}
        </Modal>
      )}
    </>
  );
}
