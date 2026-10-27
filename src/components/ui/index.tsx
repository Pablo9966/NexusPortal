import clsx from 'clsx';
import { AlertTriangle, Check, ChevronDown, Info, Loader2, Search, X } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { STATUS_META } from '@/domain/constants';
import type { OfferStatus } from '@/domain/types';
import { num, parseNumber } from '@/lib/format';

/* ---------- Button ---------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger' | 'light' | 'ghost-light';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'group relative inline-flex select-none items-center justify-center gap-2 rounded-full font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' && 'h-9 px-4 text-sm',
        size === 'md' && 'h-11 px-5 text-[15px]',
        size === 'lg' && 'h-12 px-7 text-base',
        variant === 'primary' && 'bg-brand text-white shadow-brand hover:bg-brand-dark enabled:active:scale-[0.98]',
        variant === 'dark' && 'bg-ink text-white hover:bg-black enabled:active:scale-[0.98]',
        variant === 'secondary' && 'border border-line-strong bg-white text-ink hover:border-ink',
        variant === 'ghost' && 'text-ink-soft hover:bg-surface-muted hover:text-ink',
        variant === 'danger' && 'text-brand-dark hover:bg-brand-soft',
        variant === 'light' && 'bg-white text-ink shadow-lift hover:bg-white/90 enabled:active:scale-[0.98]',
        variant === 'ghost-light' && 'text-white hover:bg-white/10',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

/* ---------- Card ---------- */

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('rounded-xl2 border border-line/70 bg-white shadow-card', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, description, icon, actions }: { eyebrow?: string; title: string; description?: ReactNode; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">{icon}</div>}
        <div>
          {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</div>}
          <h2 className="font-serif text-2xl font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

/* ---------- Field ---------- */

interface FieldProps {
  label: ReactNode;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
  className?: string;
}

export function Field({ label, required, error, hint, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink">
        {label}
        {required && <span className="text-brand">*</span>}
      </label>
      {children(id)}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand-dark" role="alert">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

export const inputClass = (invalid?: boolean) =>
  clsx(
    'h-11 w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink placeholder:text-ink-muted/70 transition',
    'focus:outline-none focus:ring-4',
    invalid ? 'border-brand focus:ring-brand/15' : 'border-line-strong/70 hover:border-ink-muted focus:border-ink focus:ring-ink/5',
    'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted',
  );

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function TextInput(
  { invalid, className, ...rest },
  ref,
) {
  return <input ref={ref} className={clsx(inputClass(invalid), className)} aria-invalid={invalid || undefined} {...rest} />;
});

/** Zahleneingabe mit Schweizer Tausendertrennzeichen. */
export function NumberInput({
  value,
  onChange,
  id,
  invalid,
  prefix,
  suffix,
  placeholder = '0',
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  id?: string;
  invalid?: boolean;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  max?: number;
}) {
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">{prefix}</span>}
      <input
        id={id}
        inputMode="numeric"
        className={clsx(inputClass(invalid), 'tabular-nums', prefix && 'pl-12', suffix && 'pr-10')}
        value={value ? num(value) : ''}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const n = Math.round(parseNumber(e.target.value));
          onChange(max !== undefined ? Math.min(n, max) : n);
        }}
      />
      {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">{suffix}</span>}
    </div>
  );
}

export function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder = 'Bitte wählen ...',
  invalid,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(inputClass(invalid), 'appearance-none pr-10', !value && 'text-ink-muted/80')}
        aria-invalid={invalid || undefined}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
    </div>
  );
}

/* ---------- Choice (Segmented) ---------- */

