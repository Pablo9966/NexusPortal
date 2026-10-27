import { describe, expect, it } from 'vitest';
import { EMPTY_QUESTIONS, newPersonGroup } from '@/domain/constants';
import { createEmptyOffer } from '@/store/offers';
import { generateSeedOffers } from '@/store/seed';
import { acceptUnderwriting, evaluateOffer } from './index';

function offerWith(salary: number) {
  const o = createEmptyOffer('app-123456');
  o.customerData.nogaCode = '620';
  o.personGroups = [{ ...newPersonGroup('1', 'Personal'), maleEmployees: 4, maleSalary: salary }];
  o.selectedProducts = { uvg: true, uvgz: true, ktg: true };
  o.applicationQuestions = {
    ...EMPTY_QUESTIONS,
    hasInsuranceRejection: false,
    hasChronicIllness: false,
    hasCurrentIncapacity: false,
    hasLongTermIllness: false,
    hasDisabledPersons: false,
  };
  return o;
}

describe('CDI-Mock', () => {
  it('berechnet Prämie ohne Underwriting', () => {
    const r = evaluateOffer(offerWith(400_000));
    expect(r.status).toBe('processing');
    expect(r.premiums?.total).toBeGreaterThan(0);
    expect(r.premiums?.total).toBeCloseTo(r.premiums!.uvg + r.premiums!.uvgz + r.premiums!.ktg, 2);
    expect(r.offerNumber).toMatch(/^OFF-\d{4}-123456$/);
  });

  it('liefert keinen Preis bei Underwriting', () => {
    const r = evaluateOffer(offerWith(800_000));
    expect(r.status).toBe('underwriting');
    expect(r.premiums).toBeNull();
    expect(r.underwritingReasons).toEqual(['salary-limit']);
  });

  it('rechnet nach angenommenem Underwriting', () => {
    const o = offerWith(800_000);
    o.cdi = evaluateOffer(o);
    const r = acceptUnderwriting(o);
    expect(r.status).toBe('processing');
    expect(r.premiums?.total).toBeGreaterThan(0);
    expect(r.offerNumber).toBe(o.cdi.offerNumber);
  });

  it('Dummy-Daten sind konsistent', () => {
    const seed = generateSeedOffers(new Date('2026-10-27'));
    expect(seed).toHaveLength(420);
    expect(seed.filter((o) => o.status === 'created').every((o) => o.cdi === null)).toBe(true);
    expect(seed.filter((o) => o.status === 'underwriting').every((o) => o.cdi && o.cdi.premiums === null && o.cdi.underwritingReasons.length > 0)).toBe(true);
    expect(seed.filter((o) => o.status === 'contracted').every((o) => (o.cdi?.premiums?.total ?? 0) > 0)).toBe(true);
    expect(seed.every((o) => !o.isSuvaAffiliated || !o.selectedProducts.uvg)).toBe(true);
  });
});
