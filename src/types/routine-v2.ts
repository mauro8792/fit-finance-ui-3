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
}

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
  dropSetData?: { reps?: string; load?: number }[]; // Datos de cada drop
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

