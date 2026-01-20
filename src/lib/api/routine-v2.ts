import api from "@/lib/api";
import type {
  MesocycleTemplate,
  TemplateMicrocycle,
  TemplateDay,
  TemplateExercise,
  TemplateSet,
  StudentMesocycle,
  StudentDay,
  StudentExercise,
  StudentSet,
  CreateTemplateDto,
  UpdateTemplateDto,
  AddMicrocycleDto,
  AddDayDto,
  AddExerciseDto,
  AddSetDto,
  AssignTemplateDto,
  LogSetDto,
  AssignedStudent,
  AssignedCounts,
} from "@/types/routine-v2";

const BASE_URL = "/v2/routine-templates";

// ========== PLANTILLAS (CRUD) ==========

export const getTemplates = async (): Promise<MesocycleTemplate[]> => {
  const { data } = await api.get(BASE_URL);
  return data;
};

export const getTemplate = async (id: string): Promise<MesocycleTemplate> => {
  const { data } = await api.get(`${BASE_URL}/${id}`);
  return data;
};

export const createTemplate = async (dto: CreateTemplateDto): Promise<MesocycleTemplate> => {
  const { data } = await api.post(BASE_URL, dto);
  return data;
};

export const updateTemplate = async (id: string, dto: UpdateTemplateDto): Promise<MesocycleTemplate> => {
  const { data } = await api.patch(`${BASE_URL}/${id}`, dto);
  return data;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await api.delete(`${BASE_URL}/${id}`);
};

export const publishTemplate = async (id: string): Promise<MesocycleTemplate> => {
  const { data } = await api.post(`${BASE_URL}/${id}/publish`);
  return data;
};

// ========== ALUMNOS ASIGNADOS ==========

export const getAssignedStudents = async (templateId: string): Promise<AssignedStudent[]> => {
  const { data } = await api.get(`${BASE_URL}/${templateId}/students`);
  return data;
};

export const getAssignedCounts = async (): Promise<AssignedCounts> => {
  const { data } = await api.get(`${BASE_URL}/stats/assigned-counts`);
  return data;
};

// ========== MICROCICLOS ==========

export const addMicrocycle = async (templateId: string, dto: AddMicrocycleDto): Promise<TemplateMicrocycle> => {
  const { data } = await api.post(`${BASE_URL}/${templateId}/microcycles`, dto);
  return data;
};

export const updateMicrocycle = async (microcycleId: string, dto: AddMicrocycleDto): Promise<TemplateMicrocycle> => {
  const { data } = await api.patch(`${BASE_URL}/microcycles/${microcycleId}`, dto);
  return data;
};

export const deleteMicrocycle = async (microcycleId: string): Promise<void> => {
  await api.delete(`${BASE_URL}/microcycles/${microcycleId}`);
};

// ========== DÍAS ==========

export const addDay = async (microcycleId: string, dto: AddDayDto): Promise<TemplateDay> => {
  const { data } = await api.post(`${BASE_URL}/microcycles/${microcycleId}/days`, dto);
  return data;
};

export const updateDay = async (dayId: string, dto: AddDayDto): Promise<TemplateDay> => {
  const { data } = await api.patch(`${BASE_URL}/days/${dayId}`, dto);
  return data;
};

export const deleteDay = async (dayId: string): Promise<void> => {
  await api.delete(`${BASE_URL}/days/${dayId}`);
};

// ========== EJERCICIOS ==========

export const addExercise = async (dayId: string, dto: AddExerciseDto): Promise<TemplateExercise> => {
  const { data } = await api.post(`${BASE_URL}/days/${dayId}/exercises`, dto);
  return data;
};

export const updateExercise = async (exerciseId: string, dto: Partial<AddExerciseDto>): Promise<TemplateExercise> => {
  const { data } = await api.patch(`${BASE_URL}/exercises/${exerciseId}`, dto);
  return data;
};

export const deleteExercise = async (exerciseId: string): Promise<void> => {
  await api.delete(`${BASE_URL}/exercises/${exerciseId}`);
};

// ========== SETS ==========

export const addSet = async (exerciseId: string, dto: AddSetDto): Promise<TemplateSet> => {
  const { data } = await api.post(`${BASE_URL}/exercises/${exerciseId}/sets`, dto);
  return data;
};

export const addMultipleSets = async (exerciseId: string, count: number, dto: AddSetDto): Promise<TemplateSet[]> => {
  const { data } = await api.post(`${BASE_URL}/exercises/${exerciseId}/sets/bulk?count=${count}`, dto);
  return data;
};

export const updateSet = async (setId: string, dto: Partial<AddSetDto>): Promise<TemplateSet> => {
  const { data } = await api.patch(`${BASE_URL}/sets/${setId}`, dto);
  return data;
};