export function Choice<T extends string | number | boolean>({
  value,
  onChange,
  options,
  invalid,
  size = 'md',
  disabledValues = [],
}: {
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; sub?: ReactNode }[];
  invalid?: boolean;
  size?: 'sm' | 'md';
  disabledValues?: T[];
}) {
  return (
    <div className={clsx('flex flex-wrap gap-2', invalid && 'rounded-xl ring-2 ring-brand/30 ring-offset-2')} role="radiogroup">
      {options.map((o) => {
        const active = value === o.value;
        const disabled = disabledValues.includes(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={clsx(
              'rounded-xl border text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40',
              size === 'sm' ? 'px-3 py-1.5 text-sm' : 'min-w-[88px] px-4 py-2.5 text-[15px]',
              active
                ? 'border-ink bg-ink text-white shadow-card'
                : 'border-line-strong/70 bg-white text-ink hover:border-ink',
            )}
          >
            <span className="font-medium">{o.label}</span>
            {o.sub && <span className={clsx('block text-xs', active ? 'text-white/70' : 'text-ink-muted')}>{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function YesNo({ value, onChange, invalid }: { value: boolean | null; onChange: (v: boolean) => void; invalid?: boolean }) {
  return (
    <Choice<boolean>
      value={value}
      onChange={onChange}
      invalid={invalid}
      size="sm"
      options={[
        { value: true, label: 'Ja' },
        { value: false, label: 'Nein' },
      ]}
    />
  );
}

/* ---------- Toggle ---------- */

export function Toggle({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className={clsx('relative h-6 w-11 rounded-full transition-colors duration-200', checked ? 'bg-brand' : 'bg-line-strong')}>
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 35 }}
          className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow', checked ? 'right-0.5' : 'left-0.5')}
        />
      </span>
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
    </button>
  );
}

/* ---------- Badges & Callouts ---------- */

export function StatusBadge({ status, className }: { status: OfferStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', meta.badge, className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

export function ProductChip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span className={clsx('rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide', muted ? 'bg-surface-muted text-ink-muted line-through' : 'bg-surface-sunken text-ink-soft')}>
      {label}
    </span>
  );
}

export function Callout({
  tone = 'info',
  title,
  children,
  icon,
  className,
}: {
  tone?: 'info' | 'warning' | 'success' | 'brand';
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'border-line bg-surface-muted text-ink',
    warning: 'border-sunflower/70 bg-[#FFF8E3] text-ink',
    success: 'border-sea/30 bg-[#EAF5F3] text-ink',
    brand: 'border-brand/25 bg-brand-tint text-ink',
  }[tone];
  const iconColor = { info: 'text-ink-muted', warning: 'text-terracotta', success: 'text-sea', brand: 'text-brand' }[tone];
  return (
    <div className={clsx('flex gap-3 rounded-xl border p-4', styles, className)}>
      <div className={clsx('mt-0.5 shrink-0', iconColor)}>{icon ?? (tone === 'warning' ? <AlertTriangle className="h-5 w-5" /> : tone === 'success' ? <Check className="h-5 w-5" /> : <Info className="h-5 w-5" />)}</div>
      <div className="min-w-0 text-sm leading-relaxed">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={clsx(title && 'mt-0.5', 'text-ink-soft')}>{children}</div>}
      </div>
    </div>
  );
}

/* ---------- Dialog ---------- */

export function Dialog({ open, onClose, title, children, footer, width = 'max-w-md' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className={clsx('relative w-full rounded-2xl bg-white p-6 shadow-lift', width)}
          >
            <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink" aria-label="Schliessen">
              <X className="h-4 w-4" />
            </button>
            <h3 className="pr-8 font-serif text-xl font-semibold text-ink">{title}</h3>
            <div className="mt-3 text-sm text-ink-soft">{children}</div>
            {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Combobox (suchbare Auswahl) ---------- */

export interface ComboItem {
  value: string;
  label: string;
  description?: string;
  group?: string;
  badge?: ReactNode;
  disabled?: boolean;
}

export function Combobox({
  id,
  value,
  onChange,
  items,
  placeholder,
  searchPlaceholder = 'Suchen ...',
  invalid,
  footer,
  emptyText = 'Keine Treffer',
  renderValue,
  searchItems,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  items: ComboItem[];
  /** Optional grössere Liste, die bei aktiver Suche durchsucht wird. */
  searchItems?: ComboItem[];
  placeholder: string;
  searchPlaceholder?: string;
  invalid?: boolean;
  footer?: (close: () => void) => ReactNode;
  emptyText?: string;
  renderValue?: (item: ComboItem) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const selected = items.find((i) => i.value === value) ?? searchItems?.find((i) => i.value === value);

  useEffect(() => {
    const onDown = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => search.current?.focus(), 10);
    else setQ('');
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? (searchItems ?? items).filter((i) => `${i.value} ${i.label} ${i.description ?? ''} ${i.group ?? ''}`.toLowerCase().includes(s)) : items;
  }, [items, searchItems, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, ComboItem[]>();
    for (const i of filtered.slice(0, 300)) {
      const g = i.group ?? '';
      map.set(g, [...(map.get(g) ?? []), i]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div ref={root} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(inputClass(invalid), 'flex items-center justify-between text-left')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={clsx('truncate', !selected && 'text-ink-muted/80')}>{selected ? (renderValue ? renderValue(selected) : selected.label) : placeholder}</span>
        <Search className="h-4 w-4 shrink-0 text-ink-muted" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-line bg-white shadow-lift"
          >
            <div className="border-b border-line p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  ref={search}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-lg bg-surface-muted pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto py-1" role="listbox">
              {grouped.length === 0 && <div className="px-4 py-6 text-center text-sm text-ink-muted">{emptyText}</div>}
              {grouped.map(([group, list]) => (
                <div key={group}>
                  {group && <div className="sticky top-0 bg-white/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted backdrop-blur">{group}</div>}
                  {list.map((i) => (
                    <button
                      type="button"
                      key={i.value}
                      disabled={i.disabled}
                      role="option"
                      aria-selected={i.value === value}
                      onClick={() => {
                        onChange(i.value);
                        setOpen(false);
                      }}
                      className={clsx(
                        'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40',
                        i.value === value ? 'bg-brand-tint' : 'hover:bg-surface-muted',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-ink">{i.label}</span>
                        {i.description && <span className="block truncate text-xs text-ink-muted">{i.description}</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {i.badge}
                        {i.value === value && <Check className="h-4 w-4 text-brand" />}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            {footer && <div className="border-t border-line p-2">{footer(() => setOpen(false))}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Misc ---------- */

export function KeyValue({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-sm text-ink-muted sm:w-48">{label}</dt>
      <dd className="min-w-0 text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={clsx('h-px w-full bg-line/80', className)} />;
}
