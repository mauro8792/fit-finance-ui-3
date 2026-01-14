import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TrainingDay {
  id: number;
  dayNumber: number;
  dayName: string;
  fecha: string | null;
  esDescanso: boolean;
  exercises: any[];
  macrocycleName: string;
  mesocycleName: string;
  microcycleName: string;
  totalExercises: number;
  totalSets: number;
}

interface HistoryCacheState {
  // Cache por estudiante
  historyByStudent: Record<number, {
    data: TrainingDay[];
    timestamp: number;
  }>;
  
  // Dashboard summary cache
  dashboardSummary: Record<number, {
    data: any;
    timestamp: number;
  }>;
  
  // Fees cache
  studentFees: Record<number, {
    data: any[];
    timestamp: number;
  }>;
  
  // Weight history cache
  weightHistory: Record<number, {
    data: any[];
    timestamp: number;
  }>;
  
  // Actions
  getHistory: (studentId: number) => TrainingDay[] | null;
  setHistory: (studentId: number, data: TrainingDay[]) => void;
  invalidateHistory: (studentId: number) => void;
  
  getDashboardSummary: (studentId: number) => any | null;
  setDashboardSummary: (studentId: number, data: any) => void;
  
  getStudentFees: (studentId: number) => any[] | null;
  setStudentFees: (studentId: number, data: any[]) => void;
  
  getWeightHistory: (studentId: number) => any[] | null;
  setWeightHistory: (studentId: number, data: any[]) => void;
  
  invalidateStudent: (studentId: number) => void;
  invalidateAll: () => void;
}

const HISTORY_CACHE_DURATION = 10 * 60 * 1000; // 10 minutos para historial
const SUMMARY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos para dashboard
const FEES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos para cuotas
const WEIGHT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos para peso

export const useHistoryCache = create<HistoryCacheState>()(
  persist(
    (set, get) => ({
      historyByStudent: {},
      dashboardSummary: {},
      studentFees: {},
      weightHistory: {},

      getHistory: (studentId: number) => {
        const cached = get().historyByStudent[studentId];
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > HISTORY_CACHE_DURATION) {
          set((state) => {
            const newHistory = { ...state.historyByStudent };
            delete newHistory[studentId];
            return { historyByStudent: newHistory };
          });
          return null;
        }
        
        return cached.data;
      },

      setHistory: (studentId: number, data: TrainingDay[]) => {
        set((state) => ({
          historyByStudent: {
            ...state.historyByStudent,
            [studentId]: {
              data,
              timestamp: Date.now(),
            },
          },
        }));
      },

      invalidateHistory: (studentId: number) => {
        set((state) => {
          const newHistory = { ...state.historyByStudent };
          delete newHistory[studentId];
          return { historyByStudent: newHistory };
        });
      },

      getDashboardSummary: (studentId: number) => {
        const cached = get().dashboardSummary[studentId];
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > SUMMARY_CACHE_DURATION) {
          set((state) => {
            const newSummary = { ...state.dashboardSummary };
            delete newSummary[studentId];
            return { dashboardSummary: newSummary };
          });
          return null;
        }
        
        return cached.data;
      },

      setDashboardSummary: (studentId: number, data: any) => {
        set((state) => ({
          dashboardSummary: {
            ...state.dashboardSummary,
            [studentId]: {
              data,
              timestamp: Date.now(),
            },
          },
        }));
      },

      getStudentFees: (studentId: number) => {
        const cached = get().studentFees[studentId];
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > FEES_CACHE_DURATION) {
          set((state) => {
            const newFees = { ...state.studentFees };
            delete newFees[studentId];
            return { studentFees: newFees };
          });
          return null;
        }
        
        return cached.data;
      },

      setStudentFees: (studentId: number, data: any[]) => {
        set((state) => ({
          studentFees: {
            ...state.studentFees,
            [studentId]: {
              data,
              timestamp: Date.now(),
            },
          },
        }));
      },

      getWeightHistory: (studentId: number) => {
        const cached = get().weightHistory[studentId];
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > WEIGHT_CACHE_DURATION) {
          set((state) => {
            const newWeight = { ...state.weightHistory };
            delete newWeight[studentId];
            return { weightHistory: newWeight };
          });
          return null;
        }
        
        return cached.data;
      },

      setWeightHistory: (studentId: number, data: any[]) => {
        set((state) => ({
          weightHistory: {
            ...state.weightHistory,
            [studentId]: {
              data,
              timestamp: Date.now(),
            },
          },
        }));
      },

      invalidateStudent: (studentId: number) => {
        set((state) => {
          const newHistory = { ...state.historyByStudent };
          const newSummary = { ...state.dashboardSummary };
          const newFees = { ...state.studentFees };
          const newWeight = { ...state.weightHistory };
          delete newHistory[studentId];
          delete newSummary[studentId];
          delete newFees[studentId];
          delete newWeight[studentId];
          return { 
            historyByStudent: newHistory,
            dashboardSummary: newSummary,
            studentFees: newFees,
            weightHistory: newWeight,
          };
        });
      },

      invalidateAll: () => {
        set({ 
          historyByStudent: {},
          dashboardSummary: {},
          studentFees: {},
          weightHistory: {},
        });
      },
    }),
    {
      name: "history-cache",
      partialize: (state) => ({
        // Solo persistir historial (es el más pesado de cargar)
        historyByStudent: state.historyByStudent,
      }),
    }
  )
);

