# Contratto UX

Fonte autorevole: [specifica fornita](docs/SPECIFICA.txt). Decisioni strettamente dimostrative in [architettura](docs/ARCHITECTURE.md). Nessuna politica produttiva viene dedotta dalla UI.

| Capability     | Canonical owner                               | Source of truth                 | Allowed variants            | Verification                               |
| -------------- | --------------------------------------------- | ------------------------------- | --------------------------- | ------------------------------------------ |
| Select/Listbox | select nativo tramite Field e selettori shell | DESIGN.md                       | native                      | tests/browser/app.spec.ts                  |
| Date           | input date nativo tramite Field               | DESIGN.md                       | native                      | tests/browser/app.spec.ts                  |
| Form           | ActionForm e Field in src/components/ui.tsx   | specifica §26, questo contratto | create / operational        | tests/browser/app.spec.ts                  |
| Scrollbar      | src/styles.css globale                        | DESIGN.md                       | geometry exceptions         | tests/browser/app.spec.ts                  |
| Toast          | App.tsx toast-region                          | questo contratto                | success / error             | tests/browser/app.spec.ts                  |
| CRUD           | API actions e dominio server/domain.mjs       | specifica §§5–13                | create / transition / reset | tests/domain.test.mjs e tests/api.test.mjs |

## Comportamento comune

Crea/modifica: dialogo → invio bloccato mentre in corso → scrittura atomica → aggiornamento dati → chiusura dialogo e feedback. Fallimento: mantenere valori, mostrare errore persistente nel dialogo, focus sul messaggio. Dati simultanei cambiati: HTTP 409, aggiornare e chiedere verifica prima di ripetere. Le azioni con esito incerto usano la medesima chiave di idempotenza nel retry.

Dialoghi: unico Modal con dialog nativo, sfondo inerte, Escape, ripristino focus. Il pulsante di chiusura riceve il focus iniziale. Reset e annullamenti richiedono conferma; annullamenti anche motivazione. Il foglietto è solo anteprima, nessuna chiamata window.print.

Ricerca locale e transitoria, con pulsante cancella e focus restituito all'input. Pagine e ricerche non sono condivisibili per la natura demo dei dati: questa è un'eccezione esplicita alla persistenza dei filtri in URL. Le sole sezione e sede sono in URL. Le tabelle sono paginate (8 righe); code e registri recenti dichiarano il limite. Nessun table selection.

Bozze sala salvate in sessionStorage per account: restano cambiando schermata, non vengono inviate offline. Nessun dato reale. Dati di dominio salvati soltanto sul server SQLite; polling ogni 5 secondi. Il client non è il confine di sicurezza. Ruoli e sedi vengono verificati dal server per ogni lettura/scrittura.

## Conseguenze delle fonti di business

| Tema           | Fonte                | Conseguenza UI                                                                              |
| -------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| Permessi       | specifica §§3–4, 18  | Postazioni dedicate e server 403; cucina/bar senza valori economici                         |
| Ciclo vita     | specifica §§5–8      | Richiesta → conferma tavolo → arrivo → sessione distinta; portate con stati propri          |
| Consumi        | specifica §10.3      | Fabbisogno a invio, scarico teorico a pronto, nessun reintegro automatico post-preparazione |
| Pagamenti      | specifica §§12–14    | Solo simulati, importi in centesimi, credito/bonus/punti separati                           |
| Eliminazione   | specifica §22        | Nessun hard delete selettivo; solo reset globale confermato dell'ambiente demo              |
| Dati personali | specifica §§2, 18.4  | Dati fittizi, nessuna acquisizione reale autorizzata                                        |
| Hardware/legal | specifica §§8, 16–17 | Stampa, sensori, messaggi esplicitamente simulati; nessuna promessa fiscale/HACCP/GDPR      |

## Limiti espliciti

Correzioni di riga e sconti motivati prima della chiusura; nessun rimborso su conto chiuso o salvataggio operativo offline. Moduli secondari dichiarati dimostrativi o consultivi. WCAG AA è obiettivo di verifica automatica e revisione, non certificazione. I popup nativi dipendono da browser e sistema operativo.

## Uscite di servizio

