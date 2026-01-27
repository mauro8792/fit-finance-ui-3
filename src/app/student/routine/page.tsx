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
import { useEffect, useState, useRef } from "react";

export default function RoutinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, student } = useAuthStore();
  
  // Use routine store for caching
  const { 
    macrocycle, 
    activeMeso, 
    routineV2,
    isV2,
    selectedMicroIndex, 
    isLoading: loading,
    loadRoutine,
    setSelectedMicroIndex,
    needsRefresh,
  } = useRoutineStore();
  
  // Read microcycle from URL
  const microFromUrl = searchParams.get("micro");

  // Get studentId from student profile or user
  const studentId = student?.id || (user as any)?.studentId;

  // Microciclos (compatibles con V1 y V2)
  const microcycles = isV2 
    ? routineV2?.microcycles || []
    : activeMeso?.microcycles || [];
  
  const currentMicro = microcycles[selectedMicroIndex];
  const routineName = isV2 ? routineV2?.name : activeMeso?.name;

  // Days carousel state
  const [daysScrollIndex, setDaysScrollIndex] = useState(0);
  const daysContainerRef = useRef<HTMLDivElement>(null);

  // Get filtered and sorted days for display
  const displayDays = currentMicro?.days
    ?.filter((day: any) => !(isV2 ? day.isRestDay : day.esDescanso) && day.exercises && day.exercises.length > 0)
    .sort((a: any, b: any) => (isV2 ? a.dayNumber : a.dia) - (isV2 ? b.dayNumber : b.dia)) || [];

  const showDaysCarousel = displayDays.length > 3;
  const maxDaysScroll = Math.max(0, displayDays.length - 3);

  // Calculate muscle group summary for current microcycle
  const getMicrocycleMuscleGroups = () => {
    if (!currentMicro?.days) return {};
    
    const muscleGroups: Record<string, number> = {};
    
    currentMicro.days.forEach((day: any) => {
      day.exercises?.forEach((exercise: any) => {
        const group = exercise.exerciseCatalog?.muscleGroup || 
                     exercise.ejercicioCatalogo?.grupoMuscular || 
                     "Sin grupo";
        muscleGroups[group] = (muscleGroups[group] || 0) + 1;
      });
    });
    
    return muscleGroups;
  };

  const muscleGroupsSummary = getMicrocycleMuscleGroups();
  const sortedMuscleGroups = Object.entries(muscleGroupsSummary).sort((a, b) => b[1] - a[1]);

  // Update URL when microcycle changes (without causing reload)
  const updateMicroInUrl = (index: number) => {
    setSelectedMicroIndex(index);
    // Update URL silently using history API to avoid re-render
    window.history.replaceState(null, "", `/student/routine?micro=${index}`);
  };

  // Load data with caching
  useEffect(() => {
    if (!studentId) return;
    
    // Load routine (uses cache if valid, or refreshes if needsRefresh is true)
    loadRoutine(studentId);
    
    // If URL has micro param, update selection
    if (microFromUrl) {
      const urlIndex = parseInt(microFromUrl);
      if (urlIndex !== selectedMicroIndex && urlIndex >= 0) {
        setSelectedMicroIndex(urlIndex);
      }
    }
  }, [studentId, microFromUrl, loadRoutine, setSelectedMicroIndex, selectedMicroIndex, needsRefresh]);

  // Navigation handlers
  const goToPrevMicro = () => {
    if (selectedMicroIndex > 0) {
      updateMicroInUrl(selectedMicroIndex - 1);
    }
  };

  const goToNextMicro = () => {
    if (microcycles && selectedMicroIndex < microcycles.length - 1) {
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

  // Check if there's any routine (V1 or V2)
  const hasRoutine = isV2 ? !!routineV2 : (!!macrocycle && !!activeMeso);

  if (!hasRoutine) {
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
        title={isV2 ? (routineV2?.name || "Mi Rutina") : (macrocycle?.name || "Mi Rutina")} 
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
                  <h2 className="font-bold text-text">{isV2 ? routineV2?.name : activeMeso?.name}</h2>
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
                  {isV2 ? (routineV2?.objective || routineV2?.description || "Rutina de entrenamiento") : (activeMeso?.objetivo || "Mesociclo de entrenamiento")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Microcycle Navigation - Simplified */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={goToPrevMicro}
            disabled={selectedMicroIndex === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Current Microcycle Display */}
          <div className="flex-1 text-center">
            <p className="font-semibold text-text">
              {isV2 ? `M${(currentMicro as any)?.order || selectedMicroIndex + 1}` : `Microciclo ${selectedMicroIndex + 1}`}
              <span className="text-text-muted font-normal ml-2">
                de {microcycles?.length || 0}
              </span>
            </p>
            {currentMicro && (
              <p className="text-sm text-text-muted flex items-center justify-center gap-2">
                {currentMicro.name}
                {currentMicro.isDeload && (
                  <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400">
                    Descarga
                  </Badge>
                )}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={goToNextMicro}
            disabled={!microcycles || selectedMicroIndex >= microcycles.length - 1}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Days Grid/Carousel */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text-muted px-1">
            Días de entrenamiento
          </h3>
          
          {displayDays.length > 0 ? (
            showDaysCarousel ? (
              /* Carousel para más de 3 días */
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setDaysScrollIndex(Math.max(0, daysScrollIndex - 1))}
                  disabled={daysScrollIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex-1 overflow-hidden" ref={daysContainerRef}>
                  <div 
                    className="flex gap-2 transition-transform duration-300"
                    style={{ transform: `translateX(-${daysScrollIndex * (100 / 3 + 2)}%)` }}
                  >
                    {displayDays.map((day: any) => (
                      <DayCard 
                        key={day.id} 
                        day={day} 
                        isV2={isV2} 
                        selectedMicroIndex={selectedMicroIndex}
                        router={router}
                        className="w-[calc(33.333%-5.33px)] shrink-0"
                      />
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setDaysScrollIndex(Math.min(maxDaysScroll, daysScrollIndex + 1))}
                  disabled={daysScrollIndex >= maxDaysScroll}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              /* Grid centrado para hasta 3 días */
              <div className={cn(
                "flex gap-2",
                displayDays.length === 1 && "justify-center",
                displayDays.length === 2 && "justify-center",
                displayDays.length === 3 && "justify-between"
              )}>
                {displayDays.map((day: any) => (
                  <DayCard 
                    key={day.id} 
                    day={day} 
                    isV2={isV2} 
                    selectedMicroIndex={selectedMicroIndex}
                    router={router}
                    className={cn(
                      displayDays.length === 1 && "w-1/2",
                      displayDays.length === 2 && "w-[calc(50%-4px)]",
                      displayDays.length === 3 && "flex-1"
                    )}
                  />
                ))}
              </div>
            )
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

        {/* Muscle group summary */}
        {sortedMuscleGroups.length > 0 && (
          <Card className="bg-surface/50 border-border">
            <CardContent className="p-3">
              <p className="text-xs text-text-muted mb-2">Grupos musculares en M{(currentMicro as any)?.order || selectedMicroIndex + 1}:</p>
              <div className="flex flex-wrap gap-2">
                {sortedMuscleGroups.map(([group, count]) => (
                  <Badge 
                    key={group} 
                    variant="outline" 
                    className="text-[10px] border-accent/30 text-accent"
                  >
                    {group}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {currentMicro?.days && currentMicro.days.length > 0 && (
          <Card className="bg-surface/50 border-border">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {currentMicro.days.filter((d) => !(d as any).esDescanso && !(d as any).isRestDay && d.exercises?.length).length}
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

// ==================== DAY CARD COMPONENT ====================
function DayCard({ 
  day, 
  isV2, 
  selectedMicroIndex, 
  router,
  className 
}: { 
  day: any; 
  isV2: boolean; 
  selectedMicroIndex: number;
  router: ReturnType<typeof useRouter>;
  className?: string;
}) {
  const totalSets = day.exercises?.reduce(
    (acc: number, ex: any) => acc + (ex.sets?.length || 0), 0
  ) || 0;
  const completedSets = day.exercises?.reduce(
    (acc: number, ex: any) => acc + (ex.sets?.filter((s: any) => 
      isV2 ? (s.isCompleted || s.completedAt) : s.status === "completed"
    ).length || 0), 0
  ) || 0;
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const isComplete = progress === 100;
  const isStarted = completedSets > 0;

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className={className}
    >
      <Card
        className={cn(
          "cursor-pointer border-2 transition-all h-full",
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
            DÍA {isV2 ? day.dayNumber : day.dia}
          </p>
          <p className="text-xs text-text-muted truncate">
            {(isV2 ? day.name : day.nombre) || `${day.exercises?.length || 0} ejercicios`}
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
}
