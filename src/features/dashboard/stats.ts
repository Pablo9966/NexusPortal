import type { Offer, OfferStatus } from '@/domain/types';
import { totals } from '@/domain/rules';

const DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export const offerSalary = (o: Offer) => totals(o.personGroups).salary;
export const offerEmployees = (o: Offer) => totals(o.personGroups).employees;
export const offerPremium = (o: Offer) => o.cdi?.premiums?.total ?? 0;

export function kpis(offers: Offer[], now = new Date()) {
  const count = (s: OfferStatus) => offers.filter((o) => o.status === s).length;
  const contracted = offers.filter((o) => o.status === 'contracted');
  const since = (days: number) => offers.filter((o) => now.getTime() - new Date(o.createdAt).getTime() <= days * DAY);
  const last90 = since(90).filter((o) => o.status !== 'created');
  return {
    total: offers.length,
    contracted: contracted.length,
    underwriting: count('underwriting'),
    drafts: count('created'),
    contractedLast30: since(30).filter((o) => o.status === 'contracted').length,
    winRate: last90.length ? Math.round((last90.filter((o) => o.status === 'contracted').length / last90.length) * 100) : 0,
    premiumVolume: contracted.reduce((s, o) => s + offerPremium(o), 0),
    salaryVolume: contracted.reduce((s, o) => s + offerSalary(o), 0),
  };
}

export function monthlySeries(offers: Offer[], now = new Date()) {
  const result: { month: string; total: number; contracted: number; declined: number; rate: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inMonth = offers.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= start && d < end;
    });
    const contracted = inMonth.filter((o) => o.status === 'contracted').length;
    const decided = inMonth.filter((o) => o.status !== 'created').length;
    result.push({
      month: `${MONTHS[start.getMonth()]} ${String(start.getFullYear()).slice(2)}`,
      total: inMonth.length,
      contracted,
      declined: inMonth.filter((o) => o.status === 'declined').length,
      rate: decided ? Math.round((contracted / decided) * 100) : 0,
    });
  }
  return result;
}

export function statusDistribution(offers: Offer[]) {
  const order: OfferStatus[] = ['contracted', 'processing', 'underwriting', 'declined', 'created'];
  return order.map((status) => ({ status, value: offers.filter((o) => o.status === status).length })).filter((d) => d.value > 0);
}
