# Dalla demo al pilota

## Prima del pilota

Validare con Simone priorità, locale pilota e regole (lista domande in SPECIFICA.txt §25). Censire casse, stampanti, palmari, reti e sensori con marca, modello, OS, protocolli e responsabile tecnico. Concordare perimetro, assistenza, durata, formazione e ritorno agli strumenti precedenti.

## Consolidamento tecnico

1. Autenticazione reale, gestione identità individuali, password sicure, sessioni persistenti/revocabili e configurazione HTTPS/proxy attendibile.
2. Database normalizzato, organizzazione e sede come chiavi obbligatorie, migrazioni e isolamento tra almeno due gruppi; non riutilizzare lo snapshot demo come architettura multitenant finale.
3. Identificazione cliente autorizzata, privacy/retention, accesso documenti e policy condivise con referenti competenti.
4. Test di carico/concorrenza, policy log/monitoraggio, backup automatici e prova di ripristino infrastrutturale.
5. Errori e accessibilità verificati sui dispositivi reali del locale, con personale durante una prova non operativa.

## Estensioni funzionali da validare

- Tavoli unibili, riassegnazione e trasferimento sessioni, durate/turni configurabili, annullamento/no-show, lista attesa.
- Varianti che cambiano prezzo e ricetta, sequenze portate configurabili, tracciamento modifiche post invio e identificazione del cameriere assegnato.
- Ricezioni multiriga e anno documento, documenti protetti, lotti/scadenze, semilavorati e conversioni confezioni/resa.
- Food cost effettivo di periodo e distinta tra ricavi lordi/netti con base fiscale validata.
- Conti separati per persona/righe, storni, rimborsi, blocchi/riaperture tracciati; configurazione e validazione commerciale/fiscale del credito e dei bonus.
- Dashboard storiche avanzate, differenze cancellazioni/pranzo/cena, fidelizzazione e copertura campioni senza dati decorativi.

## Integrazioni separate

Stampanti: bridge locale autorizzato, coda affidabile e stati diversi da “foglio fisicamente stampato”. Cassa fiscale/POS: accordi con fornitore, API e ambiente test. Sensori: protocolli, soglie per apparecchiatura e gestione dati mancanti. Email/WhatsApp: canali ufficiali e consensi pertinenti. Nessuna di queste integrazioni è dichiarata attiva nella demo.

## Rilascio progressivo

Un solo locale e flusso essenziale; prova controllata, criteri di successo e rollback. Estensione alle altre quattro sedi dopo verifica. Operatività offline e distribuzione ad altri gruppi costituiscono fasi dedicate.
