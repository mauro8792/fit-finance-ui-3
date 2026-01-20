import { useState, useCallback, useEffect } from 'react';
import * as routineV2Api from '@/lib/api/routine-v2';
import type {
  MesocycleTemplate,
  StudentMesocycle,
  CreateTemplateDto,
  UpdateTemplateDto,
  AddMicrocycleDto,
  AddDayDto,
  AddExerciseDto,
  AddSetDto,
  AssignTemplateDto,
  AssignedStudent,
  AssignedCounts,
} from '@/types/routine-v2';

// ========== TEMPLATES HOOK ==========

interface UseTemplatesState {
  templates: MesocycleTemplate[];
  loading: boolean;
  error: string | null;
}

export function useTemplates() {
  const [state, setState] = useState<UseTemplatesState>({
    templates: [],
    loading: true,
    error: null,
  });

  const [assignedCounts, setAssignedCounts] = useState<AssignedCounts>({});

  const fetchTemplates = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [templates, counts] = await Promise.all([
        routineV2Api.getTemplates(),
        routineV2Api.getAssignedCounts(),
      ]);
      
      // Agregar conteo de asignados a cada template
      const templatesWithCounts = templates.map((t) => ({
        ...t,
        assignedCount: counts[t.id] || 0,
      }));
      
      setState({ templates: templatesWithCounts, loading: false, error: null });
      setAssignedCounts(counts);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar plantillas';
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, []);

  const createTemplate = useCallback(async (dto: CreateTemplateDto) => {
    const template = await routineV2Api.createTemplate(dto);
    setState((prev) => ({
      ...prev,
      templates: [...prev.templates, { ...template, assignedCount: 0 }],
    }));
    return template;
  }, []);

  const updateTemplate = useCallback(async (id: string, dto: UpdateTemplateDto) => {
    const updated = await routineV2Api.updateTemplate(id, dto);
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) => (t.id === id ? { ...updated, assignedCount: t.assignedCount } : t)),
    }));
    return updated;
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    await routineV2Api.deleteTemplate(id);
    setState((prev) => ({
      ...prev,
      templates: prev.templates.filter((t) => t.id !== id),
    }));
  }, []);

  const publishTemplate = useCallback(async (id: string) => {
    const published = await routineV2Api.publishTemplate(id);
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === id ? { ...published, assignedCount: t.assignedCount } : t
      ),
    }));
    return published;
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    ...state,
    assignedCounts,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    publishTemplate,
  };
}

// ========== SINGLE TEMPLATE HOOK ==========

interface UseTemplateState {
  template: MesocycleTemplate | null;
  loading: boolean;
  error: string | null;
}

