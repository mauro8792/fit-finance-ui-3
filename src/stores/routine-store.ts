"use client";

import { create } from "zustand";
import { getMacrocyclesByStudent } from "@/lib/api/routine";
import api from "@/lib/api";
import type { Macrocycle, Mesocycle, Microcycle, Day } from "@/types";
import type { StudentMesocycle } from "@/types/routine-v2";

interface RoutineState {
  // Data
  macrocycle: Macrocycle | null;
  activeMeso: Mesocycle | null;
  selectedMicroIndex: number;
  
  // V2 Data
  routineV2: StudentMesocycle | null;
  isV2: boolean;
  
  // Cache metadata
  studentId: number | null;
  lastFetch: number | null;
  isLoading: boolean;
  error: string | null;
  needsRefresh: boolean; // Flag para indicar que hay datos nuevos
  
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
  routineV2: null,
  isV2: false,
  studentId: null,
  lastFetch: null,
  isLoading: false,
  error: null,
  needsRefresh: false,

  loadRoutine: async (studentId: number, forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    
    // Force refresh if needsRefresh flag is set
    const shouldForceRefresh = forceRefresh || state.needsRefresh;
    
    // Check if cache is valid
    const cacheValid = 
      !shouldForceRefresh &&
      state.studentId === studentId &&
      state.lastFetch &&
      (now - state.lastFetch) < CACHE_DURATION &&
      (state.macrocycle !== null || state.routineV2 !== null);
    
    if (cacheValid) {
      console.log("[RoutineStore] Using cached data");
      return;
    }
    
    // Reset needsRefresh flag
    if (state.needsRefresh) {
      set({ needsRefresh: false });
    }

    console.log("[RoutineStore] Fetching fresh data...");
    set({ isLoading: true, error: null });

    try {
      // Primero intentar cargar rutinas V2 activas
      let foundV2 = false;
      try {
        const { data: routinesV2 } = await api.get('/v2/my-routines');
        const activeV2 = routinesV2?.find((r: StudentMesocycle) => r.status === 'active');
        
        if (activeV2) {
          console.log("[RoutineStore] Found active V2 routine:", activeV2.name);
          
          // Ordenar microciclos
          const sortedMicros = activeV2.microcycles?.slice().sort((a: any, b: any) => a.order - b.order) || [];
          activeV2.microcycles = sortedMicros;
          
          // Determinar índice inicial
          let microIndex = 0;
          const savedIndex = localStorage.getItem("activeMicrocycleIndex");
          if (savedIndex !== null) {
            const idx = parseInt(savedIndex);
            if (idx >= 0 && idx < sortedMicros.length) {
              microIndex = idx;
            }
          }
          
          set({
            routineV2: activeV2,
            isV2: true,
            macrocycle: null,
            activeMeso: null,
            selectedMicroIndex: microIndex,
            studentId,
            lastFetch: now,
            isLoading: false,
            error: null,
          });
          foundV2 = true;
        }
      } catch (v2Error) {
        console.log("[RoutineStore] No V2 routines or error:", v2Error);
      }

      // Si no hay V2, buscar en sistema antiguo
      if (!foundV2) {
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
            routineV2: null,
            isV2: false,
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
            routineV2: null,
            isV2: false,
            studentId,
            lastFetch: now,
            isLoading: false,
            error: null,
          });
        }
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
    set({ lastFetch: null, needsRefresh: true });
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

