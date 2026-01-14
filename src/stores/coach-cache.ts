import { create } from "zustand";
import { persist } from "zustand/middleware";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

interface StudentSummary {
  id: number;
  firstName: string;
  lastName: string;
  isActive: boolean;
  macrocycles: any[];
}

interface DashboardStats {
  totalStudents: number;
  studentsWithRoutines: number;
  totalMacrocycles: number;
}

interface CachedData {
  students: StudentSummary[];
  stats: DashboardStats;
  timestamp: number;
}

interface CoachCacheState {
  studentsSummary: CachedData | null;
  
  getStudentsSummary: () => CachedData | null;
  setStudentsSummary: (students: StudentSummary[], stats: DashboardStats) => void;
  invalidateStudentsSummary: () => void;
  isStudentsSummaryValid: () => boolean;
}

export const useCoachCache = create<CoachCacheState>()(
  persist(
    (set, get) => ({
      studentsSummary: null,

      getStudentsSummary: () => {
        const cached = get().studentsSummary;
        if (!cached) return null;
        
        // Verificar si el cache expiró
        if (Date.now() - cached.timestamp > CACHE_DURATION) {
          console.log("📦 Cache expirado, invalidando...");
          get().invalidateStudentsSummary();
          return null;
        }
        
        console.log("📦 Usando cache de students-summary");
        return cached;
      },

      setStudentsSummary: (students, stats) => {
        console.log("💾 Guardando en cache students-summary");
        set({
          studentsSummary: {
            students,
            stats,
            timestamp: Date.now(),
          },
        });
      },

      invalidateStudentsSummary: () => {
        console.log("🗑️ Invalidando cache de students-summary");
        set({ studentsSummary: null });
      },

      isStudentsSummaryValid: () => {
        const cached = get().studentsSummary;
        if (!cached) return false;
        return Date.now() - cached.timestamp < CACHE_DURATION;
      },
    }),
    {
      name: "coach-cache",
      partialize: (state) => ({
        studentsSummary: state.studentsSummary,
      }),
    }
  )
);

