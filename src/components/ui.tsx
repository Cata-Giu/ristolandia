import {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
  type ReactNode,
  type FormEvent,
} from 'react';
import {
  X,
  Search,
  ArrowUpRight,
  Check,
  LoaderCircle,
  Inbox,
  Eye,
  EyeOff,
} from 'lucide-react';
import { statusLabel } from '../api';
export function Badge({
  status,
  children,
}: {
  status: string;
  children?: ReactNode;
}) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="status-dot" />
      {children ?? statusLabel[status] ?? status}
    </span>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title = 'Nessun elemento',
  description = 'Le nuove attività compariranno qui.',
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={30} strokeWidth={1.2} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = 'Cerca…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="searchbox">
      <Search size={17} />
      <input
        ref={ref}
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          className="icon-button"
          aria-label="Cancella ricerca"
          onClick={() => {
            onChange('');
            ref.current?.focus();
          }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      prev?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <div className="eyebrow">RISTOLANDIA</div>
          <h2 id="modal-title">{title}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Chiudi finestra"
        >
          <X size={20} />
        </button>
      </div>
      {description && (
        <p id="modal-description" className="muted">
          {description}
        </p>
      )}
      {children}
    </dialog>
  );
}
const FormErrors = createContext<Record<string, string>>({});
export function ActionForm({
  children,
  onSubmit,
  label = 'Salva',
  onCancel,
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<unknown>;
  label?: string;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLDivElement>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const errors: Record<string, string> = {};
    const controls = Array.from(form.elements).filter(
      (el): el is HTMLInputElement =>
        el instanceof HTMLInputElement || el instanceof HTMLSelectElement,
    );
    for (const el of controls) {
      if (!el.validity.valid)
        errors[el.name] = el.validity.valueMissing
          ? 'Compila questo campo.'
          : el.validity.rangeUnderflow || el.validity.rangeOverflow
            ? 'Scegli un valore nell’intervallo consentito.'
            : 'Controlla il valore inserito.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() =>
        controls.find((el) => errors[el.name])?.focus(),
      );
      return;
    }
    const data = new FormData(form);
    setBusy(true);
    setError('');
    try {
      await onSubmit(data);
    } catch (e) {
      setError((e as Error).message);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormErrors.Provider value={fieldErrors}>
      <form noValidate onSubmit={submit}>
        {children}
        {error && (
          <div className="form-error" role="alert" tabIndex={-1} ref={errorRef}>
            {error}
          </div>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={onCancel}
          >
            Annulla
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Check size={16} />
            )}{' '}
            {label}
          </button>
        </div>
      </form>
    </FormErrors.Provider>
  );
}
export function Field({
  label,
  name,
  children,
  help,
  ...props
}: {
  label: string;
  name: string;
  children?: ReactNode;
  help?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const errors = useContext(FormErrors),
    error = errors[name];
  const [show, setShow] = useState(false);
  const password = props.type === 'password';
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children ?? (
        <div className={password ? 'password-field' : 'input-wrapper'}>
          <input
            id={name}
            name={name}
            required={!['note'].includes(name)}
            {...props}
            type={password ? (show ? 'text' : 'password') : props.type}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error ? `${name}-error` : help ? `${name}-help` : undefined
            }
          />
          {password && (
            <button
              type="button"
              className="icon-button"
              aria-label={show ? 'Nascondi password' : 'Mostra password'}
              aria-pressed={show}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          )}
        </div>
      )}
      {help && <small id={`${name}-help`}>{help}</small>}
      {error && (
        <small className="danger-text" id={`${name}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}
export function LinkButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function Pagination({
  count,
  page,
  setPage,
  size = 8,
}: {
  count: number;
  page: number;
  setPage: (n: number) => void;
  size?: number;
}) {
  const max = Math.max(1, Math.ceil(count / size));
  useEffect(() => {
    if (page >= max) setPage(max - 1);
  }, [page, max, setPage]);
  return (
    <div className="pagination">
      <span>
        {count
          ? `${page * size + 1}–${Math.min(count, (page + 1) * size)} di ${count}`
          : '0 risultati'}
      </span>
      <div>
        <button
          className="button small"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Precedenti
        </button>
        <button
          className="button small"
          disabled={page + 1 >= max}
          onClick={() => setPage(page + 1)}
        >
          Successivi
        </button>
      </div>
    </div>
  );
}
export const silently = (p: Promise<unknown>) => {
  void p.catch(() => {});
};
