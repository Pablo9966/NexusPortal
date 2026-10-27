import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CircleDashed, Cloud, Home, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader, PageShell } from '@/app/AppShell';
import { Button, Callout, Card, Dialog } from '@/components/ui';
import { STEPS, UNDERWRITING_SALARY_LIMIT, UVG_MAX_SALARY } from '@/domain/constants';
import { hasHealthIssue, salaryExceedsUnderwritingLimit, totals } from '@/domain/rules';
import { firstInvalidStep, validateStep, type FieldErrors } from '@/domain/validation';
import { StepNav } from '@/features/wizard/StepLayout';
import { Stepper } from '@/features/wizard/Stepper';
import { Step1Customer } from '@/features/wizard/steps/Step1Customer';
import { Step2Contract } from '@/features/wizard/steps/Step2Contract';
import { Step3Personnel } from '@/features/wizard/steps/Step3Personnel';
import { Step4Questions } from '@/features/wizard/steps/Step4Questions';
import { Step5Products } from '@/features/wizard/steps/Step5Products';
import { Step6Tariff } from '@/features/wizard/steps/Step6Tariff';
import { Step7Overview } from '@/features/wizard/steps/Step7Overview';
import { chf, dateTime } from '@/lib/format';
import { useOfferStore } from '@/store/offers';

const STEP_HINTS: Record<number, ReactNode> = {
  1: 'Mit der ZEFIX-Suche übernehmen Sie Firmenname, UID und Adresse direkt aus dem Handelsregister. Der NOGA-Code bestimmt die Risikoklasse für das CDI.',
  2: 'Vertragsbeginn ist meist der Erste eines Monats. Die Zahlungsfrequenz bestimmt die Anzahl Rechnungen pro Jahr.',
  3: (
    <>
      Gruppen erlauben unterschiedliche Deckungen, z.B. für Kader. Der Lohn wird in obligatorischen Lohn (bis {chf(UVG_MAX_SALARY)} pro Person) und Überschusslohn aufgeteilt. Jede Person darf nur
      einer Gruppe angehören.
    </>
  ),
  4: 'Die Antragsfragen dienen der Risikobeurteilung. Bei Vorschäden das AKD-File des Vorversicherers beilegen.',
  5: 'SUVA-unterstellte Betriebe behalten die obligatorische UVG bei der SUVA. Offeriert werden dann UVGZ und KTG.',
  6: 'Die Empfehlung richtet sich nach dem Überschusslohn. Preise sind hier bewusst nicht sichtbar, das CDI rechnet nach der Übermittlung.',
  7: 'Prüfen Sie alle Angaben. Nach der Übermittlung lässt sich die Offerte nicht mehr bearbeiten, aber jederzeit duplizieren.',
};

function UwCheck({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok === null ? <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-line-strong" /> : ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-sea" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />}
      <span className={clsx(ok === false ? 'font-medium text-ink' : 'text-ink-soft')}>{label}</span>
    </li>
  );
}

