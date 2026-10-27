import { describe, expect, it } from 'vitest';
import { EMPTY_QUESTIONS, newPersonGroup } from './constants';
import { estimatedExcess, groupSplit, totals, underwritingReasons } from './rules';
import { validateStep } from './validation';
import { createEmptyOffer } from '@/store/offers';

const group = (male: number, maleSalary: number, female = 0, femaleSalary = 0) => ({
  ...newPersonGroup('g', 'Personal'),
  maleEmployees: male,
  maleSalary,
  femaleEmployees: female,
  femaleSalary,
});

const noIssues = {
  ...EMPTY_QUESTIONS,
  hasInsuranceRejection: false,
  hasChronicIllness: false,
  hasCurrentIncapacity: false,
  hasLongTermIllness: false,
  hasDisabledPersons: false,
};

describe('Lohnaufteilung', () => {
  it('kein Überschuss unter dem UVG-Maximum', () => {
    expect(estimatedExcess(10 * 100_000, 10)).toBe(0);
  });

  it('Überschuss über dem UVG-Maximum pro Person', () => {
    expect(estimatedExcess(2 * 200_000, 2)).toBe(2 * (200_000 - 148_200));
  });

  it('manueller Überschuss wird auf Lohnsumme begrenzt', () => {
    const g = { ...group(1, 100_000), maleExcessOverride: 500_000 };
    expect(groupSplit(g)).toEqual({ obligatory: 0, excess: 100_000 });
  });
});

describe('Underwriting im Soll-Prozess', () => {
  it('bis und mit CHF 500\'000 kein Underwriting', () => {
    expect(underwritingReasons([group(5, 500_000)], noIssues)).toEqual([]);
  });

  it('über CHF 500\'000 Underwriting', () => {
    expect(underwritingReasons([group(5, 500_001)], noIssues)).toEqual(['salary-limit']);
  });

  it('Schaden über 10 % löst kein Underwriting mehr aus', () => {
    const q = { ...noIssues, hasPreviousClaims: true, claimAmount: 400_000 };
    expect(underwritingReasons([group(3, 300_000)], q)).toEqual([]);
  });

  it('Ablehnung und Gesundheit lösen Underwriting aus', () => {
    const q = { ...noIssues, hasInsuranceRejection: true, hasCurrentIncapacity: true };
    expect(underwritingReasons([group(3, 300_000)], q)).toEqual(['insurance-rejection', 'health']);
  });

  it('Totale über mehrere Gruppen', () => {
    const t = totals([group(2, 200_000, 1, 90_000), group(1, 250_000)]);
    expect(t.employees).toBe(4);
    expect(t.salary).toBe(540_000);
    expect(t.excess).toBe(250_000 - 148_200);
  });
});

describe('Validierung', () => {
  it('Branche und NOGA-Code sind Pflicht (Mangel M1 behoben)', () => {
    const offer = createEmptyOffer('t');
    offer.customerData = {
      ...offer.customerData,
      companyName: 'Test AG',
      uidNumber: 'CHE-123.456.789',
      contactPerson: 'Max Muster',
      email: 'max@test.ch',
      phone: '+41 44 123 45 67',
      address: 'Weg 1',
      postalCode: '8000',
      city: 'Zürich',
    };
    const errors = validateStep(1, offer);
    expect(Object.keys(errors).sort()).toEqual(['industry', 'nogaCode']);
  });

  it('Gruppe ohne Personen ist ungültig (Mangel M2 behoben)', () => {
    const offer = createEmptyOffer('t');
    expect(validateStep(3, offer)['group.0.employees']).toBeDefined();
  });
});
