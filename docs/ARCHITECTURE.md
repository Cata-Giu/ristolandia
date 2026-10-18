# Architettura e decisioni demo

Fonte: SPECIFICA.txt, priorità fase 1. Il sistema è un monolite modulare dimostrativo, non un SaaS completo.

## Confini

- `src/pages`: superfici specifiche per lavoro, con navPermissions centralizzato nel contesto.
- `src/components/ui.tsx`: componenti canonici. CSS e DESIGN.md costituiscono un solo linguaggio visivo.
- `server/domain.mjs`: comandi, stati, autorizzazioni, proiezioni per ruolo, calcoli e idempotenza. Non importa HTTP o database.
- `server/repository.mjs`: SQLite (`node:sqlite` in Node 24); transazione BEGIN IMMEDIATE e rollback. Snapshot JSON versionato con registri append-only per movimenti e pagamenti. Scelta adeguata a una demo piccola e facilmente ripristinabile; non adatta a volumi produttivi elevati.
- `server/index.mjs`: HTTP, cookie HttpOnly/SameSite, scadenza sessioni, validazione revisione, controlli origine, routing e servizio bundle.
- `server/seed.mjs`: un solo gruppo fittizio, cinque sedi, persone e anomalie fittizie.

Nessun adattatore esterno attivo: le integrazioni sono rappresentate da registri locali di simulazione. Preparare interfacce/adattatori reali soltanto dopo la verifica dei protocolli autorizzati.

## Accesso e concorrenza

Ogni ruolo ha identità individuale; la password pubblica della demo è intenzionale, non una soluzione produttiva. Sessioni in memoria con scadenza 8 ore: il riavvio richiede un nuovo accesso. Nessuna credenziale è salvata nel browser. Il server verifica ruolo, sede e reparto prima di leggere o mutare lo stato. La proiezione rimuove dati economici da cucina/bar/sala. Nel client i permessi limitano anche la navigazione.

Le mutazioni verificano l'origine contro l'host/protocollo della connessione diretta oppure le origini pubbliche esatte configurate. `server/origin.mjs` riconosce automaticamente i soli endpoint 5173/3001 del Codespace corrente; `APP_ORIGIN` configura un altro proxy. Le intestazioni inoltrate non autorizzano da sole un'origine. Il login HTTPS con origine validata imposta anche Secure sul cookie. Origini invalide, altri Codespaces e altre porte restano rifiutati con 403.

Il launcher `npm run dev` imposta `RISTOLANDIA_DEV_MODE=1` soltanto nel processo API, autorizzando le origini loopback HTTP esatte sulla porta 5173 (`127.0.0.1`, `localhost`, `[::1]`). Questo copre l’inoltro locale di VS Code quando Host viene riscritto. `npm start` non abilita tale eccezione. Vite usa `strictPort` per evitare passaggi silenziosi a porte diverse. I test del proxy eseguono richieste reali attraverso Vite e verificano anche il rifiuto delle origini esterne.

Revisione globale ottimistica: la mutazione verifica expectedRevision; modifiche concorrenti producono 409 e obbligano a rileggere. La transazione SQLite serializza scritture e tutela anche saldo credito. Chiave di idempotenza per utente/azione/contenuto: i retry hanno lo stesso esito; una chiave riciclata con contenuto diverso viene rifiutata. Il client conserva la chiave per errori di rete con esito incerto.

Il consolidato è consentito soltanto all'admin. La demo contiene un'unica organizzazione: **non dimostra ancora un isolamento multitenant produttivo**. Nel pilota organizzazione e sede devono diventare chiavi obbligatorie di tutte le entità nelle tabelle normalizzate, con test su almeno due organizzazioni e query autorizzate per tenant.

## Regole operative della prima demo

Prenotazioni 1–6 persone, slot a mezz'ora nei turni dichiarati, permanenza fissa 120 minuti, singolo tavolo di capienza sufficiente. La disponibilità verifica combinazioni già assegnate, non sottrae solo i coperti totali. Unioni tavoli e regole avanzate non sono implementate. Richieste pending non riservano definitivamente il tavolo: il conflitto viene ricontrollato alla conferma. L'arrivo può aprire la sessione soltanto nel giorno della prenotazione, con tavolo libero.

