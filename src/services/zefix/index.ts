/**
 * ZEFIX-Client (Zentraler Firmenindex der Schweiz).
 *
 * Ruft ZEFIX über einen serverseitigen Proxy auf (`/api/zefix`, lokal der Vite-Server,
 * siehe vite.config.ts). Direkte Browser-Aufrufe an zefix.ch scheitern am CORS-Preflight.
 * Der Proxy nutzt die Such-API der Website zefix.ch. Sie ist frei zugänglich, aber nicht offiziell
 * dokumentiert. Für die Produktion die offizielle ZEFIX Public REST API (mit Zugangsdaten) im
 * Backend verwenden und VITE_ZEFIX_BASE_URL darauf zeigen lassen.
 * Ist ZEFIX nicht erreichbar, wirft der Client eine ZefixUnavailableError und das UI bietet Testdaten an.
 */

const BASE = import.meta.env.VITE_ZEFIX_BASE_URL ?? `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/zefix`;
const TIMEOUT_MS = 8000;

export interface ZefixHit {
  ehraid: number;
  name: string;
  uid: string;
  legalSeat: string;
  legalFormId: number;
  status: string;
}

export interface ZefixCompany {
  ehraid: number;
  name: string;
  uid: string;
  legalSeat: string;
  legalForm: string;
  purpose: string;
  street: string;
  postalCode: string;
  city: string;
  offline: boolean;
}

export class ZefixUnavailableError extends Error {}

const LEGAL_FORMS: Record<number, string> = {
  1: 'Einzelunternehmen',
  2: 'Kollektivgesellschaft',
  3: 'Aktiengesellschaft',
  4: 'Gesellschaft mit beschränkter Haftung',
  5: 'Genossenschaft',
  6: 'Verein',
  7: 'Stiftung',
  8: 'Institut des öffentlichen Rechts',
  9: 'Zweigniederlassung',
  10: 'Kommanditgesellschaft',
  11: 'Zweigniederlassung einer ausl. Gesellschaft',
  12: 'Kommanditaktiengesellschaft',
};

export function legalFormLabel(id: number): string {
  return LEGAL_FORMS[id] ?? 'Rechtsform unbekannt';
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: init?.body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    });
    if (res.status === 404) return null; // keine Treffer
    if (!res.ok) throw new ZefixUnavailableError(`ZEFIX antwortet mit Status ${res.status}`);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ZefixUnavailableError) throw e;
    throw new ZefixUnavailableError(e instanceof Error ? e.message : 'ZEFIX nicht erreichbar');
  } finally {
    clearTimeout(timer);
  }
}

/** Suche nach Firmenname oder UID (z.B. «CHE-109.469.349»). Nur aktive Firmen. */
export async function searchCompanies(query: string, max = 12): Promise<ZefixHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const data = await request<{ list: (ZefixHit & { uidFormatted: string })[] }>('/firm/search.json', {
    method: 'POST',
    body: JSON.stringify({ name: q, languageKey: 'de', maxEntries: max, activeOnly: true }),
  });
  return (data?.list ?? [])
    .filter((h) => h.status === 'EXISTIEREND')
    .map((h) => ({ ehraid: h.ehraid, name: h.name, uid: h.uidFormatted, legalSeat: h.legalSeat, legalFormId: h.legalFormId, status: h.status }));
}

interface ZefixDetailResponse {
  ehraid: number;
  name: string;
  uidFormatted: string;
  legalSeat: string;
  legalFormId: number;
  purpose?: string;
  address?: { street?: string; houseNumber?: string; addon?: string; swissZipCode?: string; town?: string; careOf?: string };
}

export async function getCompany(ehraid: number): Promise<ZefixCompany> {
  const d = await request<ZefixDetailResponse>(`/firm/${ehraid}.json`);
  if (!d) throw new ZefixUnavailableError('Firma nicht gefunden');
  const a = d.address ?? {};
  return {
    ehraid: d.ehraid,
    name: d.name,
    uid: d.uidFormatted,
    legalSeat: d.legalSeat,
    legalForm: legalFormLabel(d.legalFormId),
    purpose: d.purpose ?? '',
    street: [a.street, a.houseNumber].filter(Boolean).join(' ') || a.addon || '',
    postalCode: a.swissZipCode ?? '',
    city: a.town ?? d.legalSeat,
    offline: false,
  };
}

/** Testdaten, falls ZEFIX nicht erreichbar ist (z.B. im Firmennetz ohne Freigabe). */
export const OFFLINE_COMPANIES: ZefixCompany[] = [
  { ehraid: -1, name: 'Muster AG', uid: 'CHE-123.456.789', legalSeat: 'Zürich', legalForm: 'Aktiengesellschaft', purpose: 'Erbringung von Dienstleistungen.', street: 'Bahnhofstrasse 42', postalCode: '8001', city: 'Zürich', offline: true },
  { ehraid: -2, name: 'Beispiel Bau GmbH', uid: 'CHE-234.567.891', legalSeat: 'Bern', legalForm: 'Gesellschaft mit beschränkter Haftung', purpose: 'Hoch- und Tiefbau.', street: 'Industriestrasse 7', postalCode: '3011', city: 'Bern', offline: true },
  { ehraid: -3, name: 'Demo Logistik AG', uid: 'CHE-345.678.912', legalSeat: 'Basel', legalForm: 'Aktiengesellschaft', purpose: 'Transport und Lagerei.', street: 'Hafenstrasse 12', postalCode: '4057', city: 'Basel', offline: true },
];

export function searchOffline(query: string): ZefixHit[] {
  const q = query.trim().toLowerCase();
  return OFFLINE_COMPANIES.filter((c) => !q || c.name.toLowerCase().includes(q) || c.uid.toLowerCase().includes(q)).map((c) => ({
    ehraid: c.ehraid,
    name: c.name,
    uid: c.uid,
    legalSeat: c.legalSeat,
    legalFormId: 3,
    status: 'EXISTIEREND',
  }));
}
