"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  ArrowLeft,
  Play,
  GripVertical,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================
interface SetRecord {
  id: string;
  setNumber: number;
  targetReps: string;
  targetKg?: string;
  targetRir?: string;
  targetRpe?: string;
  rest?: string;
  isAmrap?: boolean;
  isDropSet?: boolean;
  dropSetCount?: number;
  actualReps?: string;
  actualKg?: string;
  actualRirR?: string;
  actualRpe?: string;
  drops?: {
    id: string;
    actualReps?: string;
    actualKg?: string;
  }[];
}

interface ExerciseRecord {
  id: string;
  name: string;
  muscleGroup?: string;
  targetReps?: string;
  rest?: string;
  sets: SetRecord[];
  notes?: string;
  expanded: boolean;
}

// ==================== MOCK DATA ====================
const mockExercises: ExerciseRecord[] = [
  {
    id: "e1",
    name: "Jalón al pecho",
    muscleGroup: "Espalda",
    targetReps: "10-12",
    rest: "2",
    notes: "Agarre ancho, llevar al pecho",
    expanded: true,
    sets: [
      { id: "s1", setNumber: 1, targetReps: "12", targetKg: "50", targetRir: "—", targetRpe: "7", actualReps: "12", actualKg: "50", actualRirR: "7", actualRpe: "7" },
      { id: "s2", setNumber: 2, targetReps: "12", targetKg: "50", targetRir: "—", targetRpe: "7", actualReps: "12", actualKg: "50", actualRirR: "7", actualRpe: "7" },
      { id: "s3", setNumber: 3, targetReps: "12", targetKg: "50", targetRir: "—", targetRpe: "7", actualReps: "12", actualKg: "50", actualRirR: "7", actualRpe: "7" },
    ],
  },
  {
    id: "e2",
    name: "Remo con barra",
    muscleGroup: "Espalda",
    targetReps: "10",
    rest: "2",
    notes: "Última serie AMRAP - dar todo hasta el fallo técnico",
    expanded: true,
    sets: [
      { id: "s4", setNumber: 1, targetReps: "10", targetKg: "60", targetRir: "2", targetRpe: "—" },
      { id: "s5", setNumber: 2, targetReps: "10", targetKg: "60", targetRir: "2", targetRpe: "—" },
      { id: "s6", setNumber: 3, targetReps: "AMRAP", targetKg: "50", targetRir: "—", targetRpe: "—", isAmrap: true },
    ],
  },
  {
    id: "e3",
    name: "Curl de bíceps con mancuernas",
    muscleGroup: "Bíceps",
    targetReps: "12",
    rest: "90s",
    notes: "Última serie con 2 drop sets - bajar peso un 20% en cada drop",
    expanded: true,
    sets: [
      { id: "s7", setNumber: 1, targetReps: "12", targetKg: "15", targetRir: "2", targetRpe: "—" },
      { id: "s8", setNumber: 2, targetReps: "12", targetKg: "15", targetRir: "2", targetRpe: "—" },
      { 
        id: "s9", 
        setNumber: 3, 
        targetReps: "12", 
        targetKg: "15", 
        targetRir: "1", 
        targetRpe: "—",
        isDropSet: true,
        dropSetCount: 2,
        drops: [
          { id: "d1", actualReps: "", actualKg: "" },
          { id: "d2", actualReps: "", actualKg: "" },
        ]
      },
    ],
  },
];

// Helper: check if a set is completed (has actual data)
const isSetCompleted = (set: SetRecord) => {
  return !!(set.actualReps && set.actualKg);
};

// Helper: check if exercise is completed (all sets have data)
const isExerciseCompleted = (exercise: ExerciseRecord) => {
  return exercise.sets.every(isSetCompleted);
};

