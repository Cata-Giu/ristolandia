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

Accesso diretto: `/?role=kitchen`, `/?role=waiter`, ecc. Richiesta cliente: `/?public=booking`. Cambiare postazione dal profilo o da Impostazioni. Gli account demo pubblicamente noti non sono autenticazione adatta alla produzione. Anche le bolle devono contenere solo dati fittizi.

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
- Ricezioni manuali e da bolle multiriga con originali archiviati, deduplicazione, inventari e trasferimenti tracciati.
- Pagamenti parziali/misti simulati, credito pagato, ricariche e punti da registro; bonus consultivo separato.
- Dashboard derivata dalle operazioni, filtro sede/periodo demo, grafico orario ed esportazione CSV.
- Catalogo e ricette consultivi, costo teorico e incidenza; ricetta incompleta esplicita.
- Temperature normali, fuori soglia e assenza letture simulate, con presa in carico; registro comunicazioni simulate.
- Persistenza SQLite, backup/ripristino da CLI, controllo revisione e audit delle azioni sensibili.

## Uscite delle pietanze dal palmare

In **Ordinazioni**, selezionare “Uscita per i prossimi prodotti” prima di toccare +: 1ª, 2ª, 3ª e successive, fino alla 20ª uscita. Ogni riga del riepilogo ha anche il proprio selettore per cambiare uscita prima dell'invio. Lo stesso piatto può essere inserito in uscite diverse con quantità e note indipendenti.

Dopo l'invio, cucina e bar raggruppano le righe per uscita in ordine crescente. L'uscita compare anche nello storico del palmare e nell'anteprima di stampa. La categoria (antipasto, primo, secondo, ecc.) rimane separata: un primo può essere richiesto in prima, seconda o altra uscita. I reparti mantengono i propri comandi di preparazione; la scelta dell'uscita non avvia automaticamente le portate successive.

Le comande precedenti all'aggiornamento mostrano “Uscita non specificata”; le bozze precedenti sono mantenute e inizializzate alla prima uscita, modificabile prima dell'invio. Non occorre ripristinare i dati.

## Cassa: correzioni, sconti e mance

Su un conto aperto, **Aggiungi voce** invia un nuovo prodotto al reparto. **Modifica** corregge quantità e prezzo unitario; **Sconto € / %** applica uno sconto all'intera riga, in euro oppure in percentuale. **Annulla voce** conserva lo storico. Ogni correzione richiede una motivazione. Una riga già pronta/servita cambia soltanto nella quantità addebitata: non viene cancellata la preparazione né reintegrato il consumo. Le quantità ancora da preparare vengono aggiornate anche in cucina con una segnalazione riconoscibile.

I conti chiusi sono bloccati; le correzioni non possono scendere sotto quanto già pagato. Un conto azzerato o già saldato può essere chiuso senza inventare un nuovo pagamento. I rimborsi restano fuori dal perimetro.

Prima di usare il suggerimento del resto, registra i tagli disponibili con **Aggiungi fondo contanti**. Nel pagamento scegli **Contanti**, inserisci la somma consegnata usando tastiera/calcolatrice e specifica le banconote e monete effettivamente ricevute. Il sistema propone il resto esatto con il minimo numero di pezzi disponibili, includendo quelli ricevuti, e aggiorna il cassetto solo alla conferma. Se il resto non è componibile, il pagamento è bloccato. Limite demo: resto massimo 2.000 €. I vecchi incassi privi di tagli sono segnalati ed esclusi dalla disponibilità; il fondo non è una vendita.

Le mance sono separate dalle consumazioni e dai punti. In **Impostazioni → Aliquota simulata sulle mance**, l'amministrazione imposta una percentuale da 0 a 100%, con due decimali e motivazione. Nessuna aliquota fiscale viene presunta: finché non è configurata, non si registrano mance. Ogni pagamento conserva aliquota e imposta stimate originarie anche dopo una variazione. È una simulazione da validare con il consulente fiscale, senza versamenti o documenti fiscali. Le mance sono ammesse con carta/contanti, non con credito prepagato.

## Bolle, lettura automatica e archivio

Apri **Bolle e documenti** dal menu o da Magazzino (admin, responsabile e magazzino). Scegli la sede, carica un PDF/foto oppure usa **Scatta foto** dal telefono. Il file originale viene archiviato prima della verifica: lo puoi riaprire o scaricare dal registro. Cerca per nome file, fornitore, numero e data. I movimenti di carico contengono il collegamento **Apri bolla**. In Magazzino puoi filtrare gli articoli per Cucina, Bevande / bar e Materiali di sala.

Il server estrae testo dai PDF; per foto e PDF scansionati usa OCR locale. Non invia documenti a servizi esterni. Le righe riconosciute sono proposte per la verifica, distinguendo **Cucina**, **Bevande / bar** e **Materiali di sala** (es. tovaglie/tovaglioli). Quantità e unità vengono convertite solo quando compatibili. Verifica articolo, quantità, unità e costo; completa le righe mancanti e risolvi le confezioni specificandone il contenuto. La bozza di verifica si conserva nello stesso browser. **Conferma carico merce** genera un solo carico e crea gli eventuali nuovi articoli; originali e righe approvate restano consultabili dopo il riavvio.

Limiti: JPEG/PNG/PDF fino a 10 MB, immagini fino a 24 MP, PDF fino a 10 pagine, carico fino a 100 righe. OCR e riconoscimento di tabelle non garantiscono estrazione completa o corretta di qualsiasi formato: serve sempre verifica dell'originale. Se il motore non è disponibile o il file non è leggibile, l'archivio resta operativo e puoi inserire le righe manualmente. Costi non riconosciuti sono esplicitamente da definire. La deduplicazione verifica sia il contenuto del file per sede, sia fornitore/numero/anno al carico.

Per installare i lettori nel Codespace Ubuntu/Debian, una sola volta:

```bash
bash scripts/setup-documents.sh
```

Lo script installa Poppler, Tesseract e modello italiano tramite il gestore pacchetti del server. `scripts/cloud-setup.sh` li prepara automaticamente. Senza italiano, l'eventuale modello inglese viene usato con un avviso. Non è un servizio a pagamento.

Gli originali sono in `data/documents/` (oppure `DOCUMENT_DIRECTORY`), con accessi API verificati per ruolo e sede. Restano sul volume del Codespace e sono esclusi da Git: **salva anche questa cartella insieme al backup dei dati** e non eliminare l'unica copia del Codespace. Il backup JSON della CLI contiene registri e metadati, non i file binari. Il reset globale della demo azzera anche archivio, fondo e configurazione mance, come indicato nella conferma; non serve per aggiornare il software.

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
