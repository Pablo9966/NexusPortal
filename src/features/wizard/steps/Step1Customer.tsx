import clsx from 'clsx';
import { Building, Mail, MapPin, Plus, Trash2, UserPlus, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Callout, Combobox, Field, SelectInput, TextInput } from '@/components/ui';
import { ADVISORS } from '@/domain/constants';
import { INDUSTRIES, nogaEntriesForIndustry, NOGA_ENTRIES, RISK_CLASS_LABELS, findNoga, type RiskClass } from '@/domain/noga';
import type { Advisor } from '@/domain/types';
import { StepCard, SubSection } from '../StepLayout';
import { useDraft, type StepProps } from '../useDraft';
import { ZefixImport } from './ZefixImport';

const RISK_COLORS: Record<RiskClass, string> = {
  A: 'bg-[#E3F1EF] text-sea',
  B: 'bg-[#EEF6F5] text-sea',
  C: 'bg-surface-sunken text-ink-soft',
  D: 'bg-[#FFF3D6] text-terracotta',
  E: 'bg-brand-soft text-brand-dark',
};

function RiskBadge({ cls }: { cls: RiskClass }) {
  return <span className={clsx('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold', RISK_COLORS[cls])}>{cls}</span>;
}

export function Step1Customer({ errors }: StepProps) {
  const { offer, setCustomer } = useDraft();
  const c = offer.customerData;
  const [showNewAdvisor, setShowNewAdvisor] = useState(false);
  const [newAdvisor, setNewAdvisor] = useState({ name: '', maNumber: '', email: '', location: '' });

  const allAdvisors: Advisor[] = useMemo(() => [...ADVISORS, ...c.customAdvisors], [c.customAdvisors]);
  const usedIds = c.advisors.map((a) => a.advisorId);
  const splitTotal = c.advisors.reduce((s, a) => s + a.splitPercent, 0);

  // Die Branche filtert die Startliste, die Suche durchsucht alle Codes
  const toItem = (n: (typeof NOGA_ENTRIES)[number]) => ({ value: n.code, label: `${n.code} ${n.label}`, group: n.section, badge: <RiskBadge cls={n.riskClass} /> });
  const allNogaItems = useMemo(() => NOGA_ENTRIES.map(toItem), []);
  const nogaItems = useMemo(() => (c.industry ? nogaEntriesForIndustry(c.industry).map(toItem) : allNogaItems), [c.industry, allNogaItems]);
  const noga = findNoga(c.nogaCode);

  const text = (key: keyof typeof c, label: string, opts: { placeholder?: string; type?: string; autoComplete?: string } = {}) => (
    <Field label={label} required error={errors[key as string]}>
      {(id) => (
        <TextInput
          id={id}
          type={opts.type ?? 'text'}
          value={c[key] as string}
          placeholder={opts.placeholder}
          autoComplete={opts.autoComplete}
          invalid={!!errors[key as string]}
          onChange={(e) => setCustomer({ [key]: e.target.value })}
        />
      )}
    </Field>
  );

  return (
    <StepCard title="Kundendaten" description="Angaben zum Unternehmen, das versichert werden soll." icon={<Building className="h-5 w-5" />}>
      <div className="space-y-8">
        <ZefixImport
          importedName={c.zefixSource ? c.companyName : undefined}
          onImport={(z) =>
            setCustomer({
              companyName: z.name,
              uidNumber: z.uid,
              address: z.street,
              postalCode: z.postalCode,
              city: z.city,
              zefixSource: { ehraid: z.ehraid, importedAt: new Date().toISOString(), offline: z.offline },
            })
          }
        />

        <SubSection title="Unternehmen">
          <div className="grid gap-5 sm:grid-cols-2">
            {text('companyName', 'Firmenname', { autoComplete: 'organization' })}
            {text('uidNumber', 'UID-Nummer', { placeholder: 'CHE-123.456.789' })}
            <Field label="Branche" required error={errors.industry}>
              {(id) => (
                <SelectInput
                  id={id}
                  value={c.industry}
                  invalid={!!errors.industry}
                  placeholder="Branche wählen ..."
                  onChange={(v) => setCustomer({ industry: v, nogaCode: '' })}
                  options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
                />
              )}
            </Field>
            <Field
              label={
                <>
                  NOGA-Code {c.industry && <span className="font-normal text-ink-muted">(gefiltert nach {c.industry})</span>}
                </>
              }
              required
              error={errors.nogaCode}
              hint={noga ? <span className="flex items-center gap-1.5">Risikoklasse <RiskBadge cls={noga.riskClass} /> {RISK_CLASS_LABELS[noga.riskClass]}</span> : 'Bestimmt die Risikoklasse für die Tarifierung im CDI.'}
            >
              {(id) => (
                <Combobox
                  id={id}
                  value={c.nogaCode}
                  onChange={(v) => setCustomer({ nogaCode: v })}
                  items={nogaItems}
                  searchItems={allNogaItems}
                  invalid={!!errors.nogaCode}
                  placeholder="NOGA-Code suchen oder wählen ..."
                  searchPlaceholder="Code oder Bezeichnung ..."
                  emptyText="Kein NOGA-Code gefunden"
                />
              )}
            </Field>
          </div>
        </SubSection>

        <SubSection title="Kontakt und Adresse">
          <div className="grid gap-5 sm:grid-cols-2">
            {text('contactPerson', 'Kontaktperson', { autoComplete: 'name' })}
            {text('email', 'E-Mail', { type: 'email', autoComplete: 'email' })}
            {text('phone', 'Telefon', { type: 'tel', placeholder: '+41 44 123 45 67', autoComplete: 'tel' })}
            {text('address', 'Strasse und Nr.', { autoComplete: 'street-address' })}
            <div className="grid grid-cols-[7.5rem_1fr] gap-3 sm:col-span-2 sm:grid-cols-[10rem_1fr]">
              {text('postalCode', 'PLZ', { autoComplete: 'postal-code' })}
              {text('city', 'Ort', { autoComplete: 'address-level2' })}
            </div>
          </div>
        </SubSection>

        <SubSection
          title="Kundenberater"
          description="Bei mehreren Beratern den Anteil an der Abschlussprovision angeben. Die Summe muss 100 % ergeben."
        >
          <div className="space-y-3">
            {c.advisors.map((a, i) => {
              const adv = allAdvisors.find((x) => x.id === a.advisorId);
              return (
                <div key={a.id} className="rounded-2xl border border-line bg-surface-muted/50 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_8.75rem_auto] sm:items-end">
                    <Field label={`Berater ${i + 1}`} required>
                      {(id) => (
                        <Combobox
                          id={id}
                          value={a.advisorId}
                          onChange={(v) => setCustomer({ advisors: c.advisors.map((x) => (x.id === a.id ? { ...x, advisorId: v } : x)) })}
                          items={allAdvisors.map((x) => ({
                            value: x.id,
                            label: `${x.name} (${x.maNumber})`,
                            description: `${x.location} · ${x.email}`,
                            disabled: usedIds.includes(x.id) && x.id !== a.advisorId,
                          }))}
                          placeholder="Berater suchen ..."
                          searchPlaceholder="Name, MA-Nr. oder Ort ..."
                          footer={(close) => (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand hover:bg-brand-tint"
                              onClick={() => {
                                close();
                                setShowNewAdvisor(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4" />
                              Neuen Kundenberater erfassen
                            </button>
                          )}
                        />
                      )}
                    </Field>
                    <Field label="Split %">
                      {(id) => (
                        <TextInput
                          id={id}
                          inputMode="numeric"
                          value={a.splitPercent || ''}
                          disabled={c.advisors.length === 1}
                          onChange={(e) =>
                            setCustomer({
                              advisors: c.advisors.map((x) => (x.id === a.id ? { ...x, splitPercent: Math.min(100, parseInt(e.target.value.replace(/\D/g, '')) || 0) } : x)),
                            })
                          }
                        />
                      )}
                    </Field>
                    {c.advisors.length > 1 ? (
                      <Button
                        variant="danger"
                        size="sm"
                        className="h-11"
                        aria-label="Berater entfernen"
                        onClick={() => {
                          const rest = c.advisors.filter((x) => x.id !== a.id);
                          if (rest.length === 1) rest[0] = { ...rest[0], splitPercent: 100 };
                          setCustomer({ advisors: rest });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span />
                    )}
                  </div>
                  {adv && (
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
                      <span className="flex items-center gap-1">
                        <UserRound className="h-3.5 w-3.5" />
                        {adv.maNumber}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {adv.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {adv.location}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {showNewAdvisor && (
              <div className="rounded-2xl border-2 border-dashed border-brand/30 bg-brand-tint/50 p-4">
                <div className="mb-3 text-sm font-semibold">Neuen Kundenberater erfassen</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ['name', 'Name *', 'Vor- und Nachname'],
                      ['maNumber', 'MA-Nr. *', 'z.B. MA-1009'],
                      ['email', 'E-Mail', 'name@swisslife.ch'],
                      ['location', 'Standort', 'z.B. Zürich'],
                    ] as const
                  ).map(([k, l, p]) => (
                    <div key={k}>
                      <div className="mb-1 text-xs font-medium text-ink-soft">{l}</div>
                      <TextInput value={newAdvisor[k]} placeholder={p} onChange={(e) => setNewAdvisor({ ...newAdvisor, [k]: e.target.value })} className="h-10" />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowNewAdvisor(false)}>
                    Abbrechen
                  </Button>
                  <Button
                    size="sm"
                    disabled={!newAdvisor.name.trim() || !newAdvisor.maNumber.trim()}
                    onClick={() => {
                      const adv: Advisor = {
                        id: `custom-${Date.now()}`,
                        name: newAdvisor.name.trim(),
                        maNumber: newAdvisor.maNumber.trim(),
                        email: newAdvisor.email.trim() || `${newAdvisor.name.trim().toLowerCase().replace(/\s+/g, '.')}@swisslife.ch`,
                        location: newAdvisor.location.trim() || 'Nicht angegeben',
                      };
                      setCustomer({ customAdvisors: [...c.customAdvisors, adv] });
                      setNewAdvisor({ name: '', maNumber: '', email: '', location: '' });
                      setShowNewAdvisor(false);
                    }}
                  >
                    Berater erstellen
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                disabled={c.advisors.length >= allAdvisors.length}
                onClick={() => setCustomer({ advisors: [...c.advisors, { id: `${Date.now()}`, advisorId: '', splitPercent: 0 }] })}
              >
                Weiteren Berater hinzufügen
              </Button>
              {c.advisors.length > 1 && (
                <span className={clsx('rounded-full px-3 py-1 text-sm font-medium tabular-nums', splitTotal === 100 ? 'bg-[#E3F1EF] text-sea' : 'bg-brand-soft text-brand-dark')}>
                  Total {splitTotal} %
                </span>
              )}
            </div>
            {errors.advisors && <Callout tone="brand">{errors.advisors}</Callout>}
          </div>
        </SubSection>
      </div>
    </StepCard>
  );
}