// ==================== COMPONENT ====================
export default function DemoStudentRoutinePage() {
  const [exercises, setExercises] = useState<ExerciseRecord[]>(mockExercises);
  const [isActive, setIsActive] = useState(false);

  const toggleExpand = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId ? { ...e, expanded: !e.expanded } : e
      )
    );
  };

  const updateSet = (
    exerciseId: string,
    setId: string,
    field: keyof SetRecord,
    value: string | boolean
  ) => {
    if (!isActive) return;
    
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

  const updateDrop = (
    exerciseId: string,
    setId: string,
    dropId: string,
    field: "actualReps" | "actualKg",
    value: string
  ) => {
    if (!isActive) return;
    
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId
                  ? {
                      ...s,
                      drops: s.drops?.map((d) =>
                        d.id === dropId ? { ...d, [field]: value } : d
                      ),
                    }
                  : s
              ),
            }
          : e
      )
    );
  };

  // Count completed sets (sets with actual data)
  const completedSets = exercises.reduce(
    (acc, e) => acc + e.sets.filter(isSetCompleted).length,
    0
  );
  const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0d0d12] border-b border-[#1a1a24]">
        <div className="flex items-center gap-4 p-4">
          <button className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white">Día 3</h1>
            <p className="text-xs text-gray-500">{completedSets}/{totalSets} series completadas</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Fecha */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>mié, 5 nov 25</span>
        </div>

        {/* Banner Preview */}
        {!isActive && (
          <div className="bg-[#2a1f0d] border border-[#4a3520] rounded-lg p-3 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-gray-300">
                Esta rutina está en modo preview. Tu coach debe activarla para que puedas completar las series.
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-7 text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 px-2"
                onClick={() => setIsActive(true)}
              >
                <Play className="w-3 h-3 mr-1" />
                Simular activación
              </Button>
            </div>
          </div>
        )}

        {/* Lista de ejercicios */}
        {exercises.map((exercise) => {
          const exerciseCompleted = isExerciseCompleted(exercise);
          
          return (
            <Card 
              key={exercise.id} 
              className={cn(
                "bg-[#13131a] border-[#1e1e2a] overflow-hidden",
                exerciseCompleted && "border-l-2 border-l-emerald-500/50"
              )}
            >
              {/* Header del ejercicio */}
              <div
                className="p-3 flex items-start justify-between cursor-pointer"
                onClick={() => toggleExpand(exercise.id)}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-gray-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-sm text-white">{exercise.name}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {exercise.muscleGroup} · {exercise.sets.length} series · Reps: {exercise.targetReps} · Descanso: {exercise.rest}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {exerciseCompleted && (
                    <Check className="w-4 h-4 text-emerald-500" />
                  )}
                  <MoreVertical className="w-4 h-4 text-gray-600" />
                </div>
              </div>

              {/* Notas del coach */}
              {exercise.expanded && exercise.notes && (
                <div className="px-3 pb-2">
                  <div className="flex items-start gap-2 p-2 bg-blue-950/30 rounded border border-blue-900/30">
                    <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-300/80">{exercise.notes}</p>
                  </div>
                </div>
              )}

              {/* Tabla de series */}
              {exercise.expanded && (
                <div className="px-3 pb-3">
                  {/* Header de tabla - estilo como la imagen */}
                  <div className="grid grid-cols-6 gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500 bg-amber-500/10 rounded-t p-2">
                    <span className="text-center">Reps</span>
                    <span className="text-center">Real</span>
                    <span className="text-center">Carga</span>
                    <span className="text-center">RIR-E</span>
                    <span className="text-center">RIR-R</span>
                    <span className="text-center">RPE</span>
                  </div>

                  {/* Filas de series */}
                  {exercise.sets.map((set) => {
                    const setCompleted = isSetCompleted(set);
                    
                    return (
                      <div key={set.id}>
                        {/* Serie principal */}
                        <div
                          className={cn(
                            "grid grid-cols-6 gap-1 py-2.5 px-2 border-b border-[#1e1e2a] items-center",
                            set.isAmrap && "bg-purple-950/20",
                            set.isDropSet && "bg-orange-950/20"
                          )}
                        >
                          {/* REPS objetivo */}
                          <div className="text-center flex items-center justify-center gap-1">
                            {set.isAmrap ? (
                              <Badge className="bg-purple-600/80 text-white text-[9px] px-1.5 py-0.5 font-semibold">
                                <Flame className="w-3 h-3 mr-0.5" />
                                MAX
                              </Badge>
                            ) : (
                              <span className="text-sm text-white">{set.targetReps}</span>
                            )}
                            {set.isDropSet && (
                              <Badge className="bg-orange-600/80 text-white text-[8px] px-1 py-0.5">
                                <ArrowDownToLine className="w-3 h-3" />
                              </Badge>
                            )}
                          </div>

                          {/* REAL - muestra valor o input según si está activo */}
                          {isActive ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={set.actualReps || ""}
                              onChange={(e) => updateSet(exercise.id, set.id, "actualReps", e.target.value)}
                              className="w-full h-7 text-center text-sm bg-transparent border-b border-gray-700 text-amber-400 focus:outline-none focus:border-amber-500"
                              placeholder="—"
                            />
                          ) : (
                            <span className={cn(
                              "text-center text-sm",
                              set.actualReps ? "text-amber-400" : "text-gray-600"
                            )}>
                              {set.actualReps || "—"}
                            </span>
                          )}

                          {/* CARGA */}
                          {isActive ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={set.actualKg || ""}
                              onChange={(e) => updateSet(exercise.id, set.id, "actualKg", e.target.value)}
                              className="w-full h-7 text-center text-sm bg-transparent border-b border-gray-700 text-white focus:outline-none focus:border-amber-500"
                              placeholder={set.targetKg || "—"}
                            />
                          ) : (
                            <span className={cn(
                              "text-center text-sm font-medium",
                              set.actualKg ? "text-white" : "text-gray-600"
                            )}>
                              {set.actualKg || set.targetKg || "—"}
                            </span>
                          )}

                          {/* RIR-E (esperado) */}
                          <span className="text-center text-sm text-gray-500">
                            {set.targetRir || "—"}
                          </span>

                          {/* RIR-R (real) */}
                          {isActive ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={set.actualRirR || ""}
                              onChange={(e) => updateSet(exercise.id, set.id, "actualRirR", e.target.value)}
                              className="w-full h-7 text-center text-sm bg-transparent border-b border-gray-700 text-amber-400 focus:outline-none focus:border-amber-500"
                              placeholder="—"
                            />
                          ) : (
                            <span className={cn(
                              "text-center text-sm",
                              set.actualRirR ? "text-amber-400" : "text-gray-600"
                            )}>
                              {set.actualRirR || "—"}
                            </span>
                          )}

                          {/* RPE */}
                          {isActive ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={set.actualRpe || ""}
                              onChange={(e) => updateSet(exercise.id, set.id, "actualRpe", e.target.value)}
                              className="w-full h-7 text-center text-sm bg-transparent border-b border-gray-700 text-amber-400 focus:outline-none focus:border-amber-500"
                              placeholder="—"
                            />
                          ) : (
                            <span className={cn(
                              "text-center text-sm",
                              set.actualRpe ? "text-amber-400" : "text-gray-600"
                            )}>
                              {set.actualRpe || "—"}
                            </span>
                          )}
                        </div>

                        {/* Drop Sets (si aplica) */}
                        {set.isDropSet && set.drops && (
                          <div className="bg-orange-950/10 ml-4 border-l border-orange-600/30">
                            <div className="px-3 py-1.5 border-b border-[#1e1e2a]">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-500/80">
                                Drop Sets - Bajar peso y seguir
                              </span>
                            </div>
                            {set.drops.map((drop, dropIdx) => (
                              <div
                                key={drop.id}
                                className="grid grid-cols-6 gap-1 py-2 px-3 border-b border-[#1e1e2a]/50 items-center"
                              >
                                {/* Label Drop */}
                                <div className="text-center">
                                  <span className="text-[11px] text-orange-500">
                                    ↳ D{dropIdx + 1}
                                  </span>
                                </div>

                                {/* REAL (reps del drop) */}
                                {isActive ? (
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={drop.actualReps || ""}
                                    onChange={(e) =>
                                      updateDrop(exercise.id, set.id, drop.id, "actualReps", e.target.value)
                                    }
                                    className="w-full h-7 text-center text-sm bg-transparent border-b border-orange-700/50 text-orange-400 focus:outline-none focus:border-orange-500"
                                    placeholder="—"
                                  />
                                ) : (
                                  <span className="text-center text-sm text-gray-600">—</span>
                                )}

                                {/* KG (del drop) */}
                                {isActive ? (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={drop.actualKg || ""}
                                    onChange={(e) =>
                                      updateDrop(exercise.id, set.id, drop.id, "actualKg", e.target.value)
                                    }
                                    className="w-full h-7 text-center text-sm bg-transparent border-b border-orange-700/50 text-white focus:outline-none focus:border-orange-500"
                                    placeholder="—"
                                  />
                                ) : (
                                  <span className="text-center text-sm text-gray-600">—</span>
                                )}

                                {/* Espacios vacíos */}
                                <span className="text-center text-gray-700">—</span>
                                <span className="text-center text-gray-700">—</span>
                                <span className="text-center text-gray-700">—</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}

        {/* Leyenda */}
        <Card className="bg-[#13131a] border-[#1e1e2a]">
          <CardContent className="p-3">
            <p className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Leyenda</p>
            <div className="flex flex-wrap gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Badge className="bg-purple-600/80 text-white text-[8px] px-1">
                  <Flame className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-gray-400">AMRAP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-orange-600/80 text-white text-[8px] px-1">
                  <ArrowDownToLine className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-gray-400">Drop Set</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 mt-2">
              RIR-E: esperado · RIR-R: real
            </p>
          </CardContent>
        </Card>

        {/* Botón finalizar */}
        <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
          <Check className="w-4 h-4 mr-2" />
          Finalizar entrenamiento
        </Button>
      </div>
    </div>
  );
}