Sessione distinta dal tavolo fisico; nessuna prenotazione genera ordini o incassi. Il server fotografa prezzo e ricetta di ogni riga. Le note operative non cambiano il prezzo o la ricetta. Le varianti commerciali con effetti su consumi/prezzo non sono implementate, la UI lo dichiara.

Ordini incrementali: ogni invio crea soltanto le nuove righe e le smista. Riga: sent → preparing → ready → served, oppure annullamento motivato da admin/responsabile. Alla transizione ready viene registrato una sola volta il consumo teorico. Prima di ready l'annullamento elimina il fabbisogno; dopo ready non restituisce ingredienti. Preparazione e chiusura economica restano indipendenti: la cassa può chiudere anche mentre una riga non è servita; una sessione chiusa non accetta altre modifiche.

Ricezione demo: un articolo per documento, chiave univoca sede+fornitore+numero documento (anno non modellato nella prima demo). Rettifica inventario = conteggio fisico fittizio meno saldo teorico; motivazione e operatore tracciati. Trasferimento con uscita, stato in transito e carico alla ricezione. La prima UI di creazione trasferimenti è admin, ricezione consentita alla destinazione.

## Formule economiche

- Importi commerciali in centesimi interi. Input euro convertiti in centesimi una volta al confine UI; server ammette solo interi positivi sicuri.
- Totale consumazioni: somma quantità × prezzo storico delle righe non annullate. Alcuni conti iniziali hanno una fotografia totale storica dichiarata nel seed.
- Vendite chiuse: totale consumazioni delle sessioni chiuse nel periodo. Le vendite aperte non entrano nel KPI.
- Incassi esterni: soli pagamenti contanti/carta su consumazioni nel periodo. Utilizzi credito e ricariche sono separati; il KPI non è il saldo contabile/fiscale di cassa.
- Conto medio: vendite chiuse / numero conti chiusi; zero se non ci sono conti.
- Coperti serviti: coperti delle sessioni chiuse nel periodo. Conti separati demo mediante pagamenti parziali, senza creare sessioni fittizie aggiuntive.
- Credito pagato: somma registro credit; topup non crea vendita e consumo credito non viene nuovamente conteggiato negli incassi esterni.
- Bonus: registro distinto, consultivo e non spendibile. Nessuna regola promozionale reale presunta.
- Punti: regola solo demo di 1 punto per euro intero sul totale consumazioni, alla chiusura del conto e solo su cliente già identificato. Le visite aumentano una volta. Non esiste identificazione automatica tramite nome o telefono.
- Costo ricetta: quantità base × costo fisso iniziale per ingrediente. Incidenza = costo ricetta / prezzo lordo demo × 100. Non è utile netto né food cost effettivo. Recipe incompleta = costo non disponibile.
- Unità g/ml/pz; costi unitari frazionari in centesimi per g/ml, arrotondamento soltanto per presentazione del costo piatto. Nessun importo di pagamento dipende dai float di valorizzazione ingredienti.

## Tempo, persistenza e ripristino

Timestamp UTC epoch, rendering Europe/Rome; giorni civili ISO separati dagli istanti. La giornata demo viene fissata al seed/reset per rendere ripetibile il percorso: per una nuova giornata ripristinare la demo. Il timezone viene gestito da Intl anche nei cambi ora.

Bozze palmare in sessionStorage per identità; i dati operativi sono sul server. Poll ogni 5 s con protezione da risposte fuori ordine. Offline non abilita salvataggi né falsi successi. Nessuna sincronizzazione offline produttiva.

La CLI salva/ripristina lo snapshot; il test repository verifica integrità dopo backup, restore e rollback. La UI reset ricrea il seed; la revisione continua ad aumentare. In produzione servono versionamento migrazioni, backup SQLite consistenti, cifratura/policy accesso e prova recovery su infrastruttura reale.

## API essenziale

GET `/api/demo-info`; POST `/api/login`, `/api/logout`; GET `/api/state?venue=centro|all`; POST `/api/public/book`; POST `/api/actions/{action}`. Mutazioni autenticate con `Idempotency-Key` e `expectedRevision` nel body. Comandi documentati dalle mappe e test del dominio. Errori 401 accesso, 403 autorizzazione, 409 concorrenza/conflitto, 422 validazione. Tutti i dati API sono no-store.
