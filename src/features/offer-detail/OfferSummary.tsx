import { HeartPulse, Paperclip, PencilLine, ShieldPlus, UserCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, KeyValue } from '@/components/ui';
import { CONTRACT_DURATION_LABELS, PAYMENT_FREQUENCY_LABELS, UVG_MAX_SALARY } from '@/domain/constants';
import { findNoga, RISK_CLASS_LABELS } from '@/domain/noga';
import { describeKtg, describeUvgz, groupConfig, groupEmployees, groupSalary, groupSplit, totals } from '@/domain/rules';
import type { Offer } from '@/domain/types';
import { chf, date, fileSize, num, yesNo } from '@/lib/format';
import { resolveAdvisor } from '@/services/pdf';

function Section({ title, step, onEdit, children }: { title: string; step: number; onEdit?: (step: number) => void; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">{title}</h3>
        {onEdit && (
          <button type="button" onClick={() => onEdit(step)} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-surface-muted hover:text-ink">
            <PencilLine className="h-3.5 w-3.5" />
            Bearbeiten
          </button>
        )}
      </div>
      <dl>{children}</dl>
    </Card>
  );
}

export function OfferSummary({ offer, onEdit }: { offer: Offer; onEdit?: (step: number) => void }) {
  const c = offer.customerData;
  const k = offer.contractDetails;
  const q = offer.applicationQuestions;
  const noga = findNoga(c.nogaCode);
  const t = totals(offer.personGroups);
  const perGroup = offer.productConfig.perGroupConfig && offer.personGroups.length > 1;
  const configGroups = perGroup ? offer.personGroups : [offer.personGroups[0]];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Kundendaten" step={1} onEdit={onEdit}>
        <KeyValue label="Firma">{c.companyName || '-'}</KeyValue>
        <KeyValue label="UID-Nummer">{c.uidNumber || '-'}</KeyValue>
        <KeyValue label="Branche">{c.industry || '-'}</KeyValue>
        <KeyValue label="NOGA-Code">{noga ? `${noga.code} ${noga.label} (${RISK_CLASS_LABELS[noga.riskClass]})` : '-'}</KeyValue>
        <KeyValue label="Kontakt">{[c.contactPerson, c.email, c.phone].filter(Boolean).join(' · ') || '-'}</KeyValue>
        <KeyValue label="Adresse">{c.address ? `${c.address}, ${c.postalCode} ${c.city}` : '-'}</KeyValue>
        <KeyValue label="Kundenberater">
          {c.advisors.map((a) => {
            const adv = resolveAdvisor(offer, a.advisorId);
            return (
              <div key={a.id}>
                {adv ? `${adv.name} (${adv.maNumber})` : '-'}
                {c.advisors.length > 1 && <span className="text-ink-muted"> · {a.splitPercent} %</span>}
              </div>
            );
          })}
        </KeyValue>
      </Section>

      <div className="grid gap-4">
        <Section title="Vertrag" step={2} onEdit={onEdit}>
          <KeyValue label="Vertragsstart">{date(k.startDate)}</KeyValue>
          <KeyValue label="Zahlungsfrequenz">{PAYMENT_FREQUENCY_LABELS[k.paymentFrequency] ?? '-'}</KeyValue>
          <KeyValue label="Vertragsdauer">{CONTRACT_DURATION_LABELS[k.contractDuration] ?? '-'}</KeyValue>
        </Section>
        <Section title="Personal" step={3} onEdit={onEdit}>
          {offer.personGroups.map((g) => (
            <KeyValue
              key={g.id}
              label={
                <span className="flex items-center gap-1">
                  {g.isNamedInsured && <UserCheck className="h-3.5 w-3.5 text-brand" />}
                  {g.name || 'Unbenannte Gruppe'}
                </span>
              }
            >
              {g.isNamedInsured ? `${g.namedPersonName} · ` : `${num(g.maleEmployees)} M / ${num(g.femaleEmployees)} F · `}
              {num(groupEmployees(g))} Pers. · {chf(groupSalary(g))}
              {groupSplit(g).excess > 0 && <span className="text-ink-muted"> · Überschuss {chf(groupSplit(g).excess)}</span>}
            </KeyValue>
          ))}
          <div className="mt-2 flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-ink-muted">Total</span>
            <span className="font-semibold tabular-nums">
              {num(t.employees)} Personen · {chf(t.salary)}
            </span>
          </div>
        </Section>
      </div>

      <Section title="Antragsfragen" step={4} onEdit={onEdit}>
        <KeyValue label="1. Bestehende Vers.">
          KTG/VVG {yesNo(q.hasExistingKtgVvg)} · UVG {yesNo(q.hasExistingUvg)} · UVGZ/VVG {yesNo(q.hasExistingUvgzVvg)}
          {q.existingInsuranceCompany && (
            <div className="text-ink-muted">
              {q.existingInsuranceCompany}
              {q.existingPolicyNumber && ` (${q.existingPolicyNumber})`}
            </div>
          )}
        </KeyValue>
        <KeyValue label="2. Schäden 5 Jahre">
          {q.hasPreviousClaims ? `Ja · ${chf(q.claimAmount)}` : yesNo(q.hasPreviousClaims)}
          {q.akdFile && (
            <div className="flex items-center gap-1 text-ink-muted">
              <Paperclip className="h-3.5 w-3.5" />
              {q.akdFile.name} ({fileSize(q.akdFile.size)})
            </div>
          )}
        </KeyValue>
        <KeyValue label="3. Ablehnung">
          {yesNo(q.hasInsuranceRejection)}
          {q.rejectionDetails && <div className="text-ink-muted">{q.rejectionDetails}</div>}
        </KeyValue>
        <KeyValue label="4. Gesundheit">
          a) {yesNo(q.hasChronicIllness)} · b) {yesNo(q.hasCurrentIncapacity)} · c) {yesNo(q.hasLongTermIllness)} · d) {yesNo(q.hasDisabledPersons)}
          {q.healthConditionDetails && <div className="text-ink-muted">{q.healthConditionDetails}</div>}
        </KeyValue>
      </Section>

      <Section title="Produkte und Deckungen" step={6} onEdit={onEdit}>
        <KeyValue label="SUVA-unterstellt">{yesNo(offer.isSuvaAffiliated)}</KeyValue>
        {configGroups.map((g) => {
          const gc = groupConfig(offer.productConfig, g.id, offer.selectedProducts);
          return (
            <div key={g.id} className="mt-3 space-y-3 rounded-xl bg-surface-muted p-4">
              {perGroup && <div className="text-sm font-semibold">{g.name}</div>}
              {gc.products.uvg && (
                <div className="text-sm">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldPlus className="h-4 w-4 text-brand" /> UVGO & UVGF
                  </div>
                  <div className="text-ink-muted">Obligatorisch · max. {chf(UVG_MAX_SALARY)} / Person</div>
                </div>
              )}
              {gc.products.uvgz && (
                <div className="text-sm">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldPlus className="h-4 w-4 text-brand" /> UVGZ
                  </div>
                  {describeUvgz(gc.uvgz).map((r) => (
                    <div key={r.label} className="text-ink-muted">
                      {r.label}: {r.value}
                    </div>
                  ))}
                </div>
              )}
              {gc.products.ktg && (
                <div className="text-sm">
                  <div className="flex items-center gap-1.5 font-medium">
                    <HeartPulse className="h-4 w-4 text-brand" /> KTG
                  </div>
                  {describeKtg(gc.ktg).map((r) => (
                    <div key={r.label} className="text-ink-muted">
                      {r.label}: {r.value}
                    </div>
                  ))}
                </div>
              )}
              {!gc.products.uvg && !gc.products.uvgz && !gc.products.ktg && <div className="text-sm text-ink-muted">Keine Produkte gewählt.</div>}
            </div>
          );
        })}
      </Section>
    </div>
  );
}
