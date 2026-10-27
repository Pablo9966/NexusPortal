import clsx from 'clsx';
import { Building2, CheckCircle2, Database, Loader2, Search, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, TextInput } from '@/components/ui';
import { getCompany, legalFormLabel, OFFLINE_COMPANIES, searchCompanies, searchOffline, ZefixUnavailableError, type ZefixCompany, type ZefixHit } from '@/services/zefix';

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'results'; hits: ZefixHit[]; offline: boolean } | { kind: 'error'; message: string };

export function ZefixImport({ onImport, importedName }: { onImport: (c: ZefixCompany) => void; importedName?: string }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const seq = useRef(0);

  // Suche mit Entprellung während der Eingabe
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setState({ kind: 'idle' });
      return;
    }
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setState({ kind: 'loading' });
      try {
        const hits = await searchCompanies(q);
        if (id === seq.current) setState({ kind: 'results', hits, offline: false });
      } catch (e) {
        if (id !== seq.current) return;
        setState({ kind: 'error', message: e instanceof ZefixUnavailableError ? e.message : 'Unbekannter Fehler' });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const choose = async (hit: ZefixHit, offline: boolean) => {
    if (offline) {
      const c = OFFLINE_COMPANIES.find((x) => x.ehraid === hit.ehraid);
      if (c) onImport(c);
      setQuery('');
      return;
    }
    setLoadingId(hit.ehraid);
    try {
      onImport(await getCompany(hit.ehraid));
      setQuery('');
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : 'Firma konnte nicht geladen werden' });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-white to-surface-muted p-5">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-ink">Firma aus ZEFIX übernehmen</h3>
            <p className="text-sm text-ink-muted">Live-Suche im Zentralen Firmenindex der Schweiz nach Name oder UID.</p>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="z.B. «Muster AG» oder «CHE-109.469.349»" className="pl-10" aria-label="ZEFIX-Suche" />
          {state.kind === 'loading' && <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-muted" />}
        </div>

        {importedName && state.kind === 'idle' && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-sea">
            <CheckCircle2 className="h-4 w-4" />
            Übernommen: {importedName}
          </p>
        )}

        {state.kind === 'error' && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sunflower/60 bg-[#FFF8E3] p-3 text-sm">
            <span className="flex items-center gap-2 text-ink-soft">
              <WifiOff className="h-4 w-4 text-terracotta" />
              ZEFIX ist nicht erreichbar ({state.message}).
            </span>
            <Button size="sm" variant="secondary" onClick={() => setState({ kind: 'results', hits: searchOffline(''), offline: true })}>
              Testdaten verwenden
            </Button>
          </div>
        )}

        {state.kind === 'results' && (
          <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-line bg-white">
            {state.offline && <div className="border-b border-line bg-surface-muted px-4 py-2 text-xs text-ink-muted">Offline-Modus: Testdaten, keine echten Firmen.</div>}
            {state.hits.length === 0 && <div className="px-4 py-6 text-center text-sm text-ink-muted">Keine aktive Firma gefunden.</div>}
            {state.hits.map((h) => (
              <button
                key={h.ehraid}
                type="button"
                onClick={() => choose(h, state.offline)}
                className={clsx('flex w-full items-center gap-3 border-b border-line/60 px-4 py-3 text-left transition last:border-0 hover:bg-brand-tint')}
              >
                <Building2 className="h-4 w-4 shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{h.name}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {h.uid} · {h.legalSeat} · {legalFormLabel(h.legalFormId)}
                  </span>
                </span>
                {loadingId === h.ehraid ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : <span className="text-xs font-medium text-brand">Übernehmen</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
