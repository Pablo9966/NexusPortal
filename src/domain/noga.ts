import { NOGA_SECTIONS } from './noga-data';

export type RiskClass = 'A' | 'B' | 'C' | 'D' | 'E';

export interface RiskFactors {
  riskClass: RiskClass;
  uvgFactor: number;
  uvgzFactor: number;
  ktgFactor: number;
}

export interface NogaEntry extends RiskFactors {
  code: string;
  label: string;
  section: string;
}

export const INDUSTRIES = [
  'Baugewerbe',
  'Detailhandel',
  'Dienstleistungen',
  'Finanzwesen',
  'Gastronomie / Hotellerie',
  'Gesundheitswesen',
  'Industrie / Produktion',
  'Informatik / Telekommunikation',
  'Landwirtschaft',
  'Logistik / Transport',
  'Öffentliche Verwaltung',
  'Pharma / Chemie',
  'Versicherungen',
  'Andere',
] as const;

const INDUSTRY_SECTIONS: Record<string, string[]> = {
  Landwirtschaft: ['Abschnitt A: Land- und Forstwirtschaft, Fischerei'],
  'Industrie / Produktion': ['Abschnitt C: Verarbeitendes Gewerbe / Herstellung von Waren'],
  'Pharma / Chemie': ['Abschnitt C: Verarbeitendes Gewerbe / Herstellung von Waren'],
  Baugewerbe: ['Abschnitt F: Baugewerbe'],
  Detailhandel: ['Abschnitt G: Handel; Instandhaltung und Reparatur von Kraftwagen'],
  'Logistik / Transport': ['Abschnitt H: Verkehr und Lagerei'],
  'Gastronomie / Hotellerie': ['Abschnitt I: Beherbergung und Gastronomie'],
  'Informatik / Telekommunikation': ['Abschnitt J: Information und Kommunikation'],
  Finanzwesen: ['Abschnitt K: Erbringung von Finanz- und Versicherungsdienstleistungen'],
  Versicherungen: ['Abschnitt K: Erbringung von Finanz- und Versicherungsdienstleistungen'],
  Dienstleistungen: [
    'Abschnitt L & M: Grundstückswesen; Freiberufliche Dienstleistungen',
    'Abschnitt N: Erbringung von sonstigen wirtschaftlichen Dienstleistungen',
    'Abschnitt D & E: Energieversorgung, Wasser- und Abfallentsorgung',
  ],
  Gesundheitswesen: ['Abschnitt O-U: Öffentliche Verwaltung, Bildung, Gesundheit, Sonstiges'],
  'Öffentliche Verwaltung': ['Abschnitt O-U: Öffentliche Verwaltung, Bildung, Gesundheit, Sonstiges'],
  Andere: [],
};

export const RISK_CLASS_LABELS: Record<RiskClass, string> = {
  A: 'Niedrig (Klasse A)',
  B: 'Unterdurchschnittlich (Klasse B)',
  C: 'Durchschnittlich (Klasse C)',
  D: 'Überdurchschnittlich (Klasse D)',
  E: 'Hoch (Klasse E)',
};

/** Dummy-Risikotabelle: [von, bis, Klasse, UVG, UVGZ, KTG]. Im Zielsystem kommt das aus dem CDI. */
const RISK_RANGES: [number, number, RiskClass, number, number, number][] = [
  [11, 99, 'E', 1.8, 1.6, 1.4],
  [101, 120, 'C', 1.3, 1.2, 1.15],
  [131, 152, 'B', 1.1, 1.05, 1.05],
  [161, 182, 'C', 1.35, 1.25, 1.2],
  [191, 192, 'D', 1.5, 1.4, 1.3],
  [201, 212, 'B', 1.15, 1.1, 1.05],
  [221, 239, 'C', 1.3, 1.2, 1.15],
  [241, 259, 'D', 1.5, 1.35, 1.25],
  [261, 279, 'B', 1.05, 1, 1],
  [281, 289, 'C', 1.3, 1.2, 1.15],
  [291, 309, 'C', 1.35, 1.25, 1.2],
  [310, 332, 'B', 1.15, 1.1, 1.05],
  [351, 353, 'B', 1.1, 1.05, 1],
  [360, 390, 'C', 1.3, 1.2, 1.15],
  [411, 439, 'E', 2, 1.7, 1.5],
  [451, 479, 'B', 1.05, 1, 1],
  [491, 532, 'D', 1.45, 1.3, 1.25],
  [551, 563, 'C', 1.2, 1.15, 1.1],
  [581, 639, 'A', 0.8, 0.85, 0.9],
  [641, 663, 'A', 0.75, 0.8, 0.85],
  [681, 750, 'A', 0.85, 0.9, 0.9],
  [771, 829, 'B', 1.1, 1.05, 1.05],
  [841, 843, 'A', 0.8, 0.85, 0.9],
  [851, 856, 'A', 0.85, 0.9, 0.9],
  [861, 869, 'B', 1.1, 1.05, 1.1],
  [871, 889, 'C', 1.25, 1.15, 1.2],
  [900, 932, 'B', 1.1, 1.05, 1],
  [941, 990, 'B', 1, 1, 1],
];

const DEFAULT_FACTORS: RiskFactors = { riskClass: 'B', uvgFactor: 1, uvgzFactor: 1, ktgFactor: 1 };

export function riskFactorsForCode(code: string): RiskFactors {
  const n = parseInt(code, 10);
  const hit = RISK_RANGES.find(([from, to]) => n >= from && n <= to);
  if (!hit) return DEFAULT_FACTORS;
  const [, , riskClass, uvgFactor, uvgzFactor, ktgFactor] = hit;
  return { riskClass, uvgFactor, uvgzFactor, ktgFactor };
}

export const NOGA_ENTRIES: NogaEntry[] = NOGA_SECTIONS.flatMap(({ section, items }) =>
  items.map(([code, label]) => ({ code, label, section, ...riskFactorsForCode(code) })),
);

export function nogaEntriesForIndustry(industry: string): NogaEntry[] {
  const sections = INDUSTRY_SECTIONS[industry];
  if (!sections || sections.length === 0) return NOGA_ENTRIES;
  return NOGA_ENTRIES.filter((e) => sections.includes(e.section));
}

export function findNoga(code: string): NogaEntry | undefined {
  return NOGA_ENTRIES.find((e) => e.code === code);
}
