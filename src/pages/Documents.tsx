import { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Camera,
  ExternalLink,
  Download,
  ArrowLeft,
  Plus,
  Trash2,
  LoaderCircle,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context';
import { api, date } from '../api';
import {
  ActionForm,
  Badge,
  Empty,
  Field,
  PageTitle,
  Panel,
  Pagination,
  SearchBox,
} from '../components/ui';
import type { DeliveryDocument, DocumentRow } from '../types';
function dateLabel(day: string) {
  const value = new Date(day + 'T12:00:00Z');
  return Number.isFinite(value.getTime()) &&
    value.toISOString().slice(0, 10) === day
    ? date(day, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Da verificare';
}
const categories = {
  kitchen: 'Cucina',
  beverage: 'Bevande / bar',
  supplies: 'Materiali di sala',
};
const newRow = (): DocumentRow => ({
  id: crypto.randomUUID(),
  ingredientId: 'new',
  name: '',
  quantity: 1,
  unit: 'pz',
  cost: null,
  catalogCategory: 'kitchen',
});
export function Documents() {
  const { state: s, act, refresh } = useApp();
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [page, setPage] = useState(0),
    [venueId, setVenueId] = useState(
      s.venueId === 'all' ? s.venues[0]?.id : s.venueId,
    ),
    [uploading, setUploading] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [document, setDocument] = useState<DeliveryDocument | null>(null),
    [rows, setRows] = useState<DocumentRow[]>([]),
    [supplier, setSupplier] = useState(''),
    [documentNumber, setDocumentNumber] = useState(''),
    [documentDay, setDocumentDay] = useState(s.day);
  const token = useRef(0),
    picker = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null);
  const uploadVenue = s.venueId === 'all' ? venueId : s.venueId;
  const previousVenue = useRef(s.venueId);
  useEffect(() => {
    if (previousVenue.current !== s.venueId) {
      previousVenue.current = s.venueId;
      token.current++;
      setDocument(null);
      setLoading(false);
      setError('');
      const params = new URLSearchParams(location.search);
      params.delete('document');
      history.replaceState({}, '', `?${params}`);
    }
  }, [s.venueId]);
  const records = (s.documents ?? [])
    .filter(
      (d) =>
        (filter === 'all' || d.status === filter) &&
        `${d.originalName} ${d.supplier} ${d.documentNumber} ${d.documentDay}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.uploadedAt - a.uploadedAt);
  async function openDocument(id: string) {
    const request = ++token.current;
    setLoading(true);
    setError('');
    try {
      const d = await api<DeliveryDocument>(
        'documents/' + encodeURIComponent(id),
      );
      if (request !== token.current) return;
      let draft: {
        rows: DocumentRow[];
        supplier: string;
        documentNumber: string;
        documentDay: string;
      } | null = null;
      if (d.status === 'review') {
        try {
          const saved = sessionStorage.getItem(
            'ristolandia-document-draft-' + s.user.id + '-' + d.id,
          );
          if (saved) draft = JSON.parse(saved);
        } catch {
          draft = null;
        }
      } else {
        sessionStorage.removeItem(
          'ristolandia-document-draft-' + s.user.id + '-' + d.id,
        );
      }
      setDocument(d);
      setRows(
        draft && Array.isArray(draft.rows)
          ? draft.rows
          : (d.reviewedRows ?? d.suggestedRows ?? []),
      );
      setSupplier(draft?.supplier ?? d.supplier);
      setDocumentNumber(draft?.documentNumber ?? d.documentNumber);
      setDocumentDay(draft?.documentDay ?? (d.documentDay || s.day));
      const params = new URLSearchParams(location.search);
      params.set('document', id);
      history.replaceState({}, '', `?${params}`);
    } catch (e) {
      if (request === token.current) setError((e as Error).message);
    } finally {
      if (request === token.current) setLoading(false);
    }
  }
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('document');
    if (id) void openDocument(id);
    return () => {
      token.current++;
    };
  }, []);
  useEffect(() => {
    if (document?.status === 'review')
      sessionStorage.setItem(
        'ristolandia-document-draft-' + s.user.id + '-' + document.id,
        JSON.stringify({ rows, supplier, documentNumber, documentDay }),
      );
  }, [document, rows, supplier, documentNumber, documentDay, s.user.id]);
  function back() {
    setDocument(null);
    const params = new URLSearchParams(location.search);
    params.delete('document');
    history.replaceState({}, '', `?${params}`);
  }
  async function upload(file?: File) {
    if (!file || uploading) return;
    if (file.size > 10 * 1024 * 1024) {
      setError(
        'Il file supera 10 MB. Riduci la dimensione prima di caricarlo.',
      );
      return;
    }
    setUploading(true);
    setError('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () =>
          reject(new Error('Impossibile leggere il file. Riprova.'));
        reader.readAsDataURL(file);
      });
      const result = await api<{ id: string }>(
        'documents/upload',
        { venueId: uploadVenue, name: file.name, base64 },
        undefined,
        180000,
      );
      await refresh();
      await openDocument(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (picker.current) picker.current.value = '';
      if (camera.current) camera.current.value = '';
    }
  }
  function update(id: string, patch: Partial<DocumentRow>) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }
  const received = document?.status === 'received';
  return (
    <>
      <PageTitle
        eyebrow="ARCHIVIO ACQUISTI"
        title="La bolla resta. Le scorte si aggiornano."
        description="Foto e PDF originali archiviati per sede, fornitore, numero e data. Usa esclusivamente documenti dimostrativi."
        actions={
          document ? (
            <button className="button" onClick={back}>
              <ArrowLeft size={16} />
              Torna all’archivio
            </button>
          ) : undefined
        }
      />
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {loading && (
        <div className="document-loading" role="status">
          <LoaderCircle className="spin" size={20} />
          Apertura documento…
        </div>
      )}
      {!document ? (
        <>
          <Panel
            title="Carica una bolla"
            subtitle="JPEG, PNG o PDF · massimo 10 MB e 10 pagine. La lettura propone righe: il carico avviene solo dopo la tua verifica."
            className="document-upload"
          >
            <div className="document-upload-body">
              <Field label="Sede di ricezione" name="documentVenue">
                <select
                  id="documentVenue"
                  name="documentVenue"
                  value={uploadVenue}
                  onChange={(e) => setVenueId(e.target.value)}
                  disabled={uploading}
                >
                  {s.venues
                    .filter((v) => s.venueId === 'all' || v.id === s.venueId)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </Field>
              <div className="upload-actions">
                <button
                  className="button primary"
                  disabled={uploading}
                  onClick={() => picker.current?.click()}
                >
                  <Upload size={16} />
                  Scegli foto o PDF
                </button>
                <button
                  className="button"
                  disabled={uploading}
                  onClick={() => camera.current?.click()}
                >
                  <Camera size={16} />
                  Scatta foto
                </button>
                <input
                  className="sr-only"
                  tabIndex={-1}
                  ref={picker}
                  type="file"
                  aria-label="File bolla JPEG PNG o PDF"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
                <input
                  className="sr-only"
                  tabIndex={-1}
                  ref={camera}
                  type="file"
                  aria-label="Foto bolla da fotocamera"
                  accept="image/jpeg,image/png"
                  capture="environment"
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </div>
              {uploading && (
                <p className="inline-icon" role="status">
                  <LoaderCircle className="spin" size={17} />
                  Archiviazione e lettura in corso. Può richiedere fino a due
                  minuti.
                </p>
              )}
            </div>
          </Panel>
          <Panel
            title="Documenti archiviati"
            subtitle={`${s.documents?.length ?? 0} documenti · originali sempre collegati ai carichi`}
          >
            <div className="toolbar">
              <div className="filter-tabs">
                {[
                  ['all', 'Tutti'],
                  ['review', 'Da verificare'],
                  ['received', 'Caricati'],
                ].map(([id, label]) => (
                  <button
                    className={filter === id ? 'active' : ''}
                    key={id}
                    onClick={() => {
                      setFilter(id);
                      setPage(0);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <SearchBox
                value={query}
                onChange={(q) => {
                  setQuery(q);
                  setPage(0);
                }}
                placeholder="Cerca fornitore, bolla o data"
              />
            </div>
            {records.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Fornitore / numero</th>
                      <th>Data</th>
                      <th>Sede</th>
                      <th>Stato</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(page * 8, page * 8 + 8).map((d) => (
                      <tr key={d.id}>
                        <td>
                          <strong>{d.originalName}</strong>
                          <small className="block muted">
                            {Math.ceil(d.size / 1024)} KB · {d.rowCount}{' '}
                            {d.rowCount === 1 ? 'riga' : 'righe'}
                          </small>
                        </td>
                        <td>
                          {d.supplier || 'Da verificare'}
                          <small className="block muted">
                            {d.documentNumber || 'Numero da assegnare'}
                          </small>
                        </td>
                        <td>{dateLabel(d.documentDay)}</td>
                        <td>
                          {s.venues.find((v) => v.id === d.venueId)?.name}
                        </td>
                        <td>
                          <Badge
                            status={
                              d.status === 'received' ? 'received' : 'pending'
                            }
                          >
                            {d.status === 'received'
                              ? 'Caricata'
                              : 'Da verificare'}
                          </Badge>
                        </td>
                        <td>
                          <button
                            className="button small"
                            disabled={loading || uploading}
                            onClick={() => void openDocument(d.id)}
                          >
                            Apri bolla
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Nessuna bolla trovata"
                description="Carica un documento o modifica la ricerca."
              />
            )}
            <Pagination count={records.length} page={page} setPage={setPage} />
          </Panel>
        </>
      ) : (
        <Panel
          title={
            received
              ? 'Bolla caricata e archiviata'
              : 'Verifica la lettura prima di caricare'
          }
          subtitle={`${document.originalName} · ${s.venues.find((v) => v.id === document.venueId)?.name}`}
          action={
            <div className="document-links">
              <a
                className="button small"
                href={`/api/documents/${document.id}/file`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} />
                Apri originale
              </a>
              <a
                className="button small"
                href={`/api/documents/${document.id}/file?download=1`}
              >
                <Download size={14} />
                Scarica
              </a>
            </div>
          }
        >
          <div className="document-review">
            <div className="document-extraction-info">
              <Badge
                status={
                  document.extractionMode === 'unavailable'
                    ? 'pending'
                    : 'confirmed'
                }
              >
                {document.extractionMode === 'pdf-text'
                  ? 'Testo estratto dal PDF'
                  : document.extractionMode === 'ocr'
                    ? 'Lettura OCR'
                    : 'Lettura automatica non disponibile'}
              </Badge>
              {document.warnings.map((warning, i) => (
                <p className="cash-inline-warning" key={i}>
                  {warning}
                </p>
              ))}
            </div>
            {document.mediaType.startsWith('image/') && (
              <details className="document-photo">
                <summary>Mostra foto originale</summary>
                <img
                  src={`/api/documents/${document.id}/file`}
                  alt="Originale della bolla caricata, da confrontare con le righe riconosciute"
                />
              </details>
            )}
            <details className="document-extracted">
              <summary>Testo letto dal documento</summary>
              <pre>
                {document.text ||
                  'Nessun testo disponibile: consulta il file originale.'}
              </pre>
            </details>
            {received ? (
              <>
                <div className="info-box">
                  <CheckCircle2 size={17} />
                  Carico già confermato. Il documento originale e le righe
                  restano consultabili; un secondo carico è impedito.
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Articolo</th>
                        <th>Destinazione</th>
                        <th>Quantità</th>
                        <th>Costo unitario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{categories[row.catalogCategory]}</td>
                          <td>
                            {row.quantity.toLocaleString('it-IT')} {row.unit}
                          </td>
                          <td>
                            {row.cost == null
                              ? 'Da definire'
                              : new Intl.NumberFormat('it-IT', {
                                  style: 'currency',
                                  currency: 'EUR',
                                  maximumFractionDigits: 6,
                                }).format(row.cost / 100)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <ActionForm
                label="Conferma carico merce"
                onCancel={back}
                onSubmit={async () => {
                  await act('receive-document', {
                    documentId: document.id,
                    supplier,
                    documentNumber,
                    documentDay,
                    rows,
                  });
                  await openDocument(document.id);
                }}
              >
                <div className="form-grid">
                  <Field
                    label="Fornitore verificato"
                    name="supplier"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    maxLength={100}
                  />
                  <Field
                    label="Numero bolla verificato"
                    name="documentNumber"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    maxLength={60}
                  />
                  <Field
                    label="Data documento verificata"
                    name="documentDay"
                    type="date"
                    value={documentDay}
                    onChange={(e) => setDocumentDay(e.target.value)}
                  />
                </div>
                <p className="muted small">
                  Bozza di verifica conservata su questo dispositivo. Controlla
                  tutte le righe contro l’originale. Quantità nell’unità
                  dell’articolo selezionato; costi in euro per quella stessa
                  unità. Le confezioni richiedono contenuto e unità espliciti.
                </p>
                <div className="table-scroll document-row-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Articolo e nome</th>
                        <th>Destinazione</th>
                        <th>Quantità</th>
                        <th>Unità</th>
                        <th>Costo €/unità</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={row.id}>
                          <td>
                            <select
                              aria-label={`Articolo riga ${index + 1}`}
                              value={row.ingredientId}
                              onChange={(e) => {
                                const item = s.ingredients?.find(
                                  (i) => i.id === e.target.value,
                                );
                                update(row.id, {
                                  ingredientId: e.target.value,
                                  ...(item
                                    ? {
                                        name: item.name,
                                        unit: item.unit,
                                        cost: item.cost,
                                      }
                                    : {}),
                                });
                              }}
                            >
                              <option value="new">
                                Nuovo articolo da creare
                              </option>
                              {s.ingredients?.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.name} ({i.unit})
                                </option>
                              ))}
                            </select>
                            <input
                              aria-label={`Nome articolo riga ${index + 1}`}
                              value={row.name}
                              disabled={row.ingredientId !== 'new'}
                              maxLength={100}
                              onChange={(e) =>
                                update(row.id, { name: e.target.value })
                              }
                            />
                            {row.source && (
                              <small className="block muted">
                                Letto: {row.source}
                              </small>
                            )}
                          </td>
                          <td>
                            <select
                              aria-label={`Destinazione riga ${index + 1}`}
                              value={row.catalogCategory}
                              onChange={(e) =>
                                update(row.id, {
                                  catalogCategory: e.target
                                    .value as DocumentRow['catalogCategory'],
                                })
                              }
                            >
                              {Object.entries(categories).map(([id, label]) => (
                                <option key={id} value={id}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              aria-label={`Quantità riga ${index + 1}`}
                              type="number"
                              min="0.000001"
                              step="any"
                              value={row.quantity}
                              onChange={(e) =>
                                update(row.id, {
                                  quantity: Number(e.target.value),
                                })
                              }
                            />
                          </td>
                          <td>
                            <select
                              aria-label={`Unità riga ${index + 1}`}
                              value={row.unit}
                              disabled={row.ingredientId !== 'new'}
                              onChange={(e) =>
                                update(row.id, { unit: e.target.value })
                              }
                            >
                              {['g', 'kg', 'ml', 'l', 'pz', 'conf'].map((u) => (
                                <option key={u} value={u}>
                                  {u === 'conf' ? 'Confezione da risolvere' : u}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              aria-label={`Costo unitario riga ${index + 1}`}
                              type="number"
                              min={0}
                              step="any"
                              value={
                                row.cost == null
                                  ? ''
                                  : Number((row.cost / 100).toFixed(8))
                              }
                              placeholder="Da definire"
                              onChange={(e) =>
                                update(row.id, {
                                  cost:
                                    e.target.value === ''
                                      ? null
                                      : Number(e.target.value) * 100,
                                })
                              }
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="icon-button danger-text"
                              aria-label={`Rimuovi riga ${index + 1} dalla proposta`}
                              onClick={() =>
                                setRows((prev) =>
                                  prev.filter((r) => r.id !== row.id),
                                )
                              }
                            >
                              <Trash2 size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  className="button"
                  onClick={() => setRows((prev) => [...prev, newRow()])}
                >
                  <Plus size={16} />
                  Aggiungi riga mancante
                </button>
                <div className="info-box">
                  La conferma crea un solo carico, con movimenti collegati a
                  questa bolla. Non produce vendite o pagamenti. I nuovi
                  articoli vengono creati nel catalogo; costi non riconosciuti
                  rimangono da definire.
                </div>
              </ActionForm>
            )}
          </div>
        </Panel>
      )}
    </>
  );
}
