import { FileSignature } from 'lucide-react';
import { Choice, Field, TextInput } from '@/components/ui';
import type { ContractDuration, PaymentFrequency } from '@/domain/types';
import { StepCard } from '../StepLayout';
import { useDraft, type StepProps } from '../useDraft';

function firstOfNextMonth(): string {
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
}

export function Step2Contract({ errors }: StepProps) {
  const { offer, setContract } = useDraft();
  const k = offer.contractDetails;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <StepCard title="Vertrag" description="Beginn, Zahlungsweise und Laufzeit des Vertrags." icon={<FileSignature className="h-5 w-5" />}>
      <div className="grid gap-8">
        <Field label="Vertragsstart" required error={errors.startDate} hint="Üblich ist der Erste eines Monats.">
          {(id) => (
            <div className="flex flex-wrap items-center gap-3">
              <TextInput id={id} type="date" min={today} value={k.startDate} invalid={!!errors.startDate} onChange={(e) => setContract({ startDate: e.target.value })} className="max-w-[220px]" />
              <button type="button" className="text-sm font-medium text-brand hover:underline" onClick={() => setContract({ startDate: firstOfNextMonth() })}>
                1. des nächsten Monats
              </button>
            </div>
          )}
        </Field>
        <Field label="Zahlungsfrequenz" required error={errors.paymentFrequency}>
          {() => (
            <Choice<PaymentFrequency>
              value={k.paymentFrequency || null}
              invalid={!!errors.paymentFrequency}
              onChange={(v) => setContract({ paymentFrequency: v })}
              options={[
                { value: 'annual', label: 'Jährlich', sub: '1 Rechnung pro Jahr' },
                { value: 'semi-annual', label: 'Halbjährlich', sub: '2 Rechnungen pro Jahr' },
              ]}
            />
          )}
        </Field>
        <Field label="Vertragsdauer" required error={errors.contractDuration}>
          {() => (
            <Choice<ContractDuration>
              value={k.contractDuration || null}
              invalid={!!errors.contractDuration}
              onChange={(v) => setContract({ contractDuration: v })}
              options={[
                { value: '1', label: '1 Jahr' },
                { value: '3', label: '3 Jahre' },
                { value: '5', label: '5 Jahre' },
              ]}
            />
          )}
        </Field>
      </div>
    </StepCard>
  );
}
