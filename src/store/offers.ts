import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  DEFAULT_PRODUCT_CONFIG,
  EMPTY_CONTRACT,
  EMPTY_CUSTOMER,
  EMPTY_PRODUCTS,
  EMPTY_QUESTIONS,
  newPersonGroup,
} from '@/domain/constants';
import type { CdiResult, Offer, OfferStatus } from '@/domain/types';
import { generateSeedOffers } from './seed';

const clone = <T,>(v: T): T => structuredClone(v);
const nowIso = () => new Date().toISOString();

export function createEmptyOffer(id = `app-${Date.now()}`): Offer {
  const ts = nowIso();
  return {
    id,
    companyName: '',
    status: 'created',
    createdAt: ts,
    updatedAt: ts,
    currentStep: 1,
    maxStepReached: 1,
    customerData: clone(EMPTY_CUSTOMER),
    contractDetails: clone(EMPTY_CONTRACT),
    personGroups: [newPersonGroup('1', 'Das gesamte Personal')],
    isSuvaAffiliated: null,
    selectedProducts: clone(EMPTY_PRODUCTS),
    productConfig: clone(DEFAULT_PRODUCT_CONFIG),
    applicationQuestions: clone(EMPTY_QUESTIONS),
    cdi: null,
  };
}

interface WizardSession {
  /** Arbeitskopie der Offerte im Wizard. */
  draft: Offer;
  /** Stand beim Öffnen, für «Verwerfen». */
  snapshot: Offer;
  /** true, wenn die Offerte in diesem Wizard-Durchgang neu angelegt wurde. */
  isNew: boolean;
}

interface OfferState {
  isAuthenticated: boolean;
  offers: Offer[];
  seeded: boolean;
  wizard: WizardSession | null;

  login: () => void;
  logout: () => void;
  ensureSeed: () => void;
  resetDemoData: () => void;

  startNewOffer: () => string;
  openDraft: (id: string) => boolean;
  duplicateOffer: (id: string) => string | null;
  updateDraft: (updater: (draft: Offer) => Offer) => void;
  goToStep: (step: number) => void;
  saveDraft: () => void;
  discardDraft: () => void;
  closeWizard: () => void;
  completeSubmission: (result: CdiResult) => string | null;

  deleteOffer: (id: string) => void;
  setOfferStatus: (id: string, status: OfferStatus, cdi?: CdiResult | null) => void;
}

/** sessionStorage mit Schutz gegen volle Quota oder gesperrten Speicher. */
const safeSessionStorage: StateStorage = {
  getItem: (name) => {
    try {
      return sessionStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      sessionStorage.setItem(name, value);
    } catch (e) {
      console.warn('Session-Speicher nicht verfügbar, Daten werden nur im Speicher gehalten.', e);
    }
  },
  removeItem: (name) => {
    try {
      sessionStorage.removeItem(name);
    } catch {
      /* ignorieren */
    }
  },
};

function upsert(offers: Offer[], offer: Offer): Offer[] {
  const idx = offers.findIndex((o) => o.id === offer.id);
  if (idx === -1) return [offer, ...offers];
  const next = offers.slice();
  next[idx] = offer;
  return next;
}

function stamp(offer: Offer): Offer {
  return { ...offer, companyName: offer.customerData.companyName, updatedAt: nowIso() };
}

export const useOfferStore = create<OfferState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      offers: [],
      seeded: false,
      wizard: null,

      login: () => set({ isAuthenticated: true }),
      logout: () => set({ isAuthenticated: false, wizard: null }),

      ensureSeed: () => {
        if (get().seeded) return;
        set((s) => ({ offers: [...s.offers, ...generateSeedOffers()], seeded: true }));
      },

      resetDemoData: () => set((s) => ({ offers: [...s.offers.filter((o) => !o.isDemo), ...generateSeedOffers()] })),

      startNewOffer: () => {
        const offer = createEmptyOffer();
        set((s) => ({ offers: [offer, ...s.offers], wizard: { draft: clone(offer), snapshot: clone(offer), isNew: true } }));
        return offer.id;
      },

      openDraft: (id) => {
        const current = get().wizard;
        if (current?.draft.id === id) return true;
        const offer = get().offers.find((o) => o.id === id);
        if (!offer || offer.status !== 'created') return false;
        set({ wizard: { draft: clone(offer), snapshot: clone(offer), isNew: false } });
        return true;
      },

      duplicateOffer: (id) => {
        const source = get().offers.find((o) => o.id === id);
        if (!source) return null;
        const base = createEmptyOffer();
        const copy: Offer = {
          ...clone(source),
          id: base.id,
          status: 'created',
          createdAt: base.createdAt,
          updatedAt: base.updatedAt,
          currentStep: 1,
          maxStepReached: 7,
          cdi: null,
          isDemo: false,
          duplicatedFrom: source.cdi?.offerNumber ?? source.id,
        };
        set((s) => ({ offers: [copy, ...s.offers], wizard: { draft: clone(copy), snapshot: clone(copy), isNew: true } }));
        return copy.id;
      },

      updateDraft: (updater) =>
        set((s) => (s.wizard ? { wizard: { ...s.wizard, draft: updater(s.wizard.draft) } } : s)),

      goToStep: (step) =>
        set((s) => {
          if (!s.wizard) return s;
          const draft = stamp({
            ...s.wizard.draft,
            currentStep: step,
            maxStepReached: Math.max(s.wizard.draft.maxStepReached, step),
          });
          // Autosave bei jedem Schrittwechsel
          return { wizard: { ...s.wizard, draft }, offers: upsert(s.offers, draft) };
        }),

      saveDraft: () =>
        set((s) => {
          if (!s.wizard) return s;
          const draft = stamp(s.wizard.draft);
          return { offers: upsert(s.offers, draft), wizard: null };
        }),

      discardDraft: () =>
        set((s) => {
          if (!s.wizard) return s;
          const { snapshot, isNew } = s.wizard;
          const offers = isNew ? s.offers.filter((o) => o.id !== snapshot.id) : upsert(s.offers, snapshot);
          return { offers, wizard: null };
        }),

      closeWizard: () => set({ wizard: null }),

      completeSubmission: (result) => {
        const w = get().wizard;
        if (!w) return null;
        const offer = stamp({ ...w.draft, status: result.status, cdi: result, currentStep: 7, maxStepReached: 7 });
        set((s) => ({ offers: upsert(s.offers, offer), wizard: null }));
        return offer.id;
      },

      deleteOffer: (id) => set((s) => ({ offers: s.offers.filter((o) => o.id !== id) })),

      setOfferStatus: (id, status, cdi) =>
        set((s) => ({
          offers: s.offers.map((o) =>
            o.id === id ? { ...o, status, cdi: cdi === undefined ? o.cdi : cdi, updatedAt: nowIso() } : o,
          ),
        })),
    }),
    {
      name: 'nexus-portal-session-v1',
      storage: createJSONStorage(() => safeSessionStorage),
      version: 1,
    },
  ),
);
