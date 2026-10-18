# Ristolandia

Demo interattiva multisede per la ristorazione, con postazioni separate per accoglienza, sala, cucina, bar, cassa, magazzino e amministrazione.

**Solo dati fittizi.** Non elabora pagamenti reali, non emette documenti fiscali, non invia messaggi, non legge sensori e non stampa su hardware.

## Avvio

Richiede **Node.js 24 LTS** e npm.

```bash
npm ci
npm run dev
```

Aprire http://localhost:5173. API su porta 3001; Vite inoltra `/api` al server. Build distribuibile sul proprio server Node:

```bash
npm run build
npm start
```

Aprire http://localhost:3001. `PORT` cambia la porta; `DATA_PATH` cambia il file SQLite (default `data/demo.sqlite`). Più dispositivi si collegano allo **stesso server** e condividono i dati con aggiornamento ogni 5 secondi. In rete locale usare l'indirizzo del server; in cloud usare l'inoltro porte disponibile nell'ambiente. Non confondere localhost remoto e localhost del proprio computer.

## Avvio su GitHub Codespaces

Aprire Code → Codespaces → Create codespace on main nella repo. Nel terminale del Codespace eseguire `npm ci` e `npm run dev`, poi aprire la porta **5173** dalla scheda Ports. Il server riconosce automaticamente gli indirizzi HTTPS esatti del Codespace tramite `CODESPACE_NAME` e `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`; non occorre rendere pubbliche le porte.

Da VS Code desktop collegato al Codespace, l’inoltro locale può aprire `http://127.0.0.1:5173` oppure `http://localhost:5173`. Avviando con `npm run dev`, questi indirizzi esatti sono autorizzati anche se il tunnel riscrive l’host. La porta di Vite resta fissa su 5173: se già occupata, fermare l’altro processo anziché avviare una seconda copia. Questa autorizzazione locale non viene attivata da `npm start`; per un proxy produttivo usare `APP_ORIGIN`.

Se una versione precedente mostra “Origine della richiesta non autorizzata”, fermare il processo con Ctrl+C, eseguire `git pull --ff-only origin main`, riavviare `npm run dev` e ricaricare la scheda della demo. Gli aggiornamenti non azzerano il database.

Per un proxy diverso da Codespaces, impostare `APP_ORIGIN` sull'origine pubblica esatta (es. `https://demo.example.com`, senza percorso) prima di avviare il server. Non usare wildcard o disattivare il controllo delle origini.

## Accessi dimostrativi

Nella pagina di accesso selezionare il ruolo. Password comune per il solo ambiente demo: **`Demo2026!`**. Ogni account ha identità e sessione distinte.

| ID account | Persona fittizia | Postazione         | Sedi                |
| ---------- | ---------------- | ------------------ | ------------------- |
| admin      | Simone Riva      | Amministrazione    | Tutte e consolidato |
| manager    | Elena Conti      | Responsabile       | Centro              |
| reception  | Sofia Villa      | Accoglienza        | Centro              |
| waiter     | Marco Rosi       | Sala e ordinazioni | Centro              |
| kitchen    | Andrea Galli     | Cucina             | Centro              |
| bar        | Luca Neri        | Bar                | Centro              |
| cashier    | Giulia Sala      | Cassa              | Centro              |
| warehouse  | Paolo Rizzi      | Magazzino          | Centro              |

Accesso diretto: `/?role=kitchen`, `/?role=waiter`, ecc. Richiesta cliente: `/?public=booking`. Cambiare postazione dal profilo o da Impostazioni. Gli account demo pubblicamente noti non sono autenticazione adatta alla produzione.

## Percorso consigliato per la presentazione

1. Da `/?public=booking`, inviare una richiesta con nome e telefono fittizi (2 persone, ore 12:00 è una fascia libera nel set iniziale).
2. Accedere come Accoglienza: Prenotazioni → Conferma → assegnare un tavolo → Registra arrivo.
3. Passare a Sala: Ordinazioni → scegliere il tavolo appena aperto → aggiungere carbonara e acqua → inviare.
4. Cucina e Bar vedono soltanto il proprio reparto: Inizia → Segna pronta. Consultare anche l'anteprima e la coda di stampa simulata.
5. Sala segna le righe pronte come servite. Una seconda comanda aggiunge solo i nuovi prodotti.
6. Cassa: selezionare il conto, registrare un pagamento simulato, anche in più parti con metodi diversi.
7. Amministrazione: verificare vendite, incassi, movimenti e fabbisogno. Il tavolo chiuso rimane da riassettare.
8. Per dimostrare il credito, usare il tavolo 01 iniziale, già associato ad Alice Martini: credito pagato, bonus e punti restano distinti. I nuovi ospiti pubblici non sono identificati automaticamente come clienti esistenti.
9. Impostazioni → Ripristina dati demo per ripetere il percorso (solo admin, conferma esplicita).