Fonte: specifica §7.2 e richiesta utente di scegliere prima/seconda/terza uscita nel palmare e riportarla in cucina. `ServiceRoundSelect` è il selettore nativo condiviso per desktop e dialoghi; sul palmare `Orders` usa pulsanti numerati per la stessa scelta. Entrambe le varianti sono governate da `shared/service-rounds.json`; `serviceRoundLabel` è l'unico formato del nome dell'uscita. La scelta principale vale per le prossime aggiunte; il selettore di riga desktop o il campo Portata della voce nel dialogo modifica solo quella bozza. Le uscite inviate sono storicizzate, visibili al reparto e nella stampa. Nessun automatismo sull'avvio della preparazione.

## Cassa e documenti

Fonte: richiesta utente di correzione conto, sconti, calcolo resto per taglio, mance configurabili e lettura/archivio delle bolle; specifica §§8, 10, 13, 15, 18. `shared/finance.mjs` è proprietario unico di parse euro, calcolo sconti/imposta e suggerimento resto; frontend e server usano le stesse funzioni. DenominationInput e CashKeypad sono controlli condivisi della cassa; aliquota solo admin, mai presunta. Annullare conserva la riga e il magazzino già consumato. Nessuna modifica riduce il totale sotto il pagato.

Documenti: upload → archivio originale → estrazione con esito esplicito → verifica righe → conferma atomica carico → dettaglio documento ricevuto. Il tasto Torna all'archivio conserva la bozza locale per documento/utente; le conferme rimuovono tale bozza. Archive list paginata; proposta limitata a 100 righe per documento, rendered all per revisione contro l'originale. Errori persistenti e valori conservati, nessun carico su mera estrazione. Solo admin/responsabile/magazzino vedono originali e proposte, con confine sede server. Se cambia la sede attiva si chiude il dettaglio precedente. Nessuna immagine o PDF è inviato a servizi terzi.

## Palmare compatto e invio bevande

Fonte: richiesta utente di catalogo mobile compatto, schede pietanze, interruttori dietetici/AYCE e pannello inferiore per portate. `Orders` possiede la comanda persistente non modale: selettori numerati per le prossime aggiunte, 1–3 iniziali, `+` fino al limite condiviso di 20. Sul mobile mostra le righe della portata scelta; quantità e totale della comanda comprendono tutte le portate. Trascinamento sulla maniglia, pulsante apri/riduci ed espandi sono equivalenti; nessun focus trap o sfondo inerte. Le note e lo spostamento di portata sono salvati dal Modal/ActionForm canonico; annullare conserva i valori precedenti. Rimozione di una bozza reversibile ricreandola, nessuna cancellazione di righe già inviate dalla sala.

Invia bevande seleziona solo righe bar in tutte le portate: anteprima → azione `send` esistente con revisione e idempotenza → rimozione delle sole righe confermate dalla bozza. Il cibo resta da inviare; fallimento conserva l’anteprima e tutte le righe. Note e uscite passano al reparto e alla stampa come gli altri invii. Il cambio tavolo sul telefono passa dal menu laterale → Sala e tavoli → comanda del tavolo.

Filtri locali combinabili in AND, espliciti e indipendenti dall’ordine: AYCE significa voci dichiarate incluse nel catalogo demo, senza effetti su prezzi o conto. `shared/menu-details.json` è il catalogo informativo dei prodotti dimostrativi; il server lo usa come fallback per gli archivi precedenti, lasciando prevalere metadati già salvati nel prodotto. Nessuna classificazione dietetica o assenza di allergeni viene dedotta dalla ricetta di magazzino. Informazioni assenti sono dichiarate da verificare; schede e filtri non certificano contaminazioni o idoneità per allergie.

### Righe compatte della bozza

Fonte: richiesta utente di riga orizzontale con nome/prezzo, quantità a destra e note tramite tocco. `OrderDraftLine` è il componente canonico della riga: `+ quantità −`, riduzione bloccata a 1 e limite condiviso di 30 pezzi; sul mobile non ripete l’uscita già selezionata nelle schede superiori. Tocco sul nome/prezzo/nota → Modal/ActionForm canonico → salva nota, visualizzata sotto il nome solo se presente. Annullare conserva la nota precedente.

Swipe a sinistra rivela Elimina, il gesto opposto richiude; il gesto non apre il popup e il movimento verticale resta disponibile per scorrere. Nessuna eliminazione su un semplice trascinamento incompleto. Alternativa senza trascinamento: Rimuovi dalla comanda nel popup oppure tasto Delete sulla riga, che rivela e porta il focus a Elimina; Escape richiude e restituisce il focus. La rimozione riguarda solo la bozza. I pulsanti quantità sono separati dal tocco per le note.
