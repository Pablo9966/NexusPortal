import { Download, FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { jsPDF } from 'jspdf';
import { Button, Card } from '@/components/ui';
import { pdfBlobUrl } from '@/services/pdf';

type Builder = () => Promise<{ doc: jsPDF; filename: string }>;

/** Erzeugt ein PDF, zeigt es eingebettet an und bietet den Download an. */
export function PdfPreview({ build, title, height = 720, deps }: { build: Builder; title: string; height?: number; deps: unknown[] }) {
  const [state, setState] = useState<{ url: string; filename: string; doc: jsPDF } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    setState(null);
    build()
      .then(({ doc, filename }) => {
        if (cancelled) return;
        url = pdfBlobUrl(doc);
        setState({ url, filename, doc });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'PDF konnte nicht erstellt werden'));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate">{state?.filename ?? title}</span>
        </div>
        <Button size="sm" disabled={!state} icon={<Download className="h-4 w-4" />} onClick={() => state?.doc.save(state.filename)}>
          PDF herunterladen
        </Button>
      </div>
      <div className="bg-surface-sunken" style={{ height }}>
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-brand-dark">{error}</div>
        ) : state ? (
          <iframe title={title} src={`${state.url}#toolbar=0&view=FitH`} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            PDF wird erstellt ...
          </div>
        )}
      </div>
    </Card>
  );
}
