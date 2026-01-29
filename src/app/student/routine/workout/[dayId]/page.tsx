"use client";

import { PageHeader } from "@/components/navigation/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { getDayById, updateSet } from "@/lib/api/routine";
import * as routineV2Api from "@/lib/api/routine-v2";
import { cn, formatDate, formatDateWithWeekday } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useRoutineStore } from "@/stores/routine-store";
import type { Day, Exercise, Set } from "@/types";
import type { StudentDay, StudentExercise, StudentSet } from "@/types/routine-v2";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import {
    ArrowDownToLine,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Flame,
    GripVertical,
    History,
    Info,
    Lock,
    MoreVertical,
    Pause,
    Play,
    Plus,
    Repeat,
    RotateCcw,
    Timer,
    Trophy,
    Video,
    X,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// DnD Kit imports
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Exercise Card Component
function SortableExerciseCard({
  exercise,
  children,
}: {
  exercise: Exercise;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Pass listeners to children via context or props */}
      <div data-drag-listeners={JSON.stringify(listeners)}>
        {children}
      </div>
    </div>
  );
}

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { student } = useAuthStore();
  const { activeMeso, routineV2, isV2, invalidateCache } = useRoutineStore();
  const dayIdParam = params.dayId as string;
  
  // Detectar si es UUID (V2) o número (V1)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dayIdParam);
  const dayId = isUUID ? dayIdParam : Number(dayIdParam);
  
  const microIndex = searchParams.get("micro") || "0";
  const backHref = `/student/routine?micro=${microIndex}`;
  const studentId = student?.id;

  // Solo puede editar si el mesociclo está activo
  // Para V2 (UUID): si llegó hasta acá, la rutina está activa (el backend valida esto)
  // Solo mostramos read-only si explícitamente tenemos routineV2 con status != active
  const isReadOnly = isUUID 
    ? (routineV2?.status && routineV2.status !== "active")
    : activeMeso?.status !== "active";
  const readOnlyMessage = isUUID
    ? (routineV2?.status === "scheduled" 
        ? "Esta rutina está programada. Tu coach debe activarla para que puedas completar las series."
        : "Esta rutina no está activa.")
    : (activeMeso?.status === "published" 
        ? "Esta rutina está en modo preview. Tu coach debe activarla para que puedas completar las series."
        : "Esta rutina no está activa.");

  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<Day | null>(null);
  const [dayV2, setDayV2] = useState<StudentDay | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesV2, setExercisesV2] = useState<StudentExercise[]>([]);
  
  // Edit modal state
  const [editingSet, setEditingSet] = useState<{
    set: Set;
    exercise: Exercise;
    load: string;
    reps: string;
    actualRir: string;
    actualRpe: string;
    notes: string;
  } | null>(null);

  // Timer state - usando timestamp para que funcione en background
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [timerEndTime, setTimerEndTime] = useState<number | null>(null); // timestamp de cuando termina

  // Video state
  const [showVideo, setShowVideo] = useState<string | null>(null);

  // Context menu state
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [menuOpenV2, setMenuOpenV2] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuRefV2 = useRef<HTMLDivElement>(null);

  // History modal state
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);
  const [historyExerciseV2, setHistoryExerciseV2] = useState<StudentExercise | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Edit set V2 modal state
  const [editingSetV2, setEditingSetV2] = useState<{
    set: StudentSet;
    exercise: StudentExercise;
    actualReps: string;
    actualLoad: string;
    actualRir: string;
    actualRpe: string;
    notes: string;
  } | null>(null);
  
  // Estado para prevenir doble clic al guardar serie
  const [isSavingSet, setIsSavingSet] = useState(false);

  // Video V2 state
  const [showVideoV2, setShowVideoV2] = useState<string | null>(null);

  // Swipeable cards state - track which exercises are showing register view
  const [showingRegister, setShowingRegister] = useState<Record<string, boolean>>({});

  const toggleExerciseView = (exerciseId: string) => {
    setShowingRegister(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  // Edit drop set state
  const [editingDrop, setEditingDrop] = useState<{
    set: StudentSet;
    exercise: StudentExercise;
    dropIndex: number;
    reps: string;
    load: string;
  } | null>(null);

  // Edit Rest-Pause mini-set state
  const [editingRestPause, setEditingRestPause] = useState<{
    set: StudentSet;
    exercise: StudentExercise;
    miniSetIndex: number;
    reps: string;
  } | null>(null);

  // Edit Myo Reps mini-set state
  const [editingMyoReps, setEditingMyoReps] = useState<{
    set: StudentSet;
    exercise: StudentExercise;
    miniSetIndex: number;
    reps: string;
  } | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadDay = async () => {
      try {
        setLoading(true);
        
        if (isUUID) {
          // V2: Cargar siempre desde la API para tener datos frescos
          // Usar endpoint de estudiante (/v2/my-routines)
          const freshDay = await routineV2Api.getMyDay(dayIdParam);
          setDayV2(freshDay);
          const sortedExercises = freshDay.exercises?.slice().sort((a, b) => a.order - b.order) || [];
          setExercisesV2(sortedExercises);
        } else {
          // V1: Cargar desde API antigua
          const data = await getDayById(dayId as number);
          setDay(data);
          setExercises(data.exercises?.sort((a: Exercise, b: Exercise) => a.orden - b.orden) || []);
        }
      } catch (error) {
        console.error("Error loading day:", error);
        toast.error("Error al cargar el entrenamiento");
      } finally {
        setLoading(false);
      }
    };

    if (dayId) loadDay();
  }, [dayId, dayIdParam, isUUID]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
      if (menuRefV2.current && !menuRefV2.current.contains(e.target as Node)) {
        setMenuOpenV2(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Timer countdown - usa timestamps para funcionar correctamente en background
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerRunning && timerEndTime) {
      // Calcular tiempo restante basado en timestamp real
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
        setTimerSeconds(remaining);
        
        if (remaining <= 0) {
          setTimerRunning(false);
          setTimerEndTime(null);
          localStorage.removeItem('restTimerEndTime');
          toast.success("¡Descanso terminado! 💪");
        }
      };
      
      // Actualizar inmediatamente y luego cada segundo
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    
    return () => clearInterval(interval);
  }, [timerRunning, timerEndTime]);

  // Recuperar timer cuando el usuario vuelve de otra app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerEndTime) {
        const remaining = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
        setTimerSeconds(remaining);
        
        if (remaining <= 0) {
          setTimerRunning(false);
          setTimerEndTime(null);
          localStorage.removeItem('restTimerEndTime');
          toast.success("¡Descanso terminado! 💪");
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerEndTime]);

  // Restaurar timer desde localStorage al cargar la página
  useEffect(() => {
    const savedEndTime = localStorage.getItem('restTimerEndTime');
    if (savedEndTime) {
      const endTime = parseInt(savedEndTime, 10);
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      
      if (remaining > 0) {
        setTimerEndTime(endTime);
        setTimerSeconds(remaining);
        setShowTimer(true);
        setTimerRunning(true);
      } else {
        localStorage.removeItem('restTimerEndTime');
      }
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRestTimer = (restSeconds = 120) => {
    const endTime = Date.now() + (restSeconds * 1000);
    setTimerEndTime(endTime);
    setTimerSeconds(restSeconds);
    setShowTimer(true);
    setTimerRunning(true);
    // Guardar en localStorage para que sobreviva a recargas
    localStorage.setItem('restTimerEndTime', endTime.toString());
  };

  const stopTimer = () => {
    setShowTimer(false);
    setTimerRunning(false);
    setTimerEndTime(null);
    localStorage.removeItem('restTimerEndTime');
  };

  const resetTimer = (seconds = 120) => {
    const endTime = Date.now() + (seconds * 1000);
    setTimerEndTime(endTime);
    setTimerSeconds(seconds);
    localStorage.setItem('restTimerEndTime', endTime.toString());
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = exercises.findIndex((ex) => ex.id === active.id);
      const newIndex = exercises.findIndex((ex) => ex.id === over.id);

      const newOrder = arrayMove(exercises, oldIndex, newIndex);
      setExercises(newOrder);

      // Update order in backend silently
      try {
        await api.patch(`/exercise/reorder`, {
          exercises: newOrder.map((ex, index) => ({
            id: ex.id,
            orden: index + 1,
          })),
        });
      } catch (error) {
        console.error("Error updating order:", error);
        // Revert on error
        setExercises(exercises);
      }
    }
  };

  // Open edit modal
  const handleCellClick = (set: Set, exercise: Exercise) => {
    // No permitir editar si es solo lectura
    if (isReadOnly) {
      toast.info(readOnlyMessage);
      return;
    }
    
    setEditingSet({
      set,
      exercise,
      load: set.load?.toString() || "",
      reps: set.reps?.toString() || "",
      actualRir: set.actualRir?.toString() || "",
      actualRpe: set.actualRpe?.toString() || "",
      notes: set.notes || "",
    });
  };

  // Save set
  const handleSaveSet = async (status: "completed" | "failed" | "skipped" = "completed") => {
    if (!editingSet) return;

    try {
      const payload = {
        load: parseFloat(editingSet.load) || 0,
        reps: editingSet.reps || null,
        actualRir: editingSet.actualRir ? parseInt(editingSet.actualRir) : null,
        actualRpe: editingSet.actualRpe ? parseInt(editingSet.actualRpe) : null,
        notes: editingSet.notes || null,
        status,
      };

      await updateSet(editingSet.set.id, payload as any);

      // Update local state
      setExercises((prev): any =>
        prev.map((ex) => {
          if (ex.id !== editingSet.exercise.id) return ex;
          return {
            ...ex,
            sets: ex.sets?.map((s) =>
              s.id === editingSet.set.id ? { ...s, ...payload } : s
            ),
          };
        })
      );

      setEditingSet(null);

      if (status === "completed") {
        toast.success("¡Serie guardada! 🎉");
        const restSeconds = parseInt(editingSet.exercise.descanso || "2") * 60 || 120;
        startRestTimer(restSeconds);
      }
    } catch (error) {
      console.error("Error saving set:", error);
      toast.error("Error al guardar");
    }
  };

  // View history
  const handleViewHistory = async (exercise: Exercise) => {
    setMenuOpen(null);
    setHistoryExercise(exercise);
    setLoadingHistory(true);
    
    try {
      if (!studentId || !exercise.exerciseCatalogId) {
        setHistoryData([]);
        return;
      }
      const { data } = await api.get(`/macrocycle/exercise-history/${studentId}/${exercise.exerciseCatalogId}`);
      // API puede devolver { value: [...] } o array directamente
      setHistoryData(data?.value || data || []);
    } catch (error) {
      console.error("Error loading history:", error);
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Add extra set
  const handleAddExtraSet = async (exercise: Exercise) => {
    setMenuOpen(null);
    
    try {
      const existingSets = exercise.sets || [];
      const extraCount = existingSets.filter((s) => s.isExtra).length;
      
      if (extraCount >= 5) {
        toast.error("Máximo 5 sets extra por ejercicio");
        return;
      }

      const { data: newSet } = await api.post(`/set/${exercise.id}`, {
        reps: exercise.repeticiones || "8-10",
        expectedRir: exercise.rirEsperado || "2",
        isExtra: true,
        order: existingSets.length + 1,
        load: 0,
        status: "pending",
      });

      // Update local state
      setExercises((prev) =>
        prev.map((ex) => {
          if (ex.id !== exercise.id) return ex;
          return {
            ...ex,
            sets: [...(ex.sets || []), newSet],
          };
        })
      );

      toast.success("Set extra agregado");
      handleCellClick(newSet, exercise);
    } catch (error) {
      console.error("Error adding extra set:", error);
      toast.error("Error al agregar set extra");
    }
  };

  // View technique video
  const handleViewTechnique = (exercise: Exercise) => {
    setMenuOpen(null);
    const videoUrl = exercise.exerciseCatalog?.videoUrl;
    if (videoUrl) {
      setShowVideo(videoUrl);
    } else {
      toast.info("No hay video disponible para este ejercicio");
    }
  };

  // ==================== V2 HANDLERS ====================

  // Open edit modal V2
  const handleCellClickV2 = (set: StudentSet, exercise: StudentExercise) => {
    if (isReadOnly) {
      toast.info(readOnlyMessage);
      return;
    }
    
    setEditingSetV2({
      set,
      exercise,
      actualReps: set.actualReps || "",
      actualLoad: set.actualLoad?.toString() || "",
      actualRir: set.actualRir?.toString() || "",
      actualRpe: set.actualRpe?.toString() || "",
      notes: set.notes || "",
    });
  };

  // Save set V2
  const handleSaveSetV2 = async (status: "completed" | "failed" | "skipped" = "completed") => {
    // Protección contra doble clic
    if (!editingSetV2 || isSavingSet) return;

    setIsSavingSet(true);
    
    try {
      const payload = {
        actualReps: editingSetV2.actualReps || undefined,
        actualLoad: editingSetV2.actualLoad ? parseFloat(editingSetV2.actualLoad) : undefined,
        actualRir: editingSetV2.actualRir ? parseInt(editingSetV2.actualRir) : undefined,
        actualRpe: editingSetV2.actualRpe ? parseInt(editingSetV2.actualRpe) : undefined,
        notes: editingSetV2.notes || undefined,
        completedAt: status === "completed" ? new Date().toISOString() : undefined,
      };

      // Usar endpoint de estudiante (/v2/my-routines)
      await routineV2Api.logMySet(editingSetV2.set.id, payload);

      // Update local state
      setExercisesV2((prev) =>
        prev.map((ex) => {
          if (ex.id !== editingSetV2.exercise.id) return ex;
          return {
            ...ex,
            sets: ex.sets?.map((s) =>
              s.id === editingSetV2.set.id ? { ...s, ...payload } : s
            ),
          };
        })
      );

      setEditingSetV2(null);
      
      // Si es el primer set completado del día, actualizar startedAt
      if (!dayV2?.startedAt && status === "completed") {
        setDayV2((prev) => prev ? { ...prev, startedAt: new Date().toISOString() } : prev);
      }
      
      // Invalidar caché para que la página de rutina muestre el progreso actualizado
      invalidateCache();

      if (status === "completed") {
        toast.success("¡Serie guardada! 🎉");
        const restSeconds = editingSetV2.exercise.restSeconds || 120;
        startRestTimer(restSeconds);
      }
    } catch (error) {
      console.error("Error saving set:", error);
      toast.error("Error al guardar");
    } finally {
      setIsSavingSet(false);
    }
  };

  // View history V2
  const handleViewHistoryV2 = async (exercise: StudentExercise) => {
    setMenuOpenV2(null);
    setHistoryExerciseV2(exercise);
    setLoadingHistory(true);
    
    try {
      if (!studentId || !exercise.exerciseCatalogId) {
        setHistoryData([]);
        return;
      }
      const { data } = await api.get(`/macrocycle/exercise-history/${studentId}/${exercise.exerciseCatalogId}`);
      setHistoryData(data?.value || data || []);
    } catch (error) {
      console.error("Error loading history:", error);
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // View technique V2
  const handleViewTechniqueV2 = (exercise: StudentExercise) => {
    setMenuOpenV2(null);
    const videoUrl = exercise.exerciseCatalog?.videoUrl;
    if (videoUrl) {
      setShowVideoV2(videoUrl);
    } else {
      toast.info("No hay video disponible para este ejercicio");
    }
  };

  // Handle drop set click V2
  const handleDropClickV2 = (set: StudentSet, exercise: StudentExercise, dropIndex: number) => {
    if (isReadOnly) {
      toast.info(readOnlyMessage);
      return;
    }
    
    const existingData = set.dropSetData?.[dropIndex];
    setEditingDrop({
      set,
      exercise,
      dropIndex,
      reps: existingData?.reps || "",
      load: existingData?.load?.toString() || "",
    });
  };

  // Save drop set V2
  const handleSaveDropV2 = async () => {
    if (!editingDrop) return;

    try {
      // Crear o actualizar el array de dropSetData
      const currentDropData = editingDrop.set.dropSetData || 
        Array(editingDrop.set.dropSetCount).fill({ reps: undefined, load: undefined });
      
      const newDropData = [...currentDropData];
      newDropData[editingDrop.dropIndex] = {
        reps: editingDrop.reps || undefined,
        load: editingDrop.load ? parseFloat(editingDrop.load) : undefined,
      };

      // Usar endpoint de estudiante (/v2/my-routines)
      await routineV2Api.logMySet(editingDrop.set.id, {
        dropSetData: newDropData,
      } as any);

      // Update local state
      setExercisesV2((prev) =>
        prev.map((ex) => {
          if (ex.id !== editingDrop.exercise.id) return ex;
          return {
            ...ex,
            sets: ex.sets?.map((s) =>
              s.id === editingDrop.set.id ? { ...s, dropSetData: newDropData } : s
            ),
          };
        })
      );

      setEditingDrop(null);
      
      // Invalidar caché para que la página de rutina muestre el progreso actualizado
      invalidateCache();
      
      toast.success("Drop set guardado 💪");
    } catch (error) {
      console.error("Error saving drop set:", error);
      toast.error("Error al guardar");
    }
  };

  // Handle Rest-Pause mini-set click V2
  const handleRestPauseClickV2 = (set: StudentSet, exercise: StudentExercise, miniSetIndex: number) => {
    if (isReadOnly) {
      toast.info(readOnlyMessage);
      return;
    }
    
    const existingData = (set as any).restPauseData?.[miniSetIndex];
    setEditingRestPause({
      set,
      exercise,
      miniSetIndex,
      reps: existingData?.reps?.toString() || "",
    });
  };

  // Save Rest-Pause mini-set V2
  const handleSaveRestPauseV2 = async () => {
    if (!editingRestPause) return;

    try {
      const currentData = (editingRestPause.set as any).restPauseData || 
        Array(editingRestPause.set.restPauseSets).fill({ reps: undefined });
      
      const newData = [...currentData];
      newData[editingRestPause.miniSetIndex] = {
        reps: editingRestPause.reps || undefined,
      };

      await routineV2Api.logMySet(editingRestPause.set.id, {
        restPauseData: newData,
      } as any);

      setExercisesV2((prev) =>
        prev.map((ex) => {
          if (ex.id !== editingRestPause.exercise.id) return ex;
          return {
            ...ex,
            sets: ex.sets?.map((s) =>
              s.id === editingRestPause.set.id ? { ...s, restPauseData: newData } : s
            ),
          };
        })
      );

      setEditingRestPause(null);
      invalidateCache();
      toast.success("Rest-Pause guardado 💪");
    } catch (error) {
      console.error("Error saving rest-pause:", error);
      toast.error("Error al guardar");
    }
  };

  // Handle Myo Reps mini-set click V2
  const handleMyoRepsClickV2 = (set: StudentSet, exercise: StudentExercise, miniSetIndex: number) => {
    if (isReadOnly) {
      toast.info(readOnlyMessage);
      return;
    }
    
    const existingData = (set as any).myoMiniSetsData?.[miniSetIndex];
    setEditingMyoReps({
      set,
      exercise,
      miniSetIndex,
      reps: existingData?.reps?.toString() || "",
    });
  };

  // Save Myo Reps mini-set V2
  const handleSaveMyoRepsV2 = async () => {
    if (!editingMyoReps) return;

    try {
      const currentData = (editingMyoReps.set as any).myoMiniSetsData || 
        Array(editingMyoReps.set.myoMiniSets).fill({ reps: undefined });
      
      const newData = [...currentData];
      newData[editingMyoReps.miniSetIndex] = {
        reps: editingMyoReps.reps || undefined,
      };

      await routineV2Api.logMySet(editingMyoReps.set.id, {
        myoMiniSetsData: newData,
      } as any);

      setExercisesV2((prev) =>
        prev.map((ex) => {
          if (ex.id !== editingMyoReps.exercise.id) return ex;
          return {
            ...ex,
            sets: ex.sets?.map((s) =>
              s.id === editingMyoReps.set.id ? { ...s, myoMiniSetsData: newData } : s
            ),
          };
        })
      );

      setEditingMyoReps(null);
      invalidateCache();
      toast.success("Myo Reps guardado 💪");
    } catch (error) {
      console.error("Error saving myo reps:", error);
      toast.error("Error al guardar");
    }
  };

  // Add extra set V2
  const handleAddExtraSetV2 = async (exercise: StudentExercise) => {
    setMenuOpenV2(null);
    
    try {
      const existingSets = exercise.sets || [];
      
      if (existingSets.length >= 10) {
        toast.error("Máximo 10 sets por ejercicio");
        return;
      }

      // Usar endpoint de estudiante (/v2/my-routines)
      const newSet = await routineV2Api.addMyExtraSet(exercise.id, {
        order: existingSets.length + 1,
        targetReps: exercise.targetReps || "10-12",
        targetRir: exercise.sets?.[0]?.targetRir,
        isExtra: true,
      });

      // Update local state
      setExercisesV2((prev) =>
        prev.map((ex) => {
          if (ex.id !== exercise.id) return ex;
          return {
            ...ex,
            sets: [...(ex.sets || []), newSet],
          };
        })
      );

      toast.success("Set agregado");
      handleCellClickV2(newSet, { ...exercise, sets: [...(exercise.sets || []), newSet] });
    } catch (error) {
      console.error("Error adding extra set:", error);
      toast.error("Error al agregar set");
    }
  };

  // Stats
  const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
  const completedSets = exercises.reduce(
    (acc, ex) => acc + (ex.sets?.filter((s) => s.status === "completed").length || 0),
    0
  );
  const isComplete = completedSets === totalSets && totalSets > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Cargando..." backHref={backHref} />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" text="Preparando entrenamiento" />
        </div>
      </div>
    );
  }

  // ==================== RENDER V2 ====================
  if (isUUID && dayV2) {
    const totalSetsV2 = exercisesV2.reduce((acc, e) => acc + (e.sets?.length || 0), 0);
    const completedSetsV2 = exercisesV2.reduce(
      (acc, e) => acc + (e.sets?.filter((s) => s.completedAt).length || 0),
      0
    );

    return (
      <div className="min-h-screen bg-[#0a0a0f] pb-24">
        {/* Header */}
        <div className="bg-[#13131a] border-b border-[#1e1e2a] sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h1 className="text-white font-semibold">{dayV2.name || `Día ${dayV2.dayNumber}`}</h1>
              <p className="text-xs text-gray-500">{completedSetsV2}/{totalSetsV2} series completadas</p>
            </div>
            <div className="w-5" />
          </div>
        </div>

        {/* Fecha del entrenamiento V2 */}
        {dayV2.startedAt && (
          <div className="px-4 py-2 text-center bg-[#13131a]">
            <span className="text-sm text-amber-400 flex items-center justify-center gap-2">
              <span>📅</span>
              {formatDateWithWeekday(dayV2.startedAt)}
            </span>
          </div>
        )}

        <div className="px-4 py-4 space-y-4">
          {/* Read-only banner */}
          {isReadOnly && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔒</span>
                <div>
                  <p className="text-sm text-amber-200">{readOnlyMessage}</p>
                  <button className="text-sm text-amber-400 mt-2 flex items-center gap-1 hover:underline">
                    <Play className="w-4 h-4" />
                    Simular activación
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instrucciones de uso */}
          {exercisesV2.length > 0 && (
            <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-lg p-3">
              <p className="text-xs text-gray-400 text-center">
                <span className="text-white font-medium">Consigna</span> ← deslizá → <span className="text-amber-400 font-medium">Registro</span>
              </p>
            </div>
          )}

          {/* Exercises V2 - Swipeable Cards */}
          {exercisesV2.map((exercise) => {
            const isExComplete = exercise.sets?.every((s) => s.completedAt);
            const exerciseName = exercise.exerciseCatalog?.name || `Ejercicio ${exercise.order}`;
            const muscleGroup = exercise.exerciseCatalog?.muscleGroup || "";
            const completedCount = exercise.sets?.filter(s => s.completedAt).length || 0;
            const isShowingRegister = showingRegister[exercise.id] || false;
            const hasSuggestedWeight = exercise.sets?.some(s => s.targetLoad);

            const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
              const threshold = 50;
              if (info.offset.x < -threshold && !isShowingRegister) {
                toggleExerciseView(exercise.id);
              } else if (info.offset.x > threshold && isShowingRegister) {
                toggleExerciseView(exercise.id);
              }
            };
            
            return (
              <div key={exercise.id} className="relative overflow-hidden rounded-lg">
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <div className="grid">
                    {/* ==================== CARD CONSIGNA (PLANIFICACIÓN) ==================== */}
                    <div 
                      className={cn(
                        "col-start-1 row-start-1 transition-opacity duration-200 h-full",
                        isShowingRegister ? "opacity-0 pointer-events-none" : "opacity-100"
                      )}
                    >
                      <Card 
                        className={cn(
                          "bg-[#13131a] border-[#1e1e2a] overflow-hidden relative h-full flex flex-col",
                          isExComplete && "border-l-2 border-l-emerald-500/50"
                        )}
                      >
                        {/* Indicador de swipe en el borde derecho */}
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-l from-amber-500/30 to-transparent" />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500/40">
                          <ChevronLeft className="w-4 h-4" />
                        </div>

                        {/* Header del ejercicio */}
                        <div className="p-3 flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <GripVertical className="w-4 h-4 text-gray-600 mt-0.5" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm text-white">{exerciseName}</h3>
                                {isExComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {muscleGroup} · {exercise.sets?.length || 0} series · Reps: {exercise.targetReps || "10-12"} · Descanso: {Math.floor((exercise.restSeconds || 120) / 60)}&apos;
                              </p>
                            </div>
                          </div>
                          <div className="relative" ref={menuOpenV2 === exercise.id ? menuRefV2 : null}>
                            <button 
                              onClick={() => setMenuOpenV2(menuOpenV2 === exercise.id ? null : exercise.id)}
                              className="text-gray-500 hover:text-white p-1"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <AnimatePresence>
                              {menuOpenV2 === exercise.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a24] border border-[#2a2a35] rounded-lg shadow-xl overflow-hidden min-w-[160px]"
                                >
                                  <button className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#252530] text-left" onClick={() => handleViewHistoryV2(exercise)}>
                                    <History className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-xs text-white">Ver Historial</span>
                                  </button>
                                  <button className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#252530] text-left border-t border-[#2a2a35]" onClick={() => handleViewTechniqueV2(exercise)}>
                                    <Video className="w-3.5 h-3.5 text-red-400" />
                                    <span className="text-xs text-white">Ver Técnica</span>
                                  </button>
                                  <button className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#252530] text-left border-t border-[#2a2a35]" onClick={() => handleAddExtraSetV2(exercise)}>
                                    <Plus className="w-3.5 h-3.5 text-green-400" />
                                    <span className="text-xs text-white">Agregar Set</span>
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Notas del coach */}
                        {exercise.coachNotes && (
                          <div className="px-3 pb-2">
                            <div className="flex items-start gap-2 p-2 bg-blue-950/30 rounded border border-blue-900/30">
                              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-blue-300/80">{exercise.coachNotes}</p>
                            </div>
                          </div>
                        )}

                        {/* Tabla de consigna */}
                        <div className="px-3 pb-3 flex-1">
                          <div className={cn(
                            "grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500 bg-amber-500/10 rounded-t p-2",
                            hasSuggestedWeight ? "grid-cols-5" : "grid-cols-4"
                          )}>
                            <span className="text-center">Serie</span>
                            <span className="text-center">Reps</span>
                            {hasSuggestedWeight && <span className="text-center">Carga</span>}
                            <span className="text-center">RIR</span>
                            <span className="text-center">Desc</span>
                          </div>

                          {exercise.sets?.slice().sort((a, b) => a.order - b.order).map((set, idx) => (
                            <div
                              key={set.id}
                              className={cn(
                                "grid gap-1 py-2.5 px-2 border-b border-[#1e1e2a] items-center",
                                hasSuggestedWeight ? "grid-cols-5" : "grid-cols-4",
                                set.isAmrap && "bg-purple-950/20",
                                set.isDropSet && "bg-orange-950/20",
                                set.isRestPause && "bg-blue-950/20",
                                set.isMyoReps && "bg-green-950/20",
                                set.isIsohold && "bg-cyan-950/20"
                              )}
                            >
                              <span className="text-center text-sm text-gray-400">{idx + 1}</span>
                              <div className="text-center flex items-center justify-center gap-1">
                                {set.isAmrap ? (
                                  <Badge className="bg-purple-600/80 text-white text-[8px] px-1.5"><Flame className="w-2.5 h-2.5 mr-0.5" />AMRAP</Badge>
                                ) : set.isMyoReps ? (
                                  <div className="flex flex-col items-center">
                                    <Badge className="bg-green-600/80 text-white text-[8px] px-1.5"><Repeat className="w-2.5 h-2.5 mr-0.5" />MYO</Badge>
                                    <span className="text-[8px] text-green-400">{set.myoActivationReps} + {set.myoMiniSets}x{set.myoMiniReps}</span>
                                  </div>
                                ) : set.isRestPause ? (
                                  <div className="flex flex-col items-center">
                                    <Badge className="bg-blue-600/80 text-white text-[8px] px-1.5"><Timer className="w-2.5 h-2.5 mr-0.5" />R-P {set.restPauseSets}x</Badge>
                                    <span className="text-[8px] text-blue-400">{set.restPauseRest}s desc</span>
                                  </div>
                                ) : set.isIsohold ? (
                                  <div className="flex flex-col items-center">
                                    <Badge className="bg-cyan-600/80 text-white text-[8px] px-1.5"><Lock className="w-2.5 h-2.5 mr-0.5" />{set.isoholdSeconds}s</Badge>
                                    <span className="text-[8px] text-cyan-400">{set.isoholdPosition}</span>
                                  </div>
                                ) : set.isDropSet ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-white">{set.targetReps}</span>
                                    <Badge className="bg-orange-600/80 text-white text-[8px] px-1"><ArrowDownToLine className="w-2.5 h-2.5" /></Badge>
                                  </div>
                                ) : (
                                  <span className="text-sm text-white">{set.targetReps}</span>
                                )}
                              </div>
                              {hasSuggestedWeight && (
                                <span className="text-center text-sm font-medium text-white">{set.targetLoad || "—"}</span>
                              )}
                              <span className="text-center text-sm text-gray-500">{set.targetRir ?? "—"}</span>
                              <span className="text-center text-sm text-gray-500">{Math.floor((exercise.restSeconds || 120) / 60)}&apos;</span>
                            </div>
                          ))}
                        </div>

                        {/* Botón para ir a registro */}
                        <div className="px-3 pb-3">
                          <button 
                            className="w-full h-9 text-xs border border-gray-700 text-gray-400 hover:bg-gray-800 rounded-lg flex items-center justify-center gap-1"
                            onClick={() => toggleExerciseView(exercise.id)}
                          >
                            Ir a registro
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                        </div>
                      </Card>
                    </div>

                    {/* ==================== CARD REGISTRO (EJECUCIÓN DEL ALUMNO) ==================== */}
                    <div 
                      className={cn(
                        "col-start-1 row-start-1 transition-opacity duration-200 h-full",
                        isShowingRegister ? "opacity-100" : "opacity-0 pointer-events-none"
                      )}
                    >
                      <Card 
                        className={cn(
                          "bg-[#13131a] border-[#1e1e2a] overflow-hidden relative border-l-2 border-l-amber-500/50 h-full flex flex-col",
                          isExComplete && "border-l-emerald-500"
                        )}
                      >
                        {/* Indicador de swipe en el borde izquierdo */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-gray-500/30 to-transparent" />
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500/40">
                          <ChevronRight className="w-4 h-4" />
                        </div>

                        {/* Header del registro */}
                        <div className="p-3 flex items-start justify-between bg-amber-500/5">
                          <div className="flex items-start gap-2 ml-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm text-white">Mi Registro - {exerciseName}</h3>
                                {isExComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                              </div>
                              <p className="text-[11px] text-amber-500/80 mt-0.5">
                                Completá tus series · {completedCount}/{exercise.sets?.length || 0} hechas
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Tabla de registro */}
                        <div className="px-3 pb-3 flex-1">
                          <div className="grid grid-cols-5 gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500 bg-amber-500/10 rounded-t p-2">
                            <span className="text-center">Serie</span>
                            <span className="text-center">Reps</span>
                            <span className="text-center">Carga</span>
                            <span className="text-center">RIR</span>
                            <span className="text-center">RPE</span>
                          </div>

                          {exercise.sets?.slice().sort((a, b) => a.order - b.order).map((set, idx) => (
                            <div key={set.id}>
                              <div
                                onClick={() => handleCellClickV2(set, exercise)}
                                className={cn(
                                  "grid grid-cols-5 gap-1 py-2.5 px-2 border-b border-[#1e1e2a] items-center cursor-pointer hover:bg-[#1a1a24] active:bg-amber-500/10",
                                  set.completedAt && "bg-emerald-950/10",
                                  set.isAmrap && "bg-purple-950/20",
                                  set.isDropSet && "bg-orange-950/20",
                                  set.isRestPause && "bg-blue-950/20",
                                  set.isMyoReps && "bg-green-950/20",
                                  set.isIsohold && "bg-cyan-950/20"
                                )}
                              >
                                <span className="text-center text-sm text-gray-400">{idx + 1}</span>
                                <span className={cn("text-center text-sm", set.actualReps ? "text-amber-400 font-semibold" : "text-gray-600")}>{set.actualReps || "—"}</span>
                                <span className={cn("text-center text-sm font-medium", set.actualLoad ? "text-white" : "text-gray-600")}>{set.actualLoad || (set.targetLoad ? `(${set.targetLoad})` : "—")}</span>
                                <span className={cn("text-center text-sm", set.actualRir ? "text-emerald-400" : "text-gray-600")}>{set.actualRir ?? "—"}</span>
                                <span className={cn("text-center text-sm", set.actualRpe ? "text-amber-400" : "text-gray-600")}>{set.actualRpe ?? "—"}</span>
                              </div>

                              {/* Drop Sets */}
                              {set.isDropSet && set.dropSetCount && (
                                <div className="bg-orange-950/10 ml-4 border-l border-orange-600/30">
                                  <div className="px-3 py-1.5 border-b border-[#1e1e2a]">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-500/80">Drop Sets - Bajar peso y seguir</span>
                                  </div>
                                  {Array.from({ length: set.dropSetCount }, (_, i) => {
                                    const dropData = set.dropSetData?.[i];
                                    const targetData = set.dropSetTargets?.[i];
                                    return (
                                      <div key={i} onClick={() => handleDropClickV2(set, exercise, i)} className="grid grid-cols-5 gap-1 py-2 px-3 border-b border-[#1e1e2a]/50 items-center cursor-pointer hover:bg-orange-950/20">
                                        <span className="text-[11px] text-orange-500 text-center">↳ D{i + 1}</span>
                                        <span className={cn("text-center text-sm", dropData?.reps ? "text-orange-400 font-semibold" : "text-gray-600")}>{dropData?.reps || "—"}</span>
                                        <span className={cn("text-center text-sm", dropData?.load ? "text-white font-semibold" : "text-gray-600")}>{dropData?.load || (targetData?.targetLoad ? `(${targetData.targetLoad})` : "—")}</span>
                                        <span className="text-center text-gray-700">—</span>
                                        <span className="text-center text-gray-700">—</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Myo Reps mini-sets */}
                              {set.isMyoReps && set.myoMiniSets && (
                                <div className="bg-green-950/10 ml-4 border-l border-green-600/30">
                                  <div className="px-3 py-1.5 border-b border-[#1e1e2a]">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-green-500/80">Mini-series Myo ({set.myoMiniReps} reps c/u)</span>
                                  </div>
                                  {Array.from({ length: set.myoMiniSets }, (_, i) => {
                                    const miniSetData = (set as any).myoMiniSetsData?.[i];
                                    return (
                                      <div key={i} onClick={() => handleMyoRepsClickV2(set, exercise, i)} className="grid grid-cols-5 gap-1 py-2 px-3 border-b border-[#1e1e2a]/50 items-center cursor-pointer hover:bg-green-950/20 active:bg-green-500/20">
                                        <span className="text-[11px] text-green-500 text-center">↳ M{i + 1}</span>
                                        <span className={cn("text-center text-sm", miniSetData?.reps ? "text-green-400 font-semibold" : "text-gray-600")}>{miniSetData?.reps || "—"}</span>
                                        <span className="text-center text-gray-700">—</span>
                                        <span className="text-center text-gray-700">—</span>
                                        <span className="text-center text-gray-700">—</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Rest-Pause mini-sets */}
                              {set.isRestPause && set.restPauseSets && (
                                <div className="bg-blue-950/10 ml-4 border-l border-blue-600/30">
                                  <div className="px-3 py-1.5 border-b border-[#1e1e2a]">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500/80">Rest-Pause ({set.restPauseRest}s descanso)</span>
                                  </div>
                                  {Array.from({ length: set.restPauseSets }, (_, i) => {
                                    const rpData = (set as any).restPauseData?.[i];
                                    return (
                                      <div key={i} onClick={() => handleRestPauseClickV2(set, exercise, i)} className="grid grid-cols-5 gap-1 py-2 px-3 border-b border-[#1e1e2a]/50 items-center cursor-pointer hover:bg-blue-950/20 active:bg-blue-500/20">
                                        <span className="text-[11px] text-blue-500 text-center">↳ RP{i + 1}</span>
                                        <span className={cn("text-center text-sm", rpData?.reps ? "text-blue-400 font-semibold" : "text-gray-600")}>{rpData?.reps || "—"}</span>
                                        <span className="text-center text-gray-700">—</span>
                                        <span className="text-center text-gray-700">—</span>
                                        <span className="text-center text-gray-700">—</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Isohold info */}
                              {set.isIsohold && (
                                <div className="bg-cyan-950/10 ml-4 border-l border-cyan-600/30 px-3 py-2">
                                  <span className="text-[10px] text-cyan-500">Isohold: {set.isoholdSeconds}s en {set.isoholdPosition}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Botón volver a consigna */}
                        <div className="px-3 pb-3">
                          <button 
                            className="w-full h-9 text-xs border border-gray-700 text-gray-400 hover:bg-gray-800 rounded-lg flex items-center justify-center gap-1"
                            onClick={() => toggleExerciseView(exercise.id)}
                          >
                            <ChevronRight className="w-3 h-3" />
                            Volver a consigna
                          </button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}

          {/* Empty state */}
          {exercisesV2.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay ejercicios en este día</p>
            </div>
          )}
        </div>

        {/* Rest Timer Widget V2 */}
        <AnimatePresence>
          {showTimer && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-20 left-4 right-4 bg-[#1a1a24] border border-amber-500/50 rounded-2xl p-4 shadow-xl z-40"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Timer className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Descanso</p>
                    <p className="text-3xl font-bold text-amber-400 font-mono">{formatTime(timerSeconds)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="border-gray-700" onClick={() => setTimerRunning(!timerRunning)}>
                    {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                <Button variant="outline" size="icon" className="border-gray-700" onClick={() => resetTimer(120)}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={stopTimer}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Set V2 Bottom Sheet */}
        <AnimatePresence>
          {editingSetV2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-end"
              onClick={() => setEditingSetV2(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full bg-[#13131a] rounded-t-3xl p-6 pb-8 border-t border-[#2a2a35]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white">
                    {editingSetV2.exercise.exerciseCatalog?.name || "Ejercicio"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Serie {(editingSetV2.exercise.sets?.findIndex((s) => s.id === editingSetV2.set.id) || 0) + 1} · 
                    Reps objetivo: {editingSetV2.set.targetReps} · 
                    RIR esperado: {editingSetV2.set.targetRir ?? "—"}
                  </p>
                </div>
                
                {/* Primera fila: REPS y CARGA */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block text-center">REPS REALES</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100"
                      value={editingSetV2.actualReps}
                      onChange={(e) => setEditingSetV2({ ...editingSetV2, actualReps: e.target.value })}
                      className="text-center text-xl font-bold h-14 bg-amber-500/10 border-amber-500/30 text-amber-400"
                      placeholder={editingSetV2.set.targetReps || "0"}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block text-center">CARGA (kg)</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={editingSetV2.actualLoad}
                      onChange={(e) => setEditingSetV2({ ...editingSetV2, actualLoad: e.target.value })}
                      className="text-center text-xl font-bold h-14 bg-white/5 border-gray-700 text-white"
                      placeholder={editingSetV2.set.targetLoad?.toString() || "0"}
                    />
                  </div>
                </div>
                
                {/* Segunda fila: RIR y RPE */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block text-center">RIR Real</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="10"
                      value={editingSetV2.actualRir}
                      onChange={(e) => setEditingSetV2({ ...editingSetV2, actualRir: e.target.value })}
                      className="text-center text-xl font-bold h-14 bg-white/5 border-gray-700 text-white"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block text-center">RPE</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="10"
                      value={editingSetV2.actualRpe}
                      onChange={(e) => setEditingSetV2({ ...editingSetV2, actualRpe: e.target.value })}
                      className="text-center text-xl font-bold h-14 bg-white/5 border-gray-700 text-white"
                      placeholder="—"
                    />
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="text-xs text-gray-400 mb-1 block">Notas (opcional)</label>
                  <Input
                    value={editingSetV2.notes}
                    onChange={(e) => setEditingSetV2({ ...editingSetV2, notes: e.target.value })}
                    placeholder="Ej: Subí peso, último set difícil..."
                    className="bg-white/5 border-gray-700"
                  />
                </div>
                
                <div className="space-y-3">
                  <Button
                    className="w-full h-14 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleSaveSetV2("completed")}
                    disabled={isSavingSet}
                  >
                    {isSavingSet ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Guardar Serie
                      </>
                    )}
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-12 text-red-400 border-red-400/30 hover:bg-red-500/10" 
                      onClick={() => handleSaveSetV2("failed")}
                      disabled={isSavingSet}
                    >
                      Fallida
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-12 text-yellow-400 border-yellow-400/30 hover:bg-yellow-500/10" 
                      onClick={() => handleSaveSetV2("skipped")}
                      disabled={isSavingSet}
                    >
                      Saltar
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full text-gray-400" 
                    onClick={() => setEditingSetV2(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Modal V2 */}
        <AnimatePresence>
          {historyExerciseV2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setHistoryExerciseV2(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-[#13131a] rounded-2xl max-h-[80vh] overflow-hidden border border-[#2a2a35]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-[#2a2a35] flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">💪 {historyExerciseV2.exerciseCatalog?.name || "Ejercicio"}</h3>
                    <p className="text-xs text-gray-500">Historial de rendimiento</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setHistoryExerciseV2(null)}>
                    <X className="w-5 h-5 text-gray-400" />
                  </Button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                  {loadingHistory ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full bg-[#1a1a24]" />
                      <Skeleton className="h-16 w-full bg-[#1a1a24]" />
                    </div>
                  ) : historyData.length > 0 ? (
                    <div className="space-y-3">
                      {historyData.slice(0, 10).map((entry: any, idx: number) => {
                        const sets = entry.sets || [];
                        const maxLoad = sets.length > 0 ? Math.max(...sets.map((s: any) => s.load || s.actualLoad || 0)) : 0;
                        const avgReps = sets.length > 0 
                          ? Math.round(sets.reduce((acc: number, s: any) => acc + (parseInt(s.reps || s.actualReps) || 0), 0) / sets.length) 
                          : 0;
                        const avgRir = sets.length > 0 && sets.some((s: any) => s.actualRir != null)
                          ? Math.round(sets.reduce((acc: number, s: any) => acc + (s.actualRir || 0), 0) / sets.filter((s: any) => s.actualRir != null).length)
                          : null;
                        
                        return (
                          <div key={idx} className="p-3 bg-[#1a1a24] rounded-lg border border-[#2a2a35]">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-gray-500">
                                {formatDate(entry.fecha || entry.date, { day: "2-digit", month: "2-digit", year: "2-digit" })}
                              </span>
                              <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">{sets.length} series</Badge>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <div><span className="text-gray-500">Carga:</span> <span className="font-bold text-white">{maxLoad || "—"} kg</span></div>
                              <div><span className="text-gray-500">Reps:</span> <span className="font-bold text-white">{avgReps || "—"}</span></div>
                              <div><span className="text-gray-500">RIR:</span> <span className="font-bold text-green-400">{avgRir ?? "—"}</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">Aún no hay historial para este ejercicio</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop Set Edit Modal V2 */}
        <AnimatePresence>
          {editingDrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-end"
              onClick={() => setEditingDrop(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full bg-[#13131a] rounded-t-3xl p-6 pb-8 border-t border-orange-500/30"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1 bg-orange-500/50 rounded-full mx-auto mb-4" />
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-orange-400">
                    Drop Set {editingDrop.dropIndex + 1}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {editingDrop.exercise.exerciseCatalog?.name || "Ejercicio"} - 
                    Bajá el peso y seguí hasta el fallo
                  </p>
                </div>
                
                {/* REPS y CARGA para el drop */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block text-center">REPS</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100"
                      value={editingDrop.reps}
                      onChange={(e) => setEditingDrop({ ...editingDrop, reps: e.target.value })}
                      className="text-center text-xl font-bold h-14 bg-orange-500/10 border-orange-500/30 text-orange-400"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block text-center">CARGA (kg)</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={editingDrop.load}
                      onChange={(e) => setEditingDrop({ ...editingDrop, load: e.target.value })}
                      className="text-center text-xl font-bold h-14 bg-white/5 border-gray-700 text-white"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button
                    className="w-full h-14 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-lg rounded-xl"
                    onClick={handleSaveDropV2}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Guardar Drop
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-gray-400" 
                    onClick={() => setEditingDrop(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Rest-Pause Modal V2 */}
        <AnimatePresence>
          {editingRestPause && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setEditingRestPause(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-[#13131a] rounded-t-3xl p-6 max-h-[60vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white">
                    {editingRestPause.exercise.exerciseCatalog?.name || "Ejercicio"}
                  </h3>
                  <p className="text-sm text-blue-400">
                    Rest-Pause Mini-set {editingRestPause.miniSetIndex + 1}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-gray-400 mb-1 block text-center">REPETICIONES</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={editingRestPause.reps}
                    onChange={(e) => setEditingRestPause({ ...editingRestPause, reps: e.target.value })}
                    className="text-center text-xl font-bold h-14 bg-blue-500/10 border-blue-500/30 text-blue-400"
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-3">
                  <Button
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-lg rounded-xl"
                    onClick={handleSaveRestPauseV2}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Guardar Rest-Pause
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-gray-400" 
                    onClick={() => setEditingRestPause(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Myo Reps Modal V2 */}
        <AnimatePresence>
          {editingMyoReps && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setEditingMyoReps(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-[#13131a] rounded-t-3xl p-6 max-h-[60vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white">
                    {editingMyoReps.exercise.exerciseCatalog?.name || "Ejercicio"}
                  </h3>
                  <p className="text-sm text-green-400">
                    Myo Reps Mini-set {editingMyoReps.miniSetIndex + 1}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-gray-400 mb-1 block text-center">REPETICIONES</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={editingMyoReps.reps}
                    onChange={(e) => setEditingMyoReps({ ...editingMyoReps, reps: e.target.value })}
                    className="text-center text-xl font-bold h-14 bg-green-500/10 border-green-500/30 text-green-400"
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-3">
                  <Button
                    className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-xl"
                    onClick={handleSaveMyoRepsV2}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Guardar Myo Reps
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-gray-400" 
                    onClick={() => setEditingMyoReps(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Modal V2 */}
        <AnimatePresence>
          {showVideoV2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setShowVideoV2(null)}
            >
              <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white" onClick={() => setShowVideoV2(null)}>
                <X className="w-6 h-6" />
              </Button>
              <div className="w-full max-w-lg aspect-video">
                <iframe
                  src={showVideoV2.replace("watch?v=", "embed/")}
                  className="w-full h-full rounded-xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ==================== RENDER V1 ====================
  if (!day) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Error" backHref={backHref} />
        <div className="px-4 py-8 text-center">
          <p className="text-text-muted">No se encontró el entrenamiento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={day.nombre || `Día ${day.dia}`}
        subtitle={`${completedSets}/${totalSets} series completadas`}
        backHref={backHref}
      />

      {/* Date */}
      {day.fecha && (
        <div className="px-4 py-2 text-center">
          <span className="text-sm text-primary">
            📅 {formatDateWithWeekday(day.fecha)}
          </span>
        </div>
      )}

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="px-4 pb-2">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-sm text-amber-400 text-center">
              🔒 {readOnlyMessage}
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isReadOnly && (
        <div className="px-4 pb-2">
          <p className="text-xs text-text-muted text-center bg-surface/50 rounded-lg p-2">
            💡 Tocá en cada fila para cargar tu peso, RIR y RPE
          </p>
        </div>
      )}

      {/* Exercises List with DnD */}
      <div className="px-4 space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={exercises.map((ex) => ex.id)}
            strategy={verticalListSortingStrategy}
          >
            {exercises.map((exercise) => {
              const completedCount = exercise.sets?.filter((s) => s.status === "completed").length || 0;
              const totalCount = exercise.sets?.length || 0;
              const allComplete = completedCount === totalCount && totalCount > 0;

              return (
                <SortableExerciseItem
                  key={exercise.id}
                  exercise={exercise}
                  allComplete={allComplete}
                  totalCount={totalCount}
                  menuOpen={menuOpen}
                  menuRef={menuRef as any}
                  setMenuOpen={setMenuOpen}
                  handleViewHistory={handleViewHistory}
                  handleAddExtraSet={handleAddExtraSet}
                  handleViewTechnique={handleViewTechnique}
                  handleCellClick={handleCellClick}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* Rest Timer Widget */}
      <AnimatePresence>
        {showTimer && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-20 left-4 right-4 bg-surface border border-primary/50 rounded-2xl p-4 shadow-xl z-40"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Timer className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Descanso</p>
                  <p className="text-3xl font-bold text-primary font-mono">{formatTime(timerSeconds)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setTimerRunning(!timerRunning)}>
                  {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => resetTimer(120)}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={stopTimer}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Set Bottom Sheet */}
      <AnimatePresence>
        {editingSet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end"
            onClick={() => setEditingSet(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full bg-surface rounded-t-3xl p-6 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-border rounded-full mx-auto mb-4" />
              <div className="mb-4">
                <h3 className="text-lg font-bold text-text">{editingSet.exercise.exerciseCatalog?.name}</h3>
                <p className="text-sm text-text-muted">
                  Serie {(editingSet.exercise.sets?.findIndex((s) => s.id === editingSet.set.id) || 0) + 1} · 
                  Reps: {editingSet.set.reps} · RIR esperado: {editingSet.set.expectedRir || "—"}
                </p>
              </div>
              {/* Primera fila: CARGA y REPS */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block text-center">CARGA (kg)</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={editingSet.load}
                    onChange={(e) => setEditingSet({ ...editingSet, load: e.target.value })}
                    className="text-center text-xl font-bold h-14 bg-primary/10 border-primary/30"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block text-center">REPS</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={editingSet.reps}
                    onChange={(e) => setEditingSet({ ...editingSet, reps: e.target.value })}
                    className="text-center text-xl font-bold h-14 bg-accent/10 border-accent/30"
                    placeholder="0"
                  />
                </div>
              </div>
              {/* Segunda fila: RIR y RPE */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className="text-xs text-text-muted mb-1 block text-center">RIR Real</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="10"
                    value={editingSet.actualRir}
                    onChange={(e) => setEditingSet({ ...editingSet, actualRir: e.target.value })}
                    className="text-center text-xl font-bold h-14"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block text-center">RPE</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="10"
                    value={editingSet.actualRpe}
                    onChange={(e) => setEditingSet({ ...editingSet, actualRpe: e.target.value })}
                    className="text-center text-xl font-bold h-14"
                    placeholder="—"
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="text-xs text-text-muted mb-1 block">Notas (opcional)</label>
                <Input
                  value={editingSet.notes}
                  onChange={(e) => setEditingSet({ ...editingSet, notes: e.target.value })}
                  placeholder="Ej: Subí peso, último set difícil..."
                />
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full h-14 bg-gradient-to-r from-success to-accent text-black font-bold text-lg rounded-xl"
                  onClick={() => handleSaveSet("completed")}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Guardar Serie
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-12 text-red-400 border-red-400/30" onClick={() => handleSaveSet("failed")}>
                    Fallida
                  </Button>
                  <Button variant="outline" className="h-12 text-yellow-400 border-yellow-400/30" onClick={() => handleSaveSet("skipped")}>
                    Saltar
                  </Button>
                </div>
                <Button variant="ghost" className="w-full" onClick={() => setEditingSet(null)}>
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {historyExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setHistoryExercise(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-surface rounded-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-text">💪 {historyExercise.exerciseCatalog?.name}</h3>
                  <p className="text-xs text-text-muted">Historial de rendimiento</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setHistoryExercise(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                {loadingHistory ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : historyData.length > 0 ? (
                  <div className="space-y-3">
                    {historyData.slice(0, 10).map((entry: any, idx: number) => {
                      const sets = entry.sets || [];
                      const maxLoad = sets.length > 0 ? Math.max(...sets.map((s: any) => s.load || 0)) : 0;
                      const avgReps = sets.length > 0 
                        ? Math.round(sets.reduce((acc: number, s: any) => acc + (parseInt(s.reps) || 0), 0) / sets.length) 
                        : 0;
                      const avgRir = sets.length > 0 && sets.some((s: any) => s.actualRir != null)
                        ? Math.round(sets.reduce((acc: number, s: any) => acc + (s.actualRir || 0), 0) / sets.filter((s: any) => s.actualRir != null).length)
                        : null;
                      
                      return (
                        <div key={idx} className="p-3 bg-background/50 rounded-lg border border-border">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-text-muted">
                              {formatDate(entry.fecha, { day: "2-digit", month: "2-digit", year: "2-digit" })}
                            </span>
                            <Badge variant="outline" className="text-xs">{sets.length} series</Badge>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <div><span className="text-text-muted">Carga:</span> <span className="font-bold text-text">{maxLoad || "—"} kg</span></div>
                            <div><span className="text-text-muted">Reps:</span> <span className="font-bold text-text">{avgReps || "—"}</span></div>
                            <div><span className="text-text-muted">RIR:</span> <span className="font-bold text-success">{avgRir ?? "—"}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <p className="text-text-muted">Aún no hay historial para este ejercicio</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowVideo(null)}
          >
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white" onClick={() => setShowVideo(null)}>
              <X className="w-6 h-6" />
            </Button>
            <div className="w-full max-w-lg aspect-video">
              <iframe
                src={showVideo.replace("watch?v=", "embed/")}
                className="w-full h-full rounded-xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete Workout Button */}
      {isComplete && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-20 left-4 right-4 z-30">
          <Button
            className="w-full h-14 bg-gradient-to-r from-success to-accent text-black font-bold text-lg rounded-xl shadow-lg"
            onClick={() => { toast.success("¡Excelente entrenamiento! 🏆"); router.push(backHref); }}
          >
            <Trophy className="w-5 h-5 mr-2" />
            Finalizar Entrenamiento
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// Sortable Exercise Item Component
function SortableExerciseItem({
  exercise,
  allComplete,
  totalCount,
  menuOpen,
  menuRef,
  setMenuOpen,
  handleViewHistory,
  handleAddExtraSet,
  handleViewTechnique,
  handleCellClick,
}: {
  exercise: Exercise;
  allComplete: boolean;
  totalCount: number;
  menuOpen: number | null;
  menuRef: React.RefObject<HTMLDivElement>;
  setMenuOpen: (id: number | null) => void;
  handleViewHistory: (ex: Exercise) => void;
  handleAddExtraSet: (ex: Exercise) => void;
  handleViewTechnique: (ex: Exercise) => void;
  handleCellClick: (set: Set, ex: Exercise) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-surface border-border overflow-hidden",
        allComplete && "border-success/50",
        isDragging && "opacity-80 shadow-2xl scale-[1.02]"
      )}
    >
      {/* Exercise Header */}
      <div className="p-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 touch-none"
          >
            <GripVertical className="w-5 h-5 text-text-muted" />
          </div>
          <div>
            <h3 className="font-semibold text-text">
              {exercise.exerciseCatalog?.name || `Ejercicio ${exercise.orden}`}
            </h3>
            <p className="text-xs text-text-muted">
              {exercise.exerciseCatalog?.muscleGroup || "—"} · {exercise.series || totalCount} series · Reps: {exercise.repeticiones} · Descanso: {exercise.descanso}
            </p>
          </div>
        </div>

        {/* Menu Button */}
        <div className="relative" ref={menuOpen === exercise.id ? menuRef : null}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMenuOpen(menuOpen === exercise.id ? null : exercise.id)}
          >
            <MoreVertical className="w-4 h-4 text-text-muted" />
          </Button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {menuOpen === exercise.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded-lg shadow-xl overflow-hidden min-w-[180px]"
              >
                <button
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-background/50 transition-colors text-left"
                  onClick={() => handleViewHistory(exercise)}
                >
                  <History className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-text">Ver Historial</span>
                </button>
                <button
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-background/50 transition-colors text-left border-t border-border"
                  onClick={() => handleAddExtraSet(exercise)}
                >
                  <Plus className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-text">Agregar Set Extra</span>
                </button>
                {exercise.exerciseCatalog?.videoUrl && (
                  <button
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-background/50 transition-colors text-left border-t border-border"
                    onClick={() => handleViewTechnique(exercise)}
                  >
                    <Video className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-text">Ver Técnica</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sets Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary/90 text-black">
              <th className="px-2 py-2 text-left font-semibold text-xs">REPS</th>
              <th className="px-2 py-2 text-center font-semibold text-xs">REAL</th>
              <th className="px-2 py-2 text-center font-semibold text-xs">CARGA</th>
              <th className="px-2 py-2 text-center font-semibold text-xs">RIR-E</th>
              <th className="px-2 py-2 text-center font-semibold text-xs">RIR-R</th>
              <th className="px-2 py-2 text-center font-semibold text-xs">RPE</th>
            </tr>
          </thead>
          <tbody>
            {exercise.sets?.sort((a, b) => (a.order || 0) - (b.order || 0)).map((set, setIndex) => {
              const isCompleted = set.status === "completed";
              const isFailed = set.status === "failed";
              const isSkipped = set.status === "skipped";
              const isExtra = set.isExtra;

              return (
                <tr
                  key={set.id}
                  className={cn(
                    "cursor-pointer transition-colors border-b border-border/50 last:border-b-0",
                    "active:bg-primary/30",
                    isCompleted && "bg-success/10",
                    isFailed && "bg-red-500/10",
                    isSkipped && "bg-yellow-500/10",
                    isExtra && "bg-green-500/5",
                    !isCompleted && !isFailed && !isSkipped && !isExtra && (
                      setIndex % 2 === 0 ? "bg-background/50" : "bg-surface/50"
                    )
                  )}
                  onClick={() => handleCellClick(set, exercise)}
                >
                  <td className="px-2 py-3 text-left font-medium text-text">
                    {set.reps}
                    {isExtra && <span className="text-green-400 ml-1">+</span>}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className={cn("font-medium", isCompleted ? "text-success" : "text-text-muted")}>
                      {isCompleted ? set.reps : "—"}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className={cn("font-bold", isCompleted && set.load > 0 ? "text-text" : "text-text-muted")}>
                      {set.load > 0 ? set.load : "—"}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center text-text-muted">{set.expectedRir || "—"}</td>
                  <td className="px-2 py-3 text-center">
                    <span className={cn("font-medium", set.actualRir !== null && set.actualRir !== undefined ? "text-success" : "text-text-muted")}>
                      {set.actualRir !== null && set.actualRir !== undefined ? set.actualRir : "—"}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className={cn("font-medium", set.actualRpe !== null && set.actualRpe !== undefined ? "text-primary" : "text-text-muted")}>
                      {set.actualRpe !== null && set.actualRpe !== undefined ? set.actualRpe : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {exercise.sets?.some((s) => s.notes) && (
        <div className="p-3 bg-yellow-500/10 border-t border-border">
          <p className="text-xs text-yellow-600">
            <strong>Obs:</strong> {exercise.sets.filter((s) => s.notes).map((s) => s.notes).join(" · ")}
          </p>
        </div>
      )}
    </Card>
  );
}
