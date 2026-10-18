# Ristolandia — istruzioni per Codex

## Prima di intervenire

1. Leggere README.md, docs/STATUS.md, docs/ARCHITECTURE.md e la parte pertinente di docs/SPECIFICA.txt.
2. Per la UI leggere anche DESIGN.md e UX-CONTRACT.md.
3. Controllare `git status`, conservare modifiche esistenti e non caricare il database demo su Git.

## Ambiente

Node.js 24 LTS, npm; nessuna credenziale o servizio esterno necessario. `bash scripts/cloud-setup.sh` installa e verifica la demo. `npm run dev` avvia API :3001 e Vite :5173. `npm run build && npm start` serve il bundle su :3001. In cloud inoltrare la porta, non presumere che localhost sia raggiungibile dal dispositivo dell'utente.

## Regole non negoziabili del progetto

- È una demo con dati fittizi. Non integrare pagamenti, servizi fiscali, sensori, stampanti o messaggistica reali senza istruzioni esplicite.
- Dominio in server/domain.mjs; persistenza in server/repository.mjs; trasporto in server/index.mjs. Nessuna regola economica duplicata nel client.
- Autorizzazioni e perimetro sede sono controllati lato server. Le postazioni cucina/bar/sala non devono ricevere dati economici riservati.
- Importi monetari in centesimi interi. Credito pagato, bonus, punti e ricariche non sono intercambiabili.
- Ogni azione mutativa ha chiave idempotente e revisione attesa. Le scritture sono atomiche SQLite.
- Consumo teorico soltanto al passaggio a pronto; ristampe senza scarichi, annullamenti dopo preparazione senza reintegro automatico.
- UI condivisa in src/components/ui.tsx e src/styles.css. Estendere i proprietari canonici; non creare dialoghi, notifiche o componenti equivalenti per singola schermata.
- Non introdurre dipendenze, account o servizi a pagamento senza autorizzazione.
- Non eseguire reset o restore su dati non confermati come demo. I test usano :memory: o file temporanei.

## Prima della consegna

Eseguire `npm run format:check`, `npm test`, `npm run build`; dopo modifiche UI eseguire `npm run test:browser`. Nel cloud con Chromium di sistema impostare CHROMIUM_PATH; altrimenti `npx playwright install --with-deps chromium` e PLAYWRIGHT_USE_BUNDLED=1. Aggiornare docs/STATUS.md e documentazione per ogni cambiamento di comportamento. Riportare verifiche reali e limiti; non dichiarare il prodotto pronto per un servizio reale.

La CI verifica ogni push/PR. Non includere credenziali, .env, SQLite, backup o log sensibili nei commit. Il repository è predisposto per interventi successivi di Codex: mantenere un flusso dimostrativo completo prima di aggiungere moduli superficiali.
