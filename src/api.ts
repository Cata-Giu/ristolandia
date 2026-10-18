export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  body?: unknown,
  key?: string,
): Promise<T> {
  const response = await fetch('/api/' + path, {
    signal: AbortSignal.timeout(12000),
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new Error(
      'Connessione interrotta o scaduta. Verifica la rete e riprova: la richiesta mantiene la protezione dai duplicati.',
    );
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      'Risposta del server non leggibile. Riprova: la chiave operazione è conservata per evitare duplicati.',
    );
  }
  if (!response.ok)
    throw new ApiError(
      result.message ?? 'Operazione non completata',
      response.status,
    );
  return result;
}
export const money = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
    n / 100,
  );
export const number = (n: number) =>
  new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(n);
export const time = (n: number) =>
  new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
  }).format(n);
export const date = (
  day: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
) =>
  new Intl.DateTimeFormat('it-IT', {
    ...options,
    timeZone: 'Europe/Rome',
  }).format(new Date(day + 'T12:00:00Z'));
export const statusLabel: Record<string, string> = {
  free: 'Libero',
  occupied: 'Occupato',
  bill: 'Al conto',
  cleaning: 'Da riassettare',
  pending: 'Da confermare',
  confirmed: 'Confermata',
  seated: 'Al tavolo',
  completed: 'Completata',
  sent: 'Inviata',
  preparing: 'In preparazione',
  ready: 'Pronta',
  served: 'Servita',
  cancelled: 'Annullata',
  open: 'Aperto',
  closed: 'Chiuso',
  queued: 'In coda',
  error: 'Errore',
  acknowledged: 'Presa in carico',
  normal: 'Regolare',
  simulated: 'Simulato',
  transit: 'In transito',
  received: 'Ricevuto',
};
