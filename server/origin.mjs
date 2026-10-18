import { DomainError } from './domain.mjs';

function parseOrigin(value) {
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function configuredOrigins(env = process.env) {
  const origins = new Set();
  if (env.APP_ORIGIN) {
    const origin = parseOrigin(env.APP_ORIGIN);
    if (!origin)
      throw new Error(
        'APP_ORIGIN deve essere un’origine HTTP/HTTPS senza percorso.',
      );
    origins.add(origin);
  }
  // Codespaces terminates HTTPS before forwarding to Vite/Node. Only this
  // environment's two application ports are trusted, never a domain wildcard.
  if (env.CODESPACE_NAME) {
    const domain =
      env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? 'app.github.dev';
    if (
      !/^[a-z0-9-]+$/.test(env.CODESPACE_NAME) ||
      !/^[a-z0-9.-]+$/.test(domain)
    ) {
      throw new Error('Configurazione hostname Codespaces non valida.');
    }
    for (const port of [5173, 3001]) {
      origins.add(`https://${env.CODESPACE_NAME}-${port}.${domain}`);
    }
  }
  return origins;
}

export function validateRequestOrigin(req, publicOrigins) {
  if (req.headers.origin === undefined) return null;
  const origin = parseOrigin(req.headers.origin);
  const directOrigin = parseOrigin(
    `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`,
  );
  // Forwarded headers are untrusted request input; a proxy must use an exact
  // server-configured public origin when its external host/protocol differs.
  if (!origin || (origin !== directOrigin && !publicOrigins.has(origin))) {
    throw new DomainError('Origine della richiesta non autorizzata', 403);
  }
  return origin;
}
