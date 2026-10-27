import clsx from 'clsx';
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, ChevronLeft, ChevronRight, Copy, PencilLine, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, ProductChip, StatusBadge, TextInput } from '@/components/ui';
import { STATUS_META } from '@/domain/constants';
import { productLabels } from '@/domain/rules';
import type { Offer, OfferStatus } from '@/domain/types';
import { chf, chfCompact, date, num } from '@/lib/format';
import { offerEmployees, offerPremium, offerSalary } from './stats';

type SortKey = 'date' | 'name' | 'status' | 'employees' | 'salary' | 'premium' | 'products';
const PAGE_SIZE = 15;

const SORT_LABELS: Record<SortKey, string> = {
  date: 'Zuletzt aktualisiert',
  name: 'Unternehmen',
  status: 'Status',
  employees: 'Mitarbeitende',
  salary: 'Lohnsumme',
  premium: 'Prämie',
  products: 'Produkte',
};

function sortValue(o: Offer, key: SortKey): string | number {
  switch (key) {
    case 'date':
      return new Date(o.updatedAt).getTime();
    case 'name':
      return (o.companyName || 'zzz').toLowerCase();
    case 'status':
      return o.status;
    case 'employees':
      return offerEmployees(o);
    case 'salary':
      return offerSalary(o);
    case 'premium':
      return offerPremium(o);
    case 'products':
      return productLabels(o.selectedProducts).join(',');
  }
}

