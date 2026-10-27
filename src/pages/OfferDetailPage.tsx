import clsx from 'clsx';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Copy, FileText, Hourglass, Mail, PencilLine, Receipt, ScrollText, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader, PageShell } from '@/app/AppShell';
import { Button, Callout, Card, ProductChip, StatusBadge } from '@/components/ui';
import { STATUS_META, UNDERWRITING_PROCESSING_DAYS, UNDERWRITING_REASON_LABELS } from '@/domain/constants';
import { productLabels, totals } from '@/domain/rules';
import type { Offer } from '@/domain/types';
import { OfferSummary } from '@/features/offer-detail/OfferSummary';
import { PdfPreview } from '@/features/offer-detail/PdfPreview';
import { chf, date, dateTime, num } from '@/lib/format';
import { acceptUnderwriting } from '@/services/cdi';
import { buildMailto } from '@/services/mail';
import { buildApplicationPdf, buildInvoicePdf, buildOfferPdf, buildPolicyPdf, resolveAdvisor } from '@/services/pdf';
import { useOfferStore } from '@/store/offers';

type DocKey = 'offer' | 'application' | 'policy' | `invoice:${string}`;

function invoicePeriods(offer: Offer, now = new Date()): string[] {
  const start = new Date(offer.contractDetails.startDate || offer.createdAt);
  const periods: string[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  const step = offer.contractDetails.paymentFrequency === 'semi-annual' ? 6 : 12;
  while (d <= now && periods.length < 12) {
    periods.push(step === 12 ? `Jahresprämie ${d.getFullYear()}` : `${d.getMonth() < 6 ? '1.' : '2.'} Halbjahr ${d.getFullYear()}`);
    d.setMonth(d.getMonth() + step);
  }
  return periods.reverse();
}

const BANNERS: Record<Offer['status'], { icon: ReactNode; title: string; text: string; tone: string }> = {
  created: { icon: <PencilLine className="h-5 w-5" />, title: 'Entwurf', text: 'Noch nicht an das CDI übermittelt. Fortsetzen, um die Offerte abzuschliessen.', tone: 'bg-surface-muted text-ink' },
  processing: { icon: <FileText className="h-5 w-5" />, title: 'Offerte erstellt', text: 'Vom CDI berechnet. Wartet auf den Entscheid des Kunden.', tone: 'bg-[#EAF5F3] text-ink' },
  underwriting: { icon: <Hourglass className="h-5 w-5" />, title: 'Im Underwriting', text: `Manuelle Prüfung, ca. ${UNDERWRITING_PROCESSING_DAYS} Tage. Danach berechnet das CDI die Prämie.`, tone: 'bg-[#FFF8E3] text-ink' },
  contracted: { icon: <CheckCircle2 className="h-5 w-5" />, title: 'Abgeschlossen', text: 'Police und Rechnungen stehen zum Download bereit.', tone: 'bg-[#E3F1EF] text-ink' },
  declined: { icon: <XCircle className="h-5 w-5" />, title: 'Abgelehnt', text: 'Bei Fragen wenden Sie sich an den zuständigen Kundenberater.', tone: 'bg-brand-soft text-ink' },
};

export function OfferDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const offers = useOfferStore((s) => s.offers);
  const setOfferStatus = useOfferStore((s) => s.setOfferStatus);
  const offer = offers.find((o) => o.id === id);
  const sorted = useMemo(() => [...offers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [offers]);
  const index = sorted.findIndex((o) => o.id === id);
  const [doc, setDoc] = useState<DocKey>('offer');

  if (!offer) {
    return (
      <PageShell header={<AppHeader title="Offerte" />}>
        <Card className="mx-auto max-w-md p-8 text-center">
          <p className="text-ink-soft">Diese Offerte gibt es in der aktuellen Session nicht (mehr).</p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            Zum Dashboard
          </Button>
        </Card>
      </PageShell>
    );
  }

  const t = totals(offer.personGroups);
  const banner = BANNERS[offer.status];
  const advisor = resolveAdvisor(offer, offer.customerData.advisors[0]?.advisorId ?? '');
  const docs: { key: DocKey; label: string; icon: ReactNode; build: () => ReturnType<typeof buildOfferPdf> }[] = [];
  if (offer.cdi) docs.push({ key: 'offer', label: offer.cdi.premiums ? 'Offerte' : 'Offertanfrage', icon: <FileText className="h-4 w-4" />, build: () => buildOfferPdf(offer) });
  docs.push({ key: 'application', label: 'Antragsformular', icon: <ScrollText className="h-4 w-4" />, build: () => buildApplicationPdf(offer) });
  if (offer.status === 'contracted') {
    docs.push({ key: 'policy', label: 'Police', icon: <ShieldCheck className="h-4 w-4" />, build: () => buildPolicyPdf(offer) });
    invoicePeriods(offer).forEach((p) => docs.push({ key: `invoice:${p}`, label: `Rechnung ${p}`, icon: <Receipt className="h-4 w-4" />, build: () => buildInvoicePdf(offer, p) }));
  }
  const activeDoc = docs.find((d) => d.key === doc) ?? docs[0];

  const mailHref = advisor
    ? buildMailto({
        to: advisor.email,
        subject: `Offerte ${offer.cdi?.offerNumber ?? offer.id} · ${offer.companyName}`,
        body: `Hallo ${advisor.name.split(' ')[0]}\n\n\n\n---\nOfferte: ${offer.cdi?.offerNumber ?? offer.id}\nFirma: ${offer.companyName}\nStatus: ${STATUS_META[offer.status].label}\nLohnsumme: ${chf(t.salary)}, ${t.employees} Personen\nLink: ${window.location.href}`,
      })
    : undefined;

  return (
    <PageShell header={<AppHeader title="Offerte" subtitle={offer.cdi?.offerNumber ?? 'Entwurf'} />} contactContext={`Detail ${offer.cdi?.offerNumber ?? offer.id} · ${offer.companyName}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/')}>
          Zurück zur Übersicht
        </Button>
        <div className="flex items-center gap-1 text-sm text-ink-muted">
          <button disabled={index <= 0} onClick={() => navigate(`/offerte/${sorted[index - 1].id}`)} className="rounded-full p-2 hover:bg-white disabled:opacity-30" aria-label="Vorherige Offerte">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="tabular-nums">
            {index + 1} von {sorted.length}
          </span>
          <button disabled={index >= sorted.length - 1} onClick={() => navigate(`/offerte/${sorted[index + 1].id}`)} className="rounded-full p-2 hover:bg-white disabled:opacity-30" aria-label="Nächste Offerte">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand/5" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={offer.status} />
              {offer.duplicatedFrom && <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs text-ink-soft">Kopie von {offer.duplicatedFrom}</span>}
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold">{offer.companyName || 'Neue Offerte'}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {offer.customerData.industry || 'Branche offen'} · {offer.customerData.city || 'Ort offen'} · erstellt {date(offer.createdAt)} · zuletzt {dateTime(offer.updatedAt)}
            </p>
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <div>
                <div className="text-xs text-ink-muted">Mitarbeitende</div>
                <div className="font-semibold tabular-nums">{num(t.employees)}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Lohnsumme</div>
                <div className="font-semibold tabular-nums">{chf(t.salary)}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Produkte</div>
                <div className="mt-0.5 flex gap-1">{productLabels(offer.selectedProducts).map((p) => <ProductChip key={p} label={p} />)}</div>
              </div>
              {offer.cdi?.premiums && (
                <div>
                  <div className="text-xs text-ink-muted">Jahresprämie (CDI)</div>
                  <div className="font-semibold tabular-nums">{chf(offer.cdi.premiums.total, 2)}</div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {offer.status === 'created' ? (
              <Button icon={<PencilLine className="h-4 w-4" />} onClick={() => navigate(`/offerte/${offer.id}/bearbeiten`)}>
                Fortsetzen
              </Button>
            ) : (
              <Button variant="dark" icon={<Copy className="h-4 w-4" />} onClick={() => navigate(`/offerte/${offer.id}/duplizieren`)}>
                Duplizieren
              </Button>
            )}
            {mailHref && (
              <a href={mailHref} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-white px-5 text-[0.9375rem] font-medium hover:border-ink">
                <Mail className="h-4 w-4" />
                Berater kontaktieren
              </a>
            )}
          </div>
        </div>
        <div className={clsx('relative mt-6 flex items-start gap-3 rounded-xl p-4', banner.tone)}>
          <div className="mt-0.5">{banner.icon}</div>
          <div className="text-sm">
            <div className="font-semibold">{banner.title}</div>
            <div className="text-ink-soft">{banner.text}</div>
            {offer.status === 'underwriting' && offer.cdi && (
              <ul className="mt-1 list-disc pl-5 text-ink-soft">
                {offer.cdi.underwritingReasons.map((r) => (
                  <li key={r}>{UNDERWRITING_REASON_LABELS[r]}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {(offer.status === 'underwriting' || offer.status === 'processing') && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 border-dashed p-4">
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Sparkles className="h-4 w-4 text-brand" />
            <span>
              <span className="font-semibold text-ink">Demo-Aktionen:</span> Lebenszyklus der Offerte simulieren
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {offer.status === 'underwriting' ? (
              <>
                <Button size="sm" onClick={() => setOfferStatus(offer.id, 'processing', acceptUnderwriting(offer))}>
                  UW annehmen, CDI rechnet
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setOfferStatus(offer.id, 'declined')}>
                  UW ablehnen
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={() => setOfferStatus(offer.id, 'contracted')}>
                  Kunde unterschreibt
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setOfferStatus(offer.id, 'declined')}>
                  Kunde lehnt ab
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold">Angaben</h2>
          <div className="[&>div]:grid-cols-1 [&>div]:lg:grid-cols-1">
            <OfferSummary offer={offer} />
          </div>
        </div>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <h2 className="mb-3 font-serif text-xl font-semibold">Dokumente</h2>
          {offer.status === 'created' && <Callout className="mb-3">Die Offerte entsteht erst nach der Übermittlung an das CDI. Verfügbar ist das Antragsformular mit dem aktuellen Stand.</Callout>}
          <div className="mb-3 flex flex-wrap gap-2">
            {docs.map((d) => (
              <button
                key={d.key}
                onClick={() => setDoc(d.key)}
                className={clsx(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
                  activeDoc.key === d.key ? 'border-ink bg-ink text-white' : 'border-line-strong/70 bg-white hover:border-ink',
                )}
              >
                {d.icon}
                {d.label}
              </button>
            ))}
          </div>
          <PdfPreview key={`${offer.id}-${activeDoc.key}`} build={activeDoc.build} title={activeDoc.label} height={640} deps={[offer.id, activeDoc.key, offer.updatedAt]} />
        </div>
      </div>
    </PageShell>
  );
}
