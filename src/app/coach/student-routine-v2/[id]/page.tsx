"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Dumbbell,
  Calendar,
  Edit,
  ChevronRight,
  ChevronDown,
  Clock,
  Play,
  CheckCircle2,
  Loader2,
  Sparkles,
  Target,
  Flame,
  ArrowDownToLine,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as routineV2Api from "@/lib/api/routine-v2";
import type { StudentMesocycle, StudentMicrocycle, StudentDay, StudentExercise } from "@/types/routine-v2";

export default function StudentRoutineV2DetailPage() {
  const router = useRouter();
  const params = useParams();
  const routineId = params.id as string;

  const [routine, setRoutine] = useState<StudentMesocycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMicro, setExpandedMicro] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Sheet para ver día
  const [showDaySheet, setShowDaySheet] = useState(false);
  const [selectedDay, setSelectedDay] = useState<StudentDay | null>(null);
  const [selectedMicroName, setSelectedMicroName] = useState("");

  useEffect(() => {
    const loadRoutine = async () => {
      try {
        setLoading(true);
        const data = await routineV2Api.getStudentRoutine(routineId);
        setRoutine(data);
        // Auto-expandir el primer microciclo
        if (data.microcycles && data.microcycles.length > 0) {
          const sorted = [...data.microcycles].sort((a, b) => a.order - b.order);
          setExpandedMicro(sorted[0].id);
        }
      } catch (err) {
        console.error("Error loading routine:", err);
        setError("Error al cargar la rutina");
      } finally {
        setLoading(false);
      }
    };

    if (routineId) {
      loadRoutine();
    }
  }, [routineId]);

  const handleActivate = async () => {
    if (!routine) return;
    setActivating(true);
    try {
      await routineV2Api.activateRoutine(routine.id);
      toast.success("Rutina activada");
      // Recargar
      const data = await routineV2Api.getStudentRoutine(routineId);
      setRoutine(data);
    } catch (err) {
      console.error("Error activating:", err);
      toast.error("Error al activar la rutina");
    } finally {
      setActivating(false);
    }
  };

  const handleDelete = async () => {
    if (!routine) return;
    
    const confirmed = window.confirm(
      `¿Eliminar la rutina "${routine.name}"?\n\nEsta acción eliminará todos los microciclos, días y ejercicios asociados. No se puede deshacer.`
    );
    
    if (!confirmed) return;
    
    setDeleting(true);
    try {
      await routineV2Api.deleteStudentRoutine(routine.id);
      toast.success("Rutina eliminada");
      router.back();
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error("Error al eliminar la rutina");
    } finally {
      setDeleting(false);
    }
  };

  const openDaySheet = (day: StudentDay, microName: string) => {
    setSelectedDay(day);
    setSelectedMicroName(microName);
    setShowDaySheet(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Rutina" backHref="/coach/students" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error || !routine) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Error" backHref="/coach/students" />
        <div className="px-4 py-8 text-center">
          <p className="text-red-400 mb-4">{error || "Rutina no encontrada"}</p>
          <Button onClick={() => router.back()}>Volver</Button>
        </div>
      </div>
    );
  }

  const isActive = routine.status === "active";
  const isScheduled = routine.status === "scheduled";
  const isCompleted = routine.status === "completed";

  const sortedMicrocycles = routine.microcycles?.slice().sort((a, b) => a.order - b.order) || [];

  // Calcular totales
  const totalExercises = sortedMicrocycles.reduce(
    (acc, m) => acc + (m.days?.reduce((a, d) => a + (d.exercises?.length || 0), 0) || 0),
    0
  );
  const totalSets = sortedMicrocycles.reduce(
    (acc, m) => acc + (m.days?.reduce((a, d) => a + (d.exercises?.reduce((a2, e) => a2 + (e.sets?.length || 0), 0) || 0), 0) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={routine.name}
        subtitle={`${sortedMicrocycles.length} microciclos`}
        backHref={`/coach/students/${routine.studentId}/routine`}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "text-xs",
              isActive && "bg-green-500/20 text-green-400",
              isScheduled && "bg-blue-500/20 text-blue-400",
              isCompleted && "bg-gray-500/20 text-gray-400"
            )}
          >
            {isActive ? "✓ Activa" : isScheduled ? "📅 Programada" : "✔️ Completada"}
          </Badge>
          {routine.sourceTemplateId && (
            <Badge variant="outline" className="text-[10px]">
              <Sparkles className="w-3 h-3 mr-1" />
              Desde plantilla
            </Badge>
          )}
        </div>

        {/* Info */}
        {routine.description && (
          <p className="text-sm text-text-muted">{routine.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-primary">{sortedMicrocycles.length}</p>
              <p className="text-[10px] text-text-muted">Microciclos</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-accent">
                {sortedMicrocycles.reduce((acc, m) => acc + (m.days?.length || 0), 0)}
              </p>
              <p className="text-[10px] text-text-muted">Días</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-purple-400">{totalExercises}</p>
              <p className="text-[10px] text-text-muted">Ejercicios</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-orange-400">{totalSets}</p>
              <p className="text-[10px] text-text-muted">Series</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => router.push(`/coach/student-routine-v2/${routineId}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Rutina
          </Button>
          {isScheduled && (
            <Button
              className="flex-1 h-12 bg-primary text-black"
              onClick={handleActivate}
              disabled={activating}
            >
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Activar Rutina
                </>
              )}
            </Button>
          )}
        </div>

        {/* Delete button - para rutinas programadas o sin macrociclo */}
        {(isScheduled || !routine.macrocycleId) && (
          <Button
            variant="outline"
            className="w-full h-10 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Rutina
              </>
            )}
          </Button>
        )}

        {/* Microcycles */}
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              Microciclos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedMicrocycles.map((micro) => {
              const isExpanded = expandedMicro === micro.id;
              const sortedDays = micro.days?.slice().sort((a, b) => a.dayNumber - b.dayNumber) || [];
              
              // Nombre legible
              const isGenericName = 
                micro.name === `M${micro.order}` || 
                micro.name === `Semana ${micro.order}` ||
                micro.name === `Microciclo ${micro.order}`;

              return (
                <div key={micro.id} className="border border-border rounded-lg overflow-hidden">
                  <div
                    className="p-3 bg-background/50 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedMicro(isExpanded ? null : micro.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-bold">
                        M{micro.order}
                      </Badge>
                      {!isGenericName && (
                        <span className="font-medium">{micro.name}</span>
                      )}
                      {micro.isDeload && (
                        <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">
                          Descarga
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {sortedDays.length} días
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-text-muted transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 space-y-2 border-t border-border">
                          {sortedDays.map((day) => (
                            <div
                              key={day.id}
                              className="p-3 bg-surface rounded-lg flex items-center justify-between cursor-pointer hover:bg-surface/80 transition-colors"
                              onClick={() => openDaySheet(day, `M${micro.order}`)}
                            >
                              <div className="flex items-center gap-2">
                                <Dumbbell className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">{day.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-text-muted">
                                  {day.exercises?.length || 0} ejercicios
                                </span>
                                <ChevronRight className="w-4 h-4 text-text-muted" />
                              </div>
                            </div>
                          ))}
                          {sortedDays.length === 0 && (
                            <p className="text-sm text-text-muted text-center py-2">
                              Sin días configurados
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {sortedMicrocycles.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">
                Sin microciclos
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Day Detail Sheet */}
      <Sheet open={showDaySheet} onOpenChange={setShowDaySheet}>
        <SheetContent side="bottom" className="h-[85vh] bg-background rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              {selectedDay?.name}
            </SheetTitle>
            <SheetDescription>
              {selectedMicroName} · {selectedDay?.exercises?.length || 0} ejercicios
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100%-100px)]">
            {!selectedDay?.exercises || selectedDay.exercises.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No hay ejercicios en este día</p>
              </div>
            ) : (
              <div className="space-y-4 pb-8">
                {selectedDay.exercises
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((exercise, idx) => (
                    <ExerciseCard key={exercise.id} exercise={exercise} index={idx} />
                  ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ==================== EXERCISE CARD ====================
function ExerciseCard({ exercise, index }: { exercise: StudentExercise; index: number }) {
  const exerciseName = exercise.exerciseCatalog?.name || `Ejercicio ${exercise.exerciseCatalogId}`;
  const muscleGroup = exercise.exerciseCatalog?.muscleGroup;
  const sortedSets = exercise.sets?.slice().sort((a, b) => a.order - b.order) || [];

  return (
    <Card className="bg-surface/80 border-border">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{index + 1}</span>
            </div>
            <div>
              <h4 className="font-semibold">{exerciseName}</h4>
              {muscleGroup && (
                <Badge variant="secondary" className="text-[10px] mt-1">
                  {muscleGroup}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Sets */}
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-2 text-[10px] text-text-muted px-2">
            <span>Serie</span>
            <span className="text-center">Reps</span>
            <span className="text-center">Peso</span>
            <span className="text-center">RIR</span>
            <span className="text-center">Descanso</span>
          </div>
          
          {sortedSets.map((set, setIdx) => (
            <div
              key={set.id}
              className={cn(
                "grid grid-cols-5 gap-2 p-2 rounded-lg text-sm",
                set.isDropSet && "bg-orange-500/10 border border-orange-500/20",
                set.isAmrap && "bg-purple-500/10 border border-purple-500/20",
                !set.isDropSet && !set.isAmrap && "bg-background/50"
              )}
            >
              <div className="flex items-center gap-1">
                <span className="text-text-muted">{setIdx + 1}</span>
                {set.isAmrap && (
                  <Flame className="w-3 h-3 text-purple-400" />
                )}
                {set.isDropSet && (
                  <ArrowDownToLine className="w-3 h-3 text-orange-400" />
                )}
              </div>
              <span className="text-center font-medium">
                {set.isAmrap ? "AMRAP" : set.targetReps || "-"}
              </span>
              <span className="text-center">
                {set.targetLoad ? `${set.targetLoad}kg` : "-"}
              </span>
              <span className="text-center">
                {set.targetRir !== null && set.targetRir !== undefined ? set.targetRir : "-"}
              </span>
              <span className="text-center text-text-muted">
                {set.restSeconds ? `${Math.floor(set.restSeconds / 60)}:${String(set.restSeconds % 60).padStart(2, '0')}` : "-"}
              </span>
            </div>
          ))}
          
          {sortedSets.length === 0 && (
            <p className="text-xs text-text-muted text-center py-2">
              Sin series configuradas
            </p>
          )}
        </div>

        {/* Notes */}
        {exercise.coachNotes && (
          <div className="mt-3 p-2 bg-background/50 rounded-lg">
            <p className="text-xs text-text-muted">
              📝 {exercise.coachNotes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
