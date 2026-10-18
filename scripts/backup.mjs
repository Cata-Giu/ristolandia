import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { repository } from '../server/repository.mjs';
const [action, path] = process.argv.slice(2);
if (!['save', 'restore'].includes(action) || !path) {
  console.error(
    'Uso: node scripts/backup.mjs save|restore /percorso/backup.json',
  );
  process.exit(1);
}
const db = repository(process.env.DATA_PATH ?? 'data/demo.sqlite');
try {
  if (action === 'save') {
    if (existsSync(resolve(path)))
      throw new Error(
        'Il file esiste già: scegli un nuovo nome per preservare il backup.',
      );
    writeFileSync(path, db.backup(), { mode: 0o600, flag: 'wx' });
    console.log('Backup demo salvato.');
  } else {
    if (process.env.CONFIRM_DEMO_RESTORE !== 'yes')
      throw new Error(
        'Arresta il server, poi imposta CONFIRM_DEMO_RESTORE=yes per sostituire il database demo.',
      );
    db.restore(readFileSync(path, 'utf8'));
    console.log('Backup demo ripristinato.');
  }
} finally {
  db.close();
}
