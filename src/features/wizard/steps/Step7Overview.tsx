import { ClipboardCheck, FileText, Send, ShieldAlert } from 'lucide-react';
import { Button, Callout, Card } from '@/components/ui';
import { UNDERWRITING_PROCESSING_DAYS, UNDERWRITING_REASON_LABELS } from '@/domain/constants';
import { underwritingReasons } from '@/domain/rules';
import { OfferSummary } from '@/features/offer-detail/OfferSummary';
import { useDraft } from '../useDraft';

export function Step7Overview({ onEdit, onSubmit, onBack }: { onEdit: (step: number) => void; onSubmit: () => void; onBack: () => void }) {
  const { offer } = useDraft();
  const reasons = underwritingReasons(offer.personGroups, offer.applicationQuestions);
  const uw = reasons.length > 0;

  return (
    <div className="space-y-5">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold">Übersicht</h2>
            <p className="mt-1 text-sm text-ink-muted">Bitte alle Angaben prüfen. Nach der Übermittlung rechnet das CDI die Prämie und erstellt die Offerte als PDF.</p>
          </div>
        </div>
      </Card>

      <OfferSummary offer={offer} onEdit={onEdit} />

      {uw ? (
        <Callout tone="warning" icon={<ShieldAlert className="h-5 w-5" />} title="Underwriting erforderlich">
          <p>Die Anfrage wird an das CDI übermittelt und dort dem Underwriting zugewiesen. Die Offerte mit Preis folgt nach der Prüfung.</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {reasons.map((r) => (
              <li key={r}>{UNDERWRITING_REASON_LABELS[r]}</li>
            ))}
          </ul>
          <p className="mt-2 font-medium text-ink">Geschätzte Bearbeitungszeit: ca. {UNDERWRITING_PROCESSING_DAYS} Tage.</p>
        </Callout>
      ) : (
        <Callout tone="success" icon={<FileText className="h-5 w-5" />} title="Direkte Offerte möglich">
          Kein Underwriting nötig. Das CDI berechnet die Prämie sofort, die Offerte inkl. Preis steht danach als PDF bereit.
        </Callout>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={onBack}>
          Zurück
        </Button>
        <Button size="lg" onClick={onSubmit} icon={<Send className="h-4 w-4" />}>
          {uw ? 'Zur Prüfung übermitteln' : 'Offerte übermitteln'}
        </Button>
      </div>
    </div>
  );
}
