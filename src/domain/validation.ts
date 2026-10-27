import { z } from 'zod';
import type { Offer } from './types';
import { groupEmployees, groupSalary } from './rules';

export type FieldErrors = Record<string, string>;

const required = (msg: string) => z.string().trim().min(1, msg);

const customerSchema = z.object({
  companyName: required('Bitte Firmenname erfassen.'),
  uidNumber: z
    .string()
    .trim()
    .regex(/^CHE-?\d{3}\.?\d{3}\.?\d{3}$/i, 'Format CHE-123.456.789 erwartet.'),
  industry: required('Bitte Branche wählen.'),
  nogaCode: required('Bitte NOGA-Code wählen.'),
  contactPerson: required('Bitte Kontaktperson erfassen.'),
  email: z.string().trim().email('Bitte gültige E-Mail-Adresse erfassen.'),
  phone: z.string().trim().regex(/^[+\d][\d\s/()-]{5,}$/, 'Bitte gültige Telefonnummer erfassen.'),
  address: required('Bitte Adresse erfassen.'),
  postalCode: z.string().trim().regex(/^\d{4}$/, 'Bitte 4-stellige PLZ erfassen.'),
  city: required('Bitte Ort erfassen.'),
});

const contractSchema = z.object({
  startDate: required('Bitte Vertragsstart wählen.'),
  paymentFrequency: required('Bitte Zahlungsfrequenz wählen.'),
  contractDuration: required('Bitte Vertragsdauer wählen.'),
});

function zodErrors(result: z.SafeParseReturnType<unknown, unknown>): FieldErrors {
  if (result.success) return {};
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function validateStep(step: number, offer: Offer): FieldErrors {
  switch (step) {
    case 1: {
      const errors = zodErrors(customerSchema.safeParse(offer.customerData));
      const advisors = offer.customerData.advisors;
      if (advisors.some((a) => !a.advisorId)) errors.advisors = 'Bitte für jede Zeile einen Kundenberater wählen.';
      else if (advisors.length > 1 && advisors.reduce((s, a) => s + a.splitPercent, 0) !== 100)
        errors.advisors = 'Die Aufteilung muss total 100 % ergeben.';
      return errors;
    }
    case 2: {
      const errors = zodErrors(contractSchema.safeParse(offer.contractDetails));
      return errors;
    }
    case 3: {
      const errors: FieldErrors = {};
      offer.personGroups.forEach((g, i) => {
        if (!g.name.trim()) errors[`group.${i}.name`] = 'Bitte Gruppennamen erfassen.';
        if (g.isNamedInsured) {
          if (!g.namedPersonName.trim()) errors[`group.${i}.namedPersonName`] = 'Bitte Namen erfassen.';
          if (groupSalary(g) <= 0) errors[`group.${i}.salary`] = 'Bitte Lohnsumme erfassen.';
        } else {
          if (groupEmployees(g) <= 0) errors[`group.${i}.employees`] = 'Mindestens eine Person erfassen.';
          if (g.maleEmployees > 0 && g.maleSalary <= 0) errors[`group.${i}.maleSalary`] = 'Lohnsumme Männer fehlt.';
          if (g.femaleEmployees > 0 && g.femaleSalary <= 0) errors[`group.${i}.femaleSalary`] = 'Lohnsumme Frauen fehlt.';
          if (g.maleEmployees === 0 && g.maleSalary > 0) errors[`group.${i}.maleEmployees`] = 'Anzahl Männer fehlt.';
          if (g.femaleEmployees === 0 && g.femaleSalary > 0) errors[`group.${i}.femaleEmployees`] = 'Anzahl Frauen fehlt.';
        }
      });
      return errors;
    }
    case 4: {
      const q = offer.applicationQuestions;
      const errors: FieldErrors = {};
      const existing = [q.hasExistingKtgVvg, q.hasExistingUvg, q.hasExistingUvgzVvg];
      if (existing.some((v) => v === null)) errors.q1 = 'Bitte alle Fragen zu bestehenden Versicherungen beantworten.';
      else if (existing.some((v) => v === true) && !q.existingInsuranceCompany.trim())
        errors.q1 = 'Bitte Versicherungsgesellschaft erfassen.';
      if (q.hasPreviousClaims === null) errors.q2 = 'Bitte Frage zu Schäden beantworten.';
      else if (q.hasPreviousClaims && q.claimAmount <= 0) errors.q2 = 'Bitte Gesamtschadenbetrag erfassen.';
      if (q.hasInsuranceRejection === null) errors.q3 = 'Bitte Frage zur Versicherungsannahme beantworten.';
      const health = [q.hasChronicIllness, q.hasCurrentIncapacity, q.hasLongTermIllness, q.hasDisabledPersons];
      if (health.some((v) => v === null)) errors.q4 = 'Bitte alle Fragen zum Gesundheitszustand beantworten.';
      return errors;
    }
    case 5: {
      const errors: FieldErrors = {};
      if (offer.isSuvaAffiliated === null) errors.suva = 'Bitte angeben, ob die Firma der SUVA unterstellt ist.';
      const p = offer.selectedProducts;
      if (!p.uvg && !p.uvgz && !p.ktg) errors.products = 'Bitte mindestens ein Produkt wählen.';
      return errors;
    }
    default:
      return {};
  }
}

/** Prüft alle Schritte, z.B. vor der Übermittlung ans CDI. Liefert den ersten fehlerhaften Schritt. */
export function firstInvalidStep(offer: Offer): number | null {
  for (let s = 1; s <= 5; s++) if (Object.keys(validateStep(s, offer)).length > 0) return s;
  return null;
}
