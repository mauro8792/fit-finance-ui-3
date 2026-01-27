"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dumbbell,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  Flame,
  ArrowDownToLine,
  Info,
  Lock,
  Loader2,
  AlertCircle,
  Timer,
  Repeat,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useActiveRoutine } from "@/hooks/useRoutineV2";
import * as routineV2Api from "@/lib/api/routine-v2";
import type { StudentDay, StudentExercise, StudentSet } from "@/types/routine-v2";

// ==================== TYPES ====================
interface LocalExercise extends StudentExercise {
  expanded: boolean;
}

// ==================== COMPONENT ====================
export default function StudentRoutineV2Page() {
  const router = useRouter();
  const { student } = useAuthStore();
  const studentId = student?.id;
  
  const { routine, loading, error, refetch } = useActiveRoutine(studentId || null);
  
  const [currentMicroIndex, setCurrentMicroIndex] = useState(0);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [saving, setSaving] = useState(false);

  // Get current day
  const currentMicrocycle = routine?.microcycles?.[currentMicroIndex];
  const currentDay = currentMicrocycle?.days?.[currentDayIndex];

  // Sync exercises when day changes
  useEffect(() => {
    if (currentDay?.exercises) {
      setExercises(currentDay.exercises.map(e => ({ ...e, expanded: true })));
    } else {
      setExercises([]);
    }
  }, [currentDay]);

  // Toggle exercise expanded
  const toggleExpand = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId ? { ...e, expanded: !e.expanded } : e
      )
    );
  };

  // Update set locally
  const updateSetLocally = (
    exerciseId: string,
    setId: string,
    field: keyof StudentSet,
    value: string | number | boolean | unknown[]
  ) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, [field]: value } : s
              ),
            }
          : e
      )
    );
  };

  // Update mini-set for Rest-Pause or Myo Reps
  const updateMiniSetLocally = (
    exerciseId: string,
    setId: string,
    type: 'restPause' | 'myoReps',
    index: number,
    value: string
  ) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s) => {
                if (s.id !== setId) return s;
                
                if (type === 'restPause') {
                  const newData = [...(s.restPauseData || [])];
                  newData[index] = { actualReps: value };
                  return { ...s, restPauseData: newData };
                } else {
                  const newData = [...(s.myoMiniSetsData || [])];
                  newData[index] = { actualReps: value };
                  return { ...s, myoMiniSetsData: newData };
                }
              }),
            }
          : e
      )
    );
  };

  // Log set to API
  const handleLogSet = async (setId: string, exerciseId: string) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    const set = exercise?.sets.find(s => s.id === setId);
    
    if (!set || !set.actualReps) {
      toast.error("Ingresá las repeticiones realizadas");
      return;
    }

    setSaving(true);
    try {
      await routineV2Api.logSet(setId, {
        actualReps: parseInt(String(set.actualReps)),
        actualLoad: set.actualLoad ? parseFloat(String(set.actualLoad)) : undefined,
        actualRir: set.actualRir ? parseInt(String(set.actualRir)) : undefined,
        notes: set.notes,
      });
      
      // Update local state
      updateSetLocally(exerciseId, setId, 'isCompleted', true);
      toast.success("Serie registrada");
    } catch (err) {
      console.error("Error logging set:", err);
      toast.error("Error al registrar serie");
    } finally {
      setSaving(false);
    }
  };

  // Complete day
  const handleCompleteDay = async () => {
    if (!currentDay) return;
    
    setSaving(true);
    try {
      await routineV2Api.completeDay(currentDay.id);
      await refetch();
      toast.success("¡Día completado!");
    } catch (err) {
      console.error("Error completing day:", err);
      toast.error("Error al completar el día");
    } finally {
      setSaving(false);
    }
  };

  // Count completed sets
  const completedSets = exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.isCompleted).length,
    0
  );
  const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Mi Rutina" backHref="/student" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  // Error or no routine
  if (error || !routine) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Mi Rutina" backHref="/student" />
        <div className="px-4 py-8">
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted mb-2">
                {error || "No tenés una rutina activa"}
              </p>
              <p className="text-sm text-text-muted">
                Tu coach debe asignarte una rutina para que puedas verla acá.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if routine is scheduled (not active yet)
  const isPreview = routine.status === 'scheduled';

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={currentDay?.name || "Mi Rutina"}
        subtitle={`${completedSets}/${totalSets} series completadas`}
        backHref="/student"
      />

      <div className="px-4 py-4 space-y-4">
        {/* Week/Day navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {routine.microcycles?.map((m, mIdx) => (
            <Badge
              key={m.id}
              variant={mIdx === currentMicroIndex ? "default" : "outline"}
              className={cn(
                "cursor-pointer shrink-0",
                mIdx === currentMicroIndex && "bg-primary text-black"
              )}
              onClick={() => {
                setCurrentMicroIndex(mIdx);
                setCurrentDayIndex(0);
              }}
            >
              M{m.weekNumber}
            </Badge>
          ))}
        </div>

        {/* Day selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {currentMicrocycle?.days?.map((day, dIdx) => (
            <Button
              key={day.id}
              variant={dIdx === currentDayIndex ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentDayIndex(dIdx)}
              className={cn(
                "shrink-0 min-w-[70px]",
                dIdx === currentDayIndex && "bg-accent text-black",
                day.isCompleted && "border-accent/50"
              )}
            >
              {day.name}
              {day.isCompleted && <Check className="w-3 h-3 ml-1" />}
            </Button>
          ))}
        </div>

        {/* Fecha */}
        <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
          <Calendar className="w-4 h-4" />
          <span>{routine.name}</span>
        </div>

        {/* Banner Preview */}
        {isPreview && (
          <Card className="bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-3 flex items-start gap-3">
              <Lock className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-text">
                  Esta rutina está en <strong>modo preview</strong>. Tu coach debe activarla para que puedas completar las series.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Day completed banner */}
        {currentDay?.isCompleted && (
          <Card className="bg-accent/10 border-accent/30">
            <CardContent className="p-3 flex items-center gap-3">
              <Check className="w-5 h-5 text-accent" />
              <p className="text-sm text-text">¡Este día ya fue completado!</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {exercises.length === 0 && (
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-8 text-center">
              <Dumbbell className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted">No hay ejercicios para este día</p>
            </CardContent>
          </Card>
        )}

        {/* Lista de ejercicios */}
        {exercises.map((exercise, exIdx) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            isPreview={isPreview}
            saving={saving}
            isLinkedWithPrevious={exIdx > 0 && exercises[exIdx - 1]?.linkWithNext}
            onToggleExpand={() => toggleExpand(exercise.id)}
            onUpdateSet={(setId, field, value) => updateSetLocally(exercise.id, setId, field, value)}
            onUpdateMiniSet={(setId, type, index, value) => updateMiniSetLocally(exercise.id, setId, type, index, value)}
            onLogSet={(setId) => handleLogSet(setId, exercise.id)}
          />
        ))}

        {/* Botón finalizar */}
        {!isPreview && !currentDay?.isCompleted && exercises.length > 0 && (
          <Button 
            className="w-full h-14 bg-accent text-black font-semibold"
            onClick={handleCompleteDay}
            disabled={saving || completedSets < totalSets}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Check className="w-5 h-5 mr-2" />
            )}
            Finalizar entrenamiento
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================== EXERCISE CARD ====================
function ExerciseCard({
  exercise,
  isPreview,
  saving,
  isLinkedWithPrevious,
  onToggleExpand,
  onUpdateSet,
  onUpdateMiniSet,
  onLogSet,
}: {
  exercise: LocalExercise;
  isPreview: boolean;
  saving: boolean;
  isLinkedWithPrevious?: boolean;
  onToggleExpand: () => void;
  onUpdateSet: (setId: string, field: keyof StudentSet, value: string | number | boolean | unknown[]) => void;
  onUpdateMiniSet: (setId: string, type: 'restPause' | 'myoReps', index: number, value: string) => void;
  onLogSet: (setId: string) => void;
}) {
  const exerciseName = exercise.exerciseCatalog?.name || `Ejercicio ${exercise.exerciseCatalogId}`;
  const muscleGroup = exercise.exerciseCatalog?.muscleGroup;
  const isSuperset = exercise.linkWithNext || isLinkedWithPrevious;

  return (
    <Card className={cn(
      "bg-surface/80 border-border overflow-hidden",
      isSuperset && "border-l-2 border-l-blue-500"
    )}>
      {/* Superset indicator */}
      {isLinkedWithPrevious && (
        <div className="px-4 py-1 bg-blue-500/10 flex items-center gap-2">
          <Link2 className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] text-blue-400 font-medium">SUPERSERIE</span>
        </div>
      )}

      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <Dumbbell className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-text">{exerciseName}</h3>
            <p className="text-xs text-text-muted">
              {muscleGroup} · {exercise.sets.length} series
              {exercise.linkWithNext && (
                <span className="text-blue-400 ml-1">· Continúa abajo ↓</span>
              )}
            </p>
          </div>
        </div>
        {exercise.expanded ? (
          <ChevronUp className="w-5 h-5 text-text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-text-muted" />
        )}
      </div>

      {/* Coach Notes */}
      {exercise.expanded && exercise.coachNotes && (
        <div className="px-4 pb-2">
          <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">{exercise.coachNotes}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      {exercise.expanded && exercise.notes && (
        <div className="px-4 pb-2">
          <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">{exercise.notes}</p>
          </div>
        </div>
      )}

      {/* Sets table */}
      {exercise.expanded && (
        <div className="px-4 pb-4">
          {/* Header */}
          <div className="grid grid-cols-6 gap-1 text-[10px] font-medium text-primary bg-primary/10 rounded-t-lg p-2">
            <span className="text-center">TÉCNICA</span>
            <span className="text-center">REPS</span>
            <span className="text-center">CARGA</span>
            <span className="text-center">RIR</span>
            <span className="text-center col-span-2">ACCIÓN</span>
          </div>

          {/* Sets */}
          {exercise.sets.map((set, setIdx) => (
            <SetRow
              key={set.id}
              set={set}
              setNumber={setIdx + 1}
              isPreview={isPreview}
              saving={saving}
              onUpdate={(field, value) => onUpdateSet(set.id, field, value)}
              onUpdateMiniSet={(type, index, value) => onUpdateMiniSet(set.id, type, index, value)}
              onLog={() => onLogSet(set.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ==================== SET ROW ====================
function SetRow({
  set,
  setNumber,
  isPreview,
  saving,
  onUpdate,
  onLog,
  onUpdateMiniSet,
}: {
  set: StudentSet;
  setNumber: number;
  isPreview: boolean;
  saving: boolean;
  onUpdate: (field: keyof StudentSet, value: string | number | boolean) => void;
  onLog: () => void;
  onUpdateMiniSet?: (type: 'restPause' | 'myoReps', index: number, value: string) => void;
}) {
  const isAmrap = set.isAmrap || set.targetReps === 'AMRAP';
  const isDropSet = set.isDropSet;
  const isRestPause = set.isRestPause;
  const isMyoReps = set.isMyoReps;
  const isIsohold = set.isIsohold;

  // Determine background color based on technique
  const getBgClass = () => {
    if (set.isCompleted) return "bg-accent/10";
    if (isAmrap) return "bg-purple-500/5";
    if (isDropSet) return "bg-orange-500/5";
    if (isRestPause) return "bg-cyan-500/5";
    if (isMyoReps) return "bg-pink-500/5";
    if (isIsohold) return "bg-emerald-500/5";
    return "";
  };

  return (
    <div className="border-b border-border">
      {/* Main row */}
      <div
        className={cn(
          "grid grid-cols-6 gap-1 p-2 items-center",
          getBgClass()
        )}
      >
        {/* Objetivo / Técnica */}
        <div className="text-center">
          {isAmrap ? (
            <Badge className="bg-purple-500 text-white text-[10px] px-1">
              <Flame className="w-3 h-3 mr-0.5" />
              MAX
            </Badge>
          ) : isRestPause ? (
            <Badge className="bg-cyan-500 text-white text-[10px] px-1">
              <Timer className="w-3 h-3 mr-0.5" />
              R-P
            </Badge>
          ) : isMyoReps ? (
            <Badge className="bg-pink-500 text-white text-[10px] px-1">
              <Repeat className="w-3 h-3 mr-0.5" />
              MYO
            </Badge>
          ) : isIsohold ? (
            <Badge className="bg-emerald-500 text-white text-[10px] px-1">
              <Lock className="w-3 h-3 mr-0.5" />
              ISO
            </Badge>
          ) : (
            <span className="text-sm font-medium">{set.targetReps}</span>
          )}
          {isDropSet && (
            <Badge className="bg-orange-500 text-white text-[8px] px-1 ml-1">
              <ArrowDownToLine className="w-2 h-2" />
            </Badge>
          )}
        </div>

        {/* REPS Real */}
        <Input
          type="text"
          inputMode="numeric"
          value={set.actualReps || ""}
          onChange={(e) => onUpdate("actualReps", e.target.value)}
          className={cn(
            "h-8 text-center text-sm p-1",
            set.isCompleted && "text-accent font-medium",
            isPreview && "opacity-50"
          )}
          disabled={isPreview || set.isCompleted}
          placeholder={isMyoReps ? set.myoActivationReps || "-" : "-"}
        />

        {/* CARGA */}
        <Input
          type="text"
          inputMode="decimal"
          value={set.actualLoad || ""}
          onChange={(e) => onUpdate("actualLoad", e.target.value)}
          className={cn(
            "h-8 text-center text-sm p-1",
            set.isCompleted && "text-accent font-medium",
            isPreview && "opacity-50"
          )}
          disabled={isPreview || set.isCompleted}
          placeholder={set.targetLoad?.toString() || "-"}
        />

        {/* RIR */}
        <Input
          type="text"
          inputMode="numeric"
          value={set.actualRir || ""}
          onChange={(e) => onUpdate("actualRir", e.target.value)}
          className={cn(
            "h-8 text-center text-sm p-1",
            set.isCompleted && "text-accent font-medium",
            isPreview && "opacity-50"
          )}
          disabled={isPreview || set.isCompleted}
          placeholder={set.targetRir?.toString() || "-"}
        />

        {/* Action */}
        <div className="col-span-2 flex justify-center">
          {set.isCompleted ? (
            <Badge variant="outline" className="border-accent text-accent text-[10px]">
              <Check className="w-3 h-3 mr-1" /> Hecho
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onLog}
              disabled={isPreview || saving}
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Check className="w-3 h-3 mr-1" /> Log
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Rest-Pause mini-sets */}
      {isRestPause && set.restPauseSets && (
        <div className="px-2 pb-2 bg-cyan-500/5">
          <p className="text-[10px] text-cyan-400 mb-1">
            Mini-sets ({set.restPauseSets}x) - Descanso: {set.restPauseRest || "10-15"}s
          </p>
          <div className="flex gap-1">
            {Array.from({ length: set.restPauseSets }, (_, i) => (
              <Input
                key={i}
                type="text"
                inputMode="numeric"
                value={set.restPauseData?.[i]?.actualReps || ""}
                onChange={(e) => onUpdateMiniSet?.('restPause', i, e.target.value)}
                className="h-7 w-12 text-center text-xs p-1 bg-cyan-950/30 border-cyan-500/30"
                disabled={isPreview || set.isCompleted}
                placeholder={`#${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Myo Reps mini-sets */}
      {isMyoReps && set.myoMiniSets && (
        <div className="px-2 pb-2 bg-pink-500/5">
          <p className="text-[10px] text-pink-400 mb-1">
            Activación: {set.myoActivationReps} + {set.myoMiniSets} mini-sets de {set.myoMiniReps}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: set.myoMiniSets }, (_, i) => (
              <Input
                key={i}
                type="text"
                inputMode="numeric"
                value={set.myoMiniSetsData?.[i]?.actualReps || ""}
                onChange={(e) => onUpdateMiniSet?.('myoReps', i, e.target.value)}
                className="h-7 w-12 text-center text-xs p-1 bg-pink-950/30 border-pink-500/30"
                disabled={isPreview || set.isCompleted}
                placeholder={`#${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Isohold info */}
      {isIsohold && (
        <div className="px-2 pb-2 bg-emerald-500/5">
          <p className="text-[10px] text-emerald-400">
            Mantener {set.isoholdSeconds}s en posición {set.isoholdPosition} + completar reps
          </p>
        </div>
      )}

      {/* Drop set rows */}
      {isDropSet && set.dropSetCount && (
        <div className="bg-orange-500/5">
          {Array.from({ length: set.dropSetCount }, (_, i) => (
            <div
              key={i}
              className="grid grid-cols-6 gap-1 px-2 py-1 items-center border-l-2 border-l-orange-500/50"
            >
              <span className="text-[10px] text-orange-400 text-center">↳ Drop {i + 1}</span>
              <Input
                type="text"
                inputMode="numeric"
                value={set.dropSetData?.[i]?.reps || ""}
                onChange={(e) => {
                  const newData = [...(set.dropSetData || [])];
                  newData[i] = { ...newData[i], reps: e.target.value };
                  onUpdate("dropSetData" as keyof StudentSet, newData as unknown as string);
                }}
                className="h-7 text-center text-xs p-1 bg-orange-950/30 border-orange-500/30"
                disabled={isPreview || set.isCompleted}
                placeholder="reps"
              />
              <Input
                type="text"
                inputMode="decimal"
                value={set.dropSetData?.[i]?.load || ""}
                onChange={(e) => {
                  const newData = [...(set.dropSetData || [])];
                  newData[i] = { ...newData[i], load: parseFloat(e.target.value) || undefined };
                  onUpdate("dropSetData" as keyof StudentSet, newData as unknown as string);
                }}
                className="h-7 text-center text-xs p-1 bg-orange-950/30 border-orange-500/30"
                disabled={isPreview || set.isCompleted}
                placeholder={set.dropSetTargets?.[i]?.targetLoad?.toString() || "kg"}
              />
              <span className="col-span-3" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
