import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, MessageSquareText, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Field, TextInput } from '@/components/ui';
import { CURRENT_USER, SUPPORT_EMAIL } from '@/domain/constants';
import { buildMailto } from '@/services/mail';

const TOPICS = ['Frage zum Produkt', 'Frage zur Offerte', 'Underwriting', 'Technisches Problem'];

/**
 * Kontaktformular: Der Berater schreibt eine Nachricht,
 * der Kontext (Schritt, Firma, Offerte) wird automatisch angehängt und als E-Mail geöffnet.
 */
export function ContactWidget({ context }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) setSent(false);
  }, [open]);

  const body = [
    message.trim(),
    '',
    '---',
    `Absender: ${CURRENT_USER.name}`,
    context ? `Kontext: ${context}` : null,
    `Seite: ${window.location.href}`,
    `Zeitpunkt: ${new Date().toLocaleString('de-CH')}`,
  ]
    .filter((l) => l !== null)
    .join('\n');

  const href = buildMailto({ to: SUPPORT_EMAIL, subject: `[WebCalculator] ${topic}`, body });

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="w-[min(23.75rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-lift"
          >
            <div className="relative overflow-hidden bg-ink px-5 py-4 text-white">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/60 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold">Kontakt aufnehmen</div>
                  <div className="text-xs text-white/70">Wir antworten per E-Mail an Sie.</div>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Schliessen">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {sent ? (
              <div className="space-y-3 p-5 text-sm text-ink-soft">
                <p>Ihr Mailprogramm wurde mit der vorbereiteten Nachricht geöffnet. Bitte dort auf «Senden» klicken.</p>
                <p className="text-xs text-ink-muted">
                  Kein Mailprogramm geöffnet? Schreiben Sie direkt an{' '}
                  <a className="font-medium text-brand underline" href={`mailto:${SUPPORT_EMAIL}`}>
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
                <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                  Schliessen
                </Button>
              </div>
            ) : (
              <form
                className="space-y-4 p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!message.trim()) return;
                  window.location.href = href;
                  setSent(true);
                  setMessage('');
                }}
              >
                <div className="flex flex-wrap gap-1.5">
                  {TOPICS.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setTopic(t)}
                      className={clsx(
                        'rounded-full border px-3 py-1 text-xs font-medium transition',
                        t === topic ? 'border-ink bg-ink text-white' : 'border-line-strong/70 text-ink-soft hover:border-ink',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <Field label="Empfänger">{(id) => <TextInput id={id} value={SUPPORT_EMAIL} readOnly className="bg-surface-muted text-ink-muted" />}</Field>
                <Field label="Ihre Nachricht" required>
                  {(id) => (
                    <textarea
                      id={id}
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Wie können wir helfen?"
                      className="w-full resize-none rounded-xl border border-line-strong/70 px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/5"
                    />
                  )}
                </Field>
                {context && (
                  <div className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-muted">
                    <span className="font-medium text-ink-soft">Wird angehängt:</span> {context}
                  </div>
                )}
                <Button type="submit" className="w-full" icon={<Send className="h-4 w-4" />} disabled={!message.trim()}>
                  E-Mail vorbereiten
                </Button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex h-14 items-center gap-2 rounded-full bg-brand pl-4 pr-5 text-white shadow-brand transition hover:bg-brand-dark"
        aria-label="Kontakt per E-Mail"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquareText className="h-5 w-5" />}
        <span className="text-sm font-medium">{open ? 'Schliessen' : 'Fragen?'}</span>
        {!open && <Mail className="hidden h-4 w-4 opacity-70 sm:block" />}
      </button>
    </div>
  );
}
