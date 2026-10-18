import { useState } from 'react';
import { useApp } from '../context';
import { money } from '../api';
import {
  addCounts,
  countTotal,
  parseEuro,
  suggestChange,
  taxOnTip,
} from '../../shared/finance.mjs';
import { ActionForm, Field, Modal } from '../components/ui';
import {
  CashKeypad,
  ChangeBreakdown,
  DenominationInput,
} from '../components/CashTools';
import type { Session } from '../types';
export function CashPayment({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const { state: s, act } = useApp();
  const [amount, setAmount] = useState((session.due / 100).toFixed(2)),
    [method, setMethod] = useState('card'),
    [tip, setTip] = useState('0'),
    [received, setReceived] = useState(''),
    [counts, setCounts] = useState<Record<string, number>>({});
  const applied = parseEuro(amount),
    tipAmount = parseEuro(tip),
    given = parseEuro(received),
    change = given - applied - tipAmount,
    rate = s.tipTaxBasisPoints ?? null,
    drawer = s.drawers?.find((d) => d.venueId === session.venueId),
    suggestion =
      method === 'cash'
        ? suggestChange(change, addCounts(drawer?.counts ?? {}, counts))
        : null;
  return (
    <Modal
      title="Registra pagamento simulato"
      description={`Residuo: ${money(session.due)}. Puoi registrare un importo parziale; la mancia resta separata dal conto.`}
      onClose={onClose}
    >
      <ActionForm
        label="Registra pagamento simulato"
        onCancel={onClose}
        onSubmit={async () => {
          await act('pay', {
            sessionId: session.id,
            amount: applied,
            method,
            tip: tipAmount,
            ...(method === 'cash'
              ? { cashReceived: given, cashReceivedCounts: counts }
              : {}),
          });
          onClose();
        }}
      >
        <div className="form-grid">
          <Field
            label="Importo in euro"
            name="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Field label="Metodo simulato" name="method">
            <select
              id="method"
              name="method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="card">Carta · simulata</option>
              <option value="cash">Contanti · simulati</option>
              <option value="credit" disabled={!session.customerId}>
                Credito pagato del cliente
              </option>
            </select>
          </Field>
          <Field
            label="Mancia in euro (0 se assente)"
            name="tip"
            inputMode="decimal"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
          />
          <div className="tip-estimate">
            <span>Stima imposta mancia</span>
            <strong>
              {rate === null
                ? 'Aliquota non configurata'
                : `${(rate / 100).toLocaleString('it-IT')}% · ${Number.isFinite(tipAmount) ? money(taxOnTip(tipAmount, rate)) : '—'}`}
            </strong>
            <small>
              {rate === null
                ? 'Per registrare una mancia configura prima l’aliquota nelle Impostazioni.'
                : 'Solo simulazione; aliquota da validare con il consulente fiscale.'}
            </small>
          </div>
        </div>
        {method === 'cash' && (
          <>
            <Field
              label="Contanti consegnati dal cliente"
              name="cashReceived"
              inputMode="decimal"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
            />
            <CashKeypad value={received} onChange={setReceived} />
            <details className="cash-details" open>
              <summary>Specifica i tagli realmente ricevuti</summary>
              <DenominationInput
                id="received"
                label="Tagli ricevuti"
                counts={counts}
                onChange={setCounts}
              />
            </details>
            {Number.isFinite(given) && countTotal(counts) !== given && (
              <p className="cash-inline-warning">
                I tagli inseriti devono totalizzare {money(given)}.
              </p>
            )}
            <section className="change-preview" aria-label="Calcolo resto">
              <div>
                <span>Resto da consegnare</span>
                <strong>
                  {Number.isFinite(change) && change >= 0 ? money(change) : '—'}
                </strong>
              </div>
              {Number.isFinite(change) && change < 0 ? (
                <p>La somma consegnata non copre conto e mancia.</p>
              ) : suggestion ? (
                <>
                  <p>
                    Tagli suggeriti: minimo numero di pezzi disponibili,
                    includendo quelli appena ricevuti.
                  </p>
                  <ChangeBreakdown counts={suggestion} />
                </>
              ) : (
                <p>
                  Resto non componibile con i tagli inseriti e il fondo
                  disponibile. Integra il fondo o chiedi tagli diversi.
                </p>
              )}
            </section>
          </>
        )}
        <div className="info-box">
          Il pagamento chiude il conto solo quando il residuo è saldato. I punti
          si calcolano sulle consumazioni dopo gli sconti, escludendo la mancia.
          Nessuna operazione fiscale reale.
        </div>
      </ActionForm>
    </Modal>
  );
}