export function useTemplate(id: string | null) {
  const [state, setState] = useState<UseTemplateState>({
    template: null,
    loading: !!id,
    error: null,
  });

  const fetchTemplate = useCallback(async () => {
    if (!id) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const template = await routineV2Api.getTemplate(id);
      setState({ template, loading: false, error: null });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar plantilla';
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, [id]);

  const refetch = useCallback(() => fetchTemplate(), [fetchTemplate]);

  // Microcycle operations
  const addMicrocycle = useCallback(
    async (dto: AddMicrocycleDto) => {
      if (!id) throw new Error('No template ID');
      const micro = await routineV2Api.addMicrocycle(id, dto);
      await refetch();
      return micro;
    },
    [id, refetch]
  );

  const updateMicrocycle = useCallback(
    async (microcycleId: string, dto: AddMicrocycleDto) => {
      await routineV2Api.updateMicrocycle(microcycleId, dto);
      await refetch();
    },
    [refetch]
  );

  const deleteMicrocycle = useCallback(
    async (microcycleId: string) => {
      await routineV2Api.deleteMicrocycle(microcycleId);
      await refetch();
    },
    [refetch]
  );

  // Day operations
  const addDay = useCallback(
    async (microcycleId: string, dto: AddDayDto) => {
      const day = await routineV2Api.addDay(microcycleId, dto);
      await refetch();
      return day;
    },
    [refetch]
  );

  const updateDay = useCallback(
    async (dayId: string, dto: AddDayDto) => {
      await routineV2Api.updateDay(dayId, dto);
      await refetch();
    },
    [refetch]
  );

  const deleteDay = useCallback(
    async (dayId: string) => {
      await routineV2Api.deleteDay(dayId);
      await refetch();
    },
    [refetch]
  );

  // Exercise operations
  const addExercise = useCallback(
    async (dayId: string, dto: AddExerciseDto) => {
      const exercise = await routineV2Api.addExercise(dayId, dto);
      await refetch();
      return exercise;
    },
    [refetch]
  );

  const updateExercise = useCallback(
    async (exerciseId: string, dto: Partial<AddExerciseDto>) => {
      await routineV2Api.updateExercise(exerciseId, dto);
      await refetch();
    },
    [refetch]
  );

  const deleteExercise = useCallback(
    async (exerciseId: string) => {
      await routineV2Api.deleteExercise(exerciseId);
      await refetch();
    },
    [refetch]
  );

  // Set operations
  const addSet = useCallback(
    async (exerciseId: string, dto: AddSetDto) => {
      const set = await routineV2Api.addSet(exerciseId, dto);
      await refetch();
      return set;
    },
    [refetch]
  );

  const addMultipleSets = useCallback(
    async (exerciseId: string, count: number, dto: AddSetDto) => {
      const sets = await routineV2Api.addMultipleSets(exerciseId, count, dto);
      await refetch();
      return sets;
    },
    [refetch]
  );

  const updateSet = useCallback(
    async (setId: string, dto: Partial<AddSetDto>) => {
      await routineV2Api.updateSet(setId, dto);
      await refetch();
    },
    [refetch]
  );

  const deleteSet = useCallback(
    async (setId: string) => {
      await routineV2Api.deleteSet(setId);
      await refetch();
    },
    [refetch]
  );

  useEffect(() => {
    if (id) fetchTemplate();
  }, [id, fetchTemplate]);

  return {
    ...state,
    refetch,
    addMicrocycle,
    updateMicrocycle,
    deleteMicrocycle,
    addDay,
    updateDay,
    deleteDay,
    addExercise,
    updateExercise,
    deleteExercise,
    addSet,
    addMultipleSets,
    updateSet,
    deleteSet,
  };
}

// ========== ASSIGNED STUDENTS HOOK ==========

interface UseAssignedStudentsState {
  students: AssignedStudent[];
  loading: boolean;
  error: string | null;
}

export function useAssignedStudents(templateId: string | null) {
  const [state, setState] = useState<UseAssignedStudentsState>({
    students: [],
    loading: !!templateId,
    error: null,
  });

  const fetchStudents = useCallback(async () => {
    if (!templateId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const students = await routineV2Api.getAssignedStudents(templateId);
      setState({ students, loading: false, error: null });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar alumnos';
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, [templateId]);

  useEffect(() => {
    if (templateId) fetchStudents();
  }, [templateId, fetchStudents]);

  return { ...state, refetch: fetchStudents };
}

// ========== STUDENT ROUTINE HOOK ==========

interface UseStudentRoutineState {
  routine: StudentMesocycle | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

export function useStudentRoutine(routineId: string | null) {
  const [state, setState] = useState<UseStudentRoutineState>({
    routine: null,
    loading: !!routineId,
    refreshing: false,
    error: null,
  });

  const fetchRoutine = useCallback(async (silent = false) => {
    if (!routineId) return;
    
    setState((prev) => {
      // Si es silent y ya hay datos, solo marcamos refreshing (sin spinner)
      if (silent && prev.routine) {
        return { ...prev, refreshing: true, error: null };
      }
      return { ...prev, loading: true, error: null };
    });
    
    try {
      const routine = await routineV2Api.getStudentRoutine(routineId);
      setState({ routine, loading: false, refreshing: false, error: null });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar rutina';
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: errorMessage }));
    }
  }, [routineId]);

  // refetch silencioso - no muestra spinner si ya hay datos
  const refetch = useCallback(() => fetchRoutine(true), [fetchRoutine]);

  const logSet = useCallback(
    async (setId: string, dto: { actualReps: number; actualLoad?: number; actualRir?: number; notes?: string }) => {
      await routineV2Api.logSet(setId, dto);
      await refetch();
    },
    [refetch]
  );

  const completeDay = useCallback(
    async (dayId: string) => {
      await routineV2Api.completeDay(dayId);
      await refetch();
    },
    [refetch]
  );

  useEffect(() => {
    if (routineId) fetchRoutine();
  }, [routineId, fetchRoutine]);

  return { ...state, refetch, logSet, completeDay, fetchRoutine };
}

// ========== ACTIVE ROUTINE HOOK ==========

export function useActiveRoutine(studentId: number | null) {
  const [state, setState] = useState<UseStudentRoutineState>({
    routine: null,
    loading: !!studentId,
    refreshing: false,
    error: null,
  });

  const fetchActiveRoutine = useCallback(async () => {
    if (!studentId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const routine = await routineV2Api.getActiveRoutine(studentId);
      setState({ routine, loading: false, refreshing: false, error: null });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar rutina activa';
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: errorMessage }));
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) fetchActiveRoutine();
  }, [studentId, fetchActiveRoutine]);

  return { ...state, refetch: fetchActiveRoutine };
}

// ========== ASSIGN TEMPLATE ==========

export function useAssignTemplate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignTemplate = useCallback(async (dto: AssignTemplateDto) => {
    setLoading(true);
    setError(null);
    try {
      const result = await routineV2Api.assignTemplate(dto);
      setLoading(false);
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al asignar plantilla';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, []);

  return { assignTemplate, loading, error };
}