export const deleteSet = async (setId: string): Promise<void> => {
  await api.delete(`${BASE_URL}/sets/${setId}`);
};

// ========== REPLICACIÓN ==========

export const replicateMicrocycle = async (
  templateId: string, 
  microcycleId: string
): Promise<{ replicatedCount: number }> => {
  const { data } = await api.post(`${BASE_URL}/${templateId}/microcycles/${microcycleId}/replicate`);
  return data;
};

// ========== RUTINAS DEL ALUMNO ==========

const STUDENT_BASE_URL = "/v2/student-routines"; // Para coaches
const MY_ROUTINE_URL = "/v2/my-routines"; // Para estudiantes

export const assignTemplate = async (dto: AssignTemplateDto): Promise<StudentMesocycle> => {
  const { data } = await api.post(`${STUDENT_BASE_URL}/assign`, dto);
  return data;
};

export const getStudentRoutines = async (studentId: number): Promise<StudentMesocycle[]> => {
  const { data } = await api.get(`${STUDENT_BASE_URL}/student/${studentId}`);
  return data;
};

export const getStudentRoutine = async (id: string): Promise<StudentMesocycle> => {
  const { data } = await api.get(`${STUDENT_BASE_URL}/${id}`);
  return data;
};

export const getActiveRoutine = async (studentId: number): Promise<StudentMesocycle | null> => {
  const { data } = await api.get(`${STUDENT_BASE_URL}/student/${studentId}/active`);
  return data;
};

export const activateRoutine = async (id: string, macrocycleId?: number): Promise<StudentMesocycle> => {
  const { data } = await api.post(`${STUDENT_BASE_URL}/${id}/activate`, { macrocycleId });
  return data;
};

export const completeRoutine = async (id: string): Promise<StudentMesocycle> => {
  const { data } = await api.post(`${STUDENT_BASE_URL}/${id}/complete`);
  return data;
};

export const deactivateRoutine = async (id: string): Promise<StudentMesocycle> => {
  const { data } = await api.post(`${STUDENT_BASE_URL}/${id}/deactivate`);
  return data;
};

export const deleteStudentRoutine = async (id: string): Promise<void> => {
  await api.delete(`${STUDENT_BASE_URL}/${id}`);
};

/**
 * Obtener un día específico con todos sus ejercicios y sets (para coach)
 */
export const getStudentDay = async (dayId: string): Promise<StudentDay> => {
  const { data } = await api.get(`${STUDENT_BASE_URL}/days/${dayId}`);
  return data;
};

/**
 * Obtener un día específico (para estudiante)
 */
export const getMyDay = async (dayId: string): Promise<StudentDay> => {
  const { data } = await api.get(`${MY_ROUTINE_URL}/days/${dayId}`);
  return data;
};

// ========== EDICIÓN DE RUTINAS DEL ALUMNO (COACH) ==========

export const addStudentExercise = async (dayId: string, dto: AddExerciseDto): Promise<StudentExercise> => {
  const { data } = await api.post(`${STUDENT_BASE_URL}/days/${dayId}/exercises`, dto);
  return data;
};

export const updateStudentExercise = async (exerciseId: string, dto: Partial<AddExerciseDto>): Promise<StudentExercise> => {
  const { data } = await api.patch(`${STUDENT_BASE_URL}/exercises/${exerciseId}`, dto);
  return data;
};

export const deleteStudentExercise = async (exerciseId: string): Promise<void> => {
  await api.delete(`${STUDENT_BASE_URL}/exercises/${exerciseId}`);
};

export const addStudentSet = async (exerciseId: string, dto: AddSetDto): Promise<StudentSet> => {
  const { data } = await api.post(`${STUDENT_BASE_URL}/exercises/${exerciseId}/sets`, dto);
  return data;
};

/**
 * Agregar un set extra (usado por el coach)
 */
export const addExtraStudentSet = async (exerciseId: string, dto: AddSetDto): Promise<StudentSet> => {
  const { data } = await api.post(`${STUDENT_BASE_URL}/exercises/${exerciseId}/sets/extra`, dto);
  return data;
};

/**
 * Agregar un set extra (usado por el estudiante)
 */
export const addMyExtraSet = async (exerciseId: string, dto: AddSetDto): Promise<StudentSet> => {
  const { data } = await api.post(`${MY_ROUTINE_URL}/exercises/${exerciseId}/sets/extra`, dto);
  return data;
};

export const updateStudentSet = async (setId: string, dto: Partial<AddSetDto>): Promise<StudentSet> => {
  const { data } = await api.patch(`${STUDENT_BASE_URL}/sets/${setId}`, dto);
  return data;
};

