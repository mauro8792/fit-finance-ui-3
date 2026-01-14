import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentFood {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionGrams: number;
  usedAt: number; // timestamp
}

interface CachedSearchResult {
  query: string;
  results: RecentFood[];
  timestamp: number;
}

interface NutritionState {
  // Recent foods
  recentFoods: RecentFood[];
  addRecentFood: (food: RecentFood) => void;
  
  // Search cache
  searchCache: CachedSearchResult[];
  addToSearchCache: (query: string, results: RecentFood[]) => void;
  getFromSearchCache: (query: string) => RecentFood[] | null;
  
  // Clear
  clearCache: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_RECENT = 10;
const MAX_CACHE_ENTRIES = 20;

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      recentFoods: [],
      searchCache: [],

      addRecentFood: (food) => {
        set((state) => {
          // Remove if already exists
          const filtered = state.recentFoods.filter((f) => f.id !== food.id);
          // Add to beginning with current timestamp
          const updated = [{ ...food, usedAt: Date.now() }, ...filtered];
          // Keep only last MAX_RECENT
          return { recentFoods: updated.slice(0, MAX_RECENT) };
        });
      },

      addToSearchCache: (query, results) => {
        set((state) => {
          // Remove old entry for same query
          const filtered = state.searchCache.filter(
            (c) => c.query.toLowerCase() !== query.toLowerCase()
          );
          // Add new entry
          const updated = [
            { query: query.toLowerCase(), results, timestamp: Date.now() },
            ...filtered,
          ];
          // Keep only last MAX_CACHE_ENTRIES
          return { searchCache: updated.slice(0, MAX_CACHE_ENTRIES) };
        });
      },

      getFromSearchCache: (query) => {
        const cached = get().searchCache.find(
          (c) => c.query.toLowerCase() === query.toLowerCase()
        );
        if (!cached) return null;
        // Check if expired
        if (Date.now() - cached.timestamp > CACHE_DURATION) return null;
        return cached.results;
      },

      clearCache: () => {
        set({ searchCache: [] });
      },
    }),
    {
      name: "nutrition-store",
      partialize: (state) => ({
        recentFoods: state.recentFoods,
        // Don't persist search cache, only recents
      }),
    }
  )
);

