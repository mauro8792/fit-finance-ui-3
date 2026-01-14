import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SessionStatus = "idle" | "running" | "paused" | "finished";

interface CardioSession {
  // Estado de la sesión
  status: SessionStatus;
  activityType: string | null;
  studentId: number | null;
  
  // Tiempos
  startTimestamp: number | null; // Timestamp cuando arrancó/reanudó
  pausedTime: number; // Segundos acumulados antes de pausar
  elapsedSeconds: number; // Para mostrar en UI
  startTime: string | null; // ISO string de cuando inició
  
  // Datos adicionales al finalizar
  distance: string;
  calories: string;
  notes: string;
}

interface CardioSessionStore extends CardioSession {
  // Acciones
  startSession: (activityType: string, studentId: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;
  updateElapsed: () => void;
  setDistance: (val: string) => void;
  setCalories: (val: string) => void;
  setNotes: (val: string) => void;
  resetSession: () => void;
  restoreSession: () => void;
}

const initialState: CardioSession = {
  status: "idle",
  activityType: null,
  studentId: null,
  startTimestamp: null,
  pausedTime: 0,
  elapsedSeconds: 0,
  startTime: null,
  distance: "",
  calories: "",
  notes: "",
};

export const useCardioSession = create<CardioSessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      startSession: (activityType: string, studentId: number) => {
        const now = Date.now();
        set({
          status: "running",
          activityType,
          studentId,
          startTimestamp: now,
          pausedTime: 0,
          elapsedSeconds: 0,
          startTime: new Date().toISOString(),
          distance: "",
          calories: "",
          notes: "",
        });
      },

      pauseSession: () => {
        const state = get();
        if (state.status !== "running") return;
        
        // Calcular tiempo transcurrido actual
        const elapsed = state.startTimestamp
          ? Math.floor((Date.now() - state.startTimestamp) / 1000) + state.pausedTime
          : state.elapsedSeconds;
        
        set({
          status: "paused",
          pausedTime: elapsed,
          elapsedSeconds: elapsed,
          startTimestamp: null,
        });
      },

      resumeSession: () => {
        const state = get();
        if (state.status !== "paused") return;
        
        set({
          status: "running",
          startTimestamp: Date.now(),
        });
      },

      stopSession: () => {
        const state = get();
        // Calcular tiempo final
        let elapsed = state.elapsedSeconds;
        if (state.status === "running" && state.startTimestamp) {
          elapsed = Math.floor((Date.now() - state.startTimestamp) / 1000) + state.pausedTime;
        }
        
        set({
          status: "finished",
          elapsedSeconds: elapsed,
          startTimestamp: null,
        });
      },

      updateElapsed: () => {
        const state = get();
        if (state.status !== "running" || !state.startTimestamp) return;
        
        const elapsed = Math.floor((Date.now() - state.startTimestamp) / 1000) + state.pausedTime;
        set({ elapsedSeconds: elapsed });
      },

      setDistance: (distance: string) => set({ distance }),
      setCalories: (calories: string) => set({ calories }),
      setNotes: (notes: string) => set({ notes }),

      resetSession: () => set(initialState),

      restoreSession: () => {
        const state = get();
        // Si estaba running cuando se cerró la app, calcular tiempo transcurrido
        if (state.status === "running" && state.startTimestamp) {
          const elapsed = Math.floor((Date.now() - state.startTimestamp) / 1000) + state.pausedTime;
          set({ elapsedSeconds: elapsed });
        }
      },
    }),
    {
      name: "cardio-session",
      // Solo persistir estos campos
      partialize: (state) => ({
        status: state.status,
        activityType: state.activityType,
        studentId: state.studentId,
        startTimestamp: state.startTimestamp,
        pausedTime: state.pausedTime,
        elapsedSeconds: state.elapsedSeconds,
        startTime: state.startTime,
      }),
    }
  )
);

