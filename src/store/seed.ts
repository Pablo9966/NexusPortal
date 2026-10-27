/**
 * Deterministische Dummy-Offerten für das Dashboard (wie im Prototyp, aber relativ zum heutigen Datum
 * und nur mit Werten, die der Wizard auch anbietet).
 */
import { ADVISORS, DEFAULT_PRODUCT_CONFIG, EMPTY_QUESTIONS, newPersonGroup } from '@/domain/constants';
import { INDUSTRIES, nogaEntriesForIndustry } from '@/domain/noga';
import type { Offer, OfferStatus } from '@/domain/types';
import { acceptUnderwriting, evaluateOffer } from '@/services/cdi';

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const TOWNS: [string, string][] = [
  ['Zürich', '8001'], ['Bern', '3011'], ['Basel', '4051'], ['Luzern', '6003'], ['St. Gallen', '9000'],
  ['Winterthur', '8400'], ['Lausanne', '1003'], ['Biel', '2502'], ['Thun', '3600'], ['Aarau', '5000'],
  ['Chur', '7000'], ['Schaffhausen', '8200'], ['Frauenfeld', '8500'], ['Zug', '6300'], ['Solothurn', '4500'],
  ['Olten', '4600'], ['Baden', '5400'], ['Rapperswil', '8640'], ['Davos', '7270'], ['Langenthal', '4900'],
  ['Burgdorf', '3400'], ['Interlaken', '3800'], ['Liestal', '4410'], ['Bellinzona', '6500'], ['Lugano', '6900'],
  ['Fribourg', '1700'], ['Neuchâtel', '2000'], ['Sion', '1950'], ['Wil', '9500'], ['Uster', '8610'],
];

const SECTOR_WORDS: Record<string, string[]> = {
  Baugewerbe: ['Bau', 'Holzbau', 'Hochbau', 'Tiefbau'],
  Detailhandel: ['Handel', 'Retail', 'Fachhandel'],
  Dienstleistungen: ['Consulting', 'Services', 'Treuhand', 'Engineering'],
  Finanzwesen: ['Finanz', 'Vermögensverwaltung', 'Capital'],
  'Gastronomie / Hotellerie': ['Hotels', 'Gastro', 'Hotellerie'],
  Gesundheitswesen: ['Gesundheit', 'Pflege', 'Praxis'],
  'Industrie / Produktion': ['Maschinenbau', 'Metallbau', 'Präzision', 'Industrie'],
  'Informatik / Telekommunikation': ['IT Solutions', 'Software', 'Digital'],
  Landwirtschaft: ['Agrar', 'Bio', 'Käserei'],
  'Logistik / Transport': ['Logistik', 'Transport', 'Spedition'],
  'Öffentliche Verwaltung': ['Werke', 'Zweckverband'],
  'Pharma / Chemie': ['Pharma', 'Chemie', 'Biotech'],
  Versicherungen: ['Vorsorge', 'Assekuranz'],
};

const CONTACTS = [
  'Thomas Meier', 'Sandra Keller', 'Andreas Fischer', 'Barbara Schneider', 'Markus Weber', 'Monika Brunner',
  'Peter Huber', 'Christine Gerber', 'Daniel Steiner', 'Sabine Schmid', 'Stefan Baumann', 'Ursula Zimmermann',
  'Martin Wyss', 'Claudia Graf', 'Hans Frei', 'Silvia Roth', 'Patrick Bühler', 'Nicole Berger',
];

const STREETS = ['Hauptstrasse', 'Bahnhofstrasse', 'Industriestrasse', 'Dorfstrasse', 'Gewerbestrasse', 'Seestrasse'];

const DISTRIBUTION: [OfferStatus, number][] = [
  ['contracted', 160],
  ['processing', 75],
  ['declined', 72],
  ['underwriting', 63],
  ['created', 50],
];

const DAY = 86_400_000;

