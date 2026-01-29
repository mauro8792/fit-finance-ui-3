// ========== ROUTINE V2 TYPES ==========

// Estados
export type TemplateStatus = 'draft' | 'published';
export type StudentMesocycleStatus = 'scheduled' | 'active' | 'completed';

// ========== PLANTILLA (Template) ==========

export interface MesocycleTemplate {
  id: string;
  name: string;
  description?: string;
  objective?: string;
  estimatedWeeks: number;
  targetDaysPerWeek: number;
  tags: string[];
  status: TemplateStatus;
  isPublished: boolean;
  coachId: number;
  microcycles: TemplateMicrocycle[];
  createdAt: string;
  updatedAt: string;
  assignedCount?: number; // Cantidad de alumnos asignados (frontend)
}

export interface TemplateMicrocycle {
  id: string;
  order: number;
  name: string;
  isDeload: boolean;
  replicatedFrom?: string;
  templateId: string;
  days: TemplateDay[];
}

export interface TemplateDay {
  id: string;
  order?: number;
  dayNumber: number;
  name: string;
  isRestDay: boolean;
  notes?: string;
  microcycleId: string;
  exercises: TemplateExercise[];
}

export interface TemplateExercise {
  id: string;
  order: number;
  exerciseCatalogId: number;
  exerciseCatalog?: {
    id: number;
    name: string;
    description?: string;
    muscleGroup: string;
    equipment?: string;
    videoUrl?: string;
    imageUrl?: string;
  };
  defaultReps?: string;
  defaultRestSeconds?: number;
  defaultRir?: number;
  defaultRpe?: number;
  superset?: string;
  notes?: string;
  dayId: string;
  sets: TemplateSet[];
  
  // ========== SUPERSERIE FUSIONADA ==========
  linkedExerciseId?: string;     // ID del ejercicio con el que se combina
  isFirstInSuperset?: boolean;   // Si es el primero de la superserie (para mostrar fusionado al alumno)
  linkWithNext?: boolean;        // Si se combina con el siguiente ejercicio
}

// Tipo de técnica de alta intensidad
export type SetTechnique = 'normal' | 'amrap' | 'dropset' | 'restpause' | 'myoreps' | 'isohold';

export interface TemplateSet {
  id: string;
  order: number;
  targetReps: string;
  targetLoad?: number;
  targetRir?: number;
  targetRpe?: number;
  isWarmup: boolean;
  isDropSet: boolean;
  isAmrap: boolean;
  dropSetCount?: number;
  amrapInstruction?: string;
  restSeconds?: number;
  technique?: string;
  exerciseId: string;
  
  // ========== TÉCNICAS DE ALTA INTENSIDAD ==========
  setTechnique?: SetTechnique;
  
  // Drop Set - kg sugeridos por cada drop
  dropSetTargets?: { targetLoad?: number; targetReps?: string }[];
  
  // Rest-Pause
  isRestPause?: boolean;
  restPauseSets?: number;      // Cantidad de mini-sets (ej: 3)
  restPauseRest?: string;      // Descanso entre sets (ej: "10-15")
  
  // Myo Reps
  isMyoReps?: boolean;
  myoActivationReps?: string;  // Reps de activación (ej: "12-15")
  myoMiniSets?: number;        // Cantidad mini-sets (ej: 4)
  myoMiniReps?: string;        // Reps por mini-set (ej: "3-5")
  
  // Isohold
  isIsohold?: boolean;
  isoholdSeconds?: string;     // Segundos (ej: "30")
  isoholdPosition?: string;    // Posición (ej: "abajo", "arriba", "medio")
}

// ========== RUTINA DEL ALUMNO ==========

