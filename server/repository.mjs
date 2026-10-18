import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { seed } from './seed.mjs';
import { DomainError } from './domain.mjs';
export function repository(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    'PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id=1), data TEXT NOT NULL)',
  );
  if (!db.prepare('SELECT 1 FROM state').get())
    db.prepare('INSERT INTO state VALUES (1,?)').run(JSON.stringify(seed()));
  return {
    read() {
      return JSON.parse(
        db.prepare('SELECT data FROM state WHERE id=1').get().data,
      );
    },
    mutate(fn) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const s = this.read();
        const result = fn(s);
        db.prepare('UPDATE state SET data=? WHERE id=1').run(JSON.stringify(s));
        db.exec('COMMIT');
        return result;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close() {
      db.close();
    },
    backup() {
      return JSON.stringify(this.read());
    },
    restore(raw) {
      const s = JSON.parse(raw);
      if (
        s.version !== 1 ||
        !Array.isArray(s.orders) ||
        !Number.isInteger(s.revision)
      )
        throw new DomainError('Backup non valido');
      db.prepare('UPDATE state SET data=? WHERE id=1').run(JSON.stringify(s));
    },
  };
}
