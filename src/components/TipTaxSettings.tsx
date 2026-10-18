import { useState } from 'react';
import { useApp } from '../context';
import { parseEuro } from '../../shared/finance.mjs';
import { ActionForm, Field, Modal, Panel } from './ui';
export function TipTaxSettings() {
  const { state: s, act } = useApp();
  const [editing, setEditing] = useState(false);
  return (
    <>
      <Panel
        title="Aliquota simulata sulle mance"
        subtitle="Le mance restano separate dalle consumazioni. La percentuale è una configurazione demo da validare fiscalmente."
        className="tip-settings"
        action={
          <button
            className="button"
            disabled={s.user.role !== 'admin'}
            onClick={() => setEditing(true)}
          >
            Configura aliquota mance
          </button>
        }
      >
        <div className="tip-settings-value">
          <strong>
            {s.tipTaxBasisPoints == null
              ? 'Non configurata'
              : (s.tipTaxBasisPoints / 100).toLocaleString('it-IT') + '%'}
          </strong>
          <p>
            Una modifica vale solo per le prossime mance. I pagamenti già
            registrati conservano aliquota, imposta e netto stimati originari.
            Solo l’amministrazione del gruppo può modificarla.
          </p>
        </div>
      </Panel>
      {editing && (
        <Modal
          title="Configura aliquota mance"
          description="Imposta la percentuale scelta per la simulazione. Il software non determina se sia fiscalmente applicabile al tuo caso."
          onClose={() => setEditing(false)}
        >
          <ActionForm
            label="Salva aliquota simulata"
            onCancel={() => setEditing(false)}
            onSubmit={async (f) => {
              await act('tip-tax', {
                basisPoints: parseEuro(f.get('rate')),
                reason: f.get('reason'),
              });
              setEditing(false);
            }}
          >
            <Field
              label="Aliquota percentuale (0–100)"
              name="rate"
              inputMode="decimal"
              defaultValue={((s.tipTaxBasisPoints ?? 0) / 100).toFixed(2)}
            />
            <Field
              label="Motivazione della configurazione"
              name="reason"
              maxLength={200}
            />
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
