import clsx from 'clsx';
import { Check, HeartPulse, Info, Settings2, ShieldPlus, Sparkles, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { Button, Callout, Card, Choice, Toggle } from '@/components/ui';
import { UVG_MAX_SALARY, VVG_MAX_SALARY } from '@/domain/constants';
import { basisLabel, describeKtg, describeUvgz, groupConfig, groupSplit, recommendedConfig, totals } from '@/domain/rules';
import type { BenefitPercentage, CapitalBasis, GroupConfig, KtgConfig, Progression, UvgzConfig, WaitingPeriod } from '@/domain/types';
import { chf } from '@/lib/format';
import { StepCard } from '../StepLayout';
import { useDraft, type StepProps } from '../useDraft';

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="grid gap-2 border-b border-line/70 py-4 last:border-0 sm:grid-cols-[11.25rem_1fr] sm:items-center">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-ink-muted">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function CoverageBlock({ title, enabled, onToggle, children }: { title: string; enabled: boolean; onToggle: (v: boolean) => void; children?: ReactNode }) {
  return (
    <div className={clsx('rounded-xl border p-4 transition', enabled ? 'border-line bg-white' : 'border-dashed border-line bg-surface-muted/50')}>
      <div className="flex items-center justify-between">
        <span className={clsx('text-sm font-semibold', !enabled && 'text-ink-muted')}>{title}</span>
        <Toggle checked={enabled} onChange={onToggle} label={<span className="text-xs text-ink-muted">{enabled ? 'Eingeschlossen' : 'Ausgeschlossen'}</span>} />
      </div>
      {enabled && children && <div className="mt-2">{children}</div>}
    </div>
  );
}

const BASES: CapitalBasis[] = ['uvg', 'excess', 'both'];

function UvgzEditor({ cfg, onChange, hasExcess }: { cfg: UvgzConfig; onChange: (c: UvgzConfig) => void; hasExcess: boolean }) {
  const disabledBases: CapitalBasis[] = hasExcess ? [] : ['excess', 'both'];
  return (
    <div className="space-y-3">
      <CoverageBlock title="Heilungskosten" enabled={cfg.healingCostsEnabled} onToggle={(v) => onChange({ ...cfg, healingCostsEnabled: v })}>
        <p className="text-sm text-ink-muted">Private Spitalabteilung weltweit</p>
      </CoverageBlock>
      <CoverageBlock title="Invaliditätskapital" enabled={cfg.invalidityCapital.enabled} onToggle={(v) => onChange({ ...cfg, invalidityCapital: { ...cfg.invalidityCapital, enabled: v } })}>
        <Row label="Basis">
          <Choice<CapitalBasis> size="sm" value={cfg.invalidityCapital.basis} disabledValues={disabledBases} onChange={(v) => onChange({ ...cfg, invalidityCapital: { ...cfg.invalidityCapital, basis: v } })} options={BASES.map((b) => ({ value: b, label: basisLabel(b) }))} />
        </Row>
        <Row label="Multiplikator">
          <Choice<1 | 2 | 3> size="sm" value={cfg.invalidityCapital.multiplier} onChange={(v) => onChange({ ...cfg, invalidityCapital: { ...cfg.invalidityCapital, multiplier: v } })} options={[1, 2, 3].map((m) => ({ value: m as 1 | 2 | 3, label: `${m}-fach` }))} />
        </Row>
        <Row label="Progression">
          <Choice<Progression>
            size="sm"
            value={cfg.invalidityCapital.progression}
            onChange={(v) => onChange({ ...cfg, invalidityCapital: { ...cfg.invalidityCapital, progression: v } })}
            options={[
              { value: 'none', label: 'Ohne' },
              { value: '225', label: '225 %' },
              { value: '350', label: '350 %' },
            ]}
          />
        </Row>
      </CoverageBlock>
      <CoverageBlock title="Todesfallkapital" enabled={cfg.deathCapital.enabled} onToggle={(v) => onChange({ ...cfg, deathCapital: { ...cfg.deathCapital, enabled: v } })}>
        <Row label="Basis">
          <Choice<CapitalBasis> size="sm" value={cfg.deathCapital.basis} disabledValues={disabledBases} onChange={(v) => onChange({ ...cfg, deathCapital: { ...cfg.deathCapital, basis: v } })} options={BASES.map((b) => ({ value: b, label: basisLabel(b) }))} />
        </Row>
        <Row label="Multiplikator">
          <Choice<1 | 2 | 3> size="sm" value={cfg.deathCapital.multiplier} onChange={(v) => onChange({ ...cfg, deathCapital: { ...cfg.deathCapital, multiplier: v } })} options={[1, 2, 3].map((m) => ({ value: m as 1 | 2 | 3, label: `${m}-fach` }))} />
        </Row>
      </CoverageBlock>
      <CoverageBlock title="Taggeld" enabled={cfg.dailyAllowance.enabled} onToggle={(v) => onChange({ ...cfg, dailyAllowance: { ...cfg.dailyAllowance, enabled: v } })}>
        <Row label="Leistungshöhe">
          <Choice<BenefitPercentage>
            size="sm"
            value={cfg.dailyAllowance.percentage}
            onChange={(v) => onChange({ ...cfg, dailyAllowance: { ...cfg.dailyAllowance, percentage: v } })}
            options={[
              { value: 80, label: '80 %' },
              { value: 90, label: '90 %' },
              { value: 100, label: '100 % (SE & mFM)' },
            ]}
          />
        </Row>
        <Row label="Wartefrist">
          <Choice<WaitingPeriod> size="sm" value={cfg.dailyAllowance.waitingPeriod} onChange={(v) => onChange({ ...cfg, dailyAllowance: { ...cfg.dailyAllowance, waitingPeriod: v } })} options={[30, 60, 90].map((d) => ({ value: d as WaitingPeriod, label: `${d} Tage` }))} />
        </Row>
      </CoverageBlock>
    </div>
  );
}

