import api from "@/lib/api";
import type { Macrocycle, Microcycle, Set } from "@/types";

// ========== MACROCYCLES ==========

export const getMacrocyclesByStudent = async (studentId: number): Promise<Macrocycle[]> => {
  const { data } = await api.get(`/macrocycle/student/${studentId}`);
  return data;
};

export const getMacrocycleById = async (macrocycleId: number): Promise<Macrocycle> => {
  const { data } = await api.get(`/macrocycle/${macrocycleId}`);
  return data;
};

export const finalizeMacrocycle = async (macrocycleId: number) => {
  const { data } = await api.post(`/routine/macrocycle/${macrocycleId}/finalize`);
  return data;
};

// ========== MESOCYCLES ==========

export const getMicrocyclesByMesocycle = async (mesocycleId: number): Promise<Microcycle[]> => {
  const { data } = await api.get(`/microcycle/mesocycle/${mesocycleId}`);
  return data;
};

export const finalizeMesocycle = async (mesocycleId: number) => {
  const { data } = await api.post(`/routine/mesocycle/${mesocycleId}/finalize`);
  return data;
};

// ========== MICROCYCLES ==========

export const getMicrocycleById = async (microcycleId: number): Promise<Microcycle> => {
  const { data } = await api.get(`/microcycle/${microcycleId}`);
  return data;
};

// ========== SETS ==========

export const updateSet = async (setId: number, updates: Partial<Set>) => {
  const { data } = await api.patch(`/set/${setId}`, updates);
  return data;
};

export const completeSet = async (
  setId: number,
  completedReps: number,
  completedWeight?: number,
  notes?: string
) => {
  const { data } = await api.patch(`/set/${setId}`, {
    completedReps,
    completedWeight,
    completedAt: new Date().toISOString(),
    notes,
  });
  return data;
};

// ========== DAYS ==========

export const getDayById = async (dayId: number) => {
  const { data } = await api.get(`/day/${dayId}`);
  return data;
};

// ========== TRAINING HISTORY ==========

export const getTrainingHistory = async (studentId: number, limit = 20) => {
  const { data } = await api.get(`/macrocycle/history/${studentId}?limit=${limit}`);
  return data;
};

export const getExerciseHistory = async (studentId: number, limit = 10) => {
  const { data } = await api.get(`/macrocycle/exercises/${studentId}?limit=${limit}`);
  return data;
};

// ========== CREATE ROUTINE ==========

export const createCompleteRoutine = async (wizardData: any) => {
  const { data } = await api.post("/routine/create-complete", wizardData);
  return data;
};

