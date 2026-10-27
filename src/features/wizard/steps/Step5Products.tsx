import clsx from 'clsx';
import { Check, HeartPulse, Package, ShieldPlus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Callout, Choice } from '@/components/ui';
import { StepCard, SubSection } from '../StepLayout';
import { useDraft, type StepProps } from '../useDraft';

function ProductCard({
  selected,
  onToggle,
  icon,
  title,
  description,
  lines,
  features,
}: {
  selected: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  lines: { ok: boolean; label: string }[];
  features: string[];
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      onClick={onToggle}
      aria-pressed={selected}
      className={clsx(
        'relative flex h-full flex-col overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-200',
        selected ? 'border-brand bg-white shadow-lift' : 'border-line bg-white hover:border-ink-muted hover:shadow-card',
      )}
    >
      {selected && <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand/10" />}
      <div className="relative flex items-start justify-between">
        <div className={clsx('flex h-12 w-12 items-center justify-center rounded-2xl transition', selected ? 'bg-brand text-white' : 'bg-surface-muted text-ink')}>{icon}</div>
        <span className={clsx('flex h-7 w-7 items-center justify-center rounded-full border-2 transition', selected ? 'border-brand bg-brand text-white' : 'border-line-strong')}>
          {selected && <Check className="h-4 w-4" strokeWidth={3} />}
        </span>
      </div>
      <h3 className="relative mt-4 font-serif text-2xl font-semibold">{title}</h3>
      <p className="relative mt-1 text-sm text-ink-muted">{description}</p>
      <div className="relative mt-4 space-y-1.5">
        {lines.map((l) => (
          <div key={l.label} className={clsx('flex items-center gap-2 text-sm', l.ok ? 'font-medium text-ink' : 'text-ink-muted line-through')}>
            {l.ok ? <Check className="h-4 w-4 text-brand" /> : <X className="h-4 w-4" />}
            {l.label}
          </div>
        ))}
      </div>
      <ul className="relative mt-4 space-y-1 border-t border-line pt-4 text-sm text-ink-soft">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
            {f}
          </li>
        ))}
      </ul>
    </motion.button>
  );
}

export function Step5Products({ errors }: StepProps) {
  const { offer, setProducts, setSuva } = useDraft();
  const p = offer.selectedProducts;
  const suva = offer.isSuvaAffiliated;
  const accident = p.uvg || p.uvgz;

  return (
    <StepCard title="Produkte" description="Welche Versicherungsbereiche sollen offeriert werden?" icon={<Package className="h-5 w-5" />}>
      <div className="space-y-8">
        <SubSection title="Ist die Firma der SUVA unterstellt?" description="SUVA-unterstellte Betriebe haben die obligatorische Unfallversicherung (UVG) bei der SUVA.">
          <Choice<boolean>
            value={suva}
            invalid={!!errors.suva}
            onChange={(v) => {
              setSuva(v);
              // UVG ist bei SUVA-Firmen nicht möglich, ohne SUVA gehört UVG zur Unfall-Wahl
              if (v && p.uvg) setProducts({ uvg: false });
              if (!v && p.uvgz && !p.uvg) setProducts({ uvg: true });
            }}
            options={[
              { value: true, label: 'Ja', sub: 'SUVA-unterstellt' },
              { value: false, label: 'Nein', sub: 'Nicht SUVA-unterstellt' },
            ]}
          />
          {errors.suva && <p className="mt-2 text-xs font-medium text-brand-dark">{errors.suva}</p>}
        </SubSection>

        {suva !== null && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <SubSection title="Versicherungsbereiche" description="Mindestens einen Bereich wählen.">
              <div className="grid gap-4 md:grid-cols-2">
                <ProductCard
                  selected={accident}
                  onToggle={() => setProducts(accident ? { uvg: false, uvgz: false } : { uvg: !suva, uvgz: true })}
                  icon={<ShieldPlus className="h-6 w-6" />}
                  title="Unfall"
                  description="Unfallversicherung für Ihre Mitarbeitenden"
                  lines={[
                    { ok: !suva, label: suva ? 'UVG (obligatorisch) bleibt bei der SUVA' : 'UVG: Obligatorische Unfallversicherung (BU & NBU)' },
                    { ok: true, label: 'UVGZ: Unfall-Zusatzversicherung' },
                  ]}
                  features={['Heilungskosten und Pflegeleistungen', 'Taggelder bei Arbeitsunfähigkeit', 'Invaliditäts- und Todesfallkapital', 'Private Spitalabteilung (UVGZ)']}
                />
                <ProductCard
                  selected={p.ktg}
                  onToggle={() => setProducts({ ktg: !p.ktg })}
                  icon={<HeartPulse className="h-6 w-6" />}
                  title="Krankheit"
                  description="Krankentaggeldversicherung für Ihre Mitarbeitenden"
                  lines={[{ ok: true, label: 'KTG: Krankentaggeldversicherung' }]}
                  features={['Lohnfortzahlung bei Krankheit', 'Wählbare Wartefrist (30, 60, 90 Tage)', 'Leistungsdauer bis 730 Tage', 'Case Management inklusive']}
                />
              </div>
              {suva && accident && (
                <Callout tone="info" className="mt-4" title="SUVA-unterstellt">
                  Die obligatorische Unfallversicherung (UVG) verbleibt bei der SUVA. Offeriert wird die Unfall-Zusatzversicherung (UVGZ).
                </Callout>
              )}
              {errors.products && <Callout tone="brand" className="mt-4">{errors.products}</Callout>}
            </SubSection>
          </motion.div>
        )}
      </div>
    </StepCard>
  );
}
