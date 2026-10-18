import {
  DENOMINATIONS,
  countTotal,
  type Counts,
} from '../../shared/finance.mjs';
import { money } from '../api';
import { Delete } from 'lucide-react';
export function DenominationInput({
  counts,
  onChange,
  label,
  id,
}: {
  counts: Counts;
  onChange: (counts: Counts) => void;
  label: string;
  id: string;
}) {
  return (
    <fieldset className="denomination-fieldset">
      <legend>{label}</legend>
      <div className="denomination-grid">
        {DENOMINATIONS.map((d) => (
          <label key={d} htmlFor={`${id}-${d}`}>
            <span>{money(d)}</span>
            <input
              id={`${id}-${d}`}
              aria-label={`${label}: ${money(d)}`}
              type="number"
              min={0}
              max={10000}
              step={1}
              value={counts[d] ?? 0}
              onChange={(e) =>
                onChange({ ...counts, [d]: Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
      <p className="cash-count-total">
        Totale tagli inseriti <strong>{money(countTotal(counts))}</strong>
      </p>
    </fieldset>
  );
}
export function ChangeBreakdown({
  counts,
  emptyLabel = 'Nessun resto da consegnare',
}: {
  counts: Counts;
  emptyLabel?: string;
}) {
  const entries = DENOMINATIONS.filter((d) => (counts[d] ?? 0) > 0);
  return (
    <div className="change-breakdown">
      {entries.length ? (
        entries.map((d) => (
          <span key={d}>
            <strong>{counts[d]} ×</strong> {money(d)}
          </span>
        ))
      ) : (
        <span>{emptyLabel}</span>
      )}
    </div>
  );
}
export function CashKeypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="cash-keypad"
      role="group"
      aria-label="Calcolatrice contanti consegnati"
    >
      {['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '⌫'].map(
        (key) => (
          <button
            type="button"
            className="button"
            key={key}
            aria-label={
              key === '⌫' ? 'Cancella ultima cifra' : `Inserisci ${key}`
            }
            onClick={() => {
              if (key === '⌫') return onChange(value.slice(0, -1));
              if (key === ',' && /[,.]/.test(value)) return;
              onChange(
                value === '0' && key !== ',' ? key : (value + key).slice(0, 12),
              );
            }}
          >
            {key === '⌫' ? <Delete size={17} /> : key}
          </button>
        ),
      )}
      <button
        type="button"
        className="button clear-key"
        onClick={() => onChange('')}
      >
        Azzera importo consegnato
      </button>
    </div>
  );
}
