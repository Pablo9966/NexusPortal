import type {
  Advisor,
  ApplicationQuestions,
  ContractDetails,
  CustomerData,
  KtgConfig,
  OfferStatus,
  PersonGroup,
  ProductConfig,
  SelectedProducts,
  UnderwritingReason,
  UvgzConfig,
} from './types';

/** Maximal versicherter UVG-Jahreslohn pro Person. */
export const UVG_MAX_SALARY = 148_200;

/** Bis und mit dieser Gesamtlohnsumme wird direkt eine Offerte berechnet, darüber braucht es Underwriting. */
export const UNDERWRITING_SALARY_LIMIT = 500_000;

/** Max. versicherter Jahreslohn UVGZ / KTG pro Person (Produktinformation). */
export const VVG_MAX_SALARY = 300_000;

export const UNDERWRITING_PROCESSING_DAYS = 14;

/** Empfänger für das Kontaktformular. Über VITE_SUPPORT_EMAIL konfigurierbar. */
export const SUPPORT_EMAIL: string = import.meta.env.VITE_SUPPORT_EMAIL ?? 'offerten-support@example.ch';

export const CURRENT_USER = { advisorId: 'PS', name: 'Pascal Strahm', initials: 'PS' };

export const STEPS = [
  { number: 1, title: 'Kundendaten' },
  { number: 2, title: 'Vertrag' },
  { number: 3, title: 'Personal' },
  { number: 4, title: 'Antragsfragen' },
  { number: 5, title: 'Produkte' },
  { number: 6, title: 'Tarif' },
  { number: 7, title: 'Übersicht' },
] as const;

export const STATUS_META: Record<OfferStatus, { label: string; description: string; badge: string; dot: string; chart: string }> = {
  created: {
    label: 'Created',
    description: 'Entwurf',
    badge: 'bg-surface-sunken text-ink-soft ring-line-strong',
    dot: 'bg-line-strong',
    chart: '#B9B9B9',
  },
  processing: {
    label: 'Processing',
    description: 'Offerte erstellt',
    badge: 'bg-[#E9F5F4] text-sea ring-sky',
    dot: 'bg-sky',
    chart: '#83CEC5',
  },
  underwriting: {
    label: 'Underwriting',
    description: 'In Prüfung',
    badge: 'bg-[#FFF6DB] text-terracotta ring-sunflower',
    dot: 'bg-sunflower',
    chart: '#FCC52D',
  },
  contracted: {
    label: 'Contracted',
    description: 'Abgeschlossen',
    badge: 'bg-[#E3F1EF] text-sea ring-sea/40',
    dot: 'bg-sea',
    chart: '#15847B',
  },
  declined: {
    label: 'Declined',
    description: 'Abgelehnt',
    badge: 'bg-brand-soft text-brand-dark ring-flamingo',
    dot: 'bg-brand-dark',
    chart: '#A11C36',
  },
};

export const UNDERWRITING_REASON_LABELS: Record<UnderwritingReason, string> = {
  'salary-limit': `Gesamtlohnsumme übersteigt CHF ${UNDERWRITING_SALARY_LIMIT.toLocaleString('de-CH')}`,
  'insurance-rejection': 'Vorherige Ablehnung oder erschwerte Bedingungen einer Kollektivversicherung',
  health: 'Gesundheitliche Einschränkungen bei versicherten Personen',
};

export const PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  'semi-annual': 'Halbjährlich',
  annual: 'Jährlich',
};

export const CONTRACT_DURATION_LABELS: Record<string, string> = {
  '1': '1 Jahr',
  '3': '3 Jahre',
  '5': '5 Jahre',
};

