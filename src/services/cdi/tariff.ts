/**
 * DUMMY-TARIF des CDI-Mocks.
 *
 * Die Formeln stammen 1:1 aus dem Figma-Prototyp und haben keine fachliche Gültigkeit.
 * In der Zielumgebung rechnet ausschliesslich das CDI. Diese Datei darf nur vom CDI-Mock
 * importiert werden, nie von UI-Komponenten.
 */
import { riskFactorsForCode } from '@/domain/noga';
import { groupConfig, groupSalary, groupSplit } from '@/domain/rules';
import type { CapitalBasis, KtgConfig, PersonGroup, PremiumBreakdown, ProductConfig, SelectedProducts, UvgzConfig } from '@/domain/types';

function basisAmount(basis: CapitalBasis, obligatory: number, excess: number, total: number): number {
  return basis === 'uvg' ? obligatory : basis === 'excess' ? excess : total;
}

const waitingFactor = (days: number) => (days === 30 ? 1 : days === 60 ? 0.85 : 0.75);

export function uvgPremium(obligatory: number, nogaCode: string): number {
  return Math.max(obligatory * 0.0114 * riskFactorsForCode(nogaCode).uvgFactor, 100);
}

export function uvgzPremium(cfg: UvgzConfig, obligatory: number, excess: number, total: number, nogaCode: string): number {
  const f = riskFactorsForCode(nogaCode).uvgzFactor;
  const healing = cfg.healingCostsEnabled ? total * 0.0015 * f : 0;

  let invalidity = 0;
  if (cfg.invalidityCapital.enabled) {
    let rate = cfg.invalidityCapital.multiplier * 0.002;
    if (cfg.invalidityCapital.progression === '225') rate *= 1.15;
    if (cfg.invalidityCapital.progression === '350') rate *= 1.25;
    invalidity = basisAmount(cfg.invalidityCapital.basis, obligatory, excess, total) * rate * f;
  }

  const death = cfg.deathCapital.enabled
    ? basisAmount(cfg.deathCapital.basis, obligatory, excess, total) * cfg.deathCapital.multiplier * 0.001 * f
    : 0;

  let daily = 0;
  if (cfg.dailyAllowance.enabled) {
    const rate = cfg.dailyAllowance.percentage === 80 ? 0.004 : cfg.dailyAllowance.percentage === 90 ? 0.005 : 0.006;
    daily = total * rate * waitingFactor(cfg.dailyAllowance.waitingPeriod) * f;
  }

  return Math.max(healing + invalidity + death + daily, 300);
}

export function ktgPremium(cfg: KtgConfig, total: number, nogaCode: string): number {
  const f = riskFactorsForCode(nogaCode).ktgFactor;
  const rate = cfg.percentage === 80 ? 0.008 : cfg.percentage === 90 ? 0.01 : 0.012;
  let premium = total * rate * waitingFactor(cfg.waitingPeriod) * f;
  if (cfg.salaryTopUp) premium *= 1.15;
  return Math.max(premium, 800);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Berechnet die Prämie je Gruppe und Produkt. */
export function calculatePremiums(
  groups: PersonGroup[],
  selected: SelectedProducts,
  config: ProductConfig,
  nogaCode: string,
): PremiumBreakdown {
  const perGroup = groups.map((g) => {
    const { obligatory, excess } = groupSplit(g);
    const total = groupSalary(g);
    const gc = groupConfig(config, g.id, selected);
    const uvg = gc.products.uvg ? uvgPremium(obligatory, nogaCode) : 0;
    const uvgz = gc.products.uvgz ? uvgzPremium(gc.uvgz, obligatory, excess, total, nogaCode) : 0;
    const ktg = gc.products.ktg ? ktgPremium(gc.ktg, total, nogaCode) : 0;
    return { groupId: g.id, groupName: g.name || 'Unbenannte Gruppe', uvg: round2(uvg), uvgz: round2(uvgz), ktg: round2(ktg), total: round2(uvg + uvgz + ktg) };
  });
  const sum = (k: 'uvg' | 'uvgz' | 'ktg' | 'total') => round2(perGroup.reduce((s, g) => s + g[k], 0));
  return { uvg: sum('uvg'), uvgz: sum('uvgz'), ktg: sum('ktg'), total: sum('total'), perGroup };
}
