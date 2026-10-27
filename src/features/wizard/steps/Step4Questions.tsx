import clsx from 'clsx';
import { Check, ClipboardList, FileUp, Paperclip, X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Callout, Field, NumberInput, TextInput, YesNo } from '@/components/ui';
import { hasHealthIssue, totals } from '@/domain/rules';
import type { ApplicationQuestions } from '@/domain/types';
import { chf, fileSize } from '@/lib/format';
import { StepCard } from '../StepLayout';
import { useDraft, type StepProps } from '../useDraft';

function QuestionBlock({ n, title, subtitle, complete, error, children }: { n: number; title: string; subtitle: string; complete: boolean; error?: string; children: ReactNode }) {
  return (
    <div className={clsx('rounded-2xl border p-5 transition', error ? 'border-brand/50 bg-brand-tint/40' : 'border-line bg-white')}>
      <div className="mb-4 flex items-start gap-3">
        <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition', complete ? 'bg-sea text-white' : 'bg-surface-sunken text-ink-soft')}>
          {complete ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
        </span>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-ink-muted">{subtitle}</div>
        </div>
      </div>
      <div className="space-y-4 pl-0 sm:pl-11">{children}</div>
      {error && <p className="mt-3 text-xs font-medium text-brand-dark sm:pl-11">{error}</p>}
    </div>
  );
}

function YesNoRow({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line/70 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-ink">{label}</span>
      <YesNo value={value} onChange={onChange} />
    </div>
  );
}

function AkdUpload({ value, onChange }: { value: ApplicationQuestions['akdFile']; onChange: (v: ApplicationQuestions['akdFile']) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium">AKD-File (Auskunftsdienst) vom Vorversicherer</div>
      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <Paperclip className="h-4 w-4 shrink-0 text-brand" />
            <span className="truncate font-medium">{value.name}</span>
            <span className="shrink-0 text-ink-muted">{fileSize(value.size)}</span>
          </span>
          <button type="button" onClick={() => onChange(null)} className="rounded-full p-1 text-ink-muted hover:bg-white hover:text-ink" aria-label="Datei entfernen">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line-strong px-4 py-5 text-sm text-ink-muted transition hover:border-brand hover:bg-brand-tint/40 hover:text-ink"
        >
          <FileUp className="h-5 w-5" />
          <span className="font-medium">Datei auswählen</span>
          <span className="text-xs">PDF, JPG oder PNG, max. 10 MB</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange({ name: f.name, size: f.size, type: f.type, uploadedAt: new Date().toISOString() });
          e.target.value = '';
        }}
      />
      <p className="mt-1.5 text-xs text-ink-muted">Im Prototyp werden nur Name und Grösse gespeichert. Die Datei selbst geht in der Zielumgebung mit der Anfrage ans CDI.</p>
    </div>
  );
}

