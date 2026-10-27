import clsx from 'clsx';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Copy, Hourglass, LayoutDashboard, Loader2, PartyPopper, ShieldAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader, BrandArc, PageShell } from '@/app/AppShell';
import { Button, Callout, Card } from '@/components/ui';
import { UNDERWRITING_PROCESSING_DAYS, UNDERWRITING_REASON_LABELS } from '@/domain/constants';
import { underwritingReasons } from '@/domain/rules';
import type { Offer } from '@/domain/types';
import { PdfPreview } from '@/features/offer-detail/PdfPreview';
import { dateTime } from '@/lib/format';
import { CDI_PHASES, submitOffer, type CdiPhase } from '@/services/cdi';
import { buildOfferPdf } from '@/services/pdf';
import { useOfferStore } from '@/store/offers';

function Processing({ phase, skipCalculation }: { phase: CdiPhase; skipCalculation: boolean }) {
  const phases = CDI_PHASES.filter((p) => !(skipCalculation && p.id === 'calculate'));
  const idx = phases.findIndex((p) => p.id === phase);
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card className="relative overflow-hidden p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <div className="font-serif text-2xl font-semibold">Übermittlung an das CDI</div>
              <div className="text-sm text-ink-muted">Bitte warten, die Offerte wird verarbeitet.</div>
            </div>
          </div>
          <ol className="mt-8 space-y-4">
            {phases.map((p, i) => {
              const done = i < idx;
              const active = i === idx;
              return (
                <li key={p.id} className="flex items-center gap-3">
                  <span
                    className={clsx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm transition-all duration-300',
                      done && 'bg-sea text-white',
                      active && 'bg-brand text-white shadow-brand',
                      !done && !active && 'bg-surface-sunken text-ink-muted',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={3} /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : i + 1}
                  </span>
                  <span className={clsx('text-sm', active ? 'font-semibold text-ink' : done ? 'text-ink-soft' : 'text-ink-muted')}>{p.label}</span>
                </li>
              );
            })}
          </ol>
          <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <motion.div className="h-full bg-brand" animate={{ width: `${((idx + 1) / phases.length) * 100}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Result({ offer }: { offer: Offer }) {
  const navigate = useNavigate();
  const cdi = offer.cdi!;
  const uw = cdi.status === 'underwriting';
  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[1.75rem] bg-ink px-6 py-8 text-white sm:px-10"
      >
        <BrandArc className="absolute -right-24 -top-10 h-[160%] w-auto opacity-90" />
        <div className="relative max-w-2xl">
          <div className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', uw ? 'bg-sunflower text-ink' : 'bg-white text-ink')}>
            {uw ? <Hourglass className="h-3.5 w-3.5" /> : <PartyPopper className="h-3.5 w-3.5 text-brand" />}
            {uw ? 'Im Underwriting' : 'Offerte erstellt'}
          </div>
          <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            {uw ? 'Anfrage zur Prüfung übermittelt.' : 'Die Offerte ist bereit.'}
          </h1>
          <p className="mt-3 text-white/70">
            {uw
              ? `Das CDI hat die Anfrage ${cdi.offerNumber} dem Underwriting zugewiesen. Die Offerte mit Preis folgt nach der Prüfung (ca. ${UNDERWRITING_PROCESSING_DAYS} Tage).`
              : `Das CDI hat die Prämie berechnet. Offerte ${cdi.offerNumber} vom ${dateTime(cdi.calculatedAt)}, den Preis finden Sie im PDF.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="light" icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => navigate('/')}>
              Zum Dashboard
            </Button>
            <Button variant="ghost-light" icon={<Copy className="h-4 w-4" />} onClick={() => navigate(`/offerte/${offer.id}/duplizieren`)}>
              Als Vorlage duplizieren
            </Button>
            <Button variant="ghost-light" onClick={() => navigate(`/offerte/${offer.id}`)}>
              Details ansehen <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.section>

      {uw && (
        <Callout tone="warning" icon={<ShieldAlert className="h-5 w-5" />} title="Gründe für das Underwriting">
          <ul className="list-disc pl-5">
            {cdi.underwritingReasons.map((r) => (
              <li key={r}>{UNDERWRITING_REASON_LABELS[r]}</li>
            ))}
          </ul>
        </Callout>
      )}

      <PdfPreview build={() => buildOfferPdf(offer)} title={uw ? 'Offertanfrage' : 'Offerte'} deps={[offer.id, cdi.calculatedAt]} />
    </div>
  );
}

export function SubmissionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const offer = useOfferStore((s) => s.offers.find((o) => o.id === id));
  const wizard = useOfferStore((s) => s.wizard);
  const completeSubmission = useOfferStore((s) => s.completeSubmission);
  const [phase, setPhase] = useState<CdiPhase>('transmit');
  const started = useRef(false);

  const pending = wizard?.draft.id === id && wizard.draft.status === 'created';

  useEffect(() => {
    if (!pending) {
      if (!offer || offer.status === 'created') navigate(offer ? `/offerte/${id}/bearbeiten` : '/', { replace: true });
      return;
    }
    if (started.current) return;
    started.current = true;
    submitOffer(wizard.draft, setPhase).then((result) => completeSubmission(result));
  }, [pending, offer, id, navigate, wizard, completeSubmission]);

  const draft = wizard?.draft;
  const skipCalculation = draft ? underwritingReasons(draft.personGroups, draft.applicationQuestions).length > 0 : false;

  return (
    <PageShell header={<AppHeader title="Personenversicherung Rechner" subtitle="Übermittlung an das CDI" />} contactContext={`Übermittlung · ${offer?.companyName ?? ''} · ${id}`}>
      {pending || !offer?.cdi ? <Processing phase={phase} skipCalculation={skipCalculation} /> : <Result offer={offer} />}
    </PageShell>
  );
}
