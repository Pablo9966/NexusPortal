import { useCallback } from 'react';
import type {
  ApplicationQuestions,
  ContractDetails,
  CustomerData,
  Offer,
  PersonGroup,
  ProductConfig,
  SelectedProducts,
} from '@/domain/types';
import { useOfferStore } from '@/store/offers';

/** Zugriff auf die Arbeitskopie im Wizard mit typisierten Settern je Bereich. */
export function useDraft() {
  const offer = useOfferStore((s) => s.wizard?.draft) as Offer;
  const updateDraft = useOfferStore((s) => s.updateDraft);

  const setCustomer = useCallback(
    (patch: Partial<CustomerData>) => updateDraft((d) => ({ ...d, customerData: { ...d.customerData, ...patch } })),
    [updateDraft],
  );
  const setContract = useCallback(
    (patch: Partial<ContractDetails>) => updateDraft((d) => ({ ...d, contractDetails: { ...d.contractDetails, ...patch } })),
    [updateDraft],
  );
  const setGroups = useCallback((groups: PersonGroup[]) => updateDraft((d) => ({ ...d, personGroups: groups })), [updateDraft]);
  const setQuestions = useCallback(
    (patch: Partial<ApplicationQuestions>) => updateDraft((d) => ({ ...d, applicationQuestions: { ...d.applicationQuestions, ...patch } })),
    [updateDraft],
  );
  const setProducts = useCallback(
    (patch: Partial<SelectedProducts>) => updateDraft((d) => ({ ...d, selectedProducts: { ...d.selectedProducts, ...patch } })),
    [updateDraft],
  );
  const setSuva = useCallback((v: boolean) => updateDraft((d) => ({ ...d, isSuvaAffiliated: v })), [updateDraft]);
  const setConfig = useCallback(
    (fn: (c: ProductConfig) => ProductConfig) => updateDraft((d) => ({ ...d, productConfig: fn(d.productConfig) })),
    [updateDraft],
  );

  return { offer, updateDraft, setCustomer, setContract, setGroups, setQuestions, setProducts, setSuva, setConfig };
}

export type StepProps = { errors: Record<string, string> };