export const ADVISORS: Advisor[] = [
  { id: 'PS', maNumber: 'MA-0001', name: 'Pascal Strahm', email: 'p.strahm@swisslife.ch', location: 'Zürich' },
  { id: '1', maNumber: 'MA-1001', name: 'Stefan Müller', email: 's.mueller@versicherung.ch', location: 'Zürich' },
  { id: '2', maNumber: 'MA-1002', name: 'Anna Bieri', email: 'a.bieri@versicherung.ch', location: 'Bern' },
  { id: '3', maNumber: 'MA-1003', name: 'Marco Rossi', email: 'm.rossi@versicherung.ch', location: 'Lugano' },
  { id: '4', maNumber: 'MA-1004', name: 'Lisa Brunner', email: 'l.brunner@versicherung.ch', location: 'Basel' },
  { id: '5', maNumber: 'MA-1005', name: 'Thomas Keller', email: 't.keller@versicherung.ch', location: 'Luzern' },
  { id: '6', maNumber: 'MA-1006', name: 'Sandra Meier', email: 's.meier@versicherung.ch', location: 'St. Gallen' },
  { id: '7', maNumber: 'MA-1007', name: 'Patrick Gerber', email: 'p.gerber@versicherung.ch', location: 'Winterthur' },
  { id: '8', maNumber: 'MA-1008', name: 'Claudia Fischer', email: 'c.fischer@versicherung.ch', location: 'Zürich' },
];

export const EMPTY_CUSTOMER: CustomerData = {
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  postalCode: '',
  city: '',
  uidNumber: '',
  industry: '',
  nogaCode: '',
  advisors: [{ id: '1', advisorId: CURRENT_USER.advisorId, splitPercent: 100 }],
  customAdvisors: [],
};

export const EMPTY_CONTRACT: ContractDetails = { startDate: '', paymentFrequency: '', contractDuration: '' };

export function newPersonGroup(id: string, name = ''): PersonGroup {
  return {
    id,
    name,
    maleEmployees: 0,
    femaleEmployees: 0,
    maleSalary: 0,
    femaleSalary: 0,
    maleExcessOverride: null,
    femaleExcessOverride: null,
    isNamedInsured: false,
    namedPersonName: '',
    namedInsuredType: '',
    namedInsuredGender: '',
  };
}

export const EMPTY_PRODUCTS: SelectedProducts = { uvg: false, uvgz: false, ktg: false };

export const EMPTY_QUESTIONS: ApplicationQuestions = {
  hasExistingKtgVvg: null,
  hasExistingUvg: null,
  hasExistingUvgzVvg: null,
  existingInsuranceCompany: '',
  existingPolicyNumber: '',
  hasPreviousClaims: null,
  claimAmount: 0,
  akdFile: null,
  hasInsuranceRejection: null,
  rejectionDetails: '',
  hasChronicIllness: null,
  hasCurrentIncapacity: null,
  hasLongTermIllness: null,
  hasDisabledPersons: null,
  healthConditionDetails: '',
};

/** Empfehlung mit Überschusslohn. */
export const RECOMMENDED_UVGZ_WITH_EXCESS: UvgzConfig = {
  healingCostsEnabled: true,
  invalidityCapital: { enabled: true, basis: 'excess', multiplier: 3, progression: '350' },
  deathCapital: { enabled: true, basis: 'excess', multiplier: 2 },
  dailyAllowance: { enabled: true, percentage: 90, waitingPeriod: 30 },
};

/** Empfehlung ohne Überschusslohn. */
export const RECOMMENDED_UVGZ_WITHOUT_EXCESS: UvgzConfig = {
  healingCostsEnabled: false,
  invalidityCapital: { enabled: true, basis: 'uvg', multiplier: 1, progression: 'none' },
  deathCapital: { enabled: true, basis: 'uvg', multiplier: 1 },
  dailyAllowance: { enabled: true, percentage: 80, waitingPeriod: 60 },
};

export const RECOMMENDED_KTG_WITH_EXCESS: KtgConfig = { percentage: 90, waitingPeriod: 30, salaryTopUp: true };
export const RECOMMENDED_KTG_WITHOUT_EXCESS: KtgConfig = { percentage: 80, waitingPeriod: 60, salaryTopUp: false };

export const DEFAULT_PRODUCT_CONFIG: ProductConfig = {
  uvgz: RECOMMENDED_UVGZ_WITH_EXCESS,
  ktg: RECOMMENDED_KTG_WITHOUT_EXCESS,
  perGroupConfig: false,
  groupConfigs: {},
};
