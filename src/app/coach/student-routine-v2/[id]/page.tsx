"use client";

import { PageHeader } from "@/components/navigation/PageHeader";
import { MicrocycleMetrics } from "@/components/routine/MicrocycleMetrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { getMacrocyclesByStudent } from "@/lib/api/routine";
import * as routineV2Api from "@/lib/api/routine-v2";
import { cn } from "@/lib/utils";
import type { Macrocycle } from "@/types";
import type { StudentDay, StudentExercise, StudentMesocycle, StudentMicrocycle } from "@/types/routine-v2";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowDownToLine,
    Battery, BatteryFull, BatteryLow, BatteryMedium,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    Dumbbell,
    Edit,
    Flame,
    FolderPlus,
    Loader2,
    Play,
    Sparkles,
    Target,
    Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  
  // Modal para vincular/activar con macrociclo
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [loadingMacrocycles, setLoadingMacrocycles] = useState(false);
  const [linking, setLinking] = useState(false);
  const [selectedMacrocycleId, setSelectedMacrocycleId] = useState<number | "new" | null>(null);
  const [newMacrocycleName, setNewMacrocycleName] = useState("");

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

  // Abrir modal de activación
  const openActivateModal = async () => {
    if (!routine) return;
    setShowActivateModal(true);
    setSelectedMacrocycleId(null);
    setNewMacrocycleName(routine.name || "");
    setLoadingMacrocycles(true);
    try {
      const data = await getMacrocyclesByStudent(routine.studentId);
      setMacrocycles(data);
    } catch (err) {
      console.error("Error loading macrocycles:", err);
    } finally {
      setLoadingMacrocycles(false);
    }
  };

  // Activar con macrociclo
  const handleActivateWithMacrocycle = async () => {
    if (!routine || !selectedMacrocycleId) {
      toast.error("Seleccioná un macrociclo");
      return;
    }

    setActivating(true);
    try {
      let macrocycleId: number;
      
      if (selectedMacrocycleId === "new") {
        // Crear nuevo macrociclo
        const newMacro = await api.post("/macrocycle", {
          name: newMacrocycleName || routine.name,
          studentId: routine.studentId,
          startDate: new Date().toISOString().split('T')[0],
        });
        macrocycleId = newMacro.data.id;
      } else {
        macrocycleId = selectedMacrocycleId;
      }

      await routineV2Api.activateRoutine(routine.id, macrocycleId);
      toast.success("¡Rutina activada!", {
        description: selectedMacrocycleId === "new" 
          ? `Se creó el macrociclo "${newMacrocycleName || routine.name}"`
          : "Rutina activada y vinculada al macrociclo"
      });
      
      setShowActivateModal(false);
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

  const openLinkModal = async () => {
    if (!routine) return;
    setShowLinkModal(true);
    setLoadingMacrocycles(true);
    try {
      const data = await getMacrocyclesByStudent(routine.studentId);
      setMacrocycles(data);
    } catch (err) {
      console.error("Error loading macrocycles:", err);
      toast.error("Error al cargar macrociclos");
    } finally {
      setLoadingMacrocycles(false);
    }
  };

  const handleLinkToMacrocycle = async (macrocycleId: number) => {
    if (!routine) return;
    setLinking(true);
    try {
      await routineV2Api.updateStudentRoutine(routine.id, { macrocycleId });
      toast.success("Rutina vinculada al macrociclo");
      setShowLinkModal(false);
      // Recargar rutina
      const data = await routineV2Api.getStudentRoutine(routineId);
      setRoutine(data);
    } catch (err) {
      console.error("Error linking:", err);
      toast.error("Error al vincular");
    } finally {
      setLinking(false);
    }
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
              onClick={openActivateModal}
            >
              <Play className="w-4 h-4 mr-2" />
              Activar Rutina
            </Button>
          )}
        </div>

        {/* Vincular a macrociclo si no tiene */}
        {!routine.macrocycleId && (
          <Button
            variant="outline"
            className="w-full h-10 text-accent border-accent/30 hover:bg-accent/10"
            onClick={openLinkModal}
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Vincular a Macrociclo
          </Button>
        )}

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
                        <div className="p-3 space-y-3 border-t border-border">
                          {/* Métricas del microciclo */}
                          <MicrocycleMetrics 
                            microcycle={micro} 
                            isV2={true} 
                            showChart={true}
                          />
                          
                          {/* Lista de días */}
                          <div className="space-y-2">
                            <p className="text-xs text-text-muted font-medium px-1">Días de entrenamiento</p>
                            {sortedDays.map((day) => (
                              <div
                                key={day.id}
                                className="p-3 bg-surface rounded-lg cursor-pointer hover:bg-surface/80 transition-colors"
                                onClick={() => openDaySheet(day, `M${micro.order}`)}
                              >
                                <div className="flex items-center justify-between">
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
                                
                                {/* Mostrar PRS y Esfuerzo si existen */}
                                {(day.readinessPre || day.postWorkoutEffort) && (
                                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                                    {day.readinessPre && (
                                      <div className="flex items-center gap-1.5">
                                        <BatteryMedium className={cn(
                                          "w-3.5 h-3.5",
                                          day.readinessPre >= 7 ? "text-emerald-400" :
                                          day.readinessPre >= 4 ? "text-amber-400" : "text-red-400"
                                        )} />
                                        <span className="text-[10px] text-text-muted">
                                          PRS: <span className={cn(
                                            "font-medium",
                                            day.readinessPre >= 7 ? "text-emerald-400" :
                                            day.readinessPre >= 4 ? "text-amber-400" : "text-red-400"
                                          )}>{day.readinessPre}</span>
                                        </span>
                                      </div>
                                    )}
                                    {day.postWorkoutEffort && (
                                      <div className="flex items-center gap-1.5">
                                        <Flame className={cn(
                                          "w-3.5 h-3.5",
                                          day.postWorkoutEffort >= 8 ? "text-red-400" :
                                          day.postWorkoutEffort >= 5 ? "text-amber-400" : "text-emerald-400"
                                        )} />
                                        <span className="text-[10px] text-text-muted">
                                          Esfuerzo: <span className={cn(
                                            "font-medium",
                                            day.postWorkoutEffort >= 8 ? "text-red-400" :
                                            day.postWorkoutEffort >= 5 ? "text-amber-400" : "text-emerald-400"
                                          )}>{day.postWorkoutEffort}</span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            {sortedDays.length === 0 && (
                              <p className="text-sm text-text-muted text-center py-2">
                                Sin días configurados
                              </p>
                            )}
                          </div>
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
            {/* Métricas del día */}
            {selectedDay && selectedDay.exercises && selectedDay.exercises.length > 0 && (
              <div className="mb-4 space-y-3">
                {/* PRS y Esfuerzo si existen */}
                {(selectedDay.readinessPre || selectedDay.postWorkoutEffort) && (
                  <Card className="bg-surface/50 border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-4">
                        {selectedDay.readinessPre && (
                          <div className="flex items-center gap-2">
                            <BatteryMedium className={cn(
                              "w-4 h-4",
                              selectedDay.readinessPre >= 7 ? "text-emerald-400" :
                              selectedDay.readinessPre >= 4 ? "text-amber-400" : "text-red-400"
                            )} />
                            <span className="text-xs text-text-muted">
                              PRS: <span className={cn(
                                "font-bold text-sm",
                                selectedDay.readinessPre >= 7 ? "text-emerald-400" :
                                selectedDay.readinessPre >= 4 ? "text-amber-400" : "text-red-400"
                              )}>{selectedDay.readinessPre}</span>/10
                            </span>
                          </div>
                        )}
                        {selectedDay.postWorkoutEffort && (
                          <div className="flex items-center gap-2">
                            <Flame className={cn(
                              "w-4 h-4",
                              selectedDay.postWorkoutEffort >= 8 ? "text-red-400" :
                              selectedDay.postWorkoutEffort >= 5 ? "text-amber-400" : "text-emerald-400"
                            )} />
                            <span className="text-xs text-text-muted">
                              Esfuerzo: <span className={cn(
                                "font-bold text-sm",
                                selectedDay.postWorkoutEffort >= 8 ? "text-red-400" :
                                selectedDay.postWorkoutEffort >= 5 ? "text-amber-400" : "text-emerald-400"
                              )}>{selectedDay.postWorkoutEffort}</span>/10
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Grupos musculares del día */}
                <Card className="bg-surface/50 border-border">
                  <CardContent className="p-3">
                    <p className="text-xs text-text-muted mb-2 flex items-center gap-1">
                      <span>💪</span> Grupos musculares
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(() => {
                        const muscleGroups: Record<string, number> = {};
                        selectedDay.exercises?.forEach(ex => {
                          const group = ex.exerciseCatalog?.muscleGroup || "Otro";
                          muscleGroups[group] = (muscleGroups[group] || 0) + 1;
                        });
                        return Object.entries(muscleGroups)
                          .sort((a, b) => b[1] - a[1])
                          .map(([group, count]) => (
                            <Badge 
                              key={group}
                              variant="outline" 
                              className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] py-0.5 px-1.5"
                            >
                              {group}: {count}
                            </Badge>
                          ));
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

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

      {/* Sheet para vincular a macrociclo */}
      <Sheet open={showLinkModal} onOpenChange={setShowLinkModal}>
        <SheetContent side="bottom" className="h-[60vh] bg-background rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-accent" />
              Vincular a Macrociclo
            </SheetTitle>
            <SheetDescription>
              Seleccioná un macrociclo para vincular esta rutina
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100%-100px)]">
            {loadingMacrocycles ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : macrocycles.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No hay macrociclos disponibles</p>
                <p className="text-xs mt-2">
                  Podés crear uno desde la vista de rutinas del alumno
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-8">
                {macrocycles.map((macro) => (
                  <Card
                    key={macro.id}
                    className="bg-surface/80 border-border cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => !linking && handleLinkToMacrocycle(macro.id)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{macro.name}</p>
                        <p className="text-xs text-text-muted">
                          {macro.mesocycles?.length || 0} mesociclos
                        </p>
                      </div>
                      {linking ? (
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-text-muted" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Sheet para activar con macrociclo */}
      <Sheet open={showActivateModal} onOpenChange={setShowActivateModal}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] bg-background rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Activar Rutina
            </SheetTitle>
            <SheetDescription>
              Seleccioná a qué macrociclo pertenecerá esta rutina
            </SheetDescription>
          </SheetHeader>

          {loadingMacrocycles ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {/* Opción: Crear nuevo macrociclo */}
              <div
                className={cn(
                  "p-4 rounded-lg border-2 cursor-pointer transition-all",
                  selectedMacrocycleId === "new"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setSelectedMacrocycleId("new")}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    selectedMacrocycleId === "new" ? "bg-primary/20" : "bg-surface"
                  )}>
                    <FolderPlus className={cn(
                      "w-5 h-5",
                      selectedMacrocycleId === "new" ? "text-primary" : "text-text-muted"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Crear nuevo macrociclo</p>
                    <p className="text-xs text-text-muted">
                      Se creará un nuevo macrociclo para esta rutina
                    </p>
                  </div>
                  {selectedMacrocycleId === "new" && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
                
                {selectedMacrocycleId === "new" && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Label htmlFor="activateNewMacroName" className="text-sm">
                      Nombre del macrociclo
                    </Label>
                    <Input
                      id="activateNewMacroName"
                      value={newMacrocycleName}
                      onChange={(e) => setNewMacrocycleName(e.target.value)}
                      placeholder="Ej: Bloque de Hipertrofia 2026"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Macrociclos existentes */}
              {macrocycles.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Target className="w-4 h-4" />
                    <span>O agregá a un macrociclo existente</span>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {macrocycles.map((macro) => (
                      <div
                        key={macro.id}
                        className={cn(
                          "p-3 rounded-lg border-2 cursor-pointer transition-all",
                          selectedMacrocycleId === macro.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => setSelectedMacrocycleId(macro.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Target className={cn(
                              "w-5 h-5",
                              selectedMacrocycleId === macro.id ? "text-primary" : "text-text-muted"
                            )} />
                            <div>
                              <p className="font-medium">{macro.name}</p>
                              <p className="text-xs text-text-muted">
                                {macro.mesocycles?.length || 0} mesociclos
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!macro.endDate && (
                              <Badge className="bg-primary/20 text-primary text-[10px]">
                                Activo
                              </Badge>
                            )}
                            {selectedMacrocycleId === macro.id && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <SheetFooter className="border-t border-border pt-4">
            <Button
              onClick={handleActivateWithMacrocycle}
              disabled={!selectedMacrocycleId || activating}
              className="w-full h-12 bg-primary text-black"
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
          </SheetFooter>
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
