# Stato mantenuto del progetto

Aggiornato il 18 ottobre 2026. Fase: **demo collegata, non produzione**.

## Base consegnata

React 19 + TypeScript + Vite, backend HTTP Node 24, SQLite persistente. Otto account individuali demo, cinque sedi del gruppo fittizio La Corte, proiezioni e comandi autorizzati lato server. Domini, trasporto HTTP e persistenza separati; componenti UX e token condivisi.

Flusso operativo implementato: richiesta cliente → conferma e tavolo → arrivo/sessione → comande cucina e bar → preparazione/consumi teorici → servizio → pagamenti simulati → dashboard e riassetto. Moduli secondari come da README; confini e formule in ARCHITECTURE.md. Non sono presenti credenziali o integrazioni reali.

## Verifiche della consegna

- `npm test`: 41 test dominio/API/proxy/documenti, passati. Inclusi rollback, backup/restore, idempotenza, concorrenza, credito, magazzino, permessi e rifiuto organizzazione differente.
- `npm run build`: typecheck TypeScript e build Vite, passati.
- `npm run format:check`: formattazione coerente tramite Prettier.
- `npm run test:browser`: 13 scenari Chromium: desktop, intero percorso operativo, palmare a 390 px, accessibilità login/dashboard, tutte le 13 sezioni con controllo axe e layout stretto, validazione e richiesta pubblica.
- Audit statico Frontend Design Premium in modalità strict: 0 errori/avvisi; evidenza premium-audit.json. Non sostituisce i test browser.
- Lint ufficiale DESIGN.md: 0 errori; 6 avvisi di token cromatici globali non referenziati da una specifica voce componente. I token sono implementati nel CSS globale e documentati nella mappatura.
- Screenshot di verifica: dashboard-desktop.png, sala-mobile.png, cassa-demo.png, bolle-archivio.png e palmare-portate.png in questa cartella.

Durante la revisione sono stati corretti: overflow mobile dei cataloghi e delle tabelle, nomi accessibili dei campi, focus dei dialoghi e della navigazione mobile, contrasto testo/stati, coerenza del set demo e costi ingredienti nell’unità base. Il pannello persistente del palmare rende raggiungibile la comanda senza scorrere l’intero catalogo.

## Correzione accesso Codespaces

Corretto il rifiuto del login dietro il proxy HTTPS di Codespaces: l'origine esterna viene riconosciuta dalle variabili dell'ambiente per le porte 5173/3001. Il server non si fida di intestazioni forwarded arbitrarie e non accetta wildcard. Quattro test aggiuntivi coprono login/lettura/logout dietro host interno, accesso locale, rifiuto di altre origini e validazione della configurazione. Per applicare la correzione a un Codespace già aperto: fermare il processo, aggiornare da main e riavviare `npm run dev`. Non serve reinstallare dipendenze o ripristinare dati.

## Correzione inoltro locale VS Code

Aggiunto supporto alle origini HTTP loopback sulla sola porta 5173, attivo esclusivamente tramite `npm run dev`. La correzione copre il caso del browser aperto su `http://127.0.0.1:5173` con Host riscritto dal tunnel. Tre test aggiuntivi verificano login e lettura attraverso un vero proxy Vite, blocco cross-origin e assenza dell’eccezione nella configurazione produttiva. Build e 25 test passati. Vite ora rifiuta una porta 5173 occupata invece di spostarsi automaticamente su un’altra porta.

## Uscite nel palmare e in cucina

Implementata la scelta da 1ª a 20ª uscita per prodotto, distinta dalla categoria del menu. Il selettore principale si applica alle nuove aggiunte; ogni riga è modificabile prima dell'invio. Righe con lo stesso prodotto in uscite diverse hanno identità, quantità e note indipendenti, conservate nella bozza per account/sessione. Il server valida e fotografa `serviceRound` su ogni riga; lo restituisce alle proiezioni di reparto. Cucina, bar e anteprime ordinano le righe per uscita; i dati storici senza uscita restano non specificati. Limiti/default condivisi in `shared/service-rounds.json`.

Verificati: persistenza, idempotenza e rifiuto uscite non valide; scenario browser con stesso piatto in uscite diverse, modifica, nota, ricaricamento bozza, raggruppamento cucina e stampa. 40 test dominio/API/proxy/documenti e 7 scenari browser passati, build/typecheck riusciti.

## Estensione cassa e bolle

Cassa: aggiunte dal catalogo con invio ai reparti; correzioni motivate di quantità/prezzo e sconti di riga in euro/percentuale; annullamenti senza cancellazione dello storico. Le quantità preparate restano immutate dopo ready/served; le quantità economiche sono distinte. Conti chiusi bloccati e correzioni sotto il pagato rifiutate. Le voci precedenti e il menu non vengono riscritti. Gli annullamenti recenti restano visibili nel monitor cucina per 30 minuti e generano una comanda simulata riconoscibile di annullamento.