/**
 * Registrar valores reales de una serie (usado por el coach para editar)
 */
export const logStudentSet = async (setId: string, dto: {
  actualReps?: string;
  actualLoad?: number;
  actualRir?: number;
  actualRpe?: number;
  notes?: string;
  completedAt?: string;
  dropSetData?: { reps?: string; load?: number }[];
}): Promise<StudentSet> => {
  const { data } = await api.patch(`${STUDENT_BASE_URL}/sets/${setId}/log`, dto);
  return data;
};

/**
 * Registrar valores reales de una serie (usado por el estudiante)
 */
export const logMySet = async (setId: string, dto: {
  actualReps?: string;
  actualLoad?: number;
  actualRir?: number;
  actualRpe?: number;
  notes?: string;
  completedAt?: string;
  dropSetData?: { reps?: string; load?: number }[];
}): Promise<StudentSet> => {
  const { data } = await api.patch(`${MY_ROUTINE_URL}/sets/${setId}/log`, dto);
  return data;
};

export const deleteStudentSet = async (setId: string): Promise<void> => {
  await api.delete(`${STUDENT_BASE_URL}/sets/${setId}`);
};

export const reorderStudentExercise = async (exerciseId: string, direction: 'up' | 'down'): Promise<void> => {
  await api.post(`${STUDENT_BASE_URL}/exercises/${exerciseId}/reorder`, { direction });
};

export const reorderStudentExercises = async (dayId: string, exercises: { id: string; order: number }[]): Promise<void> => {
  await api.post(`${STUDENT_BASE_URL}/days/${dayId}/exercises/reorder`, { exercises });
};

export const replicateStudentMicrocycle = async (microcycleId: string): Promise<{ replicatedCount: number }> => {
  const { data } = await api.post(`${STUDENT_BASE_URL}/microcycles/${microcycleId}/replicate`);
  return data;
};

// ========== AGREGAR/ELIMINAR MICROCICLOS Y DÍAS ==========

export const addStudentMicrocycle = async (
  mesocycleId: string, 
  dto: { name?: string; isDeload?: boolean }
): Promise<any> => {
  const { data } = await api.post(`${STUDENT_BASE_URL}/${mesocycleId}/microcycles`, dto);
  return data;
};

export const updateStudentMicrocycle = async (
  microcycleId: string,
  dto: { name?: string; isDeload?: boolean; objective?: string }
): Promise<any> => {
  const { data } = await api.patch(`${STUDENT_BASE_URL}/microcycles/${microcycleId}`, dto);
  return data;
};

export const deleteStudentMicrocycle = async (microcycleId: string): Promise<void> => {
  await api.delete(`${STUDENT_BASE_URL}/microcycles/${microcycleId}`);
};

export const addStudentDay = async (
  microcycleId: string, 
  dto: { name?: string; isRestDay?: boolean }
): Promise<any> => {
  const { data } = await api.post(`${STUDENT_BASE_URL}/microcycles/${microcycleId}/days`, dto);
  return data;
};

export const deleteStudentDay = async (dayId: string): Promise<void> => {
  await api.delete(`${STUDENT_BASE_URL}/days/${dayId}`);
};

// ========== LOG DE WORKOUT ==========

export const logSet = async (setId: string, dto: LogSetDto): Promise<StudentSet> => {
  const { data } = await api.post(`${STUDENT_BASE_URL}/sets/${setId}/log`, dto);
  return data;
};

export const completeDay = async (dayId: string): Promise<void> => {
  await api.post(`${STUDENT_BASE_URL}/days/${dayId}/complete`);
};

// ========== HISTORIAL DE ENTRENAMIENTOS V2 ==========

export interface V2WorkoutHistoryItem {
  id: string;
  dayNumber: number;
  dayName: string;
  completedAt: string | null;
  isCompleted: boolean;
  mesocycleName: string;
  mesocycleId: string;
  microcycleName: string;
  microcycleOrder: number;
  totalExercises: number;
  completedSets: number;
  totalSets: number;
  exercises: {
    id: string;
    name: string;
    muscleGroup?: string;
    totalSets: number;
    completedSets: number;
  }[];
}

/**
 * Obtener historial de entrenamientos V2 del estudiante logueado
 */
export const getMyWorkoutHistory = async (): Promise<V2WorkoutHistoryItem[]> => {
  const { data } = await api.get(`${MY_ROUTINE_URL}/history`);
  return data;
};

/**
 * Obtener historial de entrenamientos V2 de un alumno (para coach)
 */
export const getStudentWorkoutHistory = async (studentId: number): Promise<V2WorkoutHistoryItem[]> => {
  const { data } = await api.get(`${STUDENT_BASE_URL}/student/${studentId}/history`);
  return data;
};

