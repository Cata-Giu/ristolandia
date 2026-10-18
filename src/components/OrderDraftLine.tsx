import { useRef, useState, type ReactNode } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { money } from '../api';

/** Riga della bozza: swipe orizzontale, scroll verticale libero e alternativa da tastiera. */
export function OrderDraftLine({
  name,
  price,
  quantity,
  note,
  current,
  onEdit,
  onRemove,
  onQuantity,
  children,
}: {
  name: string;
  price: number;
  quantity: number;
  note: string;
  current: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onQuantity: (delta: number) => void;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const gesture = useRef<{
    x: number;
    y: number;
    start: number;
    horizontal: boolean;
  } | null>(null);
  const moved = useRef(false);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const revealed = offset <= -44;
  return (
    <div
      className={`draft-line ${current ? 'current-round' : 'other-round'} ${revealed ? 'delete-revealed' : ''}`}
    >
      <button
        ref={deleteButton}
        className="draft-swipe-delete"
        aria-label={`Rimuovi ${name}`}
        tabIndex={revealed ? 0 : -1}
        aria-hidden={!revealed}
        onClick={onRemove}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOffset(0);
            e.currentTarget.parentElement
              ?.querySelector<HTMLButtonElement>('.draft-row-edit')
              ?.focus();
          }
        }}
      >
        <Trash2 size={18} />
        <span>Elimina</span>
      </button>
      <div
        className="draft-row-surface"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={(e) => {
          moved.current = false;
          if ((e.target as Element).closest('.quantity') || e.button !== 0)
            return;
          gesture.current = {
            x: e.clientX,
            y: e.clientY,
            start: offset,
            horizontal: false,
          };
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g) return;
          const dx = e.clientX - g.x,
            dy = e.clientY - g.y;
          if (
            !g.horizontal &&
            Math.abs(dy) > 8 &&
            Math.abs(dy) > Math.abs(dx)
          ) {
            gesture.current = null;
            return;
          }
          if (
            !g.horizontal &&
            Math.abs(dx) > 8 &&
            Math.abs(dx) > Math.abs(dy)
          ) {
            g.horizontal = true;
            moved.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (g.horizontal) setOffset(Math.max(-88, Math.min(0, g.start + dx)));
        }}
        onPointerUp={(e) => {
          const g = gesture.current;
          if (g?.horizontal)
            setOffset(g.start + e.clientX - g.x < -40 ? -88 : 0);
          gesture.current = null;
        }}
        onPointerCancel={() => {
          gesture.current = null;
          setOffset(0);
        }}
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
      >
        <button
          className="draft-row-edit"
          aria-label={`Nota per ${name}`}
          aria-haspopup="dialog"
          onKeyDown={(e) => {
            if (e.key === 'Delete') {
              e.preventDefault();
              setOffset(-88);
              requestAnimationFrame(() => deleteButton.current?.focus());
            } else if (e.key === 'Escape') setOffset(0);
          }}
          onClick={() => {
            if (revealed) setOffset(0);
            else onEdit();
          }}
        >
          <span className="draft-row-main">
            <strong>{name}</strong>
            <span className="draft-row-price">{money(price * quantity)}</span>
          </span>
          {note && <span className="draft-row-note">{note}</span>}
        </button>
        <div className="quantity">
          <button
            aria-label={`Aumenta ${name}`}
            disabled={quantity >= 30}
            onClick={() => onQuantity(1)}
          >
            <Plus size={15} />
          </button>
          <span aria-label="Quantità">{quantity}</span>
          <button
            aria-label={`Riduci ${name}`}
            disabled={quantity <= 1}
            onClick={() => onQuantity(-1)}
          >
            <Minus size={15} />
          </button>
        </div>
        <div className="draft-row-round">{children}</div>
      </div>
    </div>
  );
}
