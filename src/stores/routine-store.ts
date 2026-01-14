"use client";

import { create } from "zustand";
import { getMacrocyclesByStudent } from "@/lib/api/routine";
import type { Macrocycle, Mesocycle, Microcycle, Day } from "@/types";

interface RoutineState {
  // Data
  macrocycle: Macrocycle | null;
  activeMeso: Mesocycle | null;
  selectedMicroIndex: number;
  
  // Cache metadata
  studentId: number | null;
  lastFetch: number | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadRoutine: (studentId: number, forceRefresh?: boolean) => Promise<void>;
  setSelectedMicroIndex: (index: number) => void;
  invalidateCache: () => void;
  
  // Computed helpers
  getCurrentMicro: () => Microcycle | null;
  getDayById: (dayId: number) => Day | null;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useRoutineStore = create<RoutineState>((set, get) => ({
  // Initial state
  macrocycle: null,
  activeMeso: null,
  selectedMicroIndex: 0,
  studentId: null,
  lastFetch: null,
  isLoading: false,
  error: null,

  loadRoutine: async (studentId: number, forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    
    // Check if cache is valid
    const cacheValid = 
      !forceRefresh &&
      state.studentId === studentId &&
      state.lastFetch &&
      (now - state.lastFetch) < CACHE_DURATION &&
      state.macrocycle !== null;
    
    if (cacheValid) {
      console.log("[RoutineStore] Using cached data");
      return;
    }

    console.log("[RoutineStore] Fetching fresh data...");
    set({ isLoading: true, error: null });

    try {
      const macros = await getMacrocyclesByStudent(studentId);
      
      if (macros && macros.length > 0) {
        const macro = macros[0];
        // Buscar mesociclo activo o publicado (visible para el alumno)
        const activeMeso = macro.mesocycles?.find((m: Mesocycle) => 
          m.status === "active" || m.status === "published"
        ) || null;
        
        // Determine initial microcycle based on dates
        let microIndex = 0;
        if (activeMeso?.microcycles?.length) {
          // Check localStorage first
          const savedIndex = localStorage.getItem("activeMicrocycleIndex");
          if (savedIndex !== null) {
            const idx = parseInt(savedIndex);
            if (idx >= 0 && idx < activeMeso.microcycles.length) {
              microIndex = idx;
            }
          } else {
            // Try to find by date
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            for (let i = 0; i < activeMeso.microcycles.length; i++) {
              const micro = activeMeso.microcycles[i];
              const dayDates = micro.days
                ?.map((d: Day) => d.fecha?.substring(0, 10))
                .filter((d): d is string => Boolean(d)) || [];
              
              if (dayDates.some((d) => d <= todayStr)) {
                const hasFutureDays = dayDates.some((d) => d >= todayStr);
                const hasRecentDays = dayDates.some((d) => {
                  const dayDate = new Date(d);
                  const diffDays = (today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24);
                  return diffDays >= 0 && diffDays <= 7;
                });
                
                if (hasFutureDays || hasRecentDays) {
                  microIndex = i;
                }
              }
            }
            localStorage.setItem("activeMicrocycleIndex", microIndex.toString());
          }
        }

        set({
          macrocycle: macro,
          activeMeso,
          selectedMicroIndex: microIndex,
          studentId,
          lastFetch: now,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          macrocycle: null,
          activeMeso: null,
          studentId,
          lastFetch: now,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("[RoutineStore] Error loading routine:", error);
      set({ 
        isLoading: false, 
        error: "Error al cargar la rutina" 
      });
    }
  },

  setSelectedMicroIndex: (index: number) => {
    localStorage.setItem("activeMicrocycleIndex", index.toString());
    set({ selectedMicroIndex: index });
  },

  invalidateCache: () => {
    set({ lastFetch: null });
  },

  getCurrentMicro: () => {
    const { activeMeso, selectedMicroIndex } = get();
    return activeMeso?.microcycles?.[selectedMicroIndex] || null;
  },

  getDayById: (dayId: number) => {
    const { activeMeso } = get();
    if (!activeMeso) return null;
    
    for (const micro of activeMeso.microcycles || []) {
      const day = micro.days?.find((d) => d.id === dayId);
      if (day) return day;
    }
    return null;
  },
}));