export function Step4Questions({ errors }: StepProps) {
  const { offer, setQuestions } = useDraft();
  const q = offer.applicationQuestions;
  const anyExisting = q.hasExistingKtgVvg === true || q.hasExistingUvg === true || q.hasExistingUvgzVvg === true;
  const health = hasHealthIssue(q);
  const salary = totals(offer.personGroups).salary;

  const q1Complete = q.hasExistingKtgVvg !== null && q.hasExistingUvg !== null && q.hasExistingUvgzVvg !== null && (!anyExisting || !!q.existingInsuranceCompany.trim());
  const q2Complete = q.hasPreviousClaims === false || (q.hasPreviousClaims === true && q.claimAmount > 0);
  const q3Complete = q.hasInsuranceRejection !== null;
  const q4Complete = [q.hasChronicIllness, q.hasCurrentIncapacity, q.hasLongTermIllness, q.hasDisabledPersons].every((v) => v !== null);

  return (
    <StepCard title="Antragsfragen" description="Angaben zur Risikobeurteilung. Bitte alle Fragen wahrheitsgemäss beantworten." icon={<ClipboardList className="h-5 w-5" />}>
      <div className="space-y-4">
        <QuestionBlock n={1} title="Bestehende Versicherungen" subtitle="Besteht oder bestand für die zu versichernden Personen bereits eine:" complete={q1Complete} error={errors.q1}>
          <YesNoRow label="a) Krankentaggeldversicherung nach VVG" value={q.hasExistingKtgVvg} onChange={(v) => setQuestions({ hasExistingKtgVvg: v })} />
          <YesNoRow label="b) Unfallversicherung nach UVG" value={q.hasExistingUvg} onChange={(v) => setQuestions({ hasExistingUvg: v })} />
          <YesNoRow label="c) Unfallzusatzversicherung nach VVG" value={q.hasExistingUvgzVvg} onChange={(v) => setQuestions({ hasExistingUvgzVvg: v })} />
          {anyExisting && (
            <div className="grid gap-4 rounded-xl bg-surface-muted p-4 sm:grid-cols-2">
              <Field label="Versicherungsgesellschaft" required>
                {(id) => <TextInput id={id} value={q.existingInsuranceCompany} placeholder="z.B. Zurich, AXA, Helvetia" onChange={(e) => setQuestions({ existingInsuranceCompany: e.target.value })} />}
              </Field>
              <Field label="Policennummer(n)">
                {(id) => <TextInput id={id} value={q.existingPolicyNumber} placeholder="z.B. P-123456" onChange={(e) => setQuestions({ existingPolicyNumber: e.target.value })} />}
              </Field>
            </div>
          )}
        </QuestionBlock>

        <QuestionBlock n={2} title="Schadeninformationen" subtitle="Versicherungsleistungen der letzten 5 Jahre" complete={q2Complete} error={errors.q2}>
          <YesNoRow
            label="Haben Sie bzw. die Firma in den letzten 5 Jahren Leistungen für Krankentaggeld oder Unfall bezogen?"
            value={q.hasPreviousClaims}
            onChange={(v) => setQuestions({ hasPreviousClaims: v, claimAmount: v ? q.claimAmount : 0, akdFile: v ? q.akdFile : null })}
          />
          {q.hasPreviousClaims && (
            <div className="space-y-4 rounded-xl bg-surface-muted p-4">
              <Field label="Gesamtschadenbetrag der letzten 5 Jahre" required hint={salary > 0 ? `Gesamtlohnsumme: ${chf(salary)}` : undefined}>
                {(id) => <NumberInput id={id} prefix="CHF" value={q.claimAmount} onChange={(v) => setQuestions({ claimAmount: v })} />}
              </Field>
              <AkdUpload value={q.akdFile} onChange={(v) => setQuestions({ akdFile: v })} />
            </div>
          )}
        </QuestionBlock>

        <QuestionBlock n={3} title="Versicherungsannahme" subtitle="Ablehnungen oder erschwerte Bedingungen" complete={q3Complete} error={errors.q3}>
          <YesNoRow
            label="Wurde die Annahme einer Kollektivversicherung in den letzten 5 Jahren abgelehnt oder an erschwerte Bedingungen geknüpft?"
            value={q.hasInsuranceRejection}
            onChange={(v) => setQuestions({ hasInsuranceRejection: v })}
          />
          {q.hasInsuranceRejection && (
            <>
              <Callout tone="warning" title="Underwriting erforderlich">
                Eine frühere Ablehnung erfordert eine manuelle Prüfung durch das Underwriting.
              </Callout>
              <Field label="Details zur Ablehnung">
                {(id) => <TextInput id={id} value={q.rejectionDetails} placeholder="Grund und Versicherer" onChange={(e) => setQuestions({ rejectionDetails: e.target.value })} />}
              </Field>
            </>
          )}
        </QuestionBlock>

        <QuestionBlock n={4} title="Gesundheitszustand" subtitle="Befinden sich unter den zu versichernden Personen:" complete={q4Complete} error={errors.q4}>
          <YesNoRow label="a) Personen mit chronischen Krankheiten, die nicht voll arbeitsfähig sind?" value={q.hasChronicIllness} onChange={(v) => setQuestions({ hasChronicIllness: v })} />
          <YesNoRow label="b) Personen, die aktuell arbeitsunfähig sind?" value={q.hasCurrentIncapacity} onChange={(v) => setQuestions({ hasCurrentIncapacity: v })} />
          <YesNoRow label="c) Personen mit einer Krankheit, bei der mit längerer Arbeitsunfähigkeit zu rechnen ist?" value={q.hasLongTermIllness} onChange={(v) => setQuestions({ hasLongTermIllness: v })} />
          <YesNoRow label="d) Invalide Personen?" value={q.hasDisabledPersons} onChange={(v) => setQuestions({ hasDisabledPersons: v })} />
          {health && (
            <>
              <Callout tone="warning" title="Underwriting erforderlich">
                Aufgrund des Gesundheitszustands einzelner Personen prüft das Underwriting die Anfrage.
              </Callout>
              <Field label="Details zu den betroffenen Personen">
                {(id) => <TextInput id={id} value={q.healthConditionDetails} placeholder="Anzahl Personen, Art der Einschränkung" onChange={(e) => setQuestions({ healthConditionDetails: e.target.value })} />}
              </Field>
            </>
          )}
        </QuestionBlock>
      </div>
    </StepCard>
  );
}
