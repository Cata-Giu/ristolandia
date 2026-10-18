---
version: alpha
colors:
  primary: '#146457'
  canvas: '#f6f8f7'
  surface: '#ffffff'
  ink: '#22352f'
  muted: '#66746a'
  border: '#e5eae7'
  danger: '#b84439'
  warning: '#9c6a22'
typography:
  sans:
    fontFamily: 'Avenir Next, Segoe UI, sans-serif'
  display:
    fontFamily: 'Palatino Linotype, Palatino, Georgia, serif'
  utility:
    fontFamily: 'Courier New, monospace'
rounded:
  panel: '12px'
  control: '7px'
spacing:
  panel: '24px'
  compact: '12px'
components:
  button:
    rounded: '7px'
  panel:
    rounded: '12px'
---

# Ristolandia

## Overview

Registro prodotto, lingua italiana, fuso Europe/Rome. La reference è una regia di servizio: chiara come una pianta della sala, precisa come una comanda. Il tratto riconoscibile è la continuità tra tavoli verdi, comande di reparto e riepilogo del gruppo. Il marchio demo La Corte è fittizio.

Il dashboard privilegia numeri verificabili e densità tranquilla. Evitare landing page dentro l'app, effetti vistosi, statistiche decorative o menu amministrativi sui palmari. Il serif è riservato all'accesso, per dare un carattere ospitale senza rallentare gli strumenti operativi.

## Colors

Il verde petrolio identifica azioni e navigazione. Verde tenue: contesto operativo; ambra: attenzione; rosso: errore/annullamento; blu: pronto/confermato. Stato sempre scritto, mai comunicato con il solo colore.

Mappatura: i token `colors` sono implementati nelle variabili di `src/styles.css` (`primary` → `--brand`, gli altri omonimi). Le varianti cromatiche dei reparti restano CSS condiviso. Modificare questo file e CSS insieme; nessun generatore parallelo. Tema unico chiaro.

## Typography

Font di sistema per funzionare senza CDN. Avenir Next/Segoe UI per strumenti; Palatino/Georgia per il messaggio di accesso; Courier New per il foglietto simulato. Cifre tabulari per totali. Titoli brevi, microtesti in italiano, valuta EUR.

## Layout

Sidebar desktop da 238 px, contenuto con padding 34 px. Breakpoint 1250, 1020, 820 e 600 px: sidebar a scomparsa sotto 820, colonne singole sui telefoni. Il documento scorre verticalmente; le tabelle hanno overflow orizzontale locale. Cucina usa ticket autonomi; palmare usa catalogo e riepilogo affiancati su desktop e un pannello persistente dal basso sul telefono.

## Elevation & Depth

Pannelli quasi piatti, separati da bordi. Ombre solo per feedback, dialoghi e piccoli controlli attivi. La pianta usa un reticolo per rendere leggibile lo spazio fisico.

## Shapes

Pannelli 12 px, controlli 7 px. Stati compatti; niente pillole decorative. Avatar circolari. Icone Lucide coerenti, sempre accompagnate da etichetta o nome accessibile.

## Components

Primitive canoniche in `src/components/ui.tsx`: Panel, PageTitle, Badge, Modal, Field, ActionForm, Empty, Pagination e SearchBox. Controlli nativi per select e date: accettiamo popup e lingua del sistema operativo. Nessuna libreria di selezione parallela. Focus visibile, dialoghi modali nativi, live region unica per notifiche. Animazioni disattivate con reduced motion.

## Do's and Don'ts

- Mostrare sempre il carattere dimostrativo e le limitazioni dell'azione.
- Conservare le stesse etichette e conferme tra postazioni.
- Ricavare indicatori dalle operazioni, includendo denominatore e definizione.
- Non aggiungere funzioni di amministrazione alle postazioni operative.
- Non dichiarare conformità normativa, compatibilità hardware o integrazioni reali.

## Palmare di sala

Su telefono (fino a 600 px), catalogo a tre colonne con schede brevi: nome completo, prezzo, dettagli e aggiunta da 44 px. Nessun titolo introduttivo o selettore tavolo nel catalogo; il tavolo attivo resta leggibile, il cambio avviene dalla sala nel menu laterale. La barra superiore mantiene navigazione e stato connessione in 44 px. Comanda persistente dal basso, aperta a circa un terzo del viewport, riducibile e ampliabile: non è modale e lascia il menu interattivo. Le portate numerate sono il tratto operativo riconoscibile del palmare. Le righe della bozza sono rettangoli bassi: nome e prezzo affiancati, quantità a destra, nota eventuale sotto al nome; nessun numero di uscita ripetuto nella riga mobile. Elimina compare scorrendo la riga verso sinistra. Desktop mantiene catalogo e riepilogo affiancati.
