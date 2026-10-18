import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  mkdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { DomainError } from './domain.mjs';
const exec = promisify(execFile);
const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const quantity = (s) => Number(s.replace(',', '.'));
const units = {
  kg: 'kg',
  g: 'g',
  gr: 'g',
  l: 'l',
  lt: 'l',
  ml: 'ml',
  pz: 'pz',
  pzi: 'pz',
  pezzi: 'pz',
  nr: 'pz',
  conf: 'conf',
};
export function parseDeliveryText(text, ingredients = []) {
  const rows = [],
    warnings = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/\s+/g, ' ');
    let match = line.match(
        /^(.+?)\s+(kg|gr|g|lt|l|ml|pz|pzi|pezzi|nr|conf)\.?\s+(\d+(?:[.,]\d+)?)\s*(\d+(?:[.,]\d{1,4})?)?(?:\s+.*)?$/i,
      ),
      name,
      unit,
      q,
      price;
    if (match) {
      [, name, unit, q, price] = match;
    } else {
      match = line.match(
        /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|gr|g|lt|l|ml|pz|pzi|pezzi|nr|conf)\.?\s*(\d+(?:[.,]\d{1,4})?)?(?:\s+.*)?$/i,
      );
      if (match) [, name, q, unit, price] = match;
    }
    if (
      !match ||
      !/[a-zA-ZÀ-ÿ]/.test(name) ||
      /^(totale|imponibile|iva|quantit[aà]|descrizione)\b/i.test(name)
    )
      continue;
    name = name.replace(/^[A-Z0-9-]*\d[A-Z0-9-]*\s+/, '').trim();
    if (!name) continue;
    unit = units[unit.toLowerCase()];
    let amount = quantity(q),
      cost = price ? quantity(price) * 100 : null;
    const item = ingredients.find((i) => normalize(i.name) === normalize(name));
    let ingredientId = 'new';
    if (item) {
      const factor =
        unit === item.unit
          ? 1
          : unit === 'kg' && item.unit === 'g'
            ? 1000
            : unit === 'l' && item.unit === 'ml'
              ? 1000
              : unit === 'g' && item.unit === 'kg'
                ? 0.001
                : unit === 'ml' && item.unit === 'l'
                  ? 0.001
                  : null;
      if (factor !== null) {
        ingredientId = item.id;
        amount *= factor;
        unit = item.unit;
        cost = cost == null ? item.cost : cost / factor;
      }
    }
    const category =
      /tovagli|tovagliol|carta|detersiv|bicchier|posat|sacchett/i.test(name)
        ? 'supplies'
        : /acqua|vino|birra|prosecco|bevanda|succo|liquore|aperitivo/i.test(
              name,
            )
          ? 'beverage'
          : 'kitchen';
    rows.push({
      id: randomUUID(),
      ingredientId,
      name,
      quantity: amount,
      unit,
      cost,
      catalogCategory: category,
      source: line,
    });
  }
  if (!rows.length)
    warnings.push(
      'Nessuna riga riconosciuta con sufficiente struttura: inserisci manualmente gli articoli verificando l’originale.',
    );
  if (rows.some((r) => r.unit === 'conf'))
    warnings.push(
      'Confezioni rilevate: specifica unità e contenuto reale prima del carico.',
    );
  if (rows.some((r) => r.cost == null))
    warnings.push(
      'Alcuni costi non sono stati riconosciuti: completali o mantienili esplicitamente da definire.',
    );
  const supplier =
    text
      .match(/(?:fornitore|ragione sociale)\s*[:\-]\s*([^\r\n]+)/i)?.[1]
      ?.trim() ?? '';
  const documentNumber =
    text.match(
      /(?:DDT|bolla|documento di trasporto)\s*(?:n[.°º]?|numero)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/-]*)/i,
    )?.[1] ?? '';
  const date = text.match(/\b(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})\b/);
  const documentDay = date ? `${date[3]}-${date[2]}-${date[1]}` : '';
  return { supplier, documentNumber, documentDay, rows, warnings };
}
async function run(command, args, timeout = 15000) {
  return exec(command, args, {
    timeout,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, OMP_THREAD_LIMIT: '1' },
  });
}
function validateImage(buffer, type) {
  let width, height;
  if (type === 'image/png') {
    if (buffer.length < 24) throw new DomainError('Immagine PNG non valida');
    width = buffer.readUInt32BE(16);
    height = buffer.readUInt32BE(20);
  } else {
    let pos = 2;
    while (pos + 8 < buffer.length) {
      if (buffer[pos] !== 255) {
        pos++;
        continue;
      }
      const marker = buffer[pos + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xd8 || marker === 0x01) {
        pos += 2;
        continue;
      }
      const len = buffer.readUInt16BE(pos + 2);
      if (len < 2) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        height = buffer.readUInt16BE(pos + 5);
        width = buffer.readUInt16BE(pos + 7);
        break;
      }
      pos += 2 + len;
    }
  }
  if (!width || !height || width * height > 24000000)
    throw new DomainError(
      'Immagine non valida o troppo grande: usa una foto fino a 24 megapixel.',
    );
}
export function inspectUpload(base64) {
  if (
    typeof base64 !== 'string' ||
    base64.length > 14 * 1024 * 1024 ||
    !base64.length ||
    base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)
  )
    throw new DomainError('File non valido o troppo grande (massimo 10 MB)');
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > 10 * 1024 * 1024)
    throw new DomainError('Il file supera 10 MB');
  const type =
    buffer.subarray(0, 5).toString() === '%PDF-'
      ? 'application/pdf'
      : buffer
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? 'image/png'
        : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
          ? 'image/jpeg'
          : null;
  if (!type)
    throw new DomainError(
      'Formato non supportato: carica un PDF, una foto JPEG o PNG.',
    );
  if (type !== 'application/pdf') validateImage(buffer, type);
  return {
    buffer,
    type,
    hash: createHash('sha256').update(buffer).digest('hex'),
  };
}
export async function extractDocument(buffer, type) {
  const temp = mkdtempSync(join(tmpdir(), 'ristolandia-document-'));
  const file = join(
    temp,
    type === 'application/pdf'
      ? 'original.pdf'
      : type === 'image/png'
        ? 'original.png'
        : 'original.jpg',
  );
  writeFileSync(file, buffer, { mode: 0o600 });
  const warnings = [];
  try {
    let pages = 1;
    if (type === 'application/pdf') {
      const info = await run('pdfinfo', [file]);
      pages = Number(info.stdout.match(/^Pages:\s+(\d+)/m)?.[1]);
      if (!pages || pages > 10)
        throw new DomainError('La demo accetta PDF fino a 10 pagine.');
      const result = await run('pdftotext', ['-layout', file, '-']);
      if (
        result.stdout.split('\f').slice(0, pages).length === pages &&
        result.stdout
          .split('\f')
          .slice(0, pages)
          .every((page) => page.replace(/\s/g, '').length > 40)
      )
        return {
          text: result.stdout.slice(0, 180000),
          mode: 'pdf-text',
          warnings:
            result.stdout.length > 180000
              ? [
                  ...warnings,
                  'Testo estratto molto lungo: anteprima limitata. Controlla l’originale completo prima del carico.',
                ]
              : warnings,
        };
    }
    const languages = await run('tesseract', ['--list-langs']);
    const lang = /^ita$/m.test(languages.stdout) ? 'ita' : 'eng';
    if (lang === 'eng')
      warnings.push(
        'OCR italiano non installato: usato il modello inglese. Verifica con particolare attenzione i valori riconosciuti.',
      );
    let files = [file];
    if (type === 'application/pdf') {
      await run(
        'pdftoppm',
        ['-scale-to', '2400', '-png', file, join(temp, 'page')],
        30000,
      );
      files = readdirSync(temp)
        .filter((f) => /^page-\d+\.png$/.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((f) => join(temp, f));
    }
    let text = '';
    const deadline = Date.now() + 60000;
    for (const image of files) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error('OCR timeout');
      const result = await run(
        'tesseract',
        [image, 'stdout', '-l', lang, '--psm', '6'],
        Math.min(20000, remaining),
      );
      text += result.stdout + '\n';
      if (text.length > 180000) throw new Error('OCR text limit');
    }
    return { text, mode: 'ocr', warnings };
  } catch (error) {
    if (error instanceof DomainError) throw error;
    return {
      text: '',
      mode: 'unavailable',
      warnings: [
        'Lettura automatica non completata. Il file viene comunque archiviato: puoi compilare le righe manualmente. Verifica l’installazione di Poppler e Tesseract o la leggibilità del file.',
      ],
    };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
export function saveOriginal(root, hash, buffer) {
  mkdirSync(root, { recursive: true, mode: 0o700 });
  try {
    writeFileSync(join(root, hash), buffer, { flag: 'wx', mode: 0o600 });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
}
export function originalBytes(root, hash) {
  if (!/^[a-f0-9]{64}$/.test(hash))
    throw new DomainError('Documento non disponibile', 404);
  try {
    return readFileSync(join(root, hash));
  } catch {
    throw new DomainError(
      'Originale non disponibile nel volume documenti',
      404,
    );
  }
}
