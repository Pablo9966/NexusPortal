import clsx from 'clsx';
import { HelpCircle, Plus, RotateCcw, Trash2, UserCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, Callout, Choice, Field, NumberInput, TextInput, Toggle } from '@/components/ui';
import { newPersonGroup, UNDERWRITING_SALARY_LIMIT, UVG_MAX_SALARY } from '@/domain/constants';
import { effectiveExcess, groupEmployees, groupSalary, groupSplit, salaryExceedsUnderwritingLimit, totals } from '@/domain/rules';
import type { Gender, NamedInsuredType, PersonGroup } from '@/domain/types';
import { chf, num } from '@/lib/format';
import { StepCard } from '../StepLayout';
import { useDraft, type StepProps } from '../useDraft';

function ExcessHelp() {
  return (
    <span className="group relative inline-flex">
      <HelpCircle className="h-3.5 w-3.5 cursor-help text-ink-muted" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl bg-ink p-3 text-xs font-normal leading-relaxed text-white opacity-0 shadow-lift transition group-hover:opacity-100">
        Der Überschusslohn ist der Lohnanteil über dem maximal UVG-versicherten Jahreslohn von {chf(UVG_MAX_SALARY)} pro Person. Er lässt sich über die UVGZ absichern. Der Wert ist eine Schätzung über den
        Durchschnittslohn und kann angepasst werden. Verbindlich rechnet das CDI.
      </span>
    </span>
  );
}

function SplitRow({ salary, employees, override, onOverride }: { salary: number; employees: number; override: number | null; onOverride: (v: number | null) => void }) {
  if (salary <= 0 || employees <= 0) return null;
  const excess = effectiveExcess(salary, employees, override);
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-surface-muted p-3 text-sm">
      <div>
        <div className="text-xs text-ink-muted">Obligatorischer Lohn</div>
        <div className="mt-1 font-medium tabular-nums">{chf(salary - excess)}</div>
      </div>
      <div>
        <div className="flex items-center gap-1 text-xs text-ink-muted">
          Überschusslohn <ExcessHelp />
          {override !== null && (
            <button type="button" onClick={() => onOverride(null)} className="ml-auto flex items-center gap-1 text-[0.6875rem] font-medium text-brand" title="Auf berechneten Wert zurücksetzen">
              <RotateCcw className="h-3 w-3" /> Zurücksetzen
            </button>
          )}
        </div>
        <div className="mt-1">
          <NumberInput value={excess} max={salary} onChange={(v) => onOverride(v)} prefix="CHF" />
        </div>
        {override !== null && <div className="mt-1 text-[0.6875rem] font-medium text-terracotta">Manuell angepasst</div>}
      </div>
    </div>
  );
}

function GenderBlock({
  title,
  employees,
  salary,
  override,
  onChange,
  errors,
}: {
  title: string;
  employees: number;
  salary: number;
  override: number | null;
  onChange: (patch: { employees?: number; salary?: number; override?: number | null }) => void;
  errors: { employees?: string; salary?: string };
}) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="grid gap-3 sm:grid-cols-[7.5rem_1fr]">
        <Field label="Anzahl" error={errors.employees}>
          {(id) => <NumberInput id={id} value={employees} invalid={!!errors.employees} onChange={(v) => onChange({ employees: v, override: null })} />}
        </Field>
        <Field label="Jährl. AHV-Lohnsumme" error={errors.salary}>
          {(id) => <NumberInput id={id} value={salary} prefix="CHF" invalid={!!errors.salary} onChange={(v) => onChange({ salary: v, override: null })} />}
        </Field>
      </div>
      <SplitRow salary={salary} employees={employees} override={override} onOverride={(v) => onChange({ override: v })} />
    </div>
  );
}

