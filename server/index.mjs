import {
  inspectUpload,
  extractDocument,
  parseDeliveryText,
  saveOriginal,
  originalBytes,
} from './documents.mjs';
import http from 'node:http';
import { randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { repository } from './repository.mjs';
import {
  apply,
  view,
  USERS,
  DomainError,
  authorizeVenue,
  recordAudit,
} from './domain.mjs';
import { VENUES } from './seed.mjs';
import { configuredOrigins, validateRequestOrigin } from './origin.mjs';
export function createApp({
  dbPath = process.env.DATA_PATH ?? 'data/demo.sqlite',
  publicOrigins = configuredOrigins(),
  documentDirectory = process.env.DOCUMENT_DIRECTORY ??
    resolve(
      dirname(dbPath === ':memory:' ? 'data/demo.sqlite' : dbPath),
      'documents',
    ),
} = {}) {
  const db = repository(dbPath),
    sessions = new Map(),
    attempts = new Map();
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    const url = new URL(req.url, 'http://localhost');
    const json = (status, data) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(data));
    };
    try {
      if (!url.pathname.startsWith('/api/')) {
        const root = resolve('dist'),
          candidate = resolve(root, `.${decodeURIComponent(url.pathname)}`);
        let file = candidate;
        if (!candidate.startsWith(root + '/') && candidate !== root)
          throw new DomainError('Percorso non valido', 400);
        if (!existsSync(file) || !extname(file))
          file = resolve(root, 'index.html');
        if (!existsSync(file))
          return json(503, {
            message: 'Esegui npm run build oppure usa npm run dev.',
          });
        const mime = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
        };
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'",
        );
        res.writeHead(200, {
          'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        });
        return res.end(readFileSync(file));
      }
      const requestOrigin =
        req.method === 'POST'
          ? validateRequestOrigin(req, publicOrigins)
          : null;
      let body = {};
      if (req.method === 'POST') {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          const limit =
            url.pathname === '/api/documents/upload'
              ? 15 * 1024 * 1024
              : url.pathname === '/api/actions/receive-document'
                ? 256 * 1024
                : 32000;
          if (raw.length > limit)
            throw new DomainError('Richiesta troppo grande', 413);
        }
        try {
          body = JSON.parse(raw || '{}');
        } catch {
          throw new DomainError('Formato richiesta non valido', 400);
        }
      }
      if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new DomainError(
          'La richiesta deve contenere un oggetto JSON',
          400,
        );
      const token = (req.headers.cookie ?? '')
        .split('; ')
        .find((c) => c.startsWith('ristolandia='))
        ?.slice(12);
      const auth = sessions.get(token);
      const user =
        auth && auth.expires > Date.now()
          ? USERS.find((u) => u.id === auth.userId)
          : null;
      if (url.pathname === '/api/demo-info' && req.method === 'GET')
        return json(200, {
          users: USERS.map(({ id, name, label, role }) => ({
            id,
            name,
            label,
            role,
          })),
          venues: VENUES,
          day: db.read().day,
        });
      if (url.pathname === '/api/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress,
          bucket = attempts.get(ip) ?? { count: 0, at: Date.now() };
        if (Date.now() - bucket.at > 60000) {
          bucket.count = 0;
          bucket.at = Date.now();
        }
        bucket.count++;
        attempts.set(ip, bucket);
        if (bucket.count > 30)
          throw new DomainError(
            'Troppi tentativi. Riprova tra un minuto.',
            429,
          );
        const expected = Buffer.from('Demo2026!'),
          provided = Buffer.from(String(body.password ?? ''));
        if (
          provided.length !== expected.length ||
          !timingSafeEqual(provided, expected)
        )
          throw new DomainError('Password demo non corretta', 401);
        const selected = USERS.find((u) => u.id === body.userId);
        if (!selected)
          throw new DomainError('Account dimostrativo non valido', 401);
        const t = randomBytes(32).toString('hex');
        sessions.set(t, {
          userId: selected.id,
          expires: Date.now() + 8 * 3600000,
        });
        res.setHeader(
          'Set-Cookie',
          `ristolandia=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${req.socket.encrypted || requestOrigin?.startsWith('https://') ? '; Secure' : ''}`,
        );
        return json(200, { user: selected });
      }
      if (url.pathname === '/api/public/book' && req.method === 'POST') {
        const result = db.mutate((s) =>
          apply(
            s,
            { id: 'public', name: 'Cliente demo', role: 'public' },
            'book',
            body,
            req.headers['idempotency-key'],
          ),
        );
        return json(200, result);
      }
      if (!user)
        throw new DomainError('Accedi con un account dimostrativo', 401);
      if (url.pathname.startsWith('/api/documents/')) {
        if (!['admin', 'manager', 'warehouse'].includes(user.role))
          throw new DomainError('Postazione non autorizzata ai documenti', 403);
        if (url.pathname === '/api/documents/upload' && req.method === 'POST') {
          const state = db.read();
          authorizeVenue(state, user, body.venueId);
          const { buffer, type, hash } = inspectUpload(body.base64);
          const existing = (state.documents ?? []).find(
            (d) => d.venueId === body.venueId && d.hash === hash,
          );
          if (existing)
            return json(200, {
              id: existing.id,
              message: 'Documento già presente in archivio',
            });
          const extraction = await extractDocument(buffer, type),
            suggestion = parseDeliveryText(extraction.text, state.ingredients);
          saveOriginal(documentDirectory, hash, buffer);
          const result = db.mutate((s) => {
            const duplicate = (s.documents ?? []).find(
              (d) => d.venueId === body.venueId && d.hash === hash,
            );
            if (duplicate)
              return {
                id: duplicate.id,
                message: 'Documento già presente in archivio',
              };
            const document = {
              id: randomUUID(),
              venueId: body.venueId,
              hash,
              originalName: String(body.name ?? 'documento')
                .replace(/[\r\n\x00]/g, '')
                .slice(0, 180),
              mediaType: type,
              size: buffer.length,
              text: extraction.text,
              extractionMode: extraction.mode,
              warnings: [...extraction.warnings, ...suggestion.warnings],
              suggestedRows: suggestion.rows,
              supplier: suggestion.supplier,
              documentNumber: suggestion.documentNumber,
              documentDay: suggestion.documentDay,
              status: 'review',
              uploadedAt: Date.now(),
              user: user.name,
            };
            s.documents ??= [];
            s.documents.push(document);
            recordAudit(
              s,
              user,
              body.venueId,
              'upload-document',
              document.id,
              'Originale archiviato; carico da verificare',
            );
            s.revision++;
            return {
              id: document.id,
              message:
                'Originale archiviato. Verifica le righe prima del carico.',
            };
          });
          return json(200, result);
        }
        const match = url.pathname.match(
          /^\/api\/documents\/([^/]+)(\/file)?$/,
        );
        if (match && req.method === 'GET') {
          const state = db.read(),
            document = (state.documents ?? []).find((d) => d.id === match[1]);
          if (!document) throw new DomainError('Documento non trovato', 404);
          authorizeVenue(state, user, document.venueId);
          if (!match[2]) return json(200, document);
          const bytes = originalBytes(documentDirectory, document.hash);
          res.writeHead(200, {
            'Content-Type': document.mediaType,
            'Content-Length': bytes.length,
            'Cache-Control': 'no-store',
            'Content-Disposition': `${url.searchParams.has('download') ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(document.originalName)}`,
          });
          return res.end(bytes);
        }
        throw new DomainError('Documento non trovato', 404);
      }
      if (url.pathname === '/api/logout' && req.method === 'POST') {
        sessions.delete(token);
        res.setHeader(
          'Set-Cookie',
          'ristolandia=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
        );
        return json(200, { message: 'Sessione terminata' });
      }
      if (url.pathname === '/api/state' && req.method === 'GET')
        return json(
          200,
          view(
            db.read(),
            user,
            url.searchParams.get('venue') ?? user.venueIds[0],
          ),
        );
      if (url.pathname.startsWith('/api/actions/') && req.method === 'POST') {
        const action = url.pathname.split('/').at(-1);
        const { expectedRevision, ...payload } = body;
        const result = db.mutate((s) => {
          const key = req.headers['idempotency-key'];
          const prior = s.idempotency[`${user.id}:${action}:${key}`];
          if (!prior && expectedRevision !== s.revision)
            throw new DomainError(
              'I dati sono cambiati. La schermata è stata aggiornata: verifica e riprova.',
              409,
            );
          return apply(s, user, action, payload, key);
        });
        return json(200, result);
      }
      throw new DomainError('Risorsa non trovata', 404);
    } catch (e) {
      json(e.status ?? 500, {
        message: e.status ? e.message : 'Operazione non completata. Riprova.',
      });
    }
  });
  return { server, db };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { server } = createApp();
  server.listen(Number(process.env.PORT ?? 3001), '0.0.0.0', () =>
    console.log(
      'Ristolandia pronta su http://localhost:' +
        String(process.env.PORT ?? 3001),
    ),
  );
}