export function OfferTable({ offers, onDelete }: { offers: Offer[]; onDelete: (o: Offer) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<OfferStatus | 'all'>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [f, setF] = useState({ from: '', to: '', salaryMin: '', salaryMax: '', empMin: '', empMax: '' });
  const filtersActive = Object.values(f).some(Boolean);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = offers.filter((o) => {
      if (status !== 'all' && o.status !== status) return false;
      if (q) {
        const hay = [o.companyName, o.customerData.industry, o.customerData.city, o.customerData.contactPerson, o.cdi?.offerNumber, o.id].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const created = new Date(o.createdAt);
      if (f.from && created < new Date(f.from)) return false;
      if (f.to && created > new Date(`${f.to}T23:59:59`)) return false;
      const sal = offerSalary(o);
      if (f.salaryMin && sal < Number(f.salaryMin)) return false;
      if (f.salaryMax && sal > Number(f.salaryMax)) return false;
      const emp = offerEmployees(o);
      if (f.empMin && emp < Number(f.empMin)) return false;
      if (f.empMax && emp > Number(f.empMax)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [offers, query, status, sort, f]);

  useEffect(() => setPage(1), [query, status, sort, f]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'date' ? 'desc' : 'asc' }));

  const tabs: { value: OfferStatus | 'all'; label: string; count: number }[] = [
    { value: 'all', label: 'Alle', count: offers.length },
    ...(['created', 'processing', 'underwriting', 'contracted', 'declined'] as OfferStatus[]).map((s) => ({
      value: s,
      label: STATUS_META[s].label,
      count: offers.filter((o) => o.status === s).length,
    })),
  ];

  const SortHead = ({ k, className }: { k: SortKey; className?: string }) => (
    <th className={clsx('px-4 py-3 text-left', className)}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted hover:text-ink">
        {SORT_LABELS[k]}
        {sort.key === k ? sort.dir === 'asc' ? <ArrowUp className="h-3 w-3 text-brand" /> : <ArrowDown className="h-3 w-3 text-brand" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-80">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Firma, Branche, Ort, Offertnummer ..." className="h-10 pl-10" />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink" aria-label="Suche löschen">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-1 gap-1 overflow-x-auto rounded-full bg-surface-muted p-1">
            {tabs.map((t) => (
              <button
                key={t.value}
                onClick={() => setStatus(t.value)}
                className={clsx(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                  status === t.value ? 'bg-white text-ink shadow-card' : 'text-ink-muted hover:text-ink',
                )}
              >
                {t.label}
                <span className={clsx('rounded-full px-1.5 text-[11px] tabular-nums', status === t.value ? 'bg-brand text-white' : 'bg-white/70')}>{t.count}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={clsx('flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition', showFilters || filtersActive ? 'border-ink bg-ink text-white' : 'border-line-strong/70 hover:border-ink')}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
            {filtersActive && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
          </button>
        </div>
        {showFilters && (
          <div className="mt-3 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
            {(
              [
                ['Erstellt von / bis', 'from', 'to', 'date'],
                ['Lohnsumme CHF min / max', 'salaryMin', 'salaryMax', 'number'],
                ['Mitarbeitende min / max', 'empMin', 'empMax', 'number'],
              ] as const
            ).map(([label, a, b, type]) => (
              <div key={label}>
                <div className="mb-1.5 text-xs font-medium text-ink-muted">{label}</div>
                <div className="flex gap-2">
                  <TextInput type={type} className="h-10" value={f[a]} onChange={(e) => setF({ ...f, [a]: e.target.value })} placeholder="von" />
                  <TextInput type={type} className="h-10" value={f[b]} onChange={(e) => setF({ ...f, [b]: e.target.value })} placeholder="bis" />
                </div>
              </div>
            ))}
            {filtersActive && (
              <button onClick={() => setF({ from: '', to: '', salaryMin: '', salaryMax: '', empMin: '', empMax: '' })} className="justify-self-start text-sm font-medium text-brand hover:underline">
                Filter zurücksetzen
              </button>
            )}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between px-1 text-sm text-ink-muted">
        <span>
          <span className="font-semibold text-ink">{filtered.length}</span> Offerten
        </span>
        <span>Sortiert nach {SORT_LABELS[sort.key]}</span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-line bg-surface-muted/60">
              <tr>
                <SortHead k="name" />
                <SortHead k="status" />
                <SortHead k="salary" />
                <SortHead k="premium" />
                <SortHead k="products" />
                <SortHead k="date" />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-ink-muted">
                    Keine Offerten gefunden. Suche oder Filter anpassen.
                  </td>
                </tr>
              )}
              {visible.map((o) => (
                <tr key={o.id} onClick={() => navigate(`/offerte/${o.id}`)} className="group cursor-pointer transition hover:bg-brand-tint/60">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-muted transition group-hover:bg-white group-hover:text-brand">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{o.companyName || 'Neue Offerte'}</div>
                        <div className="truncate text-xs text-ink-muted">
                          {o.customerData.industry || 'Branche offen'} · {o.customerData.city || 'Ort offen'}
                          {!o.isDemo && <span className="ml-1.5 rounded bg-ink px-1.5 py-px text-[10px] font-semibold text-white">Session</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <div className="tabular-nums text-ink">{chfCompact(offerSalary(o))}</div>
                    <div className="text-xs text-ink-muted">{num(offerEmployees(o))} MA</div>
                  </td>
                  <td className="px-4 py-3.5 text-sm tabular-nums">
                    {offerPremium(o) > 0 ? <span className="font-medium text-ink">{chf(offerPremium(o))}</span> : <span className="text-ink-muted">{o.status === 'underwriting' ? 'nach UW' : '-'}</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">{productLabels(o.selectedProducts).map((p) => <ProductChip key={p} label={p} />)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-sm tabular-nums text-ink-soft">{date(o.updatedAt)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {o.status === 'created' ? (
                        <>
                          <IconAction title="Fortsetzen" onClick={() => navigate(`/offerte/${o.id}/bearbeiten`)} icon={<PencilLine className="h-4 w-4" />} />
                          <IconAction title="Löschen" onClick={() => onDelete(o)} icon={<Trash2 className="h-4 w-4" />} danger />
                        </>
                      ) : (
                        <IconAction title="Duplizieren" onClick={() => navigate(`/offerte/${o.id}/duplizieren`)} icon={<Copy className="h-4 w-4" />} />
                      )}
                      <ChevronRight className="h-4 w-4 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
            <span className="text-ink-muted">
              Seite {page} von {pages}
            </span>
            <div className="flex items-center gap-1">
              <PageButton disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </PageButton>
              {pageWindow(page, pages).map((p) => (
                <PageButton key={p} active={p === page} onClick={() => setPage(p)}>
                  {p}
                </PageButton>
              ))}
              <PageButton disabled={page === pages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </PageButton>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function pageWindow(page: number, pages: number): number[] {
  const size = Math.min(5, pages);
  const start = Math.min(Math.max(1, page - 2), pages - size + 1);
  return Array.from({ length: size }, (_, i) => start + i);
}

function PageButton({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={clsx('flex h-8 min-w-8 items-center justify-center rounded-full px-2 tabular-nums transition disabled:opacity-30', active ? 'bg-brand text-white' : 'hover:bg-surface-muted')}
    >
      {children}
    </button>
  );
}

function IconAction({ title, onClick, icon, danger }: { title: string; onClick: () => void; icon: React.ReactNode; danger?: boolean }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={clsx('rounded-full p-2 text-ink-muted transition', danger ? 'hover:bg-brand-soft hover:text-brand-dark' : 'hover:bg-white hover:text-ink')}
    >
      {icon}
    </button>
  );
}