function GroupCard({ group, index, canRemove, onChange, onRemove, errors }: { group: PersonGroup; index: number; canRemove: boolean; onChange: (g: PersonGroup) => void; onRemove: () => void; errors: Record<string, string> }) {
  const e = (k: string) => errors[`group.${index}.${k}`];
  const set = (patch: Partial<PersonGroup>) => onChange({ ...group, ...patch });
  const split = groupSplit(group);
  const female = group.namedInsuredGender === 'female';

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{index + 1}</span>
          <span className="font-semibold">Personengruppe</span>
        </div>
        {canRemove && (
          <Button variant="danger" size="sm" onClick={onRemove} icon={<Trash2 className="h-4 w-4" />}>
            Entfernen
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        <Field label="Gruppenname" required error={e('name')}>
          {(id) => <TextInput id={id} value={group.name} placeholder="z.B. Das gesamte Personal" disabled={group.isNamedInsured} invalid={!!e('name')} onChange={(ev) => set({ name: ev.target.value })} />}
        </Field>

        <div className={clsx('rounded-2xl border p-4 transition', group.isNamedInsured ? 'border-brand/30 bg-brand-tint/60' : 'border-line bg-surface-muted/50')}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserCheck className="h-4 w-4 text-brand" />
              Namentlich versicherte Person
            </div>
            <Toggle
              checked={group.isNamedInsured}
              onChange={(on) =>
                on
                  ? set({ isNamedInsured: true, name: 'Namentlich versicherte Person', maleEmployees: 1, femaleEmployees: 0, femaleSalary: 0, maleExcessOverride: null, femaleExcessOverride: null, namedInsuredType: 'betriebsinhaber', namedInsuredGender: 'male' })
                  : set({ ...newPersonGroup(group.id), name: '' })
              }
            />
          </div>
          {group.isNamedInsured && (
            <div className="mt-4 grid gap-4">
              <Field label="Art" required>
                {() => (
                  <Choice<NamedInsuredType>
                    size="sm"
                    value={group.namedInsuredType}
                    onChange={(v) => set({ namedInsuredType: v })}
                    options={[
                      { value: 'betriebsinhaber', label: 'Betriebsinhaber' },
                      { value: 'familienmitglieder', label: 'Mitarbeitende Familienmitglieder' },
                    ]}
                  />
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Geschlecht" required>
                  {() => (
                    <Choice<Gender>
                      size="sm"
                      value={group.namedInsuredGender}
                      onChange={(v) => {
                        const salary = groupSalary(group);
                        const override = female ? group.femaleExcessOverride : group.maleExcessOverride;
                        set(
                          v === 'female'
                            ? { namedInsuredGender: 'female', maleEmployees: 0, femaleEmployees: 1, maleSalary: 0, femaleSalary: salary, maleExcessOverride: null, femaleExcessOverride: override }
                            : { namedInsuredGender: 'male', maleEmployees: 1, femaleEmployees: 0, maleSalary: salary, femaleSalary: 0, maleExcessOverride: override, femaleExcessOverride: null },
                        );
                      }}
                      options={[
                        { value: 'male', label: 'Mann' },
                        { value: 'female', label: 'Frau' },
                      ]}
                    />
                  )}
                </Field>
                <Field label="Name der versicherten Person" required error={e('namedPersonName')}>
                  {(id) => <TextInput id={id} value={group.namedPersonName} placeholder="Vor- und Nachname" invalid={!!e('namedPersonName')} onChange={(ev) => set({ namedPersonName: ev.target.value })} />}
                </Field>
              </div>
              <Field label="Feste Jahreslohnsumme (AHV-Lohn + Gewinnungskosten)" required error={e('salary')} hint="Gewinnungskosten max. 30 % des AHV-Lohns und max. CHF 50'000.">
                {(id) => (
                  <NumberInput
                    id={id}
                    prefix="CHF"
                    invalid={!!e('salary')}
                    value={groupSalary(group)}
                    onChange={(v) => set(female ? { femaleSalary: v, femaleEmployees: 1, femaleExcessOverride: null } : { maleSalary: v, maleEmployees: 1, maleExcessOverride: null })}
                  />
                )}
              </Field>
              <SplitRow
                salary={groupSalary(group)}
                employees={1}
                override={female ? group.femaleExcessOverride : group.maleExcessOverride}
                onOverride={(v) => set(female ? { femaleExcessOverride: v } : { maleExcessOverride: v })}
              />
            </div>
          )}
        </div>

        {!group.isNamedInsured && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <GenderBlock
                title="Männer"
                employees={group.maleEmployees}
                salary={group.maleSalary}
                override={group.maleExcessOverride}
                errors={{ employees: e('maleEmployees'), salary: e('maleSalary') }}
                onChange={(p) => set({ ...(p.employees !== undefined && { maleEmployees: p.employees }), ...(p.salary !== undefined && { maleSalary: p.salary }), ...('override' in p && { maleExcessOverride: p.override ?? null }) })}
              />
              <GenderBlock
                title="Frauen"
                employees={group.femaleEmployees}
                salary={group.femaleSalary}
                override={group.femaleExcessOverride}
                errors={{ employees: e('femaleEmployees'), salary: e('femaleSalary') }}
                onChange={(p) => set({ ...(p.employees !== undefined && { femaleEmployees: p.employees }), ...(p.salary !== undefined && { femaleSalary: p.salary }), ...('override' in p && { femaleExcessOverride: p.override ?? null }) })}
              />
            </div>
            {e('employees') && <Callout tone="brand">{e('employees')}</Callout>}
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
          <span className="text-ink-muted">Subtotal</span>
          <span className="tabular-nums">
            <span className="font-semibold">{num(groupEmployees(group))} Personen</span> · {chf(groupSalary(group))}
            {split.excess > 0 && <span className="text-ink-muted"> · davon Überschuss {chf(split.excess)}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 font-serif text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-white/60">{sub}</div>}
    </div>
  );
}

export function Step3Personnel({ errors }: StepProps) {
  const { offer, setGroups } = useDraft();
  const groups = offer.personGroups;
  const t = totals(groups);
  const overLimit = salaryExceedsUnderwritingLimit(t.salary);

  return (
    <StepCard title="Personal" description="Jährliche AHV-pflichtige Lohnsumme pro Personengruppe und Geschlecht." icon={<Users className="h-5 w-5" />}>
      <div className="space-y-4">
        {groups.map((g, i) => (
          <GroupCard
            key={g.id}
            group={g}
            index={i}
            errors={errors}
            canRemove={groups.length > 1}
            onChange={(ng) => setGroups(groups.map((x) => (x.id === g.id ? ng : x)))}
            onRemove={() => setGroups(groups.filter((x) => x.id !== g.id))}
          />
        ))}

        <Button variant="secondary" className="w-full border-dashed" icon={<Plus className="h-4 w-4" />} onClick={() => setGroups([...groups, newPersonGroup(`${Date.now()}`)])}>
          Weitere Personengruppe hinzufügen
        </Button>

        <div className="relative overflow-hidden rounded-2xl bg-ink p-5 text-white">
          <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand/40 blur-3xl" />
          <div className="relative">
            <div className="mb-4 text-sm font-semibold">Total aller Personengruppen</div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Stat label="Männer" value={num(t.maleEmployees)} sub={chf(t.maleSalary)} />
              <Stat label="Frauen" value={num(t.femaleEmployees)} sub={chf(t.femaleSalary)} />
              <Stat label="Obligatorisch" value={chf(t.obligatory)} />
              <Stat label="Überschuss" value={chf(t.excess)} />
            </div>
            <div className="mt-5 flex items-end justify-between border-t border-white/15 pt-4">
              <span className="text-sm text-white/70">{num(t.employees)} Personen</span>
              <span className="font-serif text-2xl font-semibold tabular-nums">{chf(t.salary)}</span>
            </div>
          </div>
        </div>

        {overLimit && (
          <Callout tone="warning" title="Underwriting erforderlich">
            Die Gesamtlohnsumme von {chf(t.salary)} übersteigt {chf(UNDERWRITING_SALARY_LIMIT)}. Die Anfrage wird nach der Übermittlung durch das Underwriting geprüft (ca. 14 Tage). Die Offerte mit Preis
            folgt nach der Prüfung.
          </Callout>
        )}
      </div>
    </StepCard>
  );
}
