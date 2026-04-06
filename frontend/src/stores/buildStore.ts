import { create } from 'zustand';
import type { CategorySlot, BuildRatings, BuildGalleryFilters, Build } from '../types/build';
import type { Platform } from '../types/product';
import type { Discipline, SpaceType } from '../types/build';

interface SelectedPart {
  productId: string;
  name: string;
  thumbnail?: string;
  keySpec: string;
  rating?: number;
  price: number;
  categorySlot: CategorySlot;
}

interface BuildConfigState {
  // Configurator state
  name: string;
  description: string;
  spaceType: SpaceType | null;
  disciplines: Discipline[];
  platforms: Platform[];
  parts: Partial<Record<CategorySlot, SelectedPart>>;
  ratings: BuildRatings;
  images: string[];
  isPublic: boolean;

  // Computed
  totalCost: () => number;
  filledCount: () => number;

  // Actions
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setSpaceType: (spaceType: SpaceType | null) => void;
  setDisciplines: (disciplines: Discipline[]) => void;
  setPlatforms: (platforms: Platform[]) => void;
  setPart: (slot: CategorySlot, part: SelectedPart) => void;
  removePart: (slot: CategorySlot) => void;
  setRatings: (ratings: Partial<BuildRatings>) => void;
  addImage: (url: string) => void;
  removeImage: (url: string) => void;
  setIsPublic: (isPublic: boolean) => void;
  reset: () => void;

  /** Clone a build — loads all parts and metadata into the configurator */
  cloneBuild: (build: Build) => void;
}

const initialState = {
  name: '',
  description: '',
  spaceType: null as SpaceType | null,
  disciplines: [] as Discipline[],
  platforms: [] as Platform[],
  parts: {} as Partial<Record<CategorySlot, SelectedPart>>,
  ratings: {} as BuildRatings,
  images: [] as string[],
  isPublic: true,
};

export const useBuildStore = create<BuildConfigState>((set, get) => ({
  ...initialState,

  totalCost: () =>
    Object.values(get().parts).reduce((sum, p) => sum + (p?.price ?? 0), 0),

  filledCount: () => Object.keys(get().parts).length,

  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setSpaceType: (spaceType) => set({ spaceType }),
  setDisciplines: (disciplines) => set({ disciplines }),
  setPlatforms: (platforms) => set({ platforms }),

  setPart: (slot, part) =>
    set((state) => ({ parts: { ...state.parts, [slot]: part } })),

  removePart: (slot) =>
    set((state) => {
      const next = { ...state.parts };
      delete next[slot];
      return { parts: next };
    }),

  setRatings: (ratings) =>
    set((state) => ({ ratings: { ...state.ratings, ...ratings } })),

  addImage: (url) =>
    set((state) => ({ images: [...state.images, url] })),

  removeImage: (url) =>
    set((state) => ({ images: state.images.filter((u) => u !== url) })),

  setIsPublic: (isPublic) => set({ isPublic }),

  reset: () => set(initialState),

  cloneBuild: (build) => {
    const parts: Partial<Record<CategorySlot, SelectedPart>> = {};
    for (const bp of build.parts) {
      parts[bp.categorySlot] = {
        productId: bp.product.id,
        name: bp.product.name,
        thumbnail: bp.product.images?.[0],
        keySpec: '',
        rating: bp.product.avgRating,
        price: bp.pricePaid ?? 0,
        categorySlot: bp.categorySlot,
      };
    }

    set({
      name: `${build.name} (Clone)`,
      description: '',
      spaceType: build.spaceType ?? null,
      disciplines: [...build.disciplines],
      platforms: [...build.platforms],
      parts,
      ratings: {},
      images: [],
      isPublic: true,
    });
  },
}));
