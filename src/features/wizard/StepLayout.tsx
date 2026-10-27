import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, Card } from '@/components/ui';

export function StepCard({ title, description, icon, children }: { title: string; description?: ReactNode; icon?: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        {icon && <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</div>}
        <div>
          <h2 className="font-serif text-2xl font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

export function SubSection({ title, description, children, action }: { title: ReactNode; description?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-t border-line/80 pt-6 first:border-t-0 first:pt-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StepNav({ onBack, onNext, nextLabel = 'Weiter', backDisabled, nextIcon }: { onBack?: () => void; onNext: () => void; nextLabel?: string; backDisabled?: boolean; nextIcon?: ReactNode }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      {onBack ? (
        <Button variant="secondary" onClick={onBack} disabled={backDisabled} icon={<ArrowLeft className="h-4 w-4" />}>
          Zurück
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={onNext} size="lg">
        {nextLabel}
        {nextIcon ?? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
      </Button>
    </div>
  );
}

export function InfoPanel({ title, children, icon }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        {title}
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-ink-soft">{children}</div>
    </Card>
  );
}