Contanti: registro per taglio e giornata demo, fondo separato dagli incassi, calcolatrice di somma consegnata, resto minimo in pezzi con disponibilità effettiva. I pagamenti aggiornano contemporaneamente registri, tagli, credito e stato conto. Incassi storici senza dettaglio dei tagli esclusi dal fondo disponibile. Mance separate, aliquota nulla fino a scelta esplicita admin, stima d'imposta e aliquota fotografate per pagamento.

Documenti: originali persistenti con hash, sede e autorizzazioni; estrazione locale PDF/OCR, classificazione assistita cucina/bevande/materiali sala; carico multiriga solo dopo verifica, costi mancanti dichiarati, doppio file e doppio documento impediti. Archivio ricercabile e collegamenti ai movimenti, download protetti. Bozze di verifica conservate per utente/documento nello stesso browser. Setup lettori in scripts/setup-documents.sh e CI. OCR verificato qui anche con il modello inglese disponibile, segnalato nella UI; installazione italiana predisposta per Codespaces.

Verifiche: 40 test dominio/API/proxy/documenti e 12 scenari browser, comprese foto realmente lette tramite Tesseract, PDF testuale, persistenza dell'originale dopo riavvio, permessi, correzioni/sconti, errori di resto e pagamento su telefono. Build/typecheck e formattazione verificati.

## Limiti da conoscere prima di continuare

- Una sola organizzazione demo; non è un SaaS multitenant pronto. Le identità di altre organizzazioni sono rifiutate, ma manca un database produttivo normalizzato con più tenant effettivi.
- Password demo pubblica e sessioni in memoria. Riavvio server = nuovo accesso. Nessuna gestione reale utenti/password.
- Giornata fissata al seed, rinnovo mediante reset. Slot/durata/capienza semplici, niente unione tavoli, riassegnazione avanzata, liste attesa o no-show operativo.
- Note operative; niente varianti commerciali con modifica prezzi/ingredienti. Catalogo consultivo.
- Clienti pubblici non vengono associati automaticamente ad anagrafiche esistenti. Per il credito usare tavolo 01 del set iniziale.
- Bonus consultivo e punti demo; correzioni/sconti/annullamenti prima della chiusura con audit. Niente rimborsi su conti chiusi, spendibilità bonus o integrazione fiscale.
- Bolle: upload e archivio JPEG/PNG/PDF, estrazione testo/OCR locale e verifica prima del carico multiriga. Non implementati lotti, scadenze e riconoscimento universale dei formati. Originali sul volume del server, da includere nei backup.
- Polling 5 secondi; offline blocca operazioni, non sincronizza dati. Uno snapshot JSON SQLite è una scelta demo.
- Allarmi generati dal simulatore; presa in carico, nessuna risoluzione o misura reale presunta. Code di stampa e messaggi sono registri dimostrativi.
- I test automatici non certificano accessibilità, sicurezza o conformità normativa. Non verificati dispositivi reali, Safari/iOS, hardware di cassa/stampa o carico produttivo.

## Prossima sessione Codex

Leggere AGENTS.md e il README, eseguire scripts/cloud-setup.sh, controllare git status. Concordare un sottoflusso della ROADMAP prima di estendere la demo. Conservare regole di dominio e componenti canonici; aggiornare questo stato dopo modifiche rilevanti.

## Palmare mobile compatto

Catalogo mobile a tre colonne con dettagli ingredienti/allergeni/preparazione, interruttori combinabili AYCE e preferenze alimentari, tavolo attivo sempre leggibile senza tendine o titolo introduttivo. Pannello inferiore non modale con portate 1–3 e aggiunta fino a 20, riduzione tramite trascinamento o pulsante e ampliamento per modificare righe. Note, quantità, rimozione bozze e spostamento portata; invio bevande separato che conserva i piatti e mantiene la bozza in caso di errore. Schede informative dimostrative esplicite, senza certificare allergie o contaminazioni; AYCE filtra senza cambiare prezzi.

Verifica browser dedicata: dettagli e filtri combinati, quarta portata, note cibo/bevande, invio parziale con errore e retry, persistenza al refresh, invio successivo cibo, rimozione riga, trascinamento, alternativa con pulsante, assenza risultati, axe AA e larghezze 320/390/600/820 px. Gli scenari preesistenti verificano note e uscite nei reparti e nella stampa.

### Righe comanda compatte

Righe della bozza rese orizzontali con nome, prezzo e quantità `+ numero −` a destra; nessuna etichetta uscita ripetuta sul mobile. Tocco riga per nota nel dialogo condiviso, testo nota visibile sotto il nome. Swipe a sinistra per rivelare Elimina, con alternativa nel popup e tasto Delete/Escape. Il decremento a 1 non cancella la riga: si usa l’azione dedicata. Verifica browser estesa con altezza riga compatta, quantità senza popup, nota salvata, swipe senza apertura involontaria e accesso da tastiera alla rimozione.
