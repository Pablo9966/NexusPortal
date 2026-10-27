/** Schweizer Zahlenformat mit ASCII-Apostroph (funktioniert auch in PDF-Standardschriften). */
export function num(value: number | null | undefined, decimals = 0): string {
  const n = typeof value === 'number' && isFinite(value) ? value : 0;
  const [int, frac] = Math.abs(n).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${n < 0 ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}

export function chf(value: number | null | undefined, decimals = 0): string {
  return `CHF ${num(value, decimals)}`;
}

/** Kompakt: 1.2 Mio. / 850k */
export function chfCompact(value: number): string {
  if (value >= 1_000_000) return `CHF ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)} Mio.`;
  if (value >= 1_000) return `CHF ${Math.round(value / 1000)}k`;
  return chf(value);
}

/** Liest eine Benutzereingabe wie «1'250'000» oder «1 250 000.50» als Zahl. */
export function parseNumber(input: string): number {
  const cleaned = input.replace(/[^0-9.,]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function date(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${date(iso)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function yesNo(v: boolean | null): string {
  return v === true ? 'Ja' : v === false ? 'Nein' : '-';
}

export function fileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
