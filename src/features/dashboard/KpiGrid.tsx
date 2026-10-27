import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import clsx from 'clsx';
import type { Offer } from '@/domain/types';
import { num } from '@/lib/format';
import { kpis } from './stats';

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => num(v, decimals));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return c.stop;
  }, [mv, value]);
  return <motion.span>{text}</motion.span>;
}

export function KpiGrid({ offers }: { offers: Offer[] }) {
  const k = kpis(offers);
  const items: { label: string; value: number; decimals?: number; unit?: string; note?: string; accent?: boolean }[] = [
    { label: 'Offerten total', value: k.total, note: `${k.drafts} Entwürfe` },
    { label: 'Contracted', value: k.contracted, note: `${k.contractedLast30} in 30 Tagen` },
    { label: 'Underwriting', value: k.underwriting, note: 'in Prüfung' },
    { label: 'Win Rate', value: k.winRate, unit: '%', note: 'letzte 90 Tage', accent: true },
    { label: 'Prämienvolumen', value: k.premiumVolume / 1_000_000, decimals: 2, unit: 'Mio.', note: 'CHF, Contracted' },
    { label: 'Lohnvolumen', value: k.salaryVolume / 1_000_000, decimals: 1, unit: 'Mio.', note: 'CHF, Contracted' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((i, idx) => (
        <motion.div
          key={i.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className={clsx(
            'relative overflow-hidden rounded-2xl border p-4',
            i.accent ? 'border-transparent bg-brand text-white shadow-brand' : 'border-line/70 bg-white shadow-card',
          )}
        >
          {i.accent && <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15" />}
          <div className={clsx('text-xs font-medium', i.accent ? 'text-white/80' : 'text-ink-muted')}>{i.label}</div>
          <div className="mt-2 flex items-baseline gap-1 font-serif text-[1.75rem] font-semibold leading-none tabular-nums">
            <CountUp value={i.value} decimals={i.decimals} />
            {i.unit && <span className={clsx('font-sans text-sm font-medium', i.accent ? 'text-white/80' : 'text-ink-muted')}>{i.unit}</span>}
          </div>
          {i.note && <div className={clsx('mt-2 text-[0.6875rem]', i.accent ? 'text-white/70' : 'text-ink-muted')}>{i.note}</div>}
        </motion.div>
      ))}
    </div>
  );
}
