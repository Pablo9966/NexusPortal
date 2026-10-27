import { motion } from 'framer-motion';
import { ArrowRight, Copy, Eye, PencilLine, Plus, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, BrandArc, PageShell } from '@/app/AppShell';
import { Button, Card, Dialog, StatusBadge } from '@/components/ui';
import { CURRENT_USER, STEPS } from '@/domain/constants';
import type { Offer } from '@/domain/types';
import { DashboardCharts } from '@/features/dashboard/Charts';
import { KpiGrid } from '@/features/dashboard/KpiGrid';
import { OfferTable } from '@/features/dashboard/OfferTable';
import { chf, dateTime } from '@/lib/format';
import { useOfferStore } from '@/store/offers';

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend';
}

function SessionOffers({ offers }: { offers: Offer[] }) {
  const navigate = useNavigate();
  if (offers.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold">Ihre Offerten in dieser Session</h2>
          <p className="text-sm text-ink-muted">Fortsetzen, ansehen oder als Vorlage für eine neue Variante duplizieren.</p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {offers.map((o, i) => (
          <motion.div key={o.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="flex w-[18.75rem] shrink-0 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{o.companyName || 'Neue Offerte'}</div>
                  <div className="text-xs text-ink-muted">{o.cdi?.offerNumber ?? `Entwurf · Schritt ${o.currentStep} ${STEPS[o.currentStep - 1]?.title ?? ''}`}</div>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="mt-3 text-xs text-ink-muted">Zuletzt: {dateTime(o.updatedAt)}</div>
              {o.cdi?.premiums && <div className="mt-1 text-sm font-medium">{chf(o.cdi.premiums.total, 2)} / Jahr</div>}
              {o.status === 'created' && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(o.maxStepReached / 7) * 100}%` }} />
                </div>
              )}
              <div className="mt-4 flex gap-2">
                {o.status === 'created' ? (
                  <Button size="sm" className="flex-1" icon={<PencilLine className="h-4 w-4" />} onClick={() => navigate(`/offerte/${o.id}/bearbeiten`)}>
                    Fortsetzen
                  </Button>
                ) : (
                  <Button size="sm" variant="dark" className="flex-1" icon={<Eye className="h-4 w-4" />} onClick={() => navigate(`/offerte/${o.id}`)}>
                    Ansehen
                  </Button>
                )}
                <Button size="sm" variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => navigate(`/offerte/${o.id}/duplizieren`)} title="Duplizieren">
                  Kopie
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const offers = useOfferStore((s) => s.offers);
  const deleteOffer = useOfferStore((s) => s.deleteOffer);
  const resetDemoData = useOfferStore((s) => s.resetDemoData);
  const [toDelete, setToDelete] = useState<Offer | null>(null);
  const sessionOffers = useMemo(
    () => offers.filter((o) => !o.isDemo).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [offers],
  );

  return (
    <PageShell header={<AppHeader title="Personenversicherung" subtitle="WebCalculator · UVG, UVGZ, KTG" />} contactContext="Dashboard">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-ink px-6 py-8 text-white sm:px-10 sm:py-10">
          <BrandArc className="absolute -right-24 -top-10 h-[150%] w-auto opacity-90" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <div className="text-sm text-white/60">
                {greeting()}, {CURRENT_USER.name.split(' ')[0]}
              </div>
              <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight sm:text-4xl">Offerten für Firmenkunden, berechnet im CDI.</h1>
              <p className="mt-3 text-sm text-white/65">Erfassen Sie Kunde, Personal und Deckungen. Nach der Übermittlung erstellt das CDI die Offerte inkl. Prämie als PDF.</p>
            </div>
            <Button size="lg" variant="light" onClick={() => navigate('/offerte/neu')} icon={<Plus className="h-5 w-5" />} className="shrink-0">
              Neue Offerte erstellen
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Button>
          </div>
        </section>

        <SessionOffers offers={sessionOffers} />

        <KpiGrid offers={offers} />
        <DashboardCharts offers={offers} />

        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold">Offertübersicht</h2>
              <p className="text-sm text-ink-muted">Klick auf eine Zeile öffnet die Details.</p>
            </div>
            <button onClick={resetDemoData} className="hidden items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink sm:flex" title="Demo-Daten neu erzeugen">
              <RotateCcw className="h-3.5 w-3.5" />
              Demo-Daten zurücksetzen
            </button>
          </div>
          <OfferTable offers={offers} onDelete={setToDelete} />
        </section>
      </div>

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Entwurf löschen?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (toDelete) deleteOffer(toDelete.id);
                setToDelete(null);
              }}
            >
              Löschen
            </Button>
          </>
        }
      >
        «{toDelete?.companyName || 'Neue Offerte'}» wird aus der Session entfernt. Das lässt sich nicht rückgängig machen.
      </Dialog>
    </PageShell>
  );
}
