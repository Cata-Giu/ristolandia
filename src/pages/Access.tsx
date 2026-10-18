import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChefHat,
  Glasses,
  HandPlatter,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  UtensilsCrossed,
  Users,
  Wallet,
  Package,
  MonitorSmartphone,
  CalendarDays,
} from 'lucide-react';
import { api, ApiError, date } from '../api';
import type { User, Venue } from '../types';
import { ActionForm, Badge, Field, Panel } from '../components/ui';
interface Info {
  users: User[];
  venues: Venue[];
  day: string;
}
export function Access({
  onLogin,
  initialRole = 'admin',
}: {
  onLogin: () => Promise<void>;
  initialRole?: string;
}) {
  const [info, setInfo] = useState<Info | null>(null),
    [role, setRole] = useState(initialRole),
    [publicMode, setPublicMode] = useState(
      new URLSearchParams(location.search).get('public') === 'booking',
    ),
    [error, setError] = useState(''),
    [booked, setBooked] = useState(false);
  useEffect(() => {
    api<Info>('demo-info')
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, []);
  const icons: Record<string, typeof ChefHat> = {
    admin: LayoutDashboard,
    manager: ShieldCheck,
    reception: Users,
    waiter: HandPlatter,
    kitchen: ChefHat,
    bar: Glasses,
    cashier: Wallet,
    warehouse: Package,
  };
  return (
    <div className="access-page">
      <section className="access-story">
        <a className="brand access-brand" href="/">
          <span className="brand-symbol">
            <UtensilsCrossed size={24} />
          </span>
          <span>
            ristolandia<span className="brand-period">.</span>
          </span>
        </a>
        <div className="access-story-content">
          <span className="eyebrow">IL TUO SERVIZIO, IN ARMONIA</span>
          <h1>
            Dietro un grande servizio,
            <br />
            una buona regia.
          </h1>
          <p>
            Le persone giuste. Le informazioni che servono.
            <br />
            Ogni locale, connesso al tuo gruppo.
          </p>
          <div className="access-illustration">
            <div className="illustration-node node-kitchen">
              <ChefHat size={21} />
              <span>Cucina</span>
              <i />
            </div>
            <div className="illustration-node node-sala">
              <HandPlatter size={21} />
              <span>Sala</span>
              <i />
            </div>
            <div className="illustration-core">
              <UtensilsCrossed size={35} />
              <span>Un unico servizio</span>
            </div>
            <div className="illustration-node node-reception">
              <Users size={21} />
              <span>Accoglienza</span>
              <i />
            </div>
            <div className="illustration-node node-cassa">
              <Wallet size={21} />
              <span>Cassa</span>
              <i />
            </div>
            <svg viewBox="0 0 440 250" aria-hidden="true">
              <path d="M80 50 Q220 40 220 125 M360 60 Q220 40 220 125 M80 200 Q220 230 220 125 M360 200 Q220 230 220 125" />
            </svg>
          </div>
        </div>
        <div className="access-story-footer">
          <span>
            <i className="dot" />5 sedi. Un’unica visione.
          </span>
          <span>Demo interattiva · dati fittizi</span>
        </div>
      </section>
      <main className="access-main">
        <div className="access-top">
          <Badge status="simulated">Ambiente dimostrativo</Badge>
          <a
            href="?public=booking"
            onClick={(e) => {
              e.preventDefault();
              setPublicMode(!publicMode);
              setBooked(false);
              setError('');
            }}
          >
            {publicMode ? 'Accesso staff' : 'Prova prenotazione cliente'}
            <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="access-form">
          <span className="eyebrow">
            {publicMode ? 'UN POSTO PER TE' : 'BENVENUTO IN RISTOLANDIA'}
          </span>
          <h2>
            {publicMode
              ? 'Prenota un tavolo demo.'
              : 'Il servizio comincia da qui.'}
          </h2>
          <p className="muted">
            {publicMode
              ? 'Una richiesta fittizia per provare il percorso di accoglienza.'
              : 'Scegli la tua postazione. Troverai solo ciò che serve al tuo lavoro.'}
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!info && !error && (
            <div className="loading" role="status">
              Caricamento account demo…
            </div>
          )}
          {info &&
            (publicMode ? (
              booked ? (
                <div className="booking-success">
                  <CalendarDays size={35} />
                  <h3>Richiesta demo ricevuta.</h3>
                  <p>
                    La ritroverai in Accoglienza, in attesa di conferma e
                    assegnazione tavolo.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => {
                      setPublicMode(false);
                      setRole('reception');
                    }}
                  >
                    Apri accesso Accoglienza
                    <ArrowRight size={16} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setBooked(false)}
                  >
                    Invia un’altra richiesta
                  </button>
                </div>
              ) : (
                <ActionForm
                  label="Invia richiesta dimostrativa"
                  onCancel={() => setPublicMode(false)}
                  onSubmit={async (f) => {
                    await api(
                      'public/book',
                      {
                        name: f.get('name'),
                        phone: f.get('phone'),
                        venueId: f.get('venueId'),
                        day: f.get('day'),
                        time: f.get('time'),
                        covers: Number(f.get('covers')),
                      },
                      crypto.randomUUID(),
                    );
                    setBooked(true);
                  }}
                >
                  <div className="form-grid">
                    <Field
                      label="Nome fittizio"
                      name="name"
                      placeholder="Anna Demo"
                      maxLength={70}
                    />
                    <Field
                      label="Telefono fittizio"
                      name="phone"
                      placeholder="+39 000 000 0000"
                      type="tel"
                      maxLength={25}
                    />
                    <Field label="Sede" name="venueId">
                      <select id="venueId" name="venueId">
                        {info.venues.map((v) => (
                          <option value={v.id} key={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Data"
                      name="day"
                      type="date"
                      defaultValue={info.day}
                      min={info.day}
                    />
                    <Field label="Orario" name="time">
                      <select id="time" name="time">
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
                      label="Persone"
                      name="covers"
                      type="number"
                      min={1}
                      max={6}
                      defaultValue={2}
                    />
                  </div>
                  <p className="small muted">
                    Non inserire dati personali reali o informazioni sensibili.
                    Non verrà inviato alcun messaggio.
                  </p>
                </ActionForm>
              )
            ) : (
              <>
                <div
                  className="role-grid"
                  role="group"
                  aria-label="Postazioni dimostrative"
                >
                  {info.users.map((u) => {
                    const Icon = icons[u.role] ?? MonitorSmartphone;
                    return (
                      <button
                        key={u.id}
                        aria-pressed={role === u.id}
                        className={role === u.id ? 'selected' : ''}
                        onClick={() => setRole(u.id)}
                      >
                        <Icon size={20} />
                        <span>{u.label}</span>
                        {role === u.id && (
                          <span className="role-check" aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="selected-user">
                  <span className="avatar">
                    {info.users
                      .find((u) => u.id === role)
                      ?.name.split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                  <div>
                    <strong>
                      {info.users.find((u) => u.id === role)?.name}
                    </strong>
                    <small>
                      {role === 'admin'
                        ? 'Tutte le sedi del gruppo'
                        : 'La Corte · Centro'}
                    </small>
                  </div>
                </div>
                <ActionForm
                  label="Accedi alla demo"
                  onCancel={() => {
                    setPublicMode(true);
                  }}
                  onSubmit={async (f) => {
                    await api('login', {
                      userId: role,
                      password: f.get('password'),
                    });
                    await onLogin();
                  }}
                >
                  <Field
                    label="Password dimostrativa"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    defaultValue="Demo2026!"
                  />
                  <p className="password-hint">
                    Password demo: <code>Demo2026!</code>
                  </p>
                </ActionForm>
              </>
            ))}
        </div>
        <footer className="access-footer">
          <ShieldCheck size={15} />
          <span>Pagamenti, sensori, stampe e comunicazioni sono simulati.</span>
        </footer>
      </main>
    </div>
  );
}
