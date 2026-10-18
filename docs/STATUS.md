# Stato mantenuto del progetto

Aggiornato il 18 ottobre 2026. Fase: **demo collegata, non produzione**.

## Base consegnata

React 19 + TypeScript + Vite, backend HTTP Node 24, SQLite persistente. Otto account individuali demo, cinque sedi del gruppo fittizio La Corte, proiezioni e comandi autorizzati lato server. Domini, trasporto HTTP e persistenza separati; componenti UX e token condivisi.

Flusso operativo implementato: richiesta cliente → conferma e tavolo → arrivo/sessione → comande cucina e bar → preparazione/consumi teorici → servizio → pagamenti simulati → dashboard e riassetto. Moduli secondari come da README; confini e formule in ARCHITECTURE.md. Non sono presenti credenziali o integrazioni reali.

## Verifiche della consegna

- `npm test`: 18 test dominio/API, passati. Inclusi rollback, backup/restore, idempotenza, concorrenza, credito, magazzino, permessi e rifiuto organizzazione differente.
- `npm run build`: typecheck TypeScript e build Vite, passati.
- `npm run format:check`: formattazione coerente tramite Prettier.
- `npm run test:browser`: 6 scenari Chromium: desktop, intero percorso operativo, palmare a 390 px, accessibilità login/dashboard, tutte le 12 sezioni con controllo axe e layout stretto, validazione e richiesta pubblica.
- Audit statico Frontend Design Premium in modalità strict: 0 errori/avvisi; evidenza premium-audit.json. Non sostituisce i test browser.
- Lint ufficiale DESIGN.md: 0 errori; 6 avvisi di token cromatici globali non referenziati da una specifica voce componente. I token sono implementati nel CSS globale e documentati nella mappatura.
- Screenshot di verifica: dashboard-desktop.png e sala-mobile.png in questa cartella.

Durante la revisione sono stati corretti: overflow mobile dei cataloghi e delle tabelle, nomi accessibili dei campi, focus dei dialoghi e della navigazione mobile, contrasto testo/stati, coerenza del set demo e costi ingredienti nell’unità base. La barra mobile del palmare rende raggiungibile il riepilogo senza scorrere l'intero catalogo.

## Limiti da conoscere prima di continuare

- Una sola organizzazione demo; non è un SaaS multitenant pronto. Le identità di altre organizzazioni sono rifiutate, ma manca un database produttivo normalizzato con più tenant effettivi.
- Password demo pubblica e sessioni in memoria. Riavvio server = nuovo accesso. Nessuna gestione reale utenti/password.
- Giornata fissata al seed, rinnovo mediante reset. Slot/durata/capienza semplici, niente unione tavoli, riassegnazione avanzata, liste attesa o no-show operativo.
- Note operative; niente varianti commerciali con modifica prezzi/ingredienti. Catalogo consultivo.
- Clienti pubblici non vengono associati automaticamente ad anagrafiche esistenti. Per il credito usare tavolo 01 del set iniziale.
- Bonus consultivo, punti secondo regola esplicitamente demo; niente rimborsi, storni, spendibilità bonus o integrazione fiscale.
- Ricezione un articolo per documento; niente upload documenti, lotti, scadenze o OCR.
- Polling 5 secondi; offline blocca operazioni, non sincronizza dati. Uno snapshot JSON SQLite è una scelta demo.
- Allarmi generati dal simulatore; presa in carico, nessuna risoluzione o misura reale presunta. Code di stampa e messaggi sono registri dimostrativi.
- I test automatici non certificano accessibilità, sicurezza o conformità normativa. Non verificati dispositivi reali, Safari/iOS, hardware di cassa/stampa o carico produttivo.

## Prossima sessione Codex

Leggere AGENTS.md e il README, eseguire scripts/cloud-setup.sh, controllare git status. Concordare un sottoflusso della ROADMAP prima di estendere la demo. Conservare regole di dominio e componenti canonici; aggiornare questo stato dopo modifiche rilevanti.