export function generateSeedOffers(now = new Date()): Offer[] {
  const r = rng(42);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
  const int = (min: number, max: number) => Math.floor(r() * (max - min + 1)) + min;

  const statuses = DISTRIBUTION.flatMap(([s, n]) => Array<OfferStatus>(n).fill(s));
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
  }

  const usedNames = new Set<string>();
  const start = now.getTime() - 730 * DAY;

  return statuses.map((status, i) => {
    const industry = pick(INDUSTRIES.filter((x) => x !== 'Andere'));
    const noga = pick(nogaEntriesForIndustry(industry));
    const [city, plz] = pick(TOWNS);
    let companyName = `${city} ${pick(SECTOR_WORDS[industry])} ${pick(['AG', 'AG', 'GmbH'])}`;
    if (usedNames.has(companyName)) companyName = `${companyName.replace(/ (AG|GmbH)$/, '')} ${i + 1} AG`;
    usedNames.add(companyName);

    const createdAt = new Date(start + Math.floor(Math.sqrt(r()) * 728) * DAY + int(7, 17) * 3_600_000);
    const updatedAt = new Date(Math.min(now.getTime() - DAY / 2, createdAt.getTime() + int(0, 30) * DAY));

    const small = r() < 0.45;
    const male = small ? int(1, 6) : int(4, 60);
    const female = small ? int(0, 5) : int(2, 45);
    const group = {
      ...newPersonGroup('1', 'Das gesamte Personal'),
      maleEmployees: male,
      femaleEmployees: female,
      maleSalary: male * int(55, 175) * 1000,
      femaleSalary: female * int(50, 160) * 1000,
    };

    const products = { uvg: r() > 0.3, uvgz: r() > 0.25, ktg: r() > 0.25 };
    if (!products.uvg && !products.uvgz && !products.ktg) products.ktg = true;
    const isSuva = r() > 0.75;
    if (isSuva) products.uvg = false;
    if (!products.uvg && !products.uvgz && !products.ktg) products.uvgz = true;

    const step = status === 'created' ? int(1, 6) : 7;
    const advisorId = r() > 0.5 ? 'PS' : pick(ADVISORS).id;
    const claims = r() > 0.75;

    const offer: Offer = {
      id: `demo-${String(i + 1).padStart(4, '0')}`,
      companyName,
      status,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      currentStep: step,
      maxStepReached: step,
      customerData: {
        companyName,
        contactPerson: pick(CONTACTS),
        email: `info@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.ch`,
        phone: `+41 ${int(21, 79)} ${int(100, 999)} ${int(10, 99)} ${int(10, 99)}`,
        address: `${pick(STREETS)} ${int(1, 120)}`,
        postalCode: plz,
        city,
        uidNumber: `CHE-${int(100, 499)}.${int(100, 999)}.${int(100, 999)}`,
        industry,
        nogaCode: noga.code,
        advisors: [{ id: '1', advisorId, splitPercent: 100 }],
        customAdvisors: [],
      },
      contractDetails: {
        startDate: new Date(createdAt.getTime() + int(14, 90) * DAY).toISOString().slice(0, 10),
        paymentFrequency: pick(['semi-annual', 'annual'] as const),
        contractDuration: pick(['1', '3', '5'] as const),
      },
      personGroups: [group],
      isSuvaAffiliated: isSuva,
      selectedProducts: products,
      productConfig: {
        ...DEFAULT_PRODUCT_CONFIG,
        uvgz: {
          healingCostsEnabled: r() > 0.3,
          invalidityCapital: { enabled: r() > 0.3, basis: 'excess', multiplier: pick([1, 2, 3] as const), progression: pick(['none', '225', '350'] as const) },
          deathCapital: { enabled: r() > 0.3, basis: 'excess', multiplier: pick([1, 2, 3] as const) },
          dailyAllowance: { enabled: r() > 0.4, percentage: pick([80, 90, 100] as const), waitingPeriod: pick([30, 60, 90] as const) },
        },
        ktg: { percentage: pick([80, 90, 100] as const), waitingPeriod: pick([30, 60, 90] as const), salaryTopUp: r() > 0.5 },
      },
      applicationQuestions: {
        ...EMPTY_QUESTIONS,
        hasExistingKtgVvg: r() > 0.5,
        hasExistingUvg: r() > 0.4,
        hasExistingUvgzVvg: r() > 0.6,
        existingInsuranceCompany: pick(['Zurich', 'AXA', 'Helvetia', 'Mobiliar', 'Baloise', 'Generali']),
        existingPolicyNumber: `P-${int(100000, 999999)}`,
        hasPreviousClaims: claims,
        claimAmount: claims ? int(5, 200) * 1000 : 0,
        akdFile: claims ? { name: 'AKD_Vorversicherer.pdf', size: 184_320, type: 'application/pdf', uploadedAt: createdAt.toISOString() } : null,
        hasInsuranceRejection: status === 'underwriting' ? r() > 0.6 : false,
        hasChronicIllness: status === 'underwriting' ? r() > 0.7 : false,
        hasCurrentIncapacity: false,
        hasLongTermIllness: false,
        hasDisabledPersons: false,
      },
      cdi: null,
      isDemo: true,
    };

    if (status === 'underwriting' && evaluateOffer(offer).underwritingReasons.length === 0) {
      offer.applicationQuestions.hasChronicIllness = true;
      offer.applicationQuestions.healthConditionDetails = 'Eine Person mit chronischer Erkrankung, reduziertes Pensum.';
    }

    if (status === 'underwriting') offer.cdi = { ...evaluateOffer(offer, updatedAt), status: 'underwriting', premiums: null };
    else if (status !== 'created') offer.cdi = acceptUnderwriting({ ...offer, cdi: evaluateOffer(offer, updatedAt) });
    return offer;
  });
}