export function WizardPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const wizard = useOfferStore((s) => s.wizard);
  const openDraft = useOfferStore((s) => s.openDraft);
  const goToStep = useOfferStore((s) => s.goToStep);
  const saveDraft = useOfferStore((s) => s.saveDraft);
  const discardDraft = useOfferStore((s) => s.discardDraft);
  const offers = useOfferStore((s) => s.offers);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [homeDialog, setHomeDialog] = useState(false);
  const [direction, setDirection] = useState(1);
  const leaving = useRef(false);

  useEffect(() => {
    if (leaving.current || wizard?.draft.id === id) return;
    if (!openDraft(id)) navigate(offers.some((o) => o.id === id) ? `/offerte/${id}` : '/', { replace: true });
  }, [id, wizard?.draft.id, openDraft, navigate, offers]);

  if (!wizard || wizard.draft.id !== id) return null;
  const offer = wizard.draft;
  const step = offer.currentStep;
  const savedVersion = offers.find((o) => o.id === id);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const go = (target: number) => {
    // Vorwärts nur mit gültigem aktuellem Schritt
    if (target > step) {
      const e = validateStep(step, offer);
      if (Object.keys(e).length) {
        setErrors(e);
        setTimeout(() => document.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
        return;
      }
    }
    setErrors({});
    setDirection(target > step ? 1 : -1);
    goToStep(target);
    scrollTop();
  };

  const submit = () => {
    const invalid = firstInvalidStep(offer);
    if (invalid) {
      setDirection(-1);
      goToStep(invalid);
      setErrors(validateStep(invalid, offer));
      scrollTop();
      return;
    }
    goToStep(7);
    leaving.current = true;
    navigate(`/offerte/${id}/uebermittlung`);
  };

  const q = offer.applicationQuestions;
  const salary = totals(offer.personGroups).salary;
  const q4Answered = [q.hasChronicIllness, q.hasCurrentIncapacity, q.hasLongTermIllness, q.hasDisabledPersons].every((v) => v !== null);

  const stepProps = { errors };
  const content: Record<number, ReactNode> = {
    1: <Step1Customer {...stepProps} />,
    2: <Step2Contract {...stepProps} />,
    3: <Step3Personnel {...stepProps} />,
    4: <Step4Questions {...stepProps} />,
    5: <Step5Products {...stepProps} />,
    6: <Step6Tariff {...stepProps} />,
    7: <Step7Overview onEdit={(s) => go(s)} onSubmit={submit} onBack={() => go(6)} />,
  };

  return (
    <PageShell
      contactContext={`Schritt ${step} ${STEPS[step - 1].title} · ${offer.companyName || offer.customerData.companyName || 'Neue Offerte'} · ${offer.id}`}
      header={
        <AppHeader
          title="Personenversicherung Rechner"
          subtitle={offer.duplicatedFrom ? `Kopie von ${offer.duplicatedFrom}` : 'Neue Offerte in 7 Schritten'}
          actions={
            <Button variant="ghost" size="sm" icon={<Home className="h-4 w-4" />} onClick={() => setHomeDialog(true)}>
              <span className="hidden sm:inline">Home</span>
            </Button>
          }
        />
      }
    >
      <div className="mx-auto max-w-5xl">
        <Stepper current={step} maxReached={offer.maxStepReached} onSelect={go} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
        <div className="min-w-0">
          {Object.keys(errors).length > 0 && (
            <Callout tone="brand" className="mb-4" title="Bitte Angaben ergänzen">
              Einige Pflichtangaben fehlen oder sind ungültig. Die betroffenen Felder sind markiert.
            </Callout>
          )}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {content[step]}
            </motion.div>
          </AnimatePresence>
          {step < 7 && <StepNav onBack={step > 1 ? () => go(step - 1) : undefined} onNext={() => go(step + 1)} nextLabel={step === 6 ? 'Weiter zur Übersicht' : 'Weiter'} />}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-ink px-5 py-4 text-white">
              <div className="text-xs text-white/60">Offerte</div>
              <div className="truncate font-serif text-lg font-semibold">{offer.customerData.companyName || 'Neue Offerte'}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/60">
                <Cloud className="h-3.5 w-3.5" />
                {savedVersion ? `In Session gespeichert ${dateTime(savedVersion.updatedAt)}` : 'Noch nicht gespeichert'}
              </div>
            </div>
            <div className="p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-brand" />
                Underwriting-Prüfung
              </div>
              <ul className="space-y-2">
                <UwCheck ok={salary > 0 ? !salaryExceedsUnderwritingLimit(salary) : null} label={`Lohnsumme bis ${chf(UNDERWRITING_SALARY_LIMIT)}${salary > 0 ? ` (aktuell ${chf(salary)})` : ''}`} />
                <UwCheck ok={q.hasInsuranceRejection === null ? null : !q.hasInsuranceRejection} label="Keine frühere Ablehnung" />
                <UwCheck ok={q4Answered ? !hasHealthIssue(q) : null} label="Keine gesundheitlichen Einschränkungen" />
              </ul>
              <p className="mt-3 text-xs text-ink-muted">Vorschäden lösen kein Underwriting aus. Verbindlich entscheidet das CDI.</p>
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4 text-ink-muted" />
              {STEPS[step - 1].title}
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">{STEP_HINTS[step]}</p>
          </Card>
        </aside>
      </div>

      <Dialog
        open={homeDialog}
        onClose={() => setHomeDialog(false)}
        title="Zurück zum Dashboard?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setHomeDialog(false)}>
              Abbrechen
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                leaving.current = true;
                discardDraft();
                navigate('/');
              }}
            >
              Verwerfen
            </Button>
            <Button
              onClick={() => {
                leaving.current = true;
                saveDraft();
                navigate('/');
              }}
            >
              Speichern & zurück
            </Button>
          </>
        }
      >
        {wizard.isNew
          ? 'Speichern behält den Entwurf in dieser Session. Verwerfen löscht die neue Offerte.'
          : 'Speichern übernimmt Ihre Änderungen. Verwerfen stellt den Stand vom Öffnen wieder her.'}
      </Dialog>
    </PageShell>
  );
}
