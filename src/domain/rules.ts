import {
  RECOMMENDED_KTG_WITHOUT_EXCESS,
  RECOMMENDED_KTG_WITH_EXCESS,
  RECOMMENDED_UVGZ_WITHOUT_EXCESS,
  RECOMMENDED_UVGZ_WITH_EXCESS,
  UNDERWRITING_SALARY_LIMIT,
  UVG_MAX_SALARY,
} from './constants';
import type {
  ApplicationQuestions,
  CapitalBasis,
  GroupConfig,
  KtgConfig,
  PersonGroup,
  ProductConfig,
  SelectedProducts,
  UnderwritingReason,
  UvgzConfig,
} from './types';

export interface SalarySplit {
  obligatory: number;
  excess: number;
}

/**
 * Schätzt den Überschusslohn über den Durchschnittslohn (wie im Prototyp).
 * Fachlich ist das nur eine Näherung: Die verbindliche Aufteilung pro Person macht das CDI.
 */
export function estimatedExcess(salary: number, employees: number): number {
  if (salary <= 0 || employees <= 0) return 0;
  const avg = salary / employees;
  const obligatory = Math.round(Math.min(avg, UVG_MAX_SALARY) * employees);
  return Math.max(0, salary - obligatory);
}

export function effectiveExcess(salary: number, employees: number, override: number | null): number {
  return override !== null ? Math.min(override, salary) : estimatedExcess(salary, employees);
}

export function groupEmployees(g: PersonGroup): number {
  return g.maleEmployees + g.femaleEmployees;
}

export function groupSalary(g: PersonGroup): number {
  return g.maleSalary + g.femaleSalary;
}

export function groupSplit(g: PersonGroup): SalarySplit {
  const excess =
    effectiveExcess(g.maleSalary, g.maleEmployees, g.maleExcessOverride) +
    effectiveExcess(g.femaleSalary, g.femaleEmployees, g.femaleExcessOverride);
  return { obligatory: groupSalary(g) - excess, excess };
}

export interface GroupTotals {
  maleEmployees: number;
  femaleEmployees: number;
  employees: number;
  maleSalary: number;
  femaleSalary: number;
  salary: number;
  obligatory: number;
  excess: number;
}

export function totals(groups: PersonGroup[]): GroupTotals {
  return groups.reduce<GroupTotals>(
    (acc, g) => {
      const split = groupSplit(g);
      acc.maleEmployees += g.maleEmployees;
      acc.femaleEmployees += g.femaleEmployees;
      acc.employees += groupEmployees(g);
      acc.maleSalary += g.maleSalary;
      acc.femaleSalary += g.femaleSalary;
      acc.salary += groupSalary(g);
      acc.obligatory += split.obligatory;
      acc.excess += split.excess;
      return acc;
    },
    { maleEmployees: 0, femaleEmployees: 0, employees: 0, maleSalary: 0, femaleSalary: 0, salary: 0, obligatory: 0, excess: 0 },
  );
}

export function salaryExceedsUnderwritingLimit(totalSalary: number): boolean {
  return totalSalary > UNDERWRITING_SALARY_LIMIT;
}

export function hasHealthIssue(q: ApplicationQuestions): boolean {
  return q.hasChronicIllness === true || q.hasCurrentIncapacity === true || q.hasLongTermIllness === true || q.hasDisabledPersons === true;
}

/**
 * Underwriting-Gründe im Soll-Prozess.
 * Schäden lösen bewusst kein Underwriting mehr aus.
 */
export function underwritingReasons(groups: PersonGroup[], q: ApplicationQuestions): UnderwritingReason[] {
  const reasons: UnderwritingReason[] = [];
  if (salaryExceedsUnderwritingLimit(totals(groups).salary)) reasons.push('salary-limit');
  if (q.hasInsuranceRejection === true) reasons.push('insurance-rejection');
  if (hasHealthIssue(q)) reasons.push('health');
  return reasons;
}

export function recommendedConfig(hasExcessSalary: boolean): { uvgz: UvgzConfig; ktg: KtgConfig } {
  return hasExcessSalary
    ? { uvgz: structuredClone(RECOMMENDED_UVGZ_WITH_EXCESS), ktg: { ...RECOMMENDED_KTG_WITH_EXCESS } }
    : { uvgz: structuredClone(RECOMMENDED_UVGZ_WITHOUT_EXCESS), ktg: { ...RECOMMENDED_KTG_WITHOUT_EXCESS } };
}

/** Wirksame Konfiguration einer Gruppe (global oder gruppenspezifisch). */
export function groupConfig(config: ProductConfig, groupId: string, selected: SelectedProducts): GroupConfig {
  if (config.perGroupConfig && config.groupConfigs[groupId]) {
    const gc = config.groupConfigs[groupId];
    return {
      ...gc,
      products: { uvg: gc.products.uvg && selected.uvg, uvgz: gc.products.uvgz && selected.uvgz, ktg: gc.products.ktg && selected.ktg },
    };
  }
  return { products: { ...selected }, uvgz: config.uvgz, ktg: config.ktg };
}

export function basisLabel(b: CapitalBasis): string {
  return b === 'uvg' ? 'UVG-Lohn' : b === 'excess' ? 'Überschusslohn' : 'UVG + Überschuss';
}

export function describeUvgz(cfg: UvgzConfig): { label: string; value: string }[] {
  const ic = cfg.invalidityCapital;
  const dc = cfg.deathCapital;
  const da = cfg.dailyAllowance;
  return [
    { label: 'Heilungskosten', value: cfg.healingCostsEnabled ? 'Private Spitalabteilung weltweit' : 'Nicht eingeschlossen' },
    {
      label: 'Invaliditätskapital',
      value: ic.enabled
        ? `${ic.multiplier}-fach ${basisLabel(ic.basis)}${ic.progression !== 'none' ? `, Progression ${ic.progression} %` : ''}`
        : 'Nicht eingeschlossen',
    },
    { label: 'Todesfallkapital', value: dc.enabled ? `${dc.multiplier}-fach ${basisLabel(dc.basis)}` : 'Nicht eingeschlossen' },
    { label: 'Taggeld', value: da.enabled ? `${da.percentage} %, Wartefrist ${da.waitingPeriod} Tage` : 'Nicht eingeschlossen' },
  ];
}

export function describeKtg(cfg: KtgConfig): { label: string; value: string }[] {
  return [
    { label: 'Leistungshöhe', value: `${cfg.percentage} %` },
    { label: 'Wartefrist', value: `${cfg.waitingPeriod} Tage` },
    { label: 'Leistungsdauer', value: '730 Tage abzgl. Wartefrist' },
    { label: 'Lohnnachgenuss', value: cfg.salaryTopUp ? 'Ja' : 'Nein' },
  ];
}

export function productLabels(p: SelectedProducts): string[] {
  return [p.uvg && 'UVG', p.uvgz && 'UVGZ', p.ktg && 'KTG'].filter(Boolean) as string[];
}
