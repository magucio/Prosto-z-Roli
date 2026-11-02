import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIMITS } from '@pzr/shared';
import { createContext, useContext } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type DraftItem = {
  key: string;
  productId: string;
  productName: string;
  unitId: string;
  unitShort: string;
  priceType: 'fixed' | 'negotiable';
  price: string;
  quantity: string;
  description: string;
};

export type DraftImage = {
  key: string;
  uri: string;
  width: number;
  height: number;
  bytes: number;
  // ścieżka w Storage po udanym wysłaniu (ponowna próba zapisu nie wysyła drugi raz)
  storagePath?: string;
};

export type Draft = {
  step: number;
  listingId: string | null;
  kind: 'product' | 'service';
  location: { lng: number; lat: number } | null;
  placeName: string;
  addressText: string;
  title: string;
  description: string;
  mainCategoryId: string | null;
  sellerName: string;
  pickup: boolean;
  items: DraftItem[];
  images: DraftImage[];
  phone: string;
  email: string;
  sharePhone: boolean;
  shareEmail: boolean;
  allowChat: boolean;
  locationAck: boolean;
  // edycja: zdjęcia zapisane na serwerze przed edycją (do usunięcia, jeśli użytkownik je skasuje)
  originalImagePaths: string[];
};

const EMPTY: Draft = {
  step: 0,
  listingId: null,
  kind: 'product',
  location: null,
  placeName: '',
  addressText: '',
  title: '',
  description: '',
  mainCategoryId: null,
  sellerName: '',
  pickup: true,
  items: [],
  images: [],
  phone: '',
  email: '',
  sharePhone: false,
  shareEmail: false,
  allowChat: true,
  locationAck: false,
  originalImagePaths: [],
};

export type DraftStore = Draft & {
  set: (patch: Partial<Draft>) => void;
  upsertItem: (item: DraftItem) => void;
  removeItem: (key: string) => void;
  reset: () => void;
};

type SetFn = StoreApi<DraftStore>['setState'];
const actions = (set: SetFn) => ({
  set: (patch: Partial<Draft>) => set(patch),
  upsertItem: (item: DraftItem) =>
    set((s) => {
      const exists = s.items.some((i) => i.key === item.key);
      if (!exists && s.items.length >= LIMITS.itemsPerListing) return s;
      return { items: exists ? s.items.map((i) => (i.key === item.key ? item : i)) : [...s.items, item] };
    }),
  removeItem: (key: string) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
  reset: () => set({ ...EMPTY }),
});

// Nowe ogłoszenie: szkic przetrwa zamknięcie aplikacji.
export const createDraftStore = createStore<DraftStore>()(
  persist((set) => ({ ...EMPTY, ...actions(set) }), {
    name: 'pzr-listing-draft-v1',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: ({ set: _s, upsertItem: _u, removeItem: _r, reset: _x, ...draft }) => draft,
  }),
);

// Edycja istniejącego ogłoszenia: tylko w pamięci, ładowana z serwera przy każdym wejściu.
export const editDraftStore = createStore<DraftStore>()((set) => ({ ...EMPTY, ...actions(set) }));

export const WizardContext = createContext<StoreApi<DraftStore>>(createDraftStore);

export function useDraftApi(): StoreApi<DraftStore> {
  return useContext(WizardContext);
}

export function useDraft(): DraftStore {
  return useStore(useContext(WizardContext));
}

export function isEditStore(api: StoreApi<DraftStore>): boolean {
  return api === editDraftStore;
}

export const STEPS = ['Lokalizacja', 'Dane', 'Pozycje', 'Zdjęcia', 'Kontakt', 'Podsumowanie'] as const;

export function parseDecimal(v: string): number | null {
  const n = Number(v.replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) && v.trim() !== '' ? n : null;
}

// Walidacja kroku przed przejściem dalej — komunikat albo null.
export function validateStep(step: number, d: Draft): string | null {
  switch (step) {
    case 0:
      return d.location ? null : 'Wskaż miejsce na mapie.';
    case 1:
      if (d.title.trim().length < LIMITS.titleMin) return `Tytuł musi mieć co najmniej ${LIMITS.titleMin} znaków.`;
      if (!d.mainCategoryId) return 'Wybierz kategorię główną.';
      if (d.sellerName.trim().length < 2) return 'Podaj nazwę sprzedawcy.';
      return null;
    case 2:
      if (d.items.length === 0) return 'Dodaj co najmniej jedną pozycję.';
      return null;
    case 4:
      if (d.sharePhone && !/^\+?[0-9 ]{9,16}$/.test(d.phone.trim())) return 'Podaj poprawny numer telefonu.';
      if (d.shareEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) return 'Podaj poprawny e-mail.';
      if (!d.sharePhone && !d.shareEmail && !d.allowChat) return 'Włącz co najmniej jedną formę kontaktu.';
      return null;
    case 5:
      return d.locationAck ? null : 'Potwierdź, że rozumiesz, jak widoczna będzie lokalizacja.';
    default:
      return null;
  }
}
