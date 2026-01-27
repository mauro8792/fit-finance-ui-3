"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Dumbbell,
  Calendar,
  Plus,
  Flame,
  ArrowDownToLine,
  Info,
  ArrowLeft,
  GripVertical,
  Trash2,
  Edit3,
  Search,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Timer,
  Repeat,
  Lock,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudentRoutine } from "@/hooks/useRoutineV2";
import { getExerciseCatalog, type CatalogExercise } from "@/lib/api/coach";
import * as routineV2Api from "@/lib/api/routine-v2";
import type { StudentExercise, StudentSet } from "@/types/routine-v2";

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ==================== SORTABLE EXERCISE CARD ====================
function SortableExerciseCard({
  exercise,
  onEdit,
  onDelete,
  deleting = false,
}: {
  exercise: StudentExercise;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
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
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={cn(
        "bg-[#13131a] border-[#1e1e2a] overflow-hidden transition-all",
        isDragging && "opacity-80 shadow-2xl scale-[1.02] ring-2 ring-amber-500/50"
      )}>
        {/* Header del ejercicio */}
        <div className="p-4 flex items-start justify-between border-b border-[#1e1e2a]/50">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <div
              {...listeners}
              className="p-1 rounded hover:bg-white/10 cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {exercise.exerciseCatalog?.name || `Ejercicio ${exercise.order}`}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {exercise.exerciseCatalog?.muscleGroup} · {exercise.sets?.length || 0} series · 
                Reps: {exercise.targetReps || "—"} · Descanso: {Math.round((exercise.restSeconds || 120) / 60)} min
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              disabled={deleting}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Notas */}
        {(exercise.coachNotes || exercise.notes) && (
          <div className="px-4 py-3">
            <div className="flex items-start gap-2 p-3 bg-blue-950/40 rounded-lg border border-blue-900/30">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300/90">{exercise.coachNotes || exercise.notes}</p>
            </div>
          </div>
        )}

        {/* Tabla de series */}
        <div className="px-4 pb-4 pt-2">
          {/* Header de tabla */}
          <div className="grid grid-cols-5 text-[10px] font-semibold uppercase tracking-wide text-amber-500 bg-amber-500/10 rounded-t-lg py-2.5">
            <span className="text-center">Serie</span>
            <span className="text-center">Reps</span>
            <span className="text-center">Carga</span>
            <span className="text-center">RIR</span>
            <span className="text-center">Info</span>
          </div>

          {/* Filas de series */}
          {exercise.sets?.slice().sort((a, b) => a.order - b.order).map((set, setIdx) => (
            <div key={set.id}>
              <div
                className={cn(
                  "grid grid-cols-5 py-3 border-b border-[#1e1e2a]/60 items-center",
                  set.isAmrap && "bg-purple-950/30",
                  set.isDropSet && "bg-orange-950/20 border-l-2 border-l-orange-500/60",
                  setIdx === (exercise.sets?.length || 0) - 1 && !set.isDropSet && "border-b-0 rounded-b-lg"
                )}
              >
                {/* SERIE # */}
                <span className="text-center text-sm text-gray-400">{setIdx + 1}</span>

                {/* REPS */}
                <div className="flex items-center justify-center">
                  {set.isAmrap ? (
                    <Badge className="bg-purple-600 text-white text-[9px] px-2 py-0.5 font-semibold">
                      <Flame className="w-3 h-3 mr-0.5" />
                      MAX
                    </Badge>
                  ) : (
                    <span className={cn(
                      "text-sm font-medium",
                      set.isDropSet ? "text-orange-400" : "text-white"
                    )}>
                      {set.targetReps}
                    </span>
                  )}
                </div>

                {/* CARGA */}
                <span className="text-center text-sm text-white font-semibold">
                  {set.targetLoad ? `${set.targetLoad}kg` : "—"}
                </span>

                {/* RIR */}
                <span className="text-center text-sm text-gray-400">
                  {set.targetRir ?? "—"}
                </span>

                {/* INFO */}
                <div className="flex items-center justify-center gap-1">
                  {set.isDropSet && (
                    <Badge variant="outline" className="text-[9px] border-orange-500/50 text-orange-400">
                      Drop
                    </Badge>
                  )}
                  {!set.isDropSet && !set.isAmrap && (
                    <span className="text-gray-600">—</span>
                  )}
                </div>
              </div>

              {/* Drop Sets */}
              {set.isDropSet && set.dropSetCount && (
                <>
                  {Array.from({ length: set.dropSetCount }, (_, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-5 py-3 border-b border-[#1e1e2a]/40 items-center bg-orange-950/10 border-l-2 border-l-orange-500/50"
                    >
                      <span className="text-center text-xs text-orange-400">↳</span>
                      <span className="text-center text-xs text-orange-400">Drop {i + 1}</span>
                      <span className="text-center text-sm text-gray-600">—</span>
                      <span className="text-center text-sm text-gray-600">—</span>
                      <span className="text-center text-sm text-gray-600">—</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ==================== COMPONENT ====================
export default function EditStudentRoutinePage() {
  const router = useRouter();
  const params = useParams();
  const routineId = params.id as string;

  const { routine, loading, error, refetch } = useStudentRoutine(routineId);
  const [saving, setSaving] = useState(false);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);

  // Navigation
  const [currentMicroIndex, setCurrentMicroIndex] = useState(0);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // Exercise catalog
  const [exerciseCatalog, setExerciseCatalog] = useState<CatalogExercise[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Sheet states
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [showEditExercise, setShowEditExercise] = useState(false);
  const [selectedCatalogExercise, setSelectedCatalogExercise] = useState<CatalogExercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<StudentExercise | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Series form state
  const [seriesCount, setSeriesCount] = useState("3");
  const [repsRange, setRepsRange] = useState("10-12");
  const [rir, setRir] = useState("");
  const [rpe, setRpe] = useState("");
  const [rest, setRest] = useState("2");
  const [kg, setKg] = useState("");
  const [notes, setNotes] = useState("");
  const [includeAmrap, setIncludeAmrap] = useState(false);
  const [includeDropSet, setIncludeDropSet] = useState(false);
  const [dropSetCount, setDropSetCount] = useState("2");
  
  // ========== TÉCNICAS DE ALTA INTENSIDAD ==========
  const [includeRestPause, setIncludeRestPause] = useState(false);
  const [restPauseSets, setRestPauseSets] = useState("3");
  const [restPauseRest, setRestPauseRest] = useState("10-15");
  
  const [includeMyoReps, setIncludeMyoReps] = useState(false);
  const [myoActivationReps, setMyoActivationReps] = useState("12-15");
  const [myoMiniSets, setMyoMiniSets] = useState("4");
  const [myoMiniReps, setMyoMiniReps] = useState("3-5");
  
  const [includeIsohold, setIncludeIsohold] = useState(false);
  const [isoholdSeconds, setIsoholdSeconds] = useState("30");
  const [isoholdPosition, setIsoholdPosition] = useState("abajo");
  
  // ========== SUPERSERIE ==========
  const [linkWithNext, setLinkWithNext] = useState(false);

  // Local exercises state for drag and drop
  const [localExercises, setLocalExercises] = useState<StudentExercise[]>([]);

  // Replication dialog
  const [showReplicateDialog, setShowReplicateDialog] = useState(false);
  const [replicating, setReplicating] = useState(false);

  // Microcycle options
  const [showMicrocycleOptions, setShowMicrocycleOptions] = useState(false);

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

  // Load exercise catalog
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const catalog = await getExerciseCatalog();
        setExerciseCatalog(catalog);
      } catch (err) {
        console.error("Error loading catalog:", err);
        setExerciseCatalog([
          { id: 1, name: "Press de Banca", muscleGroup: "Pecho" },
          { id: 2, name: "Sentadilla", muscleGroup: "Piernas" },
          { id: 3, name: "Peso Muerto", muscleGroup: "Espalda" },
          { id: 4, name: "Press Militar", muscleGroup: "Hombros" },
          { id: 5, name: "Curl de Bíceps", muscleGroup: "Bíceps" },
        ]);
      } finally {
        setCatalogLoading(false);
      }
    };
    loadCatalog();
  }, []);

  // Sort microcycles and days
  const sortedMicrocycles = routine?.microcycles?.slice().sort((a, b) => a.order - b.order) || [];
  const currentMicrocycle = sortedMicrocycles[currentMicroIndex];
  const sortedDays = currentMicrocycle?.days?.slice().sort((a, b) => (a.dayNumber || a.order || 0) - (b.dayNumber || b.order || 0)) || [];
  const currentDay = sortedDays[currentDayIndex];

  // Sync local exercises when day changes
  useEffect(() => {
    if (currentDay?.exercises) {
      setLocalExercises(currentDay.exercises.slice().sort((a, b) => a.order - b.order));
    } else {
      setLocalExercises([]);
    }
  }, [currentDay?.id, currentDay?.exercises]);

  // Use local state for exercises (for drag and drop)
  const sortedExercises = localExercises;

  // Filter exercises
  const filteredCatalog = exerciseCatalog.filter(
    (ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscleGroup?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset form
  const resetForm = () => {
    setSeriesCount("3");
    setRepsRange("10-12");
    setRir("");
    setRpe("");
    setRest("2");
    setKg("");
    setNotes("");
    setIncludeAmrap(false);
    setIncludeDropSet(false);
    setDropSetCount("2");
    // Reset técnicas HIT
    setIncludeRestPause(false);
    setRestPauseSets("3");
    setRestPauseRest("10-15");
    setIncludeMyoReps(false);
    setMyoActivationReps("12-15");
    setMyoMiniSets("4");
    setMyoMiniReps("3-5");
    setIncludeIsohold(false);
    setIsoholdSeconds("30");
    setIsoholdPosition("abajo");
    setLinkWithNext(false);
  };

  // Handle exercise selection from catalog
  const handleSelectExercise = (exercise: CatalogExercise) => {
    setSelectedCatalogExercise(exercise);
    setShowExerciseSearch(false);
    resetForm();
    setShowSeriesForm(true);
  };

  // Add exercise with sets (batch insert)
  const handleAddExercise = async () => {
    if (!selectedCatalogExercise || !currentDay) return;

    setSaving(true);
    try {
      const count = parseInt(seriesCount) || 3;
      
      // Build sets array
      const sets = [];
      for (let i = 0; i < count; i++) {
        const isLast = i === count - 1;
        
        // Determinar tipo de set y técnica
        let setData: Record<string, unknown> = {
          targetReps: repsRange,
          targetLoad: kg ? parseFloat(kg) : undefined,
          targetRir: rir ? parseInt(rir) : undefined,
          targetRpe: rpe ? parseInt(rpe) : undefined,
          isDropSet: false,
          isAmrap: false,
        };
        
        // Solo aplicar técnica a la última serie
        if (isLast) {
          if (includeAmrap) {
            setData.targetReps = "AMRAP";
            setData.isAmrap = true;
          } else if (includeDropSet) {
            setData.isDropSet = true;
            setData.dropSetCount = parseInt(dropSetCount) || 2;
          } else if (includeRestPause) {
            setData.isRestPause = true;
            setData.restPauseSets = parseInt(restPauseSets) || 3;
            setData.restPauseRest = restPauseRest || "10-15";
          } else if (includeMyoReps) {
            setData.isMyoReps = true;
            setData.myoActivationReps = myoActivationReps || "12-15";
            setData.myoMiniSets = parseInt(myoMiniSets) || 4;
            setData.myoMiniReps = myoMiniReps || "3-5";
          } else if (includeIsohold) {
            setData.isIsohold = true;
            setData.isoholdSeconds = isoholdSeconds || "30";
            setData.isoholdPosition = isoholdPosition || "abajo";
          }
        }
        
        sets.push(setData);
      }

      // Single API call - batch insert exercise + sets
      await routineV2Api.addStudentExerciseWithSets(currentDay.id, {
        exerciseCatalogId: selectedCatalogExercise.id,
        targetReps: repsRange,
        restSeconds: rest ? parseInt(rest) * 60 : 120,
        targetRir: rir ? parseInt(rir) : undefined,
        targetRpe: rpe ? parseInt(rpe) : undefined,
        coachNotes: notes || undefined,
        linkWithNext: linkWithNext || undefined,
        sets,
      });

      await refetch();
      setShowSeriesForm(false);
      setSelectedCatalogExercise(null);
      resetForm();
      toast.success("Ejercicio agregado");
    } catch (err) {
      console.error("Error adding exercise:", err);
      toast.error("Error al agregar ejercicio");
    } finally {
      setSaving(false);
    }
  };

  // Delete exercise
  const handleDeleteExercise = async (exerciseId: string) => {
    setDeletingExerciseId(exerciseId);
    try {
      await routineV2Api.deleteStudentExercise(exerciseId);
      await refetch();
      toast.success("Ejercicio eliminado");
    } catch (err) {
      console.error("Error deleting exercise:", err);
      toast.error("Error al eliminar");
    } finally {
      setDeletingExerciseId(null);
    }
  };

  // Edit exercise
  const handleEditExercise = (exercise: StudentExercise) => {
    setEditingExercise(exercise);
    setNotes(exercise.coachNotes || "");
    setRepsRange(exercise.targetReps || "10-12");
    setRir(exercise.targetRir?.toString() || "");
    setRpe(exercise.targetRpe?.toString() || "");
    setRest(((exercise.restSeconds || 120) / 60).toString());
    setSeriesCount((exercise.sets?.length || 3).toString());
    
    // Check if last set has any HIT technique
    const lastSet = exercise.sets?.slice().sort((a, b) => a.order - b.order).pop();
    
    // Reset all techniques first
    setIncludeAmrap(false);
    setIncludeDropSet(false);
    setIncludeRestPause(false);
    setIncludeMyoReps(false);
    setIncludeIsohold(false);
    
    // Set the active technique based on last set
    if (lastSet?.isAmrap) {
      setIncludeAmrap(true);
    } else if (lastSet?.isDropSet) {
      setIncludeDropSet(true);
      setDropSetCount((lastSet.dropSetCount || 2).toString());
    } else if (lastSet?.isRestPause) {
      setIncludeRestPause(true);
      setRestPauseSets((lastSet.restPauseSets || 3).toString());
      setRestPauseRest(lastSet.restPauseRest || "10-15");
    } else if (lastSet?.isMyoReps) {
      setIncludeMyoReps(true);
      setMyoActivationReps(lastSet.myoActivationReps || "12-15");
      setMyoMiniSets((lastSet.myoMiniSets || 4).toString());
      setMyoMiniReps(lastSet.myoMiniReps || "3-5");
    } else if (lastSet?.isIsohold) {
      setIncludeIsohold(true);
      setIsoholdSeconds(lastSet.isoholdSeconds || "30");
      setIsoholdPosition(lastSet.isoholdPosition || "abajo");
    }
    
    setKg(lastSet?.targetLoad?.toString() || "");
    setLinkWithNext(exercise.linkWithNext || false);
    setShowEditExercise(true);
  };

  // Save edit (simple - just notes)
  const handleSaveEdit = async () => {
    if (!editingExercise) return;
    
    setSaving(true);
    try {
      // Update exercise config
      await routineV2Api.updateStudentExercise(editingExercise.id, {
        targetReps: repsRange || undefined,
        restSeconds: rest ? parseInt(rest) * 60 : 120,
        targetRir: rir ? parseInt(rir) : undefined,
        targetRpe: rpe ? parseInt(rpe) : undefined,
        coachNotes: notes || undefined,
      });
      await refetch();
      setShowEditExercise(false);
      setEditingExercise(null);
      toast.success("Cambios guardados");
    } catch (err) {
      console.error("Error updating:", err);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Save edit complete - recreate sets if count changed
  const handleSaveEditComplete = async () => {
    if (!editingExercise) return;
    
    setSaving(true);
    try {
      const count = parseInt(seriesCount) || 3;
      const currentCount = editingExercise.sets?.length || 0;
      
      // Helper function to build set data with HIT technique
      const buildSetData = (isLast: boolean): Parameters<typeof routineV2Api.addStudentSet>[1] => {
        const setData: Parameters<typeof routineV2Api.addStudentSet>[1] = {
          targetReps: repsRange,
          targetLoad: kg ? parseFloat(kg) : undefined,
          targetRir: rir ? parseInt(rir) : undefined,
          targetRpe: rpe ? parseInt(rpe) : undefined,
          isAmrap: false,
          isDropSet: false,
          isRestPause: false,
          isMyoReps: false,
          isIsohold: false,
        };
        
        if (isLast) {
          if (includeAmrap) {
            setData.targetReps = "AMRAP";
            setData.isAmrap = true;
          } else if (includeDropSet) {
            setData.isDropSet = true;
            setData.dropSetCount = parseInt(dropSetCount) || 2;
          } else if (includeRestPause) {
            setData.isRestPause = true;
            setData.restPauseSets = parseInt(restPauseSets) || 3;
            setData.restPauseRest = restPauseRest || "10-15";
          } else if (includeMyoReps) {
            setData.isMyoReps = true;
            setData.myoActivationReps = myoActivationReps || "12-15";
            setData.myoMiniSets = parseInt(myoMiniSets) || 4;
            setData.myoMiniReps = myoMiniReps || "3-5";
          } else if (includeIsohold) {
            setData.isIsohold = true;
            setData.isoholdSeconds = isoholdSeconds || "30";
            setData.isoholdPosition = isoholdPosition || "abajo";
          }
        }
        
        return setData;
      };
      
      // Update exercise config including linkWithNext
      await routineV2Api.updateStudentExercise(editingExercise.id, {
        targetReps: repsRange || undefined,
        restSeconds: rest ? parseInt(rest) * 60 : 120,
        targetRir: rir ? parseInt(rir) : undefined,
        targetRpe: rpe ? parseInt(rpe) : undefined,
        coachNotes: notes || undefined,
        linkWithNext: linkWithNext || undefined,
      });

      // If series count changed, delete old and create new
      if (count !== currentCount) {
        // Delete existing sets
        for (const set of editingExercise.sets || []) {
          await routineV2Api.deleteStudentSet(set.id);
        }
        
        // Create new sets
        for (let i = 0; i < count; i++) {
          const isLast = i === count - 1;
          await routineV2Api.addStudentSet(editingExercise.id, buildSetData(isLast));
        }
      } else {
        // Update all sets in batch (single API call)
        const sortedSets = editingExercise.sets?.slice().sort((a, b) => a.order - b.order) || [];
        const setsToUpdate = sortedSets.map((set, idx) => {
          const isLast = idx === sortedSets.length - 1;
          return {
            id: set.id,
            ...buildSetData(isLast),
          };
        });
        
        // Single batch call instead of multiple individual calls
        await routineV2Api.updateStudentSetsBatch(editingExercise.id, setsToUpdate);
      }

      await refetch();
      setShowEditExercise(false);
      setEditingExercise(null);
      toast.success("Cambios guardados");
    } catch (err) {
      console.error("Error updating:", err);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Update a single set
  const handleUpdateSet = async (setId: string, data: Partial<StudentSet>) => {
    try {
      await routineV2Api.updateStudentSet(setId, data);
      await refetch();
    } catch (err) {
      console.error("Error updating set:", err);
      toast.error("Error al actualizar serie");
    }
  };

  // Delete a set
  const handleDeleteSet = async (setId: string) => {
    try {
      await routineV2Api.deleteStudentSet(setId);
      await refetch();
      toast.success("Serie eliminada");
    } catch (err) {
      console.error("Error deleting set:", err);
      toast.error("Error al eliminar serie");
    }
  };

  // Add a set to exercise
  const handleAddSetToExercise = async (exerciseId: string) => {
    try {
      await routineV2Api.addStudentSet(exerciseId, {
        targetReps: repsRange || "10",
        targetRir: rir ? parseInt(rir) : undefined,
      });
      await refetch();
      toast.success("Serie agregada");
    } catch (err) {
      console.error("Error adding set:", err);
      toast.error("Error al agregar serie");
    }
  };

  // Count total series
  const totalSeries = sortedExercises.reduce((acc, e) => acc + (e.sets?.length || 0), 0);

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localExercises.findIndex((ex) => ex.id === active.id);
      const newIndex = localExercises.findIndex((ex) => ex.id === over.id);

      const newOrder = arrayMove(localExercises, oldIndex, newIndex);
      setLocalExercises(newOrder);

      // Update order in backend silently
      if (currentDay) {
        try {
          await routineV2Api.reorderStudentExercises(
            currentDay.id,
            newOrder.map((ex, index) => ({
              id: ex.id,
              order: index + 1,
            }))
          );
        } catch (error) {
          console.error("Error updating order:", error);
          // Revert on error
          setLocalExercises(localExercises);
          toast.error("Error al reordenar");
        }
      }
    }
  };

  // Handle add microcycle
  const handleAddMicrocycle = async () => {
    if (!routine) return;
    setSaving(true);
    try {
      const newMicro = await routineV2Api.addStudentMicrocycle(routine.id, {});
      toast.success(`Microciclo M${newMicro.order} agregado`);
      await refetch();
      // Go to new microcycle
      setCurrentMicroIndex(sortedMicrocycles.length);
      setCurrentDayIndex(0);
    } catch (err) {
      console.error("Error adding microcycle:", err);
      toast.error("Error al agregar microciclo");
    } finally {
      setSaving(false);
    }
  };

  // Handle add day
  const handleAddDay = async () => {
    if (!currentMicrocycle) return;
    setSaving(true);
    try {
      const newDay = await routineV2Api.addStudentDay(currentMicrocycle.id, {});
      toast.success(`${newDay.name} agregado`);
      await refetch();
      // Go to new day
      setCurrentDayIndex(sortedDays.length);
    } catch (err) {
      console.error("Error adding day:", err);
      toast.error("Error al agregar día");
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle deload
  const handleToggleDeload = async () => {
    if (!currentMicrocycle) return;
    setSaving(true);
    try {
      await routineV2Api.updateStudentMicrocycle(currentMicrocycle.id, {
        isDeload: !currentMicrocycle.isDeload,
      });
      toast.success(
        currentMicrocycle.isDeload 
          ? "Microciclo marcado como normal" 
          : "Microciclo marcado como descarga"
      );
      await refetch();
      setShowMicrocycleOptions(false);
    } catch (err) {
      console.error("Error updating microcycle:", err);
      toast.error("Error al actualizar microciclo");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete microcycle
  const handleDeleteMicrocycle = async () => {
    if (!currentMicrocycle) return;
    if (sortedMicrocycles.length <= 1) {
      toast.error("No se puede eliminar el único microciclo");
      return;
    }
    setSaving(true);
    try {
      await routineV2Api.deleteStudentMicrocycle(currentMicrocycle.id);
      toast.success("Microciclo eliminado");
      await refetch();
      setCurrentMicroIndex(Math.max(0, currentMicroIndex - 1));
      setShowMicrocycleOptions(false);
    } catch (err) {
      console.error("Error deleting microcycle:", err);
      toast.error("Error al eliminar microciclo");
    } finally {
      setSaving(false);
    }
  };

  // Handle save button - ask about replication if there are more microcycles
  const handleSaveClick = () => {
    if (sortedMicrocycles.length > 1 && currentMicrocycle) {
      // Check if there are later microcycles to replicate to
      const laterMicros = sortedMicrocycles.filter((m) => m.order > currentMicrocycle.order);
      if (laterMicros.length > 0) {
        setShowReplicateDialog(true);
        return;
      }
    }
    // No replication needed
    toast.success("¡Cambios guardados!", {
      description: "Los ejercicios ya están guardados automáticamente",
    });
    router.push(`/coach/student-routine-v2/${routineId}`);
  };

  // Handle replication
  const handleReplicate = async (replicate: boolean) => {
    setShowReplicateDialog(false);

    if (!replicate) {
      toast.success("¡Cambios guardados!", {
        description: "Solo se guardó el microciclo actual",
      });
      router.push(`/coach/student-routine-v2/${routineId}`);
      return;
    }

    // Replicate to later microcycles
    setReplicating(true);
    try {
      if (!currentMicrocycle) throw new Error("No hay microciclo seleccionado");

      const result = await routineV2Api.replicateStudentMicrocycle(currentMicrocycle.id);

      toast.success("¡Cambios replicados!", {
        description: `Los ejercicios de M${currentMicrocycle.order} se copiaron a ${result.replicatedCount} microciclos`,
      });
      router.push(`/coach/student-routine-v2/${routineId}`);
    } catch (err) {
      console.error("Error replicating:", err);
      toast.error("Error al replicar", {
        description: "Intentá de nuevo",
      });
    } finally {
      setReplicating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (error || !routine) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center">
        <p className="text-red-400">Error al cargar la rutina</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0d0d12] border-b border-[#1a1a24]">
        <div className="flex items-center gap-4 p-4">
          <button 
            onClick={() => router.back()}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white">Editando Rutina</h1>
            <p className="text-xs text-gray-500">Rutina: {routine.name}</p>
          </div>
          <Button 
            size="sm" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSaveClick}
            disabled={replicating}
          >
            {replicating ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-1" />
            )}
            Guardar
          </Button>
        </div>

        {/* Microcycle selector - improved navigation */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-center gap-3">
            {/* Left arrow */}
            <button
              onClick={() => {
                if (currentMicroIndex > 0) {
                  setCurrentMicroIndex(currentMicroIndex - 1);
                  setCurrentDayIndex(0);
                }
              }}
              disabled={currentMicroIndex === 0}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                currentMicroIndex === 0
                  ? "bg-[#1a1a24]/50 text-gray-600 cursor-not-allowed"
                  : "bg-[#1a1a24] text-gray-300 hover:bg-[#252530] hover:text-white"
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Current microcycle display */}
            <div className="flex flex-col items-center min-w-[140px]">
              <div className={cn(
                "px-6 py-2.5 rounded-xl text-base font-bold transition-all flex items-center gap-2",
                currentMicrocycle?.isDeload
                  ? "bg-blue-500 text-white"
                  : "bg-amber-500 text-black"
              )}>
                <span>Microciclo {currentMicrocycle?.order || currentMicroIndex + 1}</span>
                <button
                  onClick={() => setShowMicrocycleOptions(true)}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    currentMicrocycle?.isDeload
                      ? "bg-blue-600/50 hover:bg-blue-600 text-white"
                      : "bg-amber-600/50 hover:bg-amber-600 text-black"
                  )}
                  title="Configurar microciclo"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-gray-500 mt-1">
                {currentMicroIndex + 1} de {sortedMicrocycles.length}
              </span>
              {currentMicrocycle?.isDeload && (
                <span className="text-xs text-blue-400 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  Semana de descarga
                </span>
              )}
            </div>

            {/* Right arrow */}
            <button
              onClick={() => {
                if (currentMicroIndex < sortedMicrocycles.length - 1) {
                  setCurrentMicroIndex(currentMicroIndex + 1);
                  setCurrentDayIndex(0);
                }
              }}
              disabled={currentMicroIndex >= sortedMicrocycles.length - 1}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                currentMicroIndex >= sortedMicrocycles.length - 1
                  ? "bg-[#1a1a24]/50 text-gray-600 cursor-not-allowed"
                  : "bg-[#1a1a24] text-gray-300 hover:bg-[#252530] hover:text-white"
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Add microcycle button */}
            <button
              onClick={handleAddMicrocycle}
              className="w-10 h-10 rounded-full bg-[#1a1a24] hover:bg-[#252530] border border-dashed border-gray-700 flex items-center justify-center text-gray-500 hover:text-amber-500 transition-all"
              title="Agregar microciclo"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day selector */}
        <div className="px-4 pb-3 border-b border-[#1a1a24]">
          <div className="flex gap-2 overflow-x-auto items-center">
            {sortedDays.map((d, idx) => (
              <button
                key={d.id}
                onClick={() => setCurrentDayIndex(idx)}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  idx === currentDayIndex
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                    : "bg-[#1a1a24] text-gray-500 hover:text-gray-300 hover:bg-[#252530]"
                )}
              >
                {d.name}
              </button>
            ))}
            {/* Add day button */}
            <button
              onClick={handleAddDay}
              className="w-8 h-8 rounded-lg bg-[#1a1a24] hover:bg-[#252530] border border-dashed border-gray-700 flex items-center justify-center text-gray-500 hover:text-amber-500 transition-all shrink-0"
              title="Agregar día"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Info header */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm bg-[#1a1a24] rounded-full px-4 py-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-white font-medium">M{currentMicrocycle?.order} · {currentDay?.name}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">{sortedExercises.length} ejercicios · {totalSeries} series</span>
          </div>
        </div>

        {/* Tip */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
          <span className="text-amber-500 text-xl">💡</span>
          <p className="text-sm text-amber-200/90">
            Los cambios se guardan automáticamente. Podés personalizar esta rutina para este alumno.
          </p>
        </div>

        {/* Lista de ejercicios con Drag and Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedExercises.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {sortedExercises.map((exercise) => (
                <SortableExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onEdit={() => handleEditExercise(exercise)}
                  onDelete={() => handleDeleteExercise(exercise.id)}
                  deleting={deletingExerciseId === exercise.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Empty state */}
        {sortedExercises.length === 0 && (
          <div className="text-center py-12">
            <Dumbbell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay ejercicios en este día</p>
            <p className="text-gray-600 text-xs mt-1">Tocá el botón + para agregar</p>
          </div>
        )}

        {/* Leyenda */}
        {sortedExercises.length > 0 && (
          <div className="flex items-center justify-center gap-6 py-4 border-t border-[#1e1e2a]">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-600 text-white text-[9px] px-2 py-0.5">
                <Flame className="w-3 h-3 mr-0.5" />
                MAX
              </Badge>
              <span className="text-xs text-gray-500">AMRAP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-orange-500 rounded-full" />
              <span className="text-xs text-gray-500">Drop Set</span>
            </div>
          </div>
        )}
      </div>

      {/* FAB - Agregar ejercicio */}
      <button
        onClick={() => {
          setSearchQuery("");
          setShowExerciseSearch(true);
        }}
        className="fixed bottom-24 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 transition-all hover:scale-105 z-40"
      >
        <Plus className="w-6 h-6 text-black" />
      </button>

      {/* Sheet: Buscar ejercicio */}
      <Sheet open={showExerciseSearch} onOpenChange={setShowExerciseSearch}>
        <SheetContent side="bottom" className="bg-[#13131a] border-[#1e1e2a] h-[85vh] rounded-t-2xl mx-auto max-w-[420px] sm:max-w-[480px]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-white">Agregar ejercicio</SheetTitle>
            <SheetDescription className="text-gray-500">
              Buscá un ejercicio del catálogo para agregarlo al día
            </SheetDescription>
          </SheetHeader>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ejercicio..."
              className="pl-10 bg-[#1a1a24] border-[#2a2a35] text-white"
            />
          </div>

          {/* Exercise list */}
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {catalogLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              </div>
            ) : (
              filteredCatalog.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleSelectExercise(exercise)}
                  className="w-full p-3 flex items-center gap-3 rounded-lg hover:bg-[#1a1a24] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{exercise.name}</p>
                    <p className="text-xs text-gray-500">{exercise.muscleGroup}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet: Configurar series */}
      <Sheet open={showSeriesForm} onOpenChange={setShowSeriesForm}>
        <SheetContent side="bottom" className="bg-[#13131a] border-[#1e1e2a] h-[85vh] rounded-t-2xl overflow-y-auto mx-auto max-w-[420px] sm:max-w-[480px]">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-white flex items-center gap-2 text-base">
              <Dumbbell className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="truncate">{selectedCatalogExercise?.name}</span>
            </SheetTitle>
            <SheetDescription className="text-gray-500">
              {selectedCatalogExercise?.muscleGroup} · Configurá las series y repeticiones
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-24 px-1">
            {/* Quick presets */}
            <div>
              <Label className="text-[11px] text-gray-400 mb-1.5 block">Presets rápidos</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "3x10-12", series: "3", reps: "10-12", r: "2", p: "" },
                  { label: "4x8-10", series: "4", reps: "8-10", r: "2", p: "" },
                  { label: "3x15", series: "3", reps: "15", r: "1", p: "" },
                  { label: "5x5", series: "5", reps: "5", r: "", p: "8" },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setSeriesCount(preset.series);
                      setRepsRange(preset.reps);
                      setRir(preset.r);
                      setRpe(preset.p);
                    }}
                    className="px-2 py-1.5 rounded-lg text-xs bg-[#1a1a24] text-gray-300 hover:bg-amber-500/20 hover:text-amber-400 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Series count + reps */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-400 mb-1.5 block">Series</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={seriesCount}
                  onChange={(e) => setSeriesCount(e.target.value)}
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-base font-semibold h-11"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-400 mb-1.5 block">Reps</Label>
                <Input
                  type="text"
                  value={repsRange}
                  onChange={(e) => setRepsRange(e.target.value)}
                  placeholder="10-12"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-base font-semibold h-11"
                />
              </div>
            </div>

            {/* RIR + RPE + Kg + Rest - 4 columns */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px] text-gray-400 mb-1 block">RIR</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={rir}
                  onChange={(e) => setRir(e.target.value)}
                  placeholder="—"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-sm h-10"
                />
              </div>
              <div>
                <Label className="text-[10px] text-gray-400 mb-1 block">RPE</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  placeholder="—"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-sm h-10"
                />
              </div>
              <div>
                <Label className="text-[10px] text-gray-400 mb-1 block">Kg</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                  placeholder="—"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-sm h-10"
                />
              </div>
              <div>
                <Label className="text-[10px] text-gray-400 mb-1 block">Desc.</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rest}
                  onChange={(e) => setRest(e.target.value)}
                  placeholder="2"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-sm h-10"
                />
              </div>
            </div>

            {/* Técnicas de Alta Intensidad */}
            <div className="space-y-3">
              <Label className="text-[11px] text-gray-400 block">Técnica de alta intensidad (última serie)</Label>
              
              <div className="grid grid-cols-3 gap-2">
                {/* AMRAP */}
                <button
                  onClick={() => {
                    const newVal = !includeAmrap;
                    setIncludeAmrap(newVal);
                    if (newVal) {
                      setIncludeDropSet(false);
                      setIncludeRestPause(false);
                      setIncludeMyoReps(false);
                      setIncludeIsohold(false);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-lg flex flex-col items-center gap-1 transition-all",
                    includeAmrap
                      ? "bg-purple-600/20 border border-purple-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <Flame className={cn("w-4 h-4", includeAmrap ? "text-purple-400" : "text-gray-500")} />
                  <span className="text-[10px] font-medium text-white">AMRAP</span>
                </button>

                {/* Drop Set */}
                <button
                  onClick={() => {
                    const newVal = !includeDropSet;
                    setIncludeDropSet(newVal);
                    if (newVal) {
                      setIncludeAmrap(false);
                      setIncludeRestPause(false);
                      setIncludeMyoReps(false);
                      setIncludeIsohold(false);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-lg flex flex-col items-center gap-1 transition-all",
                    includeDropSet
                      ? "bg-orange-600/20 border border-orange-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <ArrowDownToLine className={cn("w-4 h-4", includeDropSet ? "text-orange-400" : "text-gray-500")} />
                  <span className="text-[10px] font-medium text-white">Drop</span>
                </button>

                {/* Rest-Pause */}
                <button
                  onClick={() => {
                    const newVal = !includeRestPause;
                    setIncludeRestPause(newVal);
                    if (newVal) {
                      setIncludeAmrap(false);
                      setIncludeDropSet(false);
                      setIncludeMyoReps(false);
                      setIncludeIsohold(false);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-lg flex flex-col items-center gap-1 transition-all",
                    includeRestPause
                      ? "bg-cyan-600/20 border border-cyan-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <Timer className={cn("w-4 h-4", includeRestPause ? "text-cyan-400" : "text-gray-500")} />
                  <span className="text-[10px] font-medium text-white">Rest-Pause</span>
                </button>

                {/* Myo Reps */}
                <button
                  onClick={() => {
                    const newVal = !includeMyoReps;
                    setIncludeMyoReps(newVal);
                    if (newVal) {
                      setIncludeAmrap(false);
                      setIncludeDropSet(false);
                      setIncludeRestPause(false);
                      setIncludeIsohold(false);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-lg flex flex-col items-center gap-1 transition-all",
                    includeMyoReps
                      ? "bg-pink-600/20 border border-pink-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <Repeat className={cn("w-4 h-4", includeMyoReps ? "text-pink-400" : "text-gray-500")} />
                  <span className="text-[10px] font-medium text-white">Myo Reps</span>
                </button>

                {/* Isohold */}
                <button
                  onClick={() => {
                    const newVal = !includeIsohold;
                    setIncludeIsohold(newVal);
                    if (newVal) {
                      setIncludeAmrap(false);
                      setIncludeDropSet(false);
                      setIncludeRestPause(false);
                      setIncludeMyoReps(false);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-lg flex flex-col items-center gap-1 transition-all",
                    includeIsohold
                      ? "bg-emerald-600/20 border border-emerald-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <Lock className={cn("w-4 h-4", includeIsohold ? "text-emerald-400" : "text-gray-500")} />
                  <span className="text-[10px] font-medium text-white">Isohold</span>
                </button>
              </div>

              {/* ========== CONFIGURACIONES ESPECÍFICAS ========== */}
              
              {/* Drop Set config */}
              {includeDropSet && (
                <div className="p-3 rounded-lg bg-orange-950/20 border border-orange-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] text-orange-400">Cantidad de drops:</Label>
                    <div className="flex gap-1.5">
                      {["1", "2", "3"].map((n) => (
                        <button
                          key={n}
                          onClick={() => setDropSetCount(n)}
                          className={cn(
                            "w-8 h-7 rounded-lg text-xs font-medium transition-all",
                            dropSetCount === n
                              ? "bg-orange-600 text-white"
                              : "bg-[#1a1a24] text-gray-400"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-orange-400/70">Bajar peso ~20% por cada drop</p>
                </div>
              )}

              {/* Rest-Pause config */}
              {includeRestPause && (
                <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-cyan-400 mb-1 block">Mini-sets:</Label>
                      <div className="flex gap-1">
                        {["2", "3", "4"].map((n) => (
                          <button
                            key={n}
                            onClick={() => setRestPauseSets(n)}
                            className={cn(
                              "flex-1 h-7 rounded text-xs font-medium transition-all",
                              restPauseSets === n
                                ? "bg-cyan-600 text-white"
                                : "bg-[#1a1a24] text-gray-400"
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-cyan-400 mb-1 block">Descanso (seg):</Label>
                      <Input
                        value={restPauseRest}
                        onChange={(e) => setRestPauseRest(e.target.value)}
                        placeholder="10-15"
                        className="h-7 text-xs bg-[#1a1a24] border-cyan-500/30 text-white text-center"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-cyan-400/70">Hacer reps hasta fallo, descansar {restPauseRest}s, repetir {restPauseSets} veces</p>
                </div>
              )}

              {/* Myo Reps config */}
              {includeMyoReps && (
                <div className="p-3 rounded-lg bg-pink-950/20 border border-pink-500/30 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-pink-400 mb-1 block">Activación:</Label>
                      <Input
                        value={myoActivationReps}
                        onChange={(e) => setMyoActivationReps(e.target.value)}
                        placeholder="12-15"
                        className="h-7 text-xs bg-[#1a1a24] border-pink-500/30 text-white text-center"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-pink-400 mb-1 block">Mini-sets:</Label>
                      <div className="flex gap-1">
                        {["3", "4", "5"].map((n) => (
                          <button
                            key={n}
                            onClick={() => setMyoMiniSets(n)}
                            className={cn(
                              "flex-1 h-7 rounded text-xs font-medium transition-all",
                              myoMiniSets === n
                                ? "bg-pink-600 text-white"
                                : "bg-[#1a1a24] text-gray-400"
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-pink-400 mb-1 block">Reps/mini:</Label>
                      <Input
                        value={myoMiniReps}
                        onChange={(e) => setMyoMiniReps(e.target.value)}
                        placeholder="3-5"
                        className="h-7 text-xs bg-[#1a1a24] border-pink-500/30 text-white text-center"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-pink-400/70">Activación {myoActivationReps} reps + {myoMiniSets} mini-sets de {myoMiniReps} reps (5-10s descanso)</p>
                </div>
              )}

              {/* Isohold config */}
              {includeIsohold && (
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-emerald-400 mb-1 block">Segundos:</Label>
                      <Input
                        value={isoholdSeconds}
                        onChange={(e) => setIsoholdSeconds(e.target.value)}
                        placeholder="30"
                        className="h-7 text-xs bg-[#1a1a24] border-emerald-500/30 text-white text-center"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-emerald-400 mb-1 block">Posición:</Label>
                      <div className="flex gap-1">
                        {["abajo", "medio", "arriba"].map((pos) => (
                          <button
                            key={pos}
                            onClick={() => setIsoholdPosition(pos)}
                            className={cn(
                              "flex-1 h-7 rounded text-[9px] font-medium transition-all capitalize",
                              isoholdPosition === pos
                                ? "bg-emerald-600 text-white"
                                : "bg-[#1a1a24] text-gray-400"
                            )}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-emerald-400/70">Mantener {isoholdSeconds}s en posición {isoholdPosition} antes de las reps</p>
                </div>
              )}
            </div>

            {/* Superserie toggle */}
            <div className="space-y-2">
              <button
                onClick={() => setLinkWithNext(!linkWithNext)}
                className={cn(
                  "w-full p-3 rounded-lg flex items-center justify-between transition-all",
                  linkWithNext
                    ? "bg-blue-600/20 border border-blue-500/50"
                    : "bg-[#1a1a24] border border-transparent"
                )}
              >
                <div className="flex items-center gap-2">
                  <Link2 className={cn("w-4 h-4", linkWithNext ? "text-blue-400" : "text-gray-500")} />
                  <span className="text-xs font-medium text-white">Combinar con siguiente (Superserie)</span>
                </div>
                <div className={cn(
                  "w-10 h-5 rounded-full transition-all relative",
                  linkWithNext ? "bg-blue-600" : "bg-gray-700"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                    linkWithNext ? "left-5" : "left-0.5"
                  )} />
                </div>
              </button>
              {linkWithNext && (
                <p className="text-[10px] text-blue-400/70 px-1">
                  Este ejercicio se mostrará combinado con el siguiente para el alumno
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-[11px] text-gray-400 mb-1.5 block">Notas para el alumno</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Agarre supino, controlar la bajada..."
                className="bg-[#1a1a24] border-[#2a2a35] text-white min-h-[60px] text-sm"
              />
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 left-0 right-0 py-4 bg-[#13131a] border-t border-[#1e1e2a] mt-4">
            <Button
              onClick={handleAddExercise}
              disabled={saving}
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Agregar ejercicio
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar ejercicio */}
      <Sheet open={showEditExercise} onOpenChange={setShowEditExercise}>
        <SheetContent side="bottom" className="bg-[#13131a] border-[#1e1e2a] h-[85vh] rounded-t-2xl overflow-y-auto w-full max-w-full px-4">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-white flex items-center gap-2 text-base">
              <Dumbbell className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="truncate">{editingExercise?.exerciseCatalog?.name}</span>
            </SheetTitle>
            <SheetDescription className="text-gray-500">
              {editingExercise?.exerciseCatalog?.muscleGroup} · Configurá las series y repeticiones
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-24 px-1">
            {/* Quick presets */}
            <div>
              <Label className="text-[11px] text-gray-400 mb-1.5 block">Presets rápidos</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "3x10-12", series: "3", reps: "10-12", r: "2", p: "" },
                  { label: "4x8-10", series: "4", reps: "8-10", r: "2", p: "" },
                  { label: "3x15", series: "3", reps: "15", r: "1", p: "" },
                  { label: "5x5", series: "5", reps: "5", r: "", p: "8" },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setSeriesCount(preset.series);
                      setRepsRange(preset.reps);
                      setRir(preset.r);
                      setRpe(preset.p);
                    }}
                    className="px-2 py-1.5 rounded-lg text-xs bg-[#1a1a24] text-gray-300 hover:bg-amber-500/20 hover:text-amber-400 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Series count + reps */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-400 mb-1.5 block">Series</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={seriesCount}
                  onChange={(e) => setSeriesCount(e.target.value)}
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-base font-semibold h-11"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-400 mb-1.5 block">Reps</Label>
                <Input
                  type="text"
                  value={repsRange}
                  onChange={(e) => setRepsRange(e.target.value)}
                  placeholder="10-12"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-base font-semibold h-11"
                />
              </div>
            </div>

            {/* RIR + RPE + Kg + Rest - 4 columns */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px] text-gray-400 mb-1 block">RIR</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={rir}
                  onChange={(e) => setRir(e.target.value)}
                  placeholder="—"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-sm h-10"
                />
              </div>
              <div>
                <Label className="text-[10px] text-gray-400 mb-1 block">RPE</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  placeholder="—"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-sm h-10"
                />
              </div>
              <div>
                <Label className="text-[10px] text-gray-400 mb-1 block">Kg</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                  placeholder="—"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-sm h-10"
                />
              </div>
              <div>
                <Label className="text-[10px] text-gray-400 mb-1 block">Desc.</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rest}
                  onChange={(e) => setRest(e.target.value)}
                  placeholder="2"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center text-sm h-10"
                />
              </div>
            </div>

            {/* Técnicas de Alta Intensidad */}
            <div className="space-y-3">
              <Label className="text-[11px] text-gray-400 block">Técnica de alta intensidad (última serie)</Label>
              
              <div className="grid grid-cols-3 gap-2">
                {/* AMRAP */}
                <button
                  onClick={() => {
                    const newVal = !includeAmrap;
                    setIncludeAmrap(newVal);
                    if (newVal) {
                      setIncludeDropSet(false);
                      setIncludeRestPause(false);
                      setIncludeMyoReps(false);
                      setIncludeIsohold(false);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-lg flex flex-col items-center gap-1 transition-all",
                    includeAmrap
                      ? "bg-purple-600/20 border border-purple-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <Flame className={cn("w-4 h-4", includeAmrap ? "text-purple-400" : "text-gray-500")} />
                  <span className="text-[10px] font-medium text-white">AMRAP</span>
                </button>

                {/* Drop Set */}
                <button
                  onClick={() => {
                    const newVal = !includeDropSet;
                    setIncludeDropSet(newVal);
                    if (newVal) {
                      setIncludeAmrap(false);
                      setIncludeRestPause(false);
                      setIncludeMyoReps(false);
                      setIncludeIsohold(false);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-lg flex flex-col items-center gap-1 transition-all",
                    includeDropSet
                      ? "bg-orange-600/20 border border-orange-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <ArrowDownToLine className={cn("w-4 h-4", includeDropSet ? "text-orange-400" : "text-gray-500")} />
                  <span className="text-[10px] font-medium text-white">Drop</span>
                </button>

                {/* Rest-Pause */}
                <button
                  onClick={() => {
                    const newVal = !includeRestPause;
                    setIncludeRestPause(newVal);
                    if (newVal) {
                      setIncludeAmrap(false);
                      setIncludeDropSet(false);
                      setIncludeMyoReps(false);
                      setIncludeIsohold(false);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-lg flex flex-col items-center gap-1 transition-all",
                    includeRestPause
                      ? "bg-cyan-600/20 border border-cyan-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <Timer className={cn("w-4 h-4", includeRestPause ? "text-cyan-400" : "text-gray-500")} />
                  <span className="text-[10px] font-medium text-white">Rest-Pause</span>
                </button>

                {/* Myo Reps */}
                <button
                  onClick={() => {
                    const newVal = !includeMyoReps;
                    setIncludeMyoReps(newVal);
                    if (newVal) {
                      setIncludeAmrap(false);
                      setIncludeDropSet(false);
                      setIncludeRestPause(false);
                      setIncludeIsohold(false);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-lg flex flex-col items-center gap-1 transition-all",
                    includeMyoReps
                      ? "bg-pink-600/20 border border-pink-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <Repeat className={cn("w-4 h-4", includeMyoReps ? "text-pink-400" : "text-gray-500")} />
                  <span className="text-[10px] font-medium text-white">Myo Reps</span>
                </button>

                {/* Isohold */}
                <button
                  onClick={() => {
                    const newVal = !includeIsohold;
                    setIncludeIsohold(newVal);
                    if (newVal) {
                      setIncludeAmrap(false);
                      setIncludeDropSet(false);
                      setIncludeRestPause(false);
                      setIncludeMyoReps(false);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-lg flex flex-col items-center gap-1 transition-all",
                    includeIsohold
                      ? "bg-emerald-600/20 border border-emerald-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <Lock className={cn("w-4 h-4", includeIsohold ? "text-emerald-400" : "text-gray-500")} />
                  <span className="text-[10px] font-medium text-white">Isohold</span>
                </button>
              </div>

              {/* ========== CONFIGURACIONES ESPECÍFICAS ========== */}
              
              {/* Drop Set config */}
              {includeDropSet && (
                <div className="p-3 rounded-lg bg-orange-950/20 border border-orange-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] text-orange-400">Cantidad de drops:</Label>
                    <div className="flex gap-1.5">
                      {["1", "2", "3"].map((n) => (
                        <button
                          key={n}
                          onClick={() => setDropSetCount(n)}
                          className={cn(
                            "w-8 h-7 rounded-lg text-xs font-medium transition-all",
                            dropSetCount === n
                              ? "bg-orange-600 text-white"
                              : "bg-[#1a1a24] text-gray-400"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-orange-400/70">Bajar peso ~20% por cada drop</p>
                </div>
              )}

              {/* Rest-Pause config */}
              {includeRestPause && (
                <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-cyan-400 mb-1 block">Mini-sets:</Label>
                      <div className="flex gap-1">
                        {["2", "3", "4"].map((n) => (
                          <button
                            key={n}
                            onClick={() => setRestPauseSets(n)}
                            className={cn(
                              "flex-1 h-7 rounded text-xs font-medium transition-all",
                              restPauseSets === n
                                ? "bg-cyan-600 text-white"
                                : "bg-[#1a1a24] text-gray-400"
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-cyan-400 mb-1 block">Descanso (seg):</Label>
                      <Input
                        value={restPauseRest}
                        onChange={(e) => setRestPauseRest(e.target.value)}
                        placeholder="10-15"
                        className="h-7 text-xs bg-[#1a1a24] border-cyan-500/30 text-white text-center"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-cyan-400/70">Hacer reps hasta fallo, descansar {restPauseRest}s, repetir {restPauseSets} veces</p>
                </div>
              )}

              {/* Myo Reps config */}
              {includeMyoReps && (
                <div className="p-3 rounded-lg bg-pink-950/20 border border-pink-500/30 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-pink-400 mb-1 block">Activación:</Label>
                      <Input
                        value={myoActivationReps}
                        onChange={(e) => setMyoActivationReps(e.target.value)}
                        placeholder="12-15"
                        className="h-7 text-xs bg-[#1a1a24] border-pink-500/30 text-white text-center"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-pink-400 mb-1 block">Mini-sets:</Label>
                      <div className="flex gap-1">
                        {["3", "4", "5"].map((n) => (
                          <button
                            key={n}
                            onClick={() => setMyoMiniSets(n)}
                            className={cn(
                              "flex-1 h-7 rounded text-xs font-medium transition-all",
                              myoMiniSets === n
                                ? "bg-pink-600 text-white"
                                : "bg-[#1a1a24] text-gray-400"
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-pink-400 mb-1 block">Reps/mini:</Label>
                      <Input
                        value={myoMiniReps}
                        onChange={(e) => setMyoMiniReps(e.target.value)}
                        placeholder="3-5"
                        className="h-7 text-xs bg-[#1a1a24] border-pink-500/30 text-white text-center"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-pink-400/70">Activación {myoActivationReps} reps + {myoMiniSets} mini-sets de {myoMiniReps} reps (5-10s descanso)</p>
                </div>
              )}

              {/* Isohold config */}
              {includeIsohold && (
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-emerald-400 mb-1 block">Segundos:</Label>
                      <Input
                        value={isoholdSeconds}
                        onChange={(e) => setIsoholdSeconds(e.target.value)}
                        placeholder="30"
                        className="h-7 text-xs bg-[#1a1a24] border-emerald-500/30 text-white text-center"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-emerald-400 mb-1 block">Posición:</Label>
                      <div className="flex gap-1">
                        {["abajo", "medio", "arriba"].map((pos) => (
                          <button
                            key={pos}
                            onClick={() => setIsoholdPosition(pos)}
                            className={cn(
                              "flex-1 h-7 rounded text-[9px] font-medium transition-all capitalize",
                              isoholdPosition === pos
                                ? "bg-emerald-600 text-white"
                                : "bg-[#1a1a24] text-gray-400"
                            )}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-emerald-400/70">Mantener {isoholdSeconds}s en posición {isoholdPosition} antes de las reps</p>
                </div>
              )}
            </div>

            {/* Superserie toggle */}
            <div className="space-y-2">
              <button
                onClick={() => setLinkWithNext(!linkWithNext)}
                className={cn(
                  "w-full p-3 rounded-lg flex items-center justify-between transition-all",
                  linkWithNext
                    ? "bg-blue-600/20 border border-blue-500/50"
                    : "bg-[#1a1a24] border border-transparent"
                )}
              >
                <div className="flex items-center gap-2">
                  <Link2 className={cn("w-4 h-4", linkWithNext ? "text-blue-400" : "text-gray-500")} />
                  <span className="text-xs font-medium text-white">Combinar con siguiente (Superserie)</span>
                </div>
                <div className={cn(
                  "w-10 h-5 rounded-full transition-all relative",
                  linkWithNext ? "bg-blue-600" : "bg-gray-700"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                    linkWithNext ? "left-5" : "left-0.5"
                  )} />
                </div>
              </button>
              {linkWithNext && (
                <p className="text-[10px] text-blue-400/70 px-1">
                  Este ejercicio se mostrará combinado con el siguiente para el alumno
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-[11px] text-gray-400 mb-1.5 block">Notas para el alumno</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Agarre supino, controlar la bajada..."
                className="bg-[#1a1a24] border-[#2a2a35] text-white min-h-[60px] text-sm"
              />
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 left-0 right-0 py-4 bg-[#13131a] border-t border-[#1e1e2a] mt-4">
            <Button
              onClick={handleSaveEditComplete}
              disabled={saving}
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Guardar cambios
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Dialog: Replicar a otros microciclos */}
      <AlertDialog open={showReplicateDialog} onOpenChange={setShowReplicateDialog}>
        <AlertDialogContent className="bg-[#13131a] border-[#1e1e2a] max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Replicar a otros microciclos?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Editaste el microciclo <span className="text-amber-500 font-medium">M{currentMicrocycle?.order}</span>. 
              ¿Querés copiar estos ejercicios (y su orden) a los microciclos posteriores 
              (M{(currentMicrocycle?.order || 0) + 1}, M{(currentMicrocycle?.order || 0) + 2}, etc)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              onClick={() => handleReplicate(false)}
              disabled={replicating}
              className="bg-[#1a1a24] border-[#2a2a35] text-white hover:bg-[#252530] hover:text-white"
            >
              No, solo este
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleReplicate(true)}
              disabled={replicating}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {replicating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Replicando...
                </>
              ) : (
                "Sí, replicar a todos"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sheet: Opciones del microciclo */}
      <Sheet open={showMicrocycleOptions} onOpenChange={setShowMicrocycleOptions}>
        <SheetContent side="bottom" className="bg-[#13131a] border-[#1e1e2a] rounded-t-2xl max-w-[480px] mx-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Opciones de M{currentMicrocycle?.order}</SheetTitle>
            <SheetDescription className="text-gray-400">
              Configurar este microciclo
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-3">
            {/* Toggle Deload */}
            <button
              onClick={handleToggleDeload}
              disabled={saving}
              className={cn(
                "w-full p-4 rounded-xl flex items-center justify-between transition-all",
                currentMicrocycle?.isDeload
                  ? "bg-blue-500/20 border border-blue-500/50"
                  : "bg-[#1a1a24] hover:bg-[#252530]"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  currentMicrocycle?.isDeload ? "bg-blue-500/30" : "bg-gray-800"
                )}>
                  <span className="text-xl">🔄</span>
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">Semana de descarga</p>
                  <p className="text-xs text-gray-400">
                    {currentMicrocycle?.isDeload 
                      ? "Este microciclo es de descarga" 
                      : "Marcar como semana de recuperación"}
                  </p>
                </div>
              </div>
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                currentMicrocycle?.isDeload 
                  ? "bg-blue-500 border-blue-500" 
                  : "border-gray-600"
              )}>
                {currentMicrocycle?.isDeload && <Check className="w-4 h-4 text-white" />}
              </div>
            </button>

            {/* Delete Microcycle */}
            {sortedMicrocycles.length > 1 && (
              <button
                onClick={handleDeleteMicrocycle}
                disabled={saving}
                className="w-full p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 flex items-center gap-3 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-red-400 font-medium">Eliminar microciclo</p>
                  <p className="text-xs text-red-400/70">Esta acción no se puede deshacer</p>
                </div>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

