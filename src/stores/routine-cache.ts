import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MicrocycleCache {
  id: number;
  data: any;
  timestamp: number;
}

interface RoutineCacheState {
  microcycles: Record<number, MicrocycleCache>;
  catalog: any[] | null;
  catalogTimestamp: number;
  muscleGroups: string[] | null;
  muscleGroupsTimestamp: number;
  
  // Actions
  getMicrocycle: (id: number) => any | null;
  setMicrocycle: (id: number, data: any) => void;
  invalidateMicrocycle: (id: number) => void;
  invalidateAll: () => void;
  
  getCatalog: () => any[] | null;
  setCatalog: (data: any[]) => void;
  
  getMuscleGroups: () => string[] | null;
  setMuscleGroups: (data: string[]) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const CATALOG_CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
const MUSCLE_GROUPS_CACHE_DURATION = 60 * 60 * 1000; // 1 hora (casi nunca cambian)

export const useRoutineCache = create<RoutineCacheState>()(
  persist(
    (set, get) => ({
      microcycles: {},
      catalog: null,
      catalogTimestamp: 0,
      muscleGroups: null,
      muscleGroupsTimestamp: 0,

      getMicrocycle: (id: number) => {
        const cached = get().microcycles[id];
        if (!cached) return null;
        
        // Verificar si el caché expiró
        if (Date.now() - cached.timestamp > CACHE_DURATION) {
          // Invalidar caché expirado
          set((state) => {
            const newMicrocycles = { ...state.microcycles };
            delete newMicrocycles[id];
            return { microcycles: newMicrocycles };
          });
          return null;
        }
        
        return cached.data;
      },

      setMicrocycle: (id: number, data: any) => {
        set((state) => ({
          microcycles: {
            ...state.microcycles,
            [id]: {
              id,
              data,
              timestamp: Date.now(),
            },
          },
        }));
      },

      invalidateMicrocycle: (id: number) => {
        set((state) => {
          const newMicrocycles = { ...state.microcycles };
          delete newMicrocycles[id];
          return { microcycles: newMicrocycles };
        });
      },

      invalidateAll: () => {
        set({ 
          microcycles: {}, 
          catalog: null, 
          catalogTimestamp: 0,
          muscleGroups: null,
          muscleGroupsTimestamp: 0
        });
      },

      getCatalog: () => {
        const { catalog, catalogTimestamp } = get();
        if (!catalog) return null;
        
        if (Date.now() - catalogTimestamp > CATALOG_CACHE_DURATION) {
          set({ catalog: null, catalogTimestamp: 0 });
          return null;
        }
        
        return catalog;
      },

      setCatalog: (data: any[]) => {
        set({ catalog: data, catalogTimestamp: Date.now() });
      },

      getMuscleGroups: () => {
        const { muscleGroups, muscleGroupsTimestamp } = get();
        if (!muscleGroups) return null;
        
        if (Date.now() - muscleGroupsTimestamp > MUSCLE_GROUPS_CACHE_DURATION) {
          set({ muscleGroups: null, muscleGroupsTimestamp: 0 });
          return null;
        }
        
        return muscleGroups;
      },

      setMuscleGroups: (data: string[]) => {
        set({ muscleGroups: data, muscleGroupsTimestamp: Date.now() });
      },
    }),
    {
      name: "routine-cache",
      partialize: (state) => ({
        // Persistir catálogo y grupos musculares (son estables)
        catalog: state.catalog,
        catalogTimestamp: state.catalogTimestamp,
        muscleGroups: state.muscleGroups,
        muscleGroupsTimestamp: state.muscleGroupsTimestamp,
      }),
    }
  )
);