function KtgEditor({ cfg, onChange }: { cfg: KtgConfig; onChange: (c: KtgConfig) => void }) {
  return (
    <div>
      <Row label="Leistungshöhe" hint="in % des versicherten Lohns">
        <Choice<BenefitPercentage>
          size="sm"
          value={cfg.percentage}
          onChange={(v) => onChange({ ...cfg, percentage: v })}
          options={[
            { value: 80, label: '80 %' },
            { value: 90, label: '90 %' },
            { value: 100, label: '100 % (SE & mFM)' },
          ]}
        />
      </Row>
      <Row label="Wartefrist">
        <Choice<WaitingPeriod> size="sm" value={cfg.waitingPeriod} onChange={(v) => onChange({ ...cfg, waitingPeriod: v })} options={[30, 60, 90].map((d) => ({ value: d as WaitingPeriod, label: `${d} Tage` }))} />
      </Row>
      <Row label="Lohnnachgenuss">
        <Toggle checked={cfg.salaryTopUp} onChange={(v) => onChange({ ...cfg, salaryTopUp: v })} label={<span className="text-sm text-ink-soft">{cfg.salaryTopUp ? 'Eingeschlossen' : 'Nicht eingeschlossen'}</span>} />
      </Row>
    </div>
  );
}

function ProductPanel({ icon, title, meta, active, onToggle, toggleDisabled, toggleHint, children }: { icon: ReactNode; title: string; meta: string; active: boolean; onToggle: () => void; toggleDisabled?: boolean; toggleHint?: string; children?: ReactNode }) {
  return (
    <Card className={clsx('overflow-hidden transition', !active && 'opacity-70')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', active ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted')}>{icon}</div>
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-ink-muted">{meta}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {toggleHint && <span className="text-xs text-ink-muted">{toggleHint}</span>}
          <Toggle checked={active} disabled={toggleDisabled} onChange={onToggle} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {active && children && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function ConfigSummary({ gc, title }: { gc: GroupConfig; title?: string }) {
  return (
    <div className="space-y-3">
      {title && <div className="text-sm font-semibold">{title}</div>}
      {gc.products.uvg && (
        <div className="text-sm">
          <div className="font-medium">UVGO & UVGF</div>
          <div className="text-ink-muted">Obligatorisch · max. {chf(UVG_MAX_SALARY)} / Person</div>
        </div>
      )}
      {gc.products.uvgz && (
        <div className="text-sm">
          <div className="font-medium">UVGZ</div>
          {describeUvgz(gc.uvgz).map((r) => (
            <div key={r.label} className="text-ink-muted">
              {r.label}: {r.value}
            </div>
          ))}
        </div>
      )}
      {gc.products.ktg && (
        <div className="text-sm">
          <div className="font-medium">KTG</div>
          {describeKtg(gc.ktg).map((r) => (
            <div key={r.label} className="text-ink-muted">
              {r.label}: {r.value}
            </div>
          ))}
        </div>
      )}
      {!gc.products.uvg && !gc.products.uvgz && !gc.products.ktg && <div className="text-sm text-ink-muted">Keine Produkte für diese Gruppe.</div>}
    </div>
  );
}

export function Step6Tariff(_: StepProps) {
  const { offer, setConfig, setProducts } = useDraft();
  const sel = offer.selectedProducts;
  const cfg = offer.productConfig;
  const groups = offer.personGroups;
  const suva = offer.isSuvaAffiliated === true;
  const hasExcess = totals(groups).excess > 0;
  const rec = recommendedConfig(hasExcess);
  const [customize, setCustomize] = useState(false);
  const [applied, setApplied] = useState(false);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const multi = groups.length > 1;
  const perGroup = cfg.perGroupConfig && multi;
  const activeGroup = groups.find((g) => g.id === groupId) ?? groups[0];
  const gc = groupConfig(cfg, activeGroup.id, sel);
  const groupHasExcess = perGroup ? groupSplit(activeGroup).excess > 0 : hasExcess;

  const updateUvgz = (u: UvgzConfig) =>
    setConfig((c) => (perGroup ? { ...c, groupConfigs: { ...c.groupConfigs, [activeGroup.id]: { ...c.groupConfigs[activeGroup.id], uvgz: u } } } : { ...c, uvgz: u }));
  const updateKtg = (k: KtgConfig) =>
    setConfig((c) => (perGroup ? { ...c, groupConfigs: { ...c.groupConfigs, [activeGroup.id]: { ...c.groupConfigs[activeGroup.id], ktg: k } } } : { ...c, ktg: k }));
  const toggleGroupProduct = (key: 'uvg' | 'uvgz' | 'ktg') =>
    setConfig((c) => {
      const current = c.groupConfigs[activeGroup.id];
      return { ...c, groupConfigs: { ...c.groupConfigs, [activeGroup.id]: { ...current, products: { ...current.products, [key]: !current.products[key] } } } };
    });
  const toggleProduct = (key: 'uvg' | 'uvgz' | 'ktg') => (perGroup ? toggleGroupProduct(key) : setProducts({ [key]: !sel[key] }));
  const productActive = (key: 'uvg' | 'uvgz' | 'ktg') => (perGroup ? gc.products[key] : sel[key]);

  const togglePerGroup = (on: boolean) =>
    setConfig((c) => {
      if (!on) return { ...c, perGroupConfig: false };
      const groupConfigs: Record<string, GroupConfig> = {};
      groups.forEach((g) => (groupConfigs[g.id] = c.groupConfigs[g.id] ?? { products: { ...sel }, uvgz: structuredClone(c.uvgz), ktg: { ...c.ktg } }));
      return { ...c, perGroupConfig: true, groupConfigs };
    });

  const applyRecommendation = () => {
    setConfig((c) => ({ ...c, uvgz: rec.uvgz, ktg: rec.ktg, perGroupConfig: false }));
    if (hasExcess && !sel.uvgz) setProducts({ uvgz: true });
    setApplied(true);
    setTimeout(() => setApplied(false), 2200);
  };

  return (
    <StepCard title="Tarif" description="Deckungen der gewählten Produkte festlegen." icon={<Settings2 className="h-5 w-5" />}>
      <div className="space-y-6">
        <Callout tone="info" icon={<Info className="h-5 w-5" />} title="Prämie wird im CDI berechnet">
          Hier legen Sie nur die Deckungen fest. Die Prämie berechnet das CDI nach der Übermittlung. Sie ist in der Offerte (PDF) ersichtlich.
        </Callout>

        <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-tint via-white to-white p-6">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              <Sparkles className="h-4 w-4" />
              Empfehlung
            </div>
            <h3 className="mt-1 font-serif text-xl font-semibold">{hasExcess ? 'Für Ihre Lohnstruktur mit Überschusslohn' : 'Für Löhne bis zum UVG-Maximum'}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {sel.uvg && (
                <div className="rounded-xl bg-white/80 p-4 ring-1 ring-line">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    UVGO & UVGF <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[0.625rem] uppercase tracking-wider text-ink-soft">Obligatorisch</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">Gesetzliche Deckung bis {chf(UVG_MAX_SALARY)} pro Person und Jahr.</p>
                </div>
              )}
              {(sel.uvgz || sel.uvg || hasExcess) && (
                <div className="rounded-xl bg-white/80 p-4 ring-1 ring-line">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    UVGZ
                    <span className={clsx('rounded-full px-2 py-0.5 text-[0.625rem] uppercase tracking-wider', hasExcess ? 'bg-brand text-white' : 'bg-surface-sunken text-ink-soft')}>{hasExcess ? 'Empfohlen' : 'Optional'}</span>
                  </div>
                  {hasExcess ? (
                    <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                      {describeUvgz(rec.uvgz).map((r) => (
                        <li key={r.label} className="flex gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                          {r.label}: {r.value}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-ink-muted">Ohne Überschusslohn ist die UVGZ meist nicht nötig.</p>
                  )}
                </div>
              )}
              {sel.ktg && (
                <div className="rounded-xl bg-white/80 p-4 ring-1 ring-line">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    KTG <span className="rounded-full bg-brand px-2 py-0.5 text-[0.625rem] uppercase tracking-wider text-white">Empfohlen</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                    {describeKtg(rec.ktg)
                      .filter((r) => r.label !== 'Leistungsdauer')
                      .map((r) => (
                        <li key={r.label} className="flex gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                          {r.label}: {r.value}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={applyRecommendation} icon={applied ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}>
                {applied ? 'Empfehlung übernommen' : 'Empfehlung übernehmen'}
              </Button>
              <Button variant="secondary" onClick={() => setCustomize((v) => !v)} icon={<Settings2 className="h-4 w-4" />}>
                {customize ? 'Anpassung schliessen' : 'Individuell anpassen'}
              </Button>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {customize && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
              {multi && (
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-brand" />
                    <div>
                      <div className="text-sm font-semibold">Unterschiedliche Deckungen pro Personengruppe</div>
                      <div className="text-xs text-ink-muted">Produkte und Deckungen je Gruppe individuell festlegen.</div>
                    </div>
                  </div>
                  <Toggle checked={cfg.perGroupConfig} onChange={togglePerGroup} label={cfg.perGroupConfig ? 'Aktiv' : 'Inaktiv'} />
                </Card>
              )}
              {perGroup && (
                <div className="flex gap-2 overflow-x-auto rounded-full bg-surface-muted p-1">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGroupId(g.id)}
                      className={clsx('shrink-0 rounded-full px-4 py-2 text-sm font-medium transition', g.id === activeGroup.id ? 'bg-white shadow-card' : 'text-ink-muted hover:text-ink')}
                    >
                      {g.name || 'Unbenannte Gruppe'}
                    </button>
                  ))}
                </div>
              )}

              {(perGroup ? sel.uvg : !suva) && (
                <ProductPanel icon={<ShieldPlus className="h-5 w-5" />} title="UVGO & UVGF" meta={`Obligatorische Unfallversicherung · max. ${chf(UVG_MAX_SALARY)} / Person`} active={productActive('uvg')} onToggle={() => toggleProduct('uvg')} />
              )}
              {suva && (
                <Callout tone="info" title="UVG nicht verfügbar">
                  Die Firma ist der SUVA unterstellt. Die obligatorische Unfallversicherung bleibt bei der SUVA.
                </Callout>
              )}
              {(sel.uvgz || !perGroup) && (
                <ProductPanel
                  icon={<ShieldPlus className="h-5 w-5" />}
                  title="UVGZ"
                  meta={`Unfall-Zusatzversicherung · max. Jahreslohn ${chf(VVG_MAX_SALARY)}`}
                  active={productActive('uvgz')}
                  onToggle={() => toggleProduct('uvgz')}
                >
                  <UvgzEditor cfg={perGroup ? gc.uvgz : cfg.uvgz} onChange={updateUvgz} hasExcess={groupHasExcess} />
                </ProductPanel>
              )}
              {(sel.ktg || !perGroup) && (
                <ProductPanel
                  icon={<HeartPulse className="h-5 w-5" />}
                  title="KTG"
                  meta={`Krankentaggeld · max. Jahreslohn ${chf(VVG_MAX_SALARY)} · Leistungsdauer 730 Tage`}
                  active={productActive('ktg')}
                  onToggle={() => toggleProduct('ktg')}
                >
                  <KtgEditor cfg={perGroup ? gc.ktg : cfg.ktg} onChange={updateKtg} />
                </ProductPanel>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <Check className="h-4 w-4 text-sea" />
            Aktuelle Konfiguration
            {perGroup && <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium">pro Gruppe</span>}
          </div>
          {perGroup ? (
            <div className="grid gap-5 md:grid-cols-2">
              {groups.map((g) => (
                <div key={g.id} className="rounded-xl bg-surface-muted p-4">
                  <ConfigSummary gc={groupConfig(cfg, g.id, sel)} title={g.name || 'Unbenannte Gruppe'} />
                </div>
              ))}
            </div>
          ) : (
            <ConfigSummary gc={groupConfig(cfg, groups[0].id, sel)} />
          )}
        </Card>
      </div>
    </StepCard>
  );
}
