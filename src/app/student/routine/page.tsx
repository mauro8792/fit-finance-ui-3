"use client";

import { PageHeader } from "@/components/navigation/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoutineLoadingSkeleton } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useRoutineStore } from "@/stores/routine-store";
import { motion } from "framer-motion";
import {
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Dumbbell,
    Play,
    Target,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function RoutinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, student } = useAuthStore();
  
  // Use routine store for caching
  const { 
    macrocycle, 
    activeMeso, 
    selectedMicroIndex, 
    isLoading: loading,
    loadRoutine,
    setSelectedMicroIndex,
  } = useRoutineStore();
  
  // Read microcycle from URL
  const microFromUrl = searchParams.get("micro");

  // Get studentId from student profile or user
  const studentId = student?.id || (user as any)?.studentId;

  // Update URL when microcycle changes (without causing reload)
  const updateMicroInUrl = (index: number) => {
    setSelectedMicroIndex(index);
    // Update URL silently using history API to avoid re-render
    window.history.replaceState(null, "", `/student/routine?micro=${index}`);
  };

  // Load data with caching
  useEffect(() => {
    if (!studentId) return;
    
    // Load routine (uses cache if valid)
    loadRoutine(studentId);
    
    // If URL has micro param, update selection
    if (microFromUrl) {
      const urlIndex = parseInt(microFromUrl);
      if (urlIndex !== selectedMicroIndex && urlIndex >= 0) {
        setSelectedMicroIndex(urlIndex);
      }
    }
  }, [studentId, microFromUrl, loadRoutine, setSelectedMicroIndex, selectedMicroIndex]);

  const currentMicro = activeMeso?.microcycles?.[selectedMicroIndex];

  // Navigation handlers
  const goToPrevMicro = () => {
    if (selectedMicroIndex > 0) {
      updateMicroInUrl(selectedMicroIndex - 1);
    }
  };

  const goToNextMicro = () => {
    if (activeMeso?.microcycles && selectedMicroIndex < activeMeso.microcycles.length - 1) {
      updateMicroInUrl(selectedMicroIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Mi Rutina" backHref="/student" />
        <RoutineLoadingSkeleton />
      </div>
    );
  }

  if (!macrocycle || !activeMeso) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Mi Rutina" backHref="/student" />
        <div className="px-4 py-8">
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text mb-2">
                Sin rutina activa
              </h3>
              <p className="text-text-muted text-sm">
                Tu entrenador está preparando tu rutina. Pronto estará lista.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isPreview = activeMeso?.status === "published";
  const isActive = activeMeso?.status === "active";

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        title={macrocycle.name} 
        subtitle="Mi Rutina Actual"
        backHref="/student" 
      />

      <div className="px-4 space-y-4">
        {/* Preview Warning Banner */}
        {isPreview && (
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🔒</div>
                <div>
                  <p className="text-sm font-medium text-amber-400">Modo Preview</p>
                  <p className="text-xs text-amber-400/80">
                    Podés ver tu rutina pero no completar series hasta que tu coach la active.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Mesocycle Badge */}
        <Card className={cn(
          "border-primary/30",
          isPreview 
            ? "bg-gradient-to-r from-amber-500/10 to-amber-600/10" 
            : "bg-gradient-to-r from-primary/20 to-accent/20"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                isPreview ? "bg-amber-500/30" : "bg-primary/30"
              )}>
                <Target className={cn(
                  "w-6 h-6",
                  isPreview ? "text-amber-400" : "text-primary"
                )} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-text">{activeMeso.name}</h2>
                  <Badge className={cn(
                    "text-xs",
                    isPreview 
                      ? "bg-amber-500/20 text-amber-400" 
                      : "bg-success/20 text-success"
                  )}>
                    {isPreview ? "Preview" : "Activo"}
                  </Badge>
                </div>
                <p className="text-sm text-text-muted">
                  {activeMeso.objetivo || "Mesociclo de entrenamiento"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Microcycle Navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={goToPrevMicro}
            disabled={selectedMicroIndex === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Microcycle Selector Pills */}
          <div className="flex-1 flex justify-center gap-1 overflow-x-auto py-1">
            {activeMeso.microcycles?.slice(
              Math.max(0, selectedMicroIndex - 2),
              Math.min(activeMeso.microcycles.length, selectedMicroIndex + 3)
            ).map((micro, idx) => {
              const realIndex = Math.max(0, selectedMicroIndex - 2) + idx;
              const isSelected = realIndex === selectedMicroIndex;
              
              return (
                <Button
                  key={micro.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "min-w-[50px] px-3",
                    isSelected && "bg-primary text-black"
                  )}
                  onClick={() => updateMicroInUrl(realIndex)}
                >
                  M{realIndex + 1}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={goToNextMicro}
            disabled={!activeMeso.microcycles || selectedMicroIndex >= activeMeso.microcycles.length - 1}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Current Microcycle Info */}
        {currentMicro && (
          <div className="text-center py-2">
            <p className="text-sm text-text-muted">
              {currentMicro.name}
              {currentMicro.isDeload && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Descarga
                </Badge>
              )}
            </p>
          </div>
        )}

        {/* Days Grid */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text-muted px-1">
            Días de entrenamiento
          </h3>
          
          {currentMicro?.days && currentMicro.days.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {currentMicro.days
                .filter((day) => !day.esDescanso && day.exercises && day.exercises.length > 0)
                .sort((a, b) => a.dia - b.dia)
                .map((day) => {
                  const totalSets = day.exercises?.reduce(
                    (acc, ex) => acc + (ex.sets?.length || 0), 0
                  ) || 0;
                  const completedSets = day.exercises?.reduce(
                    (acc, ex) => acc + (ex.sets?.filter((s) => s.status === "completed").length || 0), 0
                  ) || 0;
                  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
                  const isComplete = progress === 100;
                  const isStarted = completedSets > 0;

                  return (
                    <motion.div
                      key={day.id}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Card
                        className={cn(
                          "cursor-pointer border-2 transition-all",
                          isComplete 
                            ? "bg-success/10 border-success/50" 
                            : isStarted 
                              ? "bg-warning/10 border-warning/50"
                              : "bg-surface/80 border-border hover:border-primary/50"
                        )}
                        onClick={() => router.push(`/student/routine/workout/${day.id}?micro=${selectedMicroIndex}`)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className={cn(
                            "w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center",
                            isComplete 
                              ? "bg-success/20" 
                              : isStarted 
                                ? "bg-warning/20"
                                : "bg-primary/20"
                          )}>
                            {isComplete ? (
                              <CheckCircle2 className="w-5 h-5 text-success" />
                            ) : isStarted ? (
                              <Play className="w-5 h-5 text-warning" />
                            ) : (
                              <Dumbbell className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <p className="font-bold text-text text-lg">
                            DÍA {day.dia}
                          </p>
                          <p className="text-xs text-text-muted">
                            {day.nombre || `${day.exercises?.length || 0} ejercicios`}
                          </p>
                          {totalSets > 0 && (
                            <div className="mt-2">
                              <div className="h-1 bg-border rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all",
                                    isComplete ? "bg-success" : "bg-primary"
                                  )}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <p className="text-xs text-text-muted mt-1">
                                {completedSets}/{totalSets}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
            </div>
          ) : (
            <Card className="bg-surface/80 border-border">
              <CardContent className="p-6 text-center">
                <Calendar className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted text-sm">
                  No hay días configurados en este microciclo
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Stats */}
        {currentMicro?.days && currentMicro.days.length > 0 && (
          <Card className="bg-surface/50 border-border">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {currentMicro.days.filter((d) => !d.esDescanso && d.exercises?.length).length}
                  </p>
                  <p className="text-xs text-text-muted">Días</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text">
                    {currentMicro.days.reduce(
                      (acc, d) => acc + (d.exercises?.length || 0), 0
                    )}
                  </p>
                  <p className="text-xs text-text-muted">Ejercicios</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">
                    {currentMicro.days.reduce(
                      (acc, d) => acc + (d.exercises?.reduce(
                        (a, e) => a + (e.sets?.length || 0), 0
                      ) || 0), 0
                    )}
                  </p>
                  <p className="text-xs text-text-muted">Series</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
