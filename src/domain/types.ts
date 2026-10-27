export type OfferStatus = 'created' | 'processing' | 'underwriting' | 'contracted' | 'declined';

export type PaymentFrequency = 'semi-annual' | 'annual';
export type ContractDuration = '1' | '3' | '5';

export interface Advisor {
  id: string;
  maNumber: string;
  name: string;
  email: string;
  location: string;
}

export interface AdvisorAssignment {
  id: string;
  advisorId: string;
  splitPercent: number;
}

export interface CustomerData {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  uidNumber: string;
  industry: string;
  nogaCode: string;
  advisors: AdvisorAssignment[];
  /** In dieser Offerte neu erfasste Berater, damit sie in Übersicht und PDF auflösbar bleiben. */
  customAdvisors: Advisor[];
  /** Herkunft der Firmendaten, z.B. aus ZEFIX übernommen. */
  zefixSource?: { ehraid: number; importedAt: string; offline: boolean };
}

export interface ContractDetails {
  startDate: string;
  paymentFrequency: PaymentFrequency | '';
  contractDuration: ContractDuration | '';
}

export type NamedInsuredType = 'betriebsinhaber' | 'familienmitglieder' | '';
export type Gender = 'male' | 'female' | '';

export interface PersonGroup {
  id: string;
  name: string;
  maleEmployees: number;
  femaleEmployees: number;
  maleSalary: number;
  femaleSalary: number;
  maleExcessOverride: number | null;
  femaleExcessOverride: number | null;
  isNamedInsured: boolean;
  namedPersonName: string;
  namedInsuredType: NamedInsuredType;
  namedInsuredGender: Gender;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface ApplicationQuestions {
  hasExistingKtgVvg: boolean | null;
  hasExistingUvg: boolean | null;
  hasExistingUvgzVvg: boolean | null;
  existingInsuranceCompany: string;
  existingPolicyNumber: string;
  hasPreviousClaims: boolean | null;
  claimAmount: number;
  akdFile: UploadedFile | null;
  hasInsuranceRejection: boolean | null;
  rejectionDetails: string;
  hasChronicIllness: boolean | null;
  hasCurrentIncapacity: boolean | null;
  hasLongTermIllness: boolean | null;
  hasDisabledPersons: boolean | null;
  healthConditionDetails: string;
}

export interface SelectedProducts {
  uvg: boolean;
  uvgz: boolean;
  ktg: boolean;
}

export type CapitalBasis = 'uvg' | 'excess' | 'both';
export type Progression = 'none' | '225' | '350';
export type BenefitPercentage = 80 | 90 | 100;
export type WaitingPeriod = 30 | 60 | 90;

export interface UvgzConfig {
  healingCostsEnabled: boolean;
  invalidityCapital: { enabled: boolean; basis: CapitalBasis; multiplier: 1 | 2 | 3; progression: Progression };
  deathCapital: { enabled: boolean; basis: CapitalBasis; multiplier: 1 | 2 | 3 };
  dailyAllowance: { enabled: boolean; percentage: BenefitPercentage; waitingPeriod: WaitingPeriod };
}

export interface KtgConfig {
  percentage: BenefitPercentage;
  waitingPeriod: WaitingPeriod;
  salaryTopUp: boolean;
}

export interface GroupConfig {
  products: SelectedProducts;
  uvgz: UvgzConfig;
  ktg: KtgConfig;
}

export interface ProductConfig {
  uvgz: UvgzConfig;
  ktg: KtgConfig;
  perGroupConfig: boolean;
  groupConfigs: Record<string, GroupConfig>;
}

export type UnderwritingReason = 'salary-limit' | 'insurance-rejection' | 'health';

export interface PremiumBreakdown {
  uvg: number;
  uvgz: number;
  ktg: number;
  total: number;
  perGroup: { groupId: string; groupName: string; uvg: number; uvgz: number; ktg: number; total: number }[];
}

/** Ergebnis der Übermittlung an das CDI. */
export interface CdiResult {
  offerNumber: string;
  status: 'processing' | 'underwriting';
  premiums: PremiumBreakdown | null;
  underwritingReasons: UnderwritingReason[];
  submittedAt: string;
  calculatedAt: string;
}

export interface Offer {
  id: string;
  companyName: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
  currentStep: number;
  maxStepReached: number;
  customerData: CustomerData;
  contractDetails: ContractDetails;
  personGroups: PersonGroup[];
  isSuvaAffiliated: boolean | null;
  selectedProducts: SelectedProducts;
  productConfig: ProductConfig;
  applicationQuestions: ApplicationQuestions;
  cdi: CdiResult | null;
  /** Gesetzt, wenn die Offerte als Kopie einer anderen entstanden ist. */
  duplicatedFrom?: string;
  isDemo?: boolean;
}
