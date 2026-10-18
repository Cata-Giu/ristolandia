import { useState } from 'react';
import {
  Plus,
  CalendarDays,
  Users,
  Check,
  ArrowRight,
  LayoutGrid,
} from 'lucide-react';
import { useApp } from '../context';
import { date, statusLabel } from '../api';
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
} from '../components/ui';
import type { Booking } from '../types';
export function Bookings() {
  const { state: s, act, busy, navigate } = useApp();
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [page, setPage] = useState(0),
    [modal, setModal] = useState<Booking | 'new' | null>(null);
  const rows = s.bookings
    .filter(
      (b) =>
        (filter === 'all' || b.status === filter) &&
        `${b.name} ${b.time}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time));
  const counts = [
    { name: 'Prenotazioni', n: s.bookings.length, icon: CalendarDays },
    {
      name: 'Coperti previsti',
      n: s.bookings
        .filter((b) => !['cancelled', 'no-show'].includes(b.status))
        .reduce((a, b) => a + b.covers, 0),
      icon: Users,
    },
    {
      name: 'Da confermare',
      n: s.bookings.filter((b) => b.status === 'pending').length,
      icon: Check,
    },
  ];
  const pending = modal && modal !== 'new' ? modal : null;
  const available = pending
    ? [...s.tables]
        .sort(
          (a, b) => Number(b.status === 'free') - Number(a.status === 'free'),
        )
        .filter(
          (t) =>
            t.venueId === pending.venueId &&
            t.seats >= pending.covers &&
            !s.bookings.some(
              (b) =>
                b.id !== pending.id &&
                b.tableId === t.id &&
                b.day === pending.day &&
                Math.abs(
                  Number(b.time.slice(0, 2)) * 60 +
                    Number(b.time.slice(3)) -
                    (Number(pending.time.slice(0, 2)) * 60 +
                      Number(pending.time.slice(3))),
                ) < 120 &&
                !['cancelled', 'completed', 'no-show'].includes(b.status),
            ),
        )
    : [];
  return (
    <>
      <PageTitle
        eyebrow="ACCOGLIENZA"
        title="Ogni ospite, al posto giusto."
        description="Dalla prima richiesta all’arrivo in sala."
        actions={
          <>
            <button className="button" onClick={() => navigate('tables')}>
              <LayoutGrid size={16} />
              Pianta tavoli
            </button>
            <button className="button primary" onClick={() => setModal('new')}>
              <Plus size={17} />
              Nuova prenotazione
            </button>
          </>
        }
      />
      <div className="mini-metrics">
        {counts.map((c) => (
          <div key={c.name}>
            <c.icon size={19} />
            <span>{c.name}</span>
            <strong>{c.n}</strong>
          </div>
        ))}
      </div>
      <Panel
        title="Agenda delle prenotazioni"
        subtitle={`Giornata demo: ${date(s.day)} · sono visibili anche le richieste future`}
      >
        <div className="toolbar">
          <div className="filter-tabs">
            {[
              ['all', 'Tutte'],
              ['pending', 'Da confermare'],
              ['confirmed', 'Confermate'],
              ['seated', 'Al tavolo'],
              ['completed', 'Completate'],
            ].map(([id, label]) => (
              <button
                className={filter === id ? 'active' : ''}
                key={id}
                onClick={() => {
                  setFilter(id);
                  setPage(0);
                }}
              >
                {label}
                {id === 'pending' && (
                  <span>
                    {s.bookings.filter((b) => b.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <SearchBox
            value={query}
            onChange={(q) => {
              setQuery(q);
              setPage(0);
            }}
            placeholder="Cerca nome o orario"
          />
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ospite</th>
                  <th>Giorno e ora</th>
                  <th>Coperti</th>
                  <th>Tavolo</th>
                  <th>Stato</th>
                  <th>
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(page * 8, page * 8 + 8).map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="person-cell">
                        <span className="avatar small-avatar">
                          {b.name
                            .split(' ')
                            .map((x) => x[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        <div>
                          <strong>{b.name}</strong>
                          <small>
                            {b.note || 'Nessuna richiesta particolare'}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{b.time}</strong>
                      <small className="block muted">
                        {date(b.day, { day: 'numeric', month: 'short' })}
                      </small>
                    </td>
                    <td>
                      <span className="inline-icon">
                        <Users size={14} />
                        {b.covers}
                      </span>
                    </td>
                    <td>
                      {s.tables.find((t) => t.id === b.tableId)?.code ??
                        'Da assegnare'}
                    </td>
                    <td>
                      <Badge status={b.status} />
                    </td>
                    <td>
                      {b.status === 'pending' ? (
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() => setModal(b)}
                        >
                          Conferma
                          <ArrowRight size={14} />
                        </button>
                      ) : b.status === 'confirmed' ? (
                        <button
                          className="button small primary"
                          disabled={busy || b.day !== s.day}
                          onClick={() => setModal(b)}
                        >
                          Registra arrivo
                        </button>
                      ) : (
                        <span className="muted small">
                          {statusLabel[b.status]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Nessuna prenotazione trovata"
            description="Modifica la ricerca o inserisci una nuova richiesta."
          />
        )}
        <Pagination count={rows.length} page={page} setPage={setPage} />
      </Panel>
      <p className="quiet-note">
        <CalendarDays size={15} />
        Le richieste rispettano turni e disponibilità dei tavoli. Durata demo:
        120 minuti.
      </p>
      {modal === 'new' && (
        <Modal
          title="Nuova prenotazione"
          description="Usa esclusivamente dati fittizi. La richiesta verrà salvata in attesa di conferma."
          onClose={() => setModal(null)}
        >
          <ActionForm
            label="Registra richiesta"
            onCancel={() => setModal(null)}
            onSubmit={async (f) => {
              await act('book', {
                name: f.get('name'),
                phone: f.get('phone'),
                day: f.get('day'),
                time: f.get('time'),
                covers: Number(f.get('covers')),
                venueId: f.get('venueId'),
                note: f.get('note'),
              });
              setModal(null);
            }}
          >
            <div className="form-grid">
              <Field
                label="Nome ospite demo"
                name="name"
                autoComplete="off"
                placeholder="Es. Anna Rossi"
                maxLength={70}
              />
              <Field
                label="Telefono demo"
                name="phone"
                placeholder="Es. +39 000 000 0000"
                type="tel"
                maxLength={25}
              />
              <Field label="Sede" name="venueId">
                <select
                  name="venueId"
                  id="venueId"
                  defaultValue={s.venueId === 'all' ? 'centro' : s.venueId}
                >
                  {s.venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Data"
                name="day"
                type="date"
                defaultValue={s.day}
                min={s.day}
              />
              <Field label="Orario" name="time">
                <select id="time" name="time" defaultValue="20:00">
                  {[
                    '12:00',
                    '12:30',
                    '13:00',
                    '13:30',
                    '19:30',
                    '20:00',
                    '20:30',
                    '21:00',
                    '21:30',
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Numero di persone"
                name="covers"
                type="number"
                min={1}
                max={6}
                defaultValue={2}
              />
            </div>
            <Field
              label="Richiesta organizzativa (facoltativa)"
              name="note"
              maxLength={200}
              placeholder="Es. preferenza sala interna"
            />
          </ActionForm>
        </Modal>
      )}
      {pending && (
        <Modal
          title={
            pending.status === 'pending'
              ? 'Conferma e assegna il tavolo'
              : 'Registra l’arrivo'
          }
          description={`${pending.name} · ${pending.covers} persone · ${pending.time}`}
          onClose={() => setModal(null)}
        >
          <ActionForm
            label={
              pending.status === 'pending'
                ? 'Conferma prenotazione'
                : 'Apri sessione tavolo'
            }
            onCancel={() => setModal(null)}
            onSubmit={async (f) => {
              await act(
                pending.status === 'pending' ? 'confirm' : 'arrive',
                pending.status === 'pending'
                  ? { bookingId: pending.id, tableId: f.get('tableId') }
                  : { bookingId: pending.id },
              );
              setModal(null);
            }}
          >
            {pending.status === 'pending' ? (
              <Field label="Tavolo disponibile" name="tableId">
                <select id="tableId" name="tableId">
                  {available.map((t) => (
                    <option key={t.id} value={t.id}>
                      Tavolo {t.code} · {t.seats} posti · {t.area}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <div className="info-box">
                Tavolo {s.tables.find((t) => t.id === pending.tableId)?.code}.
                La registrazione apre la sessione senza generare ordini o
                incassi.
              </div>
            )}
            {pending.status === 'pending' && !available.length && (
              <p className="form-error">
                Nessun tavolo disponibile per questa richiesta.
              </p>
            )}
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
