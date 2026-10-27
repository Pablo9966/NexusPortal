/**
 * E-Mail-Versand im Prototyp über mailto (öffnet das Mailprogramm mit vorbefüllter Nachricht).
 * In der Zielumgebung ersetzt ein Mail-Service im Backend diese Funktion.
 */

// Viele Mailprogramme schneiden mailto-Links ab etwa 2000 Zeichen ab.
const MAX_MAILTO_LENGTH = 1900;

export interface MailDraft {
  to: string;
  subject: string;
  body: string;
  cc?: string;
}

export function buildMailto({ to, subject, body, cc }: MailDraft): string {
  const params = new URLSearchParams();
  if (cc) params.set('cc', cc);
  params.set('subject', subject);
  params.set('body', body);
  let href = `mailto:${encodeURIComponent(to)}?${params.toString().replace(/\+/g, '%20')}`;
  if (href.length > MAX_MAILTO_LENGTH) {
    const overflow = href.length - MAX_MAILTO_LENGTH + 40;
    const shortened = `${body.slice(0, Math.max(0, body.length - overflow))}\n[... gekürzt]`;
    params.set('body', shortened);
    href = `mailto:${encodeURIComponent(to)}?${params.toString().replace(/\+/g, '%20')}`;
  }
  return href;
}

export function openMail(draft: MailDraft): void {
  window.location.href = buildMailto(draft);
}
