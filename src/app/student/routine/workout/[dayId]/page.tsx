"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getDayById, updateSet } from "@/lib/api/routine";
import { useAuthStore } from "@/stores/auth-store";
import { useRoutineStore } from "@/stores/routine-store";
import api from "@/lib/api";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  MoreVertical,
  Timer,
  Play,
  Pause,
  RotateCcw,
  X,
  Trophy,
  History,
  Plus,
  Video,
  GripVertical,
} from "lucide-react";
import { cn, formatDateWithWeekday, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Day, Exercise, Set } from "@/types";

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
  const { activeMeso } = useRoutineStore();
  const dayId = Number(params.dayId);
  const microIndex = searchParams.get("micro") || "0";
  const backHref = `/student/routine?micro=${microIndex}`;
  const studentId = student?.id;

  // Solo puede editar si el mesociclo está activo
  const isReadOnly = activeMeso?.status !== "active";
  const readOnlyMessage = activeMeso?.status === "published" 
    ? "Esta rutina está en modo preview. Tu coach debe activarla para que puedas completar las series."
    : "Esta rutina no está activa.";

  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<Day | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  
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

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  // Video state
  const [showVideo, setShowVideo] = useState<string | null>(null);

  // Context menu state
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // History modal state
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
        const data = await getDayById(dayId);
        setDay(data);
        setExercises(data.exercises?.sort((a: Exercise, b: Exercise) => a.orden - b.orden) || []);
      } catch (error) {
        console.error("Error loading day:", error);
        toast.error("Error al cargar el entrenamiento");
      } finally {
        setLoading(false);
      }
    };

    if (dayId) loadDay();
  }, [dayId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            toast.success("¡Descanso terminado! 💪");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRestTimer = (restSeconds = 120) => {
    setTimerSeconds(restSeconds);
    setShowTimer(true);
    setTimerRunning(true);
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
                <Button variant="outline" size="icon" onClick={() => setTimerSeconds(120)}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setShowTimer(false); setTimerRunning(false); }}>
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
