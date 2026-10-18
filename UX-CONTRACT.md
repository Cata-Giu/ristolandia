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

Nessuna modifica commerciale avanzata, rimborso o salvataggio offline. Moduli secondari dichiarati dimostrativi o consultivi. WCAG AA è obiettivo di verifica automatica e revisione, non certificazione. I popup nativi dipendono da browser e sistema operativo.
