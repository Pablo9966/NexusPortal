import clsx from 'clsx';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { STEPS } from '@/domain/constants';

export function Stepper({ current, maxReached, onSelect }: { current: number; maxReached: number; onSelect: (step: number) => void }) {
  const progress = ((Math.max(current, 1) - 1) / (STEPS.length - 1)) * 100;
  return (
    <nav aria-label="Fortschritt" className="relative">
      <div className="absolute left-[calc(100%/14)] right-[calc(100%/14)] top-5 h-[3px] rounded-full bg-line">
        <motion.div className="h-full rounded-full bg-brand" initial={false} animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </div>
      <ol className="relative grid grid-cols-7">
        {STEPS.map((s) => {
          const done = s.number < current || (s.number <= maxReached && s.number !== current);
          const active = s.number === current;
          const reachable = s.number <= maxReached && !active;
          return (
            <li key={s.number} className="flex flex-col items-center">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onSelect(s.number)}
                aria-current={active ? 'step' : undefined}
                className={clsx(
                  'relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
                  active && 'scale-110 bg-brand text-white shadow-brand ring-4 ring-brand/15',
                  !active && done && 'bg-ink text-white hover:bg-brand',
                  !active && !done && 'border border-line-strong bg-white text-ink-muted',
                  reachable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                {done && !active ? <Check className="h-4 w-4" strokeWidth={3} /> : s.number}
              </button>
              <span className={clsx('mt-2 hidden text-center text-xs font-medium sm:block', active ? 'text-ink' : done ? 'text-ink-soft' : 'text-ink-muted')}>{s.title}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
