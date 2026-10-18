import { TipTaxSettings } from '../components/TipTaxSettings';
import { useState } from 'react';
import {
  BookOpen,
  Wallet,
  Star,
  Gift,
  Thermometer,
  WifiOff,
  Check,
  Bell,
  ShieldCheck,
  RotateCcw,
  ArrowUpRight,
  MonitorSmartphone,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { useApp } from '../context';
import { money, number, time } from '../api';
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
import type { Alert, Customer } from '../types';
export function Menu() {
  const { state: s } = useApp();
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(0);
  const rows = s.products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );
  const canCost = !!s.ingredients;
  return (
    <>
      <PageTitle
        eyebrow="MENU E RICETTE"
        title="Il menu, con tutti i suoi ingredienti."
        description="Catalogo dimostrativo condiviso. La configurazione e le varianti commerciali saranno approfondite nel pilota."
      />
      <Panel
        title="Prodotti e costo teorico"
        subtitle="Prezzi lordi demo. Incidenza = costo ingredienti / prezzo lordo; non rappresenta utile netto."
        action={
          <SearchBox
            value={query}
            onChange={(q) => {
              setQuery(q);
              setPage(0);
            }}
            placeholder="Cerca prodotto"
          />
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Prodotto</th>
                <th>Categoria</th>
                <th>Reparto</th>
                <th>Prezzo</th>
                {canCost && (
                  <>
                    <th>Costo teorico</th>
                    <th>Incidenza</th>
                  </>
                )}
                <th>Ricetta</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 8, page * 8 + 8).map((p) => {
                const cost = p.recipe
                  ? Object.entries(p.recipe).reduce(
                      (a, [id, q]) =>
                        a +
                        (s.ingredients?.find((i) => i.id === id)?.cost ?? 0) *
                          q,
                      0,
                    )
                  : null;
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      {!p.available && (
                        <small className="block danger-text">Esaurito</small>
                      )}
                    </td>
                    <td>{p.category}</td>
                    <td>{p.department === 'bar' ? 'Bar' : 'Cucina'}</td>
                    <td>{money(p.price)}</td>
                    {canCost && (
                      <>
                        <td>
                          {cost === null
                            ? 'Non disponibile'
                            : money(Math.round(cost))}
                        </td>
                        <td>
                          {cost === null
                            ? '—'
                            : number((cost / p.price) * 100) + '%'}
                        </td>
                      </>
                    )}
                    <td>
                      <Badge status={p.recipe ? 'free' : 'pending'}>
                        {p.recipe ? 'Completa · v1' : 'Da completare'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty title="Nessun prodotto trovato" />}
        <Pagination count={rows.length} page={page} setPage={setPage} />
      </Panel>
      <div className="info-box">
        <BookOpen size={18} />
        Le ricette sono espresse nell’unità base di ogni ingrediente (g, ml o
        pezzi). La demo non applica conversioni arbitrarie.
      </div>
    </>
  );
}
export function Customers() {
  const { state: s, act } = useApp();
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(0),
    [customer, setCustomer] = useState<Customer | null>(null);
  const rows = (s.customers ?? []).filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="CLIENTI E FEDELTÀ"
        title="Riconoscere chi torna."
        description="Schede fittizie e saldi distinti: credito pagato, bonus promozionale e punti."
      />
      <Panel
        title="Clienti demo autorizzati"
        subtitle="Sono visibili solo i clienti associati alla sede, salvo l’amministrazione del gruppo."
        action={
          <SearchBox
            value={query}
            onChange={(q) => {
              setQuery(q);
              setPage(0);
            }}
            placeholder="Cerca cliente demo"
          />
        }
      >
        <div className="customer-grid">
          {rows.slice(page * 8, page * 8 + 8).map((c) => (
            <article className="customer-card" key={c.id}>
              <div className="person-cell">
                <span className="avatar">
                  {c.name
                    .split(' ')
                    .map((x) => x[0])
                    .join('')}
                </span>
                <div>
                  <h3>{c.name}</h3>
                  <small>
                    {c.visits} visite demo · {c.phone}
                  </small>
                </div>
              </div>
              <div className="wallet-grid">
                <div>
                  <Wallet size={16} />
                  <small>Credito pagato</small>
                  <strong>{money(c.credit)}</strong>
                </div>
                <div>
                  <Gift size={16} />
                  <small>Bonus separato</small>
                  <strong>{money(c.bonus)}</strong>
                </div>
                <div>
                  <Star size={16} />
                  <small>Punti</small>
                  <strong>{number(c.points)}</strong>
                </div>
              </div>
              <div className="customer-card-footer">
                <span className="small muted">
                  Consenso marketing:{' '}
                  {c.marketingConsent ? 'demo presente' : 'demo assente'}
                </span>
                <button className="button small" onClick={() => setCustomer(c)}>
                  Ricarica demo
                </button>
              </div>
            </article>
          ))}
        </div>
        {!rows.length && <Empty title="Nessun cliente trovato" />}
        <Pagination count={rows.length} page={page} setPage={setPage} />
      </Panel>
      <div className="info-box">
        Il bonus è visibile ma non spendibile in questa fase. I punti demo
        vengono attribuiti alla chiusura del conto. Le ricariche non aumentano
        le vendite di consumazioni.
      </div>
      {customer && (
        <Modal
          title={`Ricarica · ${customer.name}`}
          description="Simulazione di denaro caricato dal cliente. Non genera automaticamente un bonus o una vendita."
          onClose={() => setCustomer(null)}
        >
          <ActionForm
            label="Registra ricarica simulata"
            onCancel={() => setCustomer(null)}
            onSubmit={async (f) => {
              await act('topup', {
                venueId: s.venueId === 'all' ? 'centro' : s.venueId,
                customerId: customer.id,
                amount: Math.round(
                  Number(String(f.get('amount')).replace(',', '.')) * 100,
                ),
              });
              setCustomer(null);
            }}
          >
            <Field
              label="Importo in euro"
              name="amount"
              inputMode="decimal"
              placeholder="100,00"
            />
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
export function Temperatures() {
  const { state: s, act } = useApp();
  const [alert, setAlert] = useState<Alert | null>(null);
  return (
    <>
      <PageTitle
        eyebrow="CONTROLLO APPARECCHIATURE"
        title="La temperatura giusta. Sotto controllo."
        description="Simulatore dimostrativo: nessuna misura reale o dichiarazione di conformità HACCP."
        actions={<Badge status="simulated">Sensori simulati</Badge>}
      />
      <div className="temperature-grid">
        {s.alerts.map((a) => (
          <article key={a.id} className={`temperature-card ${a.type}`}>
            <div className="temperature-head">
              <span
                className={`soft-icon ${a.type === 'temperature' ? 'danger' : ''}`}
              >
                {a.type === 'offline' ? (
                  <WifiOff size={22} />
                ) : (
                  <Thermometer size={22} />
                )}
              </span>
              <Badge
                status={
                  a.status === 'acknowledged'
                    ? 'acknowledged'
                    : a.type === 'normal'
                      ? 'normal'
                      : a.type === 'offline'
                        ? 'pending'
                        : 'error'
                }
              >
                {a.status === 'acknowledged'
                  ? 'Presa in carico'
                  : a.type === 'normal'
                    ? 'Regolare'
                    : a.type === 'offline'
                      ? 'Nessuna lettura'
                      : 'Fuori soglia'}
              </Badge>
            </div>
            <h2>{a.name}</h2>
            <p>{s.venues.find((v) => v.id === a.venueId)?.name}</p>
            <div className="temperature-value">
              {a.value === null ? '—' : number(a.value)}
              <span>°C</span>
            </div>
            <div className="temperature-detail">
              <span>Soglie demo configurate</span>
              <strong>
                {a.min} / {a.max} °C
              </strong>
            </div>
            <div className="temperature-detail">
              <span>Ultima lettura simulata</span>
              <strong>{time(a.lastReading)}</strong>
            </div>
            <p className="small muted">{a.note}</p>
            {a.operatorNote && (
              <div className="info-box small">
                Presa in carico: {a.operatorNote}
              </div>
            )}
            {a.type !== 'normal' && a.status !== 'acknowledged' && (
              <button className="button full" onClick={() => setAlert(a)}>
                Prendi in carico
              </button>
            )}
            {a.type === 'normal' && (
              <p className="success-text small inline-icon">
                <Check size={15} />
                Nessuna anomalia simulata
              </p>
            )}
          </article>
        ))}
      </div>
      {!s.alerts.length && (
        <Panel>
          <Empty title="Nessuna apparecchiatura simulata in questa sede" />
        </Panel>
      )}
      <div className="info-box">
        Un sensore senza nuove letture non indica una temperatura regolare. Le
        soglie sono esempi per le apparecchiature demo e devono essere validate
        nel pilota.
      </div>
      {alert && (
        <Modal
          title="Presa in carico dell’anomalia"
          description={
            alert.name + ' · la presa in carico non equivale alla risoluzione.'
          }
          onClose={() => setAlert(null)}
        >
          <ActionForm
            label="Registra presa in carico"
            onCancel={() => setAlert(null)}
            onSubmit={async (f) => {
              await act('alert', { alertId: alert.id, note: f.get('note') });
              setAlert(null);
            }}
          >
            <Field
              label="Nota operatore"
              name="note"
              maxLength={200}
              placeholder="Es. verifica della porta programmata nel test"
            />
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
export function Notifications() {
  const { state: s } = useApp();
  return (
    <>
      <PageTitle
        eyebrow="CENTRO NOTIFICHE"
        title="Ogni comunicazione, al suo posto."
        description="Anteprime locali degli eventi di servizio. Nessuna email o messaggio WhatsApp viene inviato."
      />
      <Panel
        title="Registro comunicazioni simulate"
        subtitle={`${s.notifications.length} eventi · dal più recente`}
      >
        <div className="notification-list">
          {[...s.notifications]
            .reverse()
            .slice(0, 30)
            .map((n) => (
              <article key={n.id}>
                <span className="soft-icon">
                  <Bell size={19} />
                </span>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  <small>
                    {time(n.at)} ·{' '}
                    {s.venues.find((v) => v.id === n.venueId)?.name}
                  </small>
                </div>
                <Badge status="simulated" />
              </article>
            ))}
        </div>
        {!s.notifications.length && (
          <Empty
            title="Nessuna comunicazione"
            description="Una nuova richiesta di prenotazione genererà un evento simulato."
          />
        )}
      </Panel>
    </>
  );
}
const roles = [
  ['admin', 'Amministrazione', 'Consolidato, configurazioni e dati economici'],
  ['manager', 'Responsabile', 'Operatività e controllo della sede'],
  ['reception', 'Accoglienza', 'Prenotazioni, arrivi e predisposizione tavoli'],
  ['waiter', 'Sala', 'Tavoli, ordinazioni e portate pronte'],
  ['kitchen', 'Cucina', 'Preparazioni food e apparecchiature'],
  ['bar', 'Bar', 'Solo preparazioni beverage'],
  ['cashier', 'Cassa', 'Conti e pagamenti simulati'],
  ['warehouse', 'Magazzino', 'Scorte, ricezioni e inventari'],
];
export function Settings({
  switchUser,
}: {
  switchUser: (role: string) => void;
}) {
  const { state: s, act } = useApp();
  const [reset, setReset] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow="CONFIGURAZIONE DELLA DEMO"
        title="Una regia. Postazioni dedicate."
        description="Ogni account ha un’identità e un perimetro operativo verificato dal server."
      />
      <Panel
        title="Accessi e postazioni"
        subtitle="Password demo per tutti gli account: Demo2026! · sessioni individuali di 8 ore"
      >
        <div className="workstations">
          {roles.map(([role, name, description]) => (
            <div key={role}>
              <span className="soft-icon">
                <MonitorSmartphone size={21} />
              </span>
              <div>
                <h3>{name}</h3>
                <p>{description}</p>
                <code>{role}</code>
              </div>
              <button className="button small" onClick={() => switchUser(role)}>
                Apri accesso
                <ArrowUpRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </Panel>
      <TipTaxSettings />
      <div className="settings-grid">
        <Panel
          title="Confini della demo"
          subtitle="Un ambiente per provare il flusso, prima del pilota."
        >
          <ul className="check-list">
            <li>
              <ShieldCheck size={17} />
              Cinque sedi e permessi controllati lato server.
            </li>
            <li>
              <Wallet size={17} />
              Pagamenti, ricariche, punti e bonus dimostrativi.
            </li>
            <li>
              <Bell size={17} />
              Stampa, comunicazioni e sensori simulati.
            </li>
            <li>
              <Code2 size={17} />
              Persistenza SQLite e log delle operazioni.
            </li>
          </ul>
        </Panel>
        <Panel
          title="Ripristino dei dati"
          subtitle="Ricrea il set iniziale fittizio per ripetere una presentazione."
        >
          <p className="muted">
            Il ripristino cancella le operazioni della demo. È riservato
            all’amministrazione.
          </p>
          <button
            className="button danger-outline"
            disabled={s.user.role !== 'admin'}
            onClick={() => setReset(true)}
          >
            <RotateCcw size={16} />
            Ripristina dati demo
          </button>
        </Panel>
      </div>
      <Panel
        title="Registro operazioni"
        subtitle="Ultimi 12 eventi autorizzati della sede selezionata."
      >
        {s.audit?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ora</th>
                  <th>Operatore</th>
                  <th>Operazione</th>
                  <th>Motivazione</th>
                </tr>
              </thead>
              <tbody>
                {[...s.audit]
                  .reverse()
                  .slice(0, 12)
                  .map((a) => (
                    <tr key={a.id}>
                      <td>{time(a.at)}</td>
                      <td>{a.user}</td>
                      <td>{a.action}</td>
                      <td>{a.reason || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Nessuna operazione registrata"
            description="Esegui il percorso dimostrativo per popolare il registro."
          />
        )}
      </Panel>
      {reset && (
        <Modal
          title="Ripristina la demo"
          description="Le prenotazioni, le comande, i pagamenti, i fondi contanti e l’archivio documenti della demo saranno azzerati, insieme alle impostazioni sulle mance. Verrà ricreato il set iniziale."
          onClose={() => setReset(false)}
        >
          <ActionForm
            label="Ripristina dati demo"
            onCancel={() => setReset(false)}
            onSubmit={async () => {
              await act('reset', {});
              sessionStorage.removeItem('ristolandia-session');
              Object.keys(sessionStorage)
                .filter(
                  (key) =>
                    key.startsWith('ristolandia-drafts-') ||
                    key.startsWith('ristolandia-document-draft-'),
                )
                .forEach((key) => sessionStorage.removeItem(key));
              setReset(false);
            }}
          >
            <p className="form-error">
              Questa operazione sostituisce tutti i dati dimostrativi correnti.
            </p>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