export interface StudentMesocycle {
  id: string;
  studentId: number;
  sourceTemplateId?: string;
  macrocycleId?: number;
  name: string;
  description?: string;
  objective?: string;
  status: StudentMesocycleStatus;
  startDate?: string;
  endDate?: string;
  microcycles: StudentMicrocycle[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentMicrocycle {
  id: string;
  order: number;
  name: string;
  weekNumber: number;
  isDeload: boolean;
  mesocycleId: string;
  days: StudentDay[];
}

export interface StudentDay {
  id: string;
  order: number;
  dayNumber: number;
  name: string;
  isRestDay: boolean;
  notes?: string;
  scheduledDate?: string;
  startedAt?: string; // Cuando se empezó el entrenamiento (primer set)
  isCompleted: boolean;
  completedAt?: string;
  microcycleId: string;
  exercises: StudentExercise[];
  
  // ========== PERCEPCIÓN DEL ALUMNO ==========
  readinessPre?: number;      // PRS - Readiness pre-entrenamiento (1-10)
  postWorkoutEffort?: number; // Esfuerzo post-entrenamiento (1-10)
}

export interface StudentExercise {
  id: string;
  order: number;
  exerciseCatalogId: number;
  exerciseCatalog?: {
    id: number;
    name: string;
    description?: string;
    muscleGroup: string;
    equipment?: string;
    videoUrl?: string;
    imageUrl?: string;
  };
  targetReps: string;
  restSeconds: number;
  targetRir?: number;
  targetRpe?: number;
  coachNotes?: string;
  superset?: string;
  notes?: string;
  isCompleted: boolean;
  dayId: string;
  sets: StudentSet[];
  
  // ========== SUPERSERIE FUSIONADA ==========
  linkedExerciseId?: string;     // ID del ejercicio con el que se combina
  isFirstInSuperset?: boolean;   // Si es el primero de la superserie
  linkWithNext?: boolean;        // Si se combina con el siguiente ejercicio
}

export interface StudentSet {
  id: string;
  order: number;
  targetReps: string;
  targetLoad?: number;
  targetRir?: number;
  targetRpe?: number;
  isWarmup?: boolean;
  isDropSet: boolean;
  dropSetCount?: number;
  dropSetData?: { reps?: string; load?: number }[]; // Datos de cada drop (alumno completa)
  dropSetTargets?: { targetLoad?: number; targetReps?: string }[]; // Kg sugeridos por el coach
  isAmrap: boolean;
  isExtra?: boolean;
  amrapInstruction?: string;
  restSeconds?: number;
  technique?: string;
  actualReps?: string;
  actualLoad?: number;
  actualRir?: number;
  actualRpe?: number;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
  exerciseId: string;
  
  // ========== TÉCNICAS DE ALTA INTENSIDAD ==========
  setTechnique?: SetTechnique;
  
  // Rest-Pause
  isRestPause?: boolean;
  restPauseSets?: number;
  restPauseRest?: string;
  restPauseData?: { actualReps?: string }[]; // Datos del alumno para cada mini-set
  
  // Myo Reps
  isMyoReps?: boolean;
  myoActivationReps?: string;
  myoMiniSets?: number;
  myoMiniReps?: string;
  myoMiniSetsData?: { actualReps?: string }[]; // Datos del alumno para cada mini-set
  
  // Isohold
  isIsohold?: boolean;
  isoholdSeconds?: string;
  isoholdPosition?: string;
  isoholdCompleted?: boolean; // Si completó el isohold
}

// ========== DTOs ==========

export interface CreateTemplateDto {
  name: string;
  description?: string;
  objective?: string;
  estimatedWeeks?: number;
  targetDaysPerWeek?: number;
  tags?: string[];
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  objective?: string;
  estimatedWeeks?: number;
  targetDaysPerWeek?: number;
  tags?: string[];
}

export interface AddMicrocycleDto {
  name: string;
  weekNumber?: number;
  isDeload?: boolean;
  copyFromId?: string;
}

export interface AddDayDto {
  name: string;
  isRestDay?: boolean;
  notes?: string;
}

export interface AddExerciseDto {
  exerciseCatalogId: number;
  superset?: string;
  notes?: string;
  defaultReps?: string;
  defaultRestSeconds?: number;
  defaultRir?: number;
  defaultRpe?: number;
  coachNotes?: string;
  
  // ========== SUPERSERIE FUSIONADA ==========
  linkedExerciseId?: string;
  linkWithNext?: boolean;
}

export interface AddSetDto {
  order?: number;
  targetReps: string;
  targetLoad?: number;
  targetRir?: number | string;
  targetRpe?: number;
  isWarmup?: boolean;
  isDropSet?: boolean;
  isAmrap?: boolean;
  isExtra?: boolean;
  amrapInstruction?: string;
  restSeconds?: number;
  technique?: string;
  dropSetCount?: number;
  
  // ========== TÉCNICAS DE ALTA INTENSIDAD ==========
  setTechnique?: SetTechnique;
  
  // Drop Set - kg sugeridos por cada drop
  dropSetTargets?: { targetLoad?: number; targetReps?: string }[];
  
  // Rest-Pause
  isRestPause?: boolean;
  restPauseSets?: number;
  restPauseRest?: string;
  
  // Myo Reps
  isMyoReps?: boolean;
  myoActivationReps?: string;
  myoMiniSets?: number;
  myoMiniReps?: string;
  
  // Isohold
  isIsohold?: boolean;
  isoholdSeconds?: string;
  isoholdPosition?: string;
}

export interface AssignTemplateDto {
  templateId: string;
  studentId: number;
  macrocycleId?: number;
  createNewMacrocycle?: boolean;
  macrocycleName?: string;
  customName?: string;
  startDate?: string;
  autoCreateMicrocycles?: boolean;
}

export interface LogSetDto {
  actualReps: number;
  actualLoad?: number;
  actualRir?: number;
  notes?: string;
}

// ========== RESPONSE TYPES ==========

export interface AssignedStudent {
  id: string;
  studentId: number;
  studentName: string;
  status: StudentMesocycleStatus;
  assignedAt: string;
  progress: number;
}

export interface AssignedCounts {
  [templateId: string]: number;
}

