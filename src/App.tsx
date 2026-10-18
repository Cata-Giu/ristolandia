import { Documents } from './pages/Documents';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChefHat,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Command,
  GlassWater,
  LayoutGrid,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Package,
  FileText,
  Receipt,
  Settings,
  ShieldCheck,
  Thermometer,
  Users,
  UtensilsCrossed,
  Wifi,
  WifiOff,
  X,
  LoaderCircle,
  CheckCircle2,
  TriangleAlert,
  MapPin,
} from 'lucide-react';
import { AppContext, navPermissions, type Page } from './context';
import { api, ApiError, date } from './api';
import type { State, Act } from './types';
import { Access } from './pages/Access';
import { Dashboard } from './pages/Dashboard';
import { Bookings } from './pages/Bookings';
import { Tables } from './pages/Tables';
import { Orders } from './pages/Orders';
import { Department } from './pages/Department';
import { Cashier } from './pages/Cashier';
import { Inventory } from './pages/Inventory';
import {
  Menu,
  Customers,
  Temperatures,
  Notifications,
  Settings as SettingsPage,
} from './pages/Management';
import { Modal } from './components/ui';
const items: {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
}[] = [
  {
    id: 'dashboard',
    label: 'Panoramica',
    icon: LayoutDashboard,
    group: 'workspace',
  },
  {
    id: 'bookings',
    label: 'Prenotazioni',
    icon: CalendarDays,
    group: 'operations',
  },
  {
    id: 'tables',
    label: 'Sala e tavoli',
    icon: LayoutGrid,
    group: 'operations',
  },
  {
    id: 'orders',
    label: 'Ordinazioni',
    icon: ClipboardList,
    group: 'operations',
  },
  { id: 'kitchen', label: 'Cucina', icon: ChefHat, group: 'operations' },
  { id: 'bar', label: 'Bar', icon: GlassWater, group: 'operations' },
  { id: 'cashier', label: 'Cassa', icon: Receipt, group: 'operations' },
  { id: 'menu', label: 'Menu e ricette', icon: BookOpen, group: 'management' },
  {
    id: 'documents',
    label: 'Bolle e documenti',
    icon: FileText,
    group: 'management',
  },
  { id: 'inventory', label: 'Magazzino', icon: Package, group: 'management' },
  {
    id: 'customers',
    label: 'Clienti e fedeltà',
    icon: Users,
    group: 'management',
  },
  {
    id: 'temperatures',
    label: 'Temperature',
    icon: Thermometer,
    group: 'management',
  },
  {
    id: 'notifications',
    label: 'Comunicazioni',
    icon: Bell,
    group: 'management',
  },
  { id: 'settings', label: 'Impostazioni', icon: Settings, group: 'settings' },
];
function initialPage() {
  return new URLSearchParams(location.search).get('view') as Page | null;
}
export default function App() {
  const [state, setState] = useState<State | null>(null),
    [auth, setAuth] = useState<'loading' | 'guest' | 'ready'>('loading'),
    [page, setPage] = useState<Page>(initialPage() ?? 'dashboard'),
    [venue, setVenue] = useState(
      new URLSearchParams(location.search).get('venue') ?? '',
    ),
    [loginRole, setLoginRole] = useState(
      new URLSearchParams(location.search).get('role') ?? 'admin',
    ),
    [busy, setBusy] = useState(false),
    [connection, setConnection] = useState(navigator.onLine),
    [error, setError] = useState(''),
    [toast, setToast] = useState<{ message: string; tone: string } | null>(
      null,
    ),
    [mobile, setMobile] = useState(false),
    [narrow, setNarrow] = useState(
      window.matchMedia('(max-width: 820px)').matches,
    ),
    [help, setHelp] = useState(false);
  const stateRef = useRef<State | null>(null),
    venueRef = useRef(venue),
    sequence = useRef(0),
    acting = useRef(false),
    retryKeys = useRef(new Map<string, string>());
  venueRef.current = venue;
  useEffect(() => {
    const media = window.matchMedia('(max-width: 820px)');
    const update = () => {
      setNarrow(media.matches);
      if (!media.matches) setMobile(false);
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!mobile || !narrow) return;
    const prev = document.activeElement as HTMLElement;
    const sidebar = document.querySelector('.sidebar') as HTMLElement;
    const targets = () =>
      Array.from(
        sidebar.querySelectorAll<HTMLElement>('a,button,select,[tabindex="0"]'),
      ).filter((el) => !el.hasAttribute('disabled'));
    targets()[0]?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobile(false);
        return;
      }
      if (e.key === 'Tab') {
        const all = targets(),
          first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', handler);
      prev?.focus({ preventScroll: true });
    };
  }, [mobile, narrow]);
  const refresh = useCallback(async () => {
    const seq = ++sequence.current;
    try {
      const data = await api<State>(
        'state' +
          (venueRef.current
            ? '?venue=' + encodeURIComponent(venueRef.current)
            : ''),
      );
      if (seq !== sequence.current) return;
      stateRef.current = data;
      setState(data);
      setAuth('ready');
      setError('');
      setConnection(true);
      if (!venueRef.current) {
        const v = data.user.role === 'admin' ? 'all' : data.venueId;
        venueRef.current = v;
        setVenue(v);
      }
      setPage((current) =>
        navPermissions[data.user.role].includes(current)
          ? current
          : navPermissions[data.user.role][0],
      );
    } catch (e) {
      if (seq !== sequence.current) return;
      if (e instanceof ApiError && e.status === 401) {
        stateRef.current = null;
        setState(null);
        setAuth('guest');
        setError('');
      } else {
        setConnection(false);
        setError((e as Error).message);
        if (!stateRef.current) setAuth('guest');
      }
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh, venue]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    async function poll() {
      if (auth === 'ready' && !acting.current) await refresh();
      if (!stopped) timer = setTimeout(poll, 5000);
    }
    timer = setTimeout(poll, 5000);
    const offline = () => setConnection(false),
      online = () => {
        setConnection(true);
        void refresh();
      };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [auth, refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.title =
      auth === 'ready'
        ? `${items.find((i) => i.id === page)?.label ?? 'Postazione'} · Ristolandia`
        : 'Accesso demo · Ristolandia';
  }, [page, auth]);
  useEffect(() => {
    if (auth === 'ready')
      requestAnimationFrame(() =>
        document.getElementById('main-content')?.focus({ preventScroll: true }),
      );
  }, [auth]);
  const navigate = useCallback((p: Page) => {
    setPage(p);
    setMobile(false);
    const query = new URLSearchParams(location.search);
    query.delete('role');
    query.delete('public');
    query.set('view', p);
    if (venueRef.current) query.set('venue', venueRef.current);
    history.pushState({}, '', `?${query}`);
  }, []);
  useEffect(() => {
    const handler = () => {
      setPage(initialPage() ?? 'dashboard');
      setVenue(new URLSearchParams(location.search).get('venue') ?? '');
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  const act: Act = async (action, payload) => {
    if (acting.current)
      throw new Error('Attendi il completamento dell’operazione in corso.');
    if (!navigator.onLine)
      throw new Error(
        'Sei offline. Riconnettiti prima di registrare l’operazione.',
      );
    acting.current = true;
    setBusy(true);
    const fingerprint = JSON.stringify([action, payload]);
    const key = retryKeys.current.get(fingerprint) ?? crypto.randomUUID();
    retryKeys.current.set(fingerprint, key);
    try {
      const result = await api<{ id?: string; message: string }>(
        'actions/' + action,
        { ...payload, expectedRevision: stateRef.current?.revision },
        key,
      );
      retryKeys.current.delete(fingerprint);
      await refresh();
      setToast({ message: result.message, tone: 'success' });
      return result;
    } catch (e) {
      if (e instanceof ApiError) retryKeys.current.delete(fingerprint);
      await refresh();
      setToast({ message: (e as Error).message, tone: 'error' });
      throw e;
    } finally {
      acting.current = false;
      setBusy(false);
    }
  };
  async function switchUser(role = 'admin') {
    try {
      await api('logout', {});
      venueRef.current = '';
      setVenue('');
      stateRef.current = null;
      setState(null);
      setLoginRole(role);
      setAuth('guest');
      sessionStorage.removeItem('ristolandia-session');
      history.replaceState({}, '', `?role=${encodeURIComponent(role)}`);
    } catch (e) {
      setToast({ message: (e as Error).message, tone: 'error' });
    }
  }
  if (auth === 'loading')
    return (
      <div className="app-loading">
        <span className="brand-symbol">
          <UtensilsCrossed size={28} />
        </span>
        <h1>ristolandia.</h1>
        <LoaderCircle className="spin" size={22} />
        <p role="status">Prepariamo la tua postazione…</p>
      </div>
    );
  if (auth === 'guest' || !state)
    return (
      <Access
        initialRole={loginRole}
        onLogin={async () => {
          venueRef.current = '';
          await refresh();
          const current = stateRef.current as State | null;
          if (current) setPage(navPermissions[current.user.role][0]);
        }}
      />
    );
  const s = state,
    allowed = navPermissions[s.user.role],
    activeItem = items.find((i) => i.id === page),
    pending = s.bookings.filter((b) => b.status === 'pending').length;
  const screen =
    page === 'dashboard' ? (
      <Dashboard />
    ) : page === 'bookings' ? (
      <Bookings />
    ) : page === 'tables' ? (
      <Tables />
    ) : page === 'orders' ? (
      <Orders />
    ) : page === 'kitchen' ? (
      <Department department="kitchen" />
    ) : page === 'bar' ? (
      <Department department="bar" />
    ) : page === 'cashier' ? (
      <Cashier />
    ) : page === 'documents' ? (
      <Documents />
    ) : page === 'inventory' ? (
      <Inventory />
    ) : page === 'menu' ? (
      <Menu />
    ) : page === 'customers' ? (
      <Customers />
    ) : page === 'temperatures' ? (
      <Temperatures />
    ) : page === 'notifications' ? (
      <Notifications />
    ) : (
      <SettingsPage switchUser={switchUser} />
    );
  return (
    <AppContext.Provider value={{ state: s, act, busy, navigate, refresh }}>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Vai al contenuto
        </a>
        {mobile && (
          <button
            className="sidebar-backdrop"
            aria-label="Chiudi navigazione"
            onClick={() => setMobile(false)}
          />
        )}
        <aside
          inert={narrow && !mobile}
          className={`sidebar ${mobile ? 'mobile-open' : ''}`}
        >
          <a
            className="brand"
            href="?view=dashboard"
            onClick={(e) => {
              e.preventDefault();
              navigate(allowed[0]);
            }}
          >
            <span className="brand-symbol">
              <UtensilsCrossed size={23} />
            </span>
            <span>
              ristolandia<span className="brand-period">.</span>
            </span>
          </a>
          <div className="workspace-card">
            <span className="group-logo">LC</span>
            <div>
              <strong>Gruppo La Corte</strong>
              <small>
                {s.user.role === 'admin' ? '5 sedi connesse' : s.user.label}
              </small>
            </div>
            <ShieldCheck size={15} />
          </div>
          <nav aria-label="Navigazione principale">
            {['workspace', 'operations', 'management', 'settings'].map(
              (group) => {
                const rows = items.filter(
                  (i) => i.group === group && allowed.includes(i.id),
                );
                return rows.length ? (
                  <div className={`nav-group nav-${group}`} key={group}>
                    {group === 'operations' && (
                      <span className="nav-heading">OPERATIVITÀ</span>
                    )}
                    {group === 'management' && (
                      <span className="nav-heading">GESTIONE</span>
                    )}
                    {rows.map((item) => (
                      <a
                        key={item.id}
                        className={`nav-item ${page === item.id ? 'active' : ''}`}
                        href={`?view=${item.id}&venue=${venue}`}
                        aria-current={page === item.id ? 'page' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(item.id);
                        }}
                      >
                        <item.icon size={18} strokeWidth={1.7} />
                        <span>{item.label}</span>
                        {item.id === 'bookings' && pending > 0 && (
                          <span className="nav-count">{pending}</span>
                        )}
                      </a>
                    ))}
                  </div>
                ) : null;
              },
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="demo-card">
              <span className="demo-card-top">
                <span className="status-dot" />
                Ambiente demo
              </span>
              <p>
                Prova il servizio.
                <br />I dati sono tutti fittizi.
              </p>
              <button className="text-button" onClick={() => setHelp(true)}>
                Come funziona
                <ArrowUpRight size={15} />
              </button>
            </div>
            <button
              className="user-card"
              onClick={() => void switchUser(s.user.role)}
              title="Esci e cambia postazione"
            >
              <span className="avatar">
                {s.user.name
                  .split(' ')
                  .map((x) => x[0])
                  .join('')}
              </span>
              <span>
                <strong>{s.user.name}</strong>
                <small>{s.user.label}</small>
              </span>
              <LogOut size={17} />
            </button>
          </div>
        </aside>
        <div className="app-body" inert={mobile && narrow}>
          <header className="topbar">
            <div className="topbar-location">
              <button
                className="icon-button mobile-toggle"
                aria-label="Apri navigazione"
                onClick={() => setMobile(true)}
              >
                <MenuIcon size={22} />
              </button>
              <span className="breadcrumb">
                Workspace<span>/</span>
                <strong>{activeItem?.label}</strong>
              </span>
            </div>
            <div className="topbar-actions">
              <label className="venue-select">
                <MapPin size={15} />
                <select
                  aria-label="Sede attiva"
                  value={venue || s.venueId}
                  onChange={(e) => {
                    setVenue(e.target.value);
                    const q = new URLSearchParams(location.search);
                    q.set('venue', e.target.value);
                    history.replaceState({}, '', `?${q}`);
                  }}
                >
                  {s.user.role === 'admin' && (
                    <option value="all">Tutte le sedi</option>
                  )}
                  {s.venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <span
                className={`connection ${connection ? '' : 'disconnected'}`}
              >
                {connection ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{connection ? 'Connesso' : 'Offline'}</span>
              </span>
              <span className="topbar-divider" />
              <button
                className="icon-button"
                aria-label="Guida alla demo"
                onClick={() => setHelp(true)}
              >
                <CircleHelp size={19} />
              </button>
              {allowed.includes('notifications') && (
                <button
                  className="icon-button notification-button"
                  aria-label="Apri comunicazioni simulate"
                  onClick={() => navigate('notifications')}
                >
                  <Bell size={19} />
                  {s.notifications.length > 0 && <i />}
                </button>
              )}
              <span className="avatar header-avatar" aria-label={s.user.name}>
                {s.user.name
                  .split(' ')
                  .map((x) => x[0])
                  .join('')}
              </span>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="main-content">
            {error && (
              <div className="connection-banner" role="alert">
                <WifiOff size={18} />
                <span>
                  {error} I dati mostrati possono non essere aggiornati. Nessuna
                  operazione viene salvata offline.
                </span>
                <button className="button small" onClick={() => void refresh()}>
                  Riprova
                </button>
              </div>
            )}
            {!connection && !error && (
              <div className="connection-banner" role="alert">
                Sei offline. Le operazioni richiedono una connessione al server.
              </div>
            )}
            {allowed.includes(page) ? (
              screen
            ) : (
              <div className="form-error" role="alert">
                Questa postazione non può accedere alla sezione richiesta.
              </div>
            )}
          </main>
          <div className="demo-ribbon">
            <span className="status-dot" />
            <span>DEMO INTERATTIVA</span>
            <span className="ribbon-detail">
              Dati fittizi · nessuna operazione reale
            </span>
            {busy && <LoaderCircle size={13} className="spin" />}
          </div>
        </div>
      </div>
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className={`toast ${toast.tone}`}>
            {toast.tone === 'success' ? (
              <CheckCircle2 size={19} />
            ) : (
              <TriangleAlert size={19} />
            )}
            <span>{toast.message}</span>
            <button
              className="icon-button"
              aria-label="Chiudi notifica"
              onClick={() => setToast(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
      {help && (
        <Modal
          title="Un servizio completo, da provare."
          description="Demo persistente condivisa tra le postazioni collegate allo stesso server. Tutti i dati sono fittizi."
          onClose={() => setHelp(false)}
        >
          <ol className="help-steps">
            <li>
              Invia una richiesta dal link “Prova prenotazione cliente” nella
              pagina di accesso.
            </li>
            <li>
              In Accoglienza conferma, assegna il tavolo e registra l’arrivo.
            </li>
            <li>In Sala seleziona il tavolo e invia piatti e bevande.</li>
            <li>
              In Cucina e Bar avvia la preparazione e segna le righe pronte.
            </li>
            <li>
              In Cassa registra il pagamento simulato, anche in più parti.
            </li>
            <li>
              Controlla dashboard, consumi teorici e punti del cliente
              identificato.
            </li>
          </ol>
          <div className="info-box">
            Puoi cambiare postazione dal profilo in basso a sinistra. Tutti gli
            account demo usano la password Demo2026!.
          </div>
          <button
            className="button primary full"
            onClick={() => setHelp(false)}
          >
            Inizia il percorso
            <ArrowUpRight size={16} />
          </button>
        </Modal>
      )}
    </AppContext.Provider>
  );
}