## Cosa è operativo nella demo

- Cinque sedi, selettore e consolidato admin, controlli server dei ruoli e della sede.
- Prenotazioni pubbliche/interne, turni, capienza e conflitti temporali con permanenza demo di 120 minuti; conferma e arrivo separati.
- Pianta/lista tavoli, sessioni, apertura senza prenotazione e riassetto.
- Palmare responsive, quantità, note operative, bozze locali per account, invii incrementali e idempotenti.
- Smistamento cucina/bar, stati riga, servizio in sala, annullamenti motivati admin/responsabile.
- Anteprima comanda, coda ed errori di stampa simulati, ristampe senza effetti economici o sul magazzino.
- Fabbisogno da ordini aperti e scarico teorico al passaggio a pronto; movimenti tracciati.
- Ricezioni con deduplicazione documento, inventari con motivazione, trasferimenti in transito e ricezione distinta.
- Pagamenti parziali/misti simulati, credito pagato, ricariche e punti da registro; bonus consultivo separato.
- Dashboard derivata dalle operazioni, filtro sede/periodo demo, grafico orario ed esportazione CSV.
- Catalogo e ricette consultivi, costo teorico e incidenza; ricetta incompleta esplicita.
- Temperature normali, fuori soglia e assenza letture simulate, con presa in carico; registro comunicazioni simulate.
- Persistenza SQLite, backup/ripristino da CLI, controllo revisione e audit delle azioni sensibili.

## Verifiche

```bash
npm test                 # dominio e API con database temporanei/in memoria
npm run typecheck
npm run build
npm run format:check
npm run test:browser     # Chromium di sistema, default /usr/bin/chromium
```

Per Playwright su un ambiente senza browser di sistema:

```bash
npx playwright install --with-deps chromium
PLAYWRIGHT_USE_BUNDLED=1 npm run test:browser
```

Il test browser avvia automaticamente il server se la porta non è già occupata. **Il test del flusso ripristina il database di test**: usare un file dedicato, ad esempio `DATA_PATH=/tmp/ristolandia-qa.sqlite npm run test:browser`, senza un server demo già avviato su :3001. Vedere [verifica corrente](docs/STATUS.md).

## Lavoro continuativo con Codex cloud

La repo è autosufficiente: sorgenti, lockfile, CI, istruzioni agenti, specifica e contratti mantenuti. Non richiede credenziali applicative. In Codex selezionare questa repo e Node 24, poi eseguire:

```bash
bash scripts/cloud-setup.sh
npm run dev
```

Inoltrare la porta 5173 per l'anteprima, oppure 3001 per la build. Conservare il volume `data/` se si vogliono mantenere le prove tra riavvii; ambienti cloud effimeri non garantiscono persistenza dei file. Ogni nuovo accesso Codex deve leggere [AGENTS.md](AGENTS.md) e [stato del progetto](docs/STATUS.md). La CI GitHub verifica commit e pull request.

## Backup e ripristino

```bash
npm run backup -- /tmp/ristolandia-backup.json
# Arrestare il server prima di ripristinare:
CONFIRM_DEMO_RESTORE=yes npm run restore -- /tmp/ristolandia-backup.json
```

Backup e database esclusi da Git. Non usare dati reali in questi file.

## Confini e passaggio al pilota

Nessuna integrazione esterna è attiva. Stampanti/palmari, cassa fiscale/POS, WhatsApp ufficiale/email e sensori richiedono verifica tecnica e autorizzazione. Il pilota richiede autenticazione reale, isolamento organizzazioni su database progettato per più tenant, policy privacy/retention, regole commerciali validate e test hardware/rete. Dettagli, formule e limiti in [ARCHITECTURE.md](docs/ARCHITECTURE.md); attività successive in [ROADMAP.md](docs/ROADMAP.md).
