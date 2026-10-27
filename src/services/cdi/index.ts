/**
 * CDI-Mock (Offerttool).
 *
 * Simuliert die Schnittstelle, an die der Online-Rechner die Offertanfrage übermittelt.
 * Das CDI prüft das Underwriting verbindlich, berechnet die Prämie und liefert das Ergebnis,
 * aus dem das Offert-PDF entsteht. Für die Zielumgebung wird nur diese Datei gegen einen
 * echten API-Client getauscht.
 */
import { underwritingReasons } from '@/domain/rules';
import type { CdiResult, Offer } from '@/domain/types';
import { calculatePremiums } from './tariff';

export type CdiPhase = 'transmit' | 'validate' | 'calculate' | 'document';

export const CDI_PHASES: { id: CdiPhase; label: string }[] = [
  { id: 'transmit', label: 'Offertanfrage an CDI übermitteln' },
  { id: 'validate', label: 'Daten validieren und Underwriting prüfen' },
  { id: 'calculate', label: 'Prämie im CDI berechnen' },
  { id: 'document', label: 'Offerte als PDF erstellen' },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function offerNumberFor(offer: Offer, date = new Date()): string {
  const digits = offer.id.replace(/\D/g, '').slice(-6).padStart(6, '0');
  return `OFF-${date.getFullYear()}-${digits}`;
}

/** Payload, wie sie an das CDI gesendet würde. Bewusst ohne UI-Zustand. */
export function buildCdiPayload(offer: Offer) {
  return {
    offerId: offer.id,
    customer: offer.customerData,
    contract: offer.contractDetails,
    personGroups: offer.personGroups,
    questions: offer.applicationQuestions,
    isSuvaAffiliated: offer.isSuvaAffiliated,
    products: offer.selectedProducts,
    coverage: offer.productConfig,
    underwritingFlags: underwritingReasons(offer.personGroups, offer.applicationQuestions),
  };
}

/** Berechnung ohne Latenz (für Dummy-Daten, Tests und UW-Entscheid). */
export function evaluateOffer(offer: Offer, now = new Date(), ignoreUnderwriting = false): CdiResult {
  const payload = buildCdiPayload(offer);
  const reasons = ignoreUnderwriting ? [] : payload.underwritingFlags;
  const premiums =
    reasons.length === 0
      ? calculatePremiums(offer.personGroups, offer.selectedProducts, offer.productConfig, offer.customerData.nogaCode)
      : null;
  return {
    offerNumber: offer.cdi?.offerNumber ?? offerNumberFor(offer, now),
    status: reasons.length === 0 ? 'processing' : 'underwriting',
    premiums,
    underwritingReasons: payload.underwritingFlags,
    submittedAt: offer.cdi?.submittedAt ?? now.toISOString(),
    calculatedAt: now.toISOString(),
  };
}

/** Übermittelt eine Offerte an das CDI (simuliert Netzwerk und Verarbeitung). */
export async function submitOffer(offer: Offer, onPhase?: (phase: CdiPhase) => void): Promise<CdiResult> {
  const reasons = underwritingReasons(offer.personGroups, offer.applicationQuestions);
  onPhase?.('transmit');
  await wait(700);
  onPhase?.('validate');
  await wait(800);
  if (reasons.length === 0) {
    onPhase?.('calculate');
    await wait(1000);
  }
  onPhase?.('document');
  await wait(700);
  return evaluateOffer(offer);
}

/** Demo: Underwriting nimmt an, danach rechnet das CDI die Prämie. */
export function acceptUnderwriting(offer: Offer): CdiResult {
  return { ...evaluateOffer(offer, new Date(), true), underwritingReasons: offer.cdi?.underwritingReasons ?? [] };
}
