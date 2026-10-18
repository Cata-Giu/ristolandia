import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Download,
  Euro,
  Users,
  UtensilsCrossed,
  Bell,
  MapPin,
  Clock3,
  CircleCheck,
} from 'lucide-react';
import { useApp } from '../context';
import { money, number, time, date } from '../api';
import { Badge, PageTitle, Panel, LinkButton, Empty } from '../components/ui';
export function Dashboard() {
  const { state: s, navigate } = useApp();
  const [chartMode, setChartMode] = useState<'cash' | 'sales'>('cash');
  const [period, setPeriod] = useState('today');
  const inPeriod = (n: number) =>
    period === 'all' ||
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(n)) === s.day;
  const payments = (s.payments ?? []).filter((p) => inPeriod(p.at)),
    closed = s.sessions.filter(
      (se) => se.status === 'closed' && inPeriod(se.closedAt ?? se.openedAt),
    );
  const sales = closed.reduce((a, se) => a + se.total, 0),
    cash = payments
      .filter((p) => p.method !== 'credit')
      .reduce((a, p) => a + p.amount, 0),
    covers = closed.reduce((a, se) => a + se.covers, 0),
    open = s.sessions.filter((se) => se.status === 'open'),
    bookings = s.bookings.filter((b) => b.day === s.day),
    pending = bookings.filter((b) => b.status === 'pending');
  const series = Array.from({ length: 12 }, (_, i) => {
    const h = i + 12;
    return {
      hour: h,
      amount:
        chartMode === 'cash'
          ? payments
              .filter(
                (p) =>
                  p.method !== 'credit' &&
                  Number(
                    new Intl.DateTimeFormat('en-GB', {
                      timeZone: 'Europe/Rome',
                      hour: '2-digit',
                      hour12: false,
                    }).format(p.at),
                  ) === h,
              )
              .reduce((a, p) => a + p.amount, 0)
          : closed
              .filter(
                (se) =>
                  Number(
                    new Intl.DateTimeFormat('en-GB', {
                      timeZone: 'Europe/Rome',
                      hour: '2-digit',
                      hour12: false,
                    }).format(se.closedAt!),
                  ) === h,
              )
              .reduce((a, se) => a + se.total, 0),
    };
  });
  // Chart follows the hour range with data, including morning demo activity.
  const allHours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    amount:
      chartMode === 'cash'
        ? payments
            .filter(
              (p) =>
                p.method !== 'credit' &&
                Number(
                  new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Europe/Rome',
                    hour: '2-digit',
                    hour12: false,
                  }).format(p.at),
                ) === h,
            )
            .reduce((a, p) => a + p.amount, 0)
        : closed
            .filter(
              (se) =>
                Number(
                  new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Europe/Rome',
                    hour: '2-digit',
                    hour12: false,
                  }).format(se.closedAt!),
                ) === h,
            )
            .reduce((a, se) => a + se.total, 0),
  }));
  const hasMorning = allHours.slice(0, 12).some((p) => p.amount > 0),
    data = hasMorning
      ? allHours
          .slice(0, 24)
          .filter((_, i) => i % 2 === 0)
          .map((p) => ({
            ...p,
            amount: p.amount + allHours[p.hour + 1].amount,
          }))
      : series;
  const max = Math.max(10000, ...data.map((p) => p.amount)),
    points = data
      .map(
        (p, i) =>
          `${55 + (i * 690) / (data.length - 1)},${185 - (p.amount / max) * 145}`,
      )
      .join(' ');
  function exportData() {
    const csv =
      'Sede;Vendite chiuse EUR;Incassi esterni EUR;Coperti\n' +
      s.venues
        .filter((v) => s.venueId === 'all' || v.id === s.venueId)
        .map((v) => {
          const ses = closed.filter((se) => se.venueId === v.id),
            p = payments.filter(
              (p) => p.venueId === v.id && p.method !== 'credit',
            );
          return [
            v.name,
            (ses.reduce((a, se) => a + se.total, 0) / 100).toFixed(2),
            (p.reduce((a, p) => a + p.amount, 0) / 100).toFixed(2),
            ses.reduce((a, se) => a + se.covers, 0),
          ].join(';');
        })
        .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }),
    );
    a.download = 'ristolandia-riepilogo-demo.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const relevantVenues = s.venues.filter(
    (v) => s.venueId === 'all' || v.id === s.venueId,
  );
  return (
    <>
      <PageTitle
        eyebrow="IL POLSO DEL TUO GRUPPO"
        title="Ogni sede, una sola visione."
        description={`Buongiorno, ${s.user.name.split(' ')[0]}. Ecco come sta andando il servizio.`}
        actions={
          <>
            <label className="select-control">
              <CalendarDays size={16} />
              <select
                aria-label="Periodo del riepilogo"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="today">
                  Oggi, {date(s.day, { day: 'numeric', month: 'short' })}
                </option>
                <option value="all">Tutto lo storico demo</option>
              </select>
            </label>
            <button className="button" onClick={exportData}>
              <Download size={16} />
              Esporta
            </button>
          </>
        }
      />
      <div className="overview-tabs">
        <span className="active">Panoramica</span>
        <button onClick={() => navigate('tables')}>Servizio in corso</button>
        <button onClick={() => navigate('inventory')}>
          Controllo operativo
        </button>
        <span className="live-label">
          <span className="status-dot" />
          Dati demo collegati
        </span>
      </div>
      <div className="metrics-grid">
        {[
          {
            label: 'Vendite chiuse',
            value: money(sales),
            icon: Euro,
            foot: `${closed.length} conti chiusi`,
            tone: 'green',
            help: 'Totale consumazioni dei conti chiusi. Esclude ricariche e conti ancora aperti.',
          },
          {
            label: 'Incassi esterni',
            value: money(cash),
            icon: CreditCard,
            foot: 'Contanti e carta simulati',
            tone: 'blue',
            help: 'Pagamenti contanti e carta sulle consumazioni. Gli utilizzi del credito prepagato e le ricariche sono separati.',
          },
          {
            label: 'Coperti serviti',
            value: number(covers),
            icon: Users,
            foot: `${open.reduce((a, se) => a + se.covers, 0)} persone ancora al tavolo`,
            tone: 'orange',
            help: 'Coperti delle sessioni chiuse nel periodo selezionato.',
          },
          {
            label: 'Conto medio',
            value: money(closed.length ? Math.round(sales / closed.length) : 0),
            icon: UtensilsCrossed,
            foot: 'Per conto chiuso',
            tone: 'purple',
            help: 'Vendite chiuse diviso numero di sessioni chiuse nel periodo.',
          },
        ].map((m) => (
          <section className="metric" key={m.label}>
            <div className="metric-top">
              <span>{m.label}</span>
              <span className={`metric-icon ${m.tone}`}>
                <m.icon size={18} />
              </span>
            </div>
            <div className="metric-value">{m.value}</div>
            <div className="metric-foot">
              <span>{m.foot}</span>
              <span
                className="help-icon"
                role="note"
                tabIndex={0}
                aria-label={m.help}
              >
                <CircleHelp size={14} />
                <span className="tooltip">{m.help}</span>
              </span>
            </div>
          </section>
        ))}
      </div>
      <div className="dashboard-main">
        <Panel
          title="Il ritmo della giornata"
          subtitle={
            chartMode === 'cash'
              ? 'Incassi esterni per fascia oraria · simulati'
              : 'Vendite dei conti chiusi per fascia oraria'
          }
          action={
            <div className="segmented">
              <button
                className={chartMode === 'cash' ? 'active' : ''}
                onClick={() => setChartMode('cash')}
              >
                Incassi
              </button>
              <button
                className={chartMode === 'sales' ? 'active' : ''}
                onClick={() => setChartMode('sales')}
              >
                Vendite
              </button>
            </div>
          }
        >
          <div className="chart-total">
            {money(chartMode === 'cash' ? cash : sales)}
            <span>nel periodo selezionato</span>
          </div>
          <div className="chart-wrap">
            <svg
              className="revenue-chart"
              viewBox="0 0 780 225"
              role="img"
              aria-label={`Andamento ${chartMode === 'cash' ? 'incassi' : 'vendite'}, totale ${money(chartMode === 'cash' ? cash : sales)}`}
            >
              <defs>
                <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#258b75" stopOpacity=".18" />
                  <stop offset="100%" stopColor="#258b75" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                  <line
                    x1="55"
                    x2="755"
                    y1={40 + i * 48}
                    y2={40 + i * 48}
                    stroke="#e9edea"
                    strokeDasharray="3 5"
                  />
                  <text x="0" y={44 + i * 48} className="chart-label">
                    {number(Math.round((max * (3 - i)) / 3 / 100))} €
                  </text>
                </g>
              ))}
              <polygon
                points={`55,185 ${points} 745,185`}
                fill="url(#chart-fill)"
              />
              <polyline
                points={points}
                fill="none"
                stroke="#24816a"
                strokeWidth="2.7"
                strokeLinejoin="round"
              />
              {data.map((p, i) => (
                <g key={p.hour}>
                  <circle
                    cx={55 + (i * 690) / (data.length - 1)}
                    cy={185 - (p.amount / max) * 145}
                    r={p.amount > 0 ? 3 : 0}
                    fill="#24816a"
                  >
                    <title>
                      {p.hour}:00 · {money(p.amount)}
                    </title>
                  </circle>
                  {i % 2 === 0 && (
                    <text
                      x={55 + (i * 690) / (data.length - 1)}
                      y="218"
                      className="chart-label"
                      textAnchor="middle"
                    >
                      {String(p.hour).padStart(2, '0')}:00
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
          <div className="chart-footer">
            <span>
              <span className="legend-line" />{' '}
              {chartMode === 'cash' ? 'Incassi esterni' : 'Vendite chiuse'}
            </span>
            <span>Fuso orario Europe/Rome</span>
          </div>
        </Panel>
        <Panel
          title="Il servizio, adesso"
          subtitle="Una vista sui tavoli e sugli arrivi"
          className="service-panel"
        >
          <div className="service-summary">
            <div
              className="occupancy-ring"
              style={
                {
                  '--progress': `${(open.length / Math.max(1, s.tables.length)) * 100}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <strong>
                  {open.length}
                  <span>/{s.tables.length}</span>
                </strong>
                <small>tavoli aperti</small>
              </div>
            </div>
            <div className="service-counts">
              <span>
                <i className="dot green-dot" />
                Occupati<strong>{open.length}</strong>
              </span>
              <span>
                <i className="dot gray-dot" />
                Liberi
                <strong>
                  {s.tables.filter((t) => t.status === 'free').length}
                </strong>
              </span>
              <span>
                <i className="dot amber-dot" />
                Da riassettare
                <strong>
                  {s.tables.filter((t) => t.status === 'cleaning').length}
                </strong>
              </span>
            </div>
          </div>
          <div className="service-row">
            <span className="soft-icon">
              <CalendarDays size={18} />
            </span>
            <div>
              <strong>{bookings.length} prenotazioni oggi</strong>
              <small>
                {bookings.reduce((a, b) => a + b.covers, 0)} coperti prenotati
              </small>
            </div>
            <ChevronRight size={16} />
          </div>
          <div className="service-row">
            <span className="soft-icon amber">
              <Clock3 size={18} />
            </span>
            <div>
              <strong>{pending.length} richieste da confermare</strong>
              <small>In attesa di una tua risposta</small>
            </div>
            <ChevronRight size={16} />
          </div>
          <button className="button full" onClick={() => navigate('bookings')}>
            Apri prenotazioni
            <ArrowUpRight size={16} />
          </button>
        </Panel>
      </div>
      <div className="dashboard-bottom">
        <Panel
          title="Le tue sedi"
          subtitle={`${relevantVenues.length} locali · un’unica regia`}
          action={
            <span className="small muted">Dati del periodo selezionato</span>
          }
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Locale</th>
                  <th>Vendite chiuse</th>
                  <th>Coperti</th>
                  <th>Servizio</th>
                </tr>
              </thead>
              <tbody>
                {relevantVenues.map((v) => {
                  const ses = closed.filter((se) => se.venueId === v.id),
                    active = open.filter((se) => se.venueId === v.id).length;
                  return (
                    <tr key={v.id}>
                      <td>
                        <div className="venue-cell">
                          <span className={`venue-monogram venue-${v.id}`}>
                            {v.initials}
                          </span>
                          <div>
                            <strong>{v.name.replace('La Corte · ', '')}</strong>
                            <small>
                              <MapPin size={11} />
                              {v.city}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="numeric">
                        {money(ses.reduce((a, se) => a + se.total, 0))}
                      </td>
                      <td>{ses.reduce((a, se) => a + se.covers, 0)}</td>
                      <td>
                        <Badge status={active ? 'occupied' : 'free'}>
                          {active
                            ? `${active} tavoli aperti`
                            : 'Nessun tavolo aperto'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel
          title="Da tenere d’occhio"
          subtitle="Le priorità del servizio"
          action={<Bell size={18} className="muted" />}
        >
          <div className="attention-list">
            <button
              onClick={() => navigate('temperatures')}
              className="attention-item"
            >
              <span className="attention-icon danger">
                <ArrowUpRight size={18} />
              </span>
              <div>
                <strong>
                  {
                    s.alerts.filter(
                      (a) =>
                        a.type === 'temperature' && a.status !== 'acknowledged',
                    ).length
                  }{' '}
                  temperature da verificare
                </strong>
                <p>
                  {s.alerts.find((a) => a.type === 'temperature')?.name ??
                    'Nessuna anomalia termica simulata'}
                </p>
                <small>
                  {s.alerts.find((a) => a.type === 'temperature')
                    ? 'Letture e soglie simulate'
                    : 'Nessun dato da verificare in questa sede'}
                </small>
              </div>
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => navigate('inventory')}
              className="attention-item"
            >
              <span className="attention-icon warning">
                <ArrowDownLeft size={18} />
              </span>
              <div>
                <strong>Scorte sotto soglia</strong>
                <p>Verifica il fabbisogno prima del servizio</p>
                <small>
                  {
                    (s.ingredients ?? []).filter(
                      (i) => i.quantity < i.min * (s.venueId === 'all' ? 5 : 1),
                    ).length
                  }{' '}
                  articoli da controllare
                </small>
              </div>
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => navigate('kitchen')}
              className="attention-item"
            >
              <span className="attention-icon info">
                <UtensilsCrossed size={18} />
              </span>
              <div>
                <strong>
                  {s.prints.filter((p) => p.status === 'error').length} errori
                  nella coda di stampa
                </strong>
                <p>Apri il reparto per vedere l’anteprima</p>
                <small>Stampanti simulate</small>
              </div>
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="quiet-note">
            <CircleCheck size={15} />
            Tutte le attività rimangono nella demo.
          </div>
        </Panel>
      </div>
      <footer className="page-footer">
        <span>Una buona regia si vede nel servizio.</span>
        <span>Ristolandia · Demo interattiva</span>
      </footer>
    </>
  );
}
