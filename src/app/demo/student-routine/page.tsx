"use client";

import { useState } from "react";
import { motion, PanInfo } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Check,
  Flame,
  ArrowDownToLine,
  Info,
  Lock,
  ArrowLeft,
  Play,
  GripVertical,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Timer,
  Repeat,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================
type SetType = "normal" | "amrap" | "dropset" | "restpause" | "myoreps" | "isohold";

interface SetRecord {
  id: string;
  setNumber: number;
  targetReps: string;
  targetKg?: string;
  targetRir?: string;
  targetRpe?: string;
  rest?: string;
  // Para superseries fusionadas - nombre del ejercicio de esta serie
  exerciseName?: string;
  exerciseColor?: "blue" | "green"; // Color para diferenciar ejercicios en superserie
  setMuscleGroup?: string; // Grupo muscular de esta serie (para superseries y análisis)
  // Tipo de técnica
  type?: SetType;
  isAmrap?: boolean;
  isDropSet?: boolean;
  dropSetCount?: number;
  // Rest-Pause
  restPauseSets?: number;
  restPauseRest?: string;
  // Myo Reps
  myoActivationReps?: string;
  myoMiniSets?: number;
  myoMiniReps?: string;
  // Isohold
  isoholdSeconds?: string;
  isoholdPosition?: string;
  // Datos del alumno
  actualReps?: string;
  actualKg?: string;
  actualRirR?: string;
  actualRpe?: string;
  drops?: {
    id: string;
    targetKg?: string;
    actualReps?: string;
    actualKg?: string;
  }[];
  // Mini-series para Myo Reps (alumno completa)
  myoMiniSetsActual?: {
    id: string;
    actualReps?: string;
  }[];
  // Mini-series para Rest-Pause (alumno completa)
  restPauseSetsActual?: {
    id: string;
    actualReps?: string;
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
  showingRegister: boolean;
  linkWithNext?: boolean; // Para superseries separadas (viejo)
  isSuperset?: boolean; // Para superseries fusionadas (nuevo)
}

// ==================== MOCK DATA ====================
// Ejemplo completo con todas las técnicas de alta intensidad y superseries
const mockExercises: ExerciseRecord[] = [
  // ========== SUPERSERIE FUSIONADA: Press banca + Jalón (6 series alternadas) ==========
  {
    id: "e1",
    name: "Press banca + Jalón",
    muscleGroup: "Pectoral / Espalda",
    targetReps: "10-12",
    rest: "2",
    notes: "SUPERSERIE: Alternar entre Press y Jalón sin descanso. Descansar 2 min después de cada par.",
    expanded: true,
    showingRegister: false,
    isSuperset: true,
    sets: [
      // Serie 1: Press
      { id: "s1", setNumber: 1, targetReps: "12", targetKg: "60", targetRir: "2", exerciseName: "Press", exerciseColor: "blue", setMuscleGroup: "Pectoral", actualReps: "12", actualKg: "60", actualRirR: "2", actualRpe: "8" },
      // Serie 2: Jalón
      { id: "s2", setNumber: 2, targetReps: "12", targetKg: "50", targetRir: "2", exerciseName: "Jalón", exerciseColor: "green", setMuscleGroup: "Dorsal", actualReps: "12", actualKg: "50", actualRirR: "2", actualRpe: "8" },
      // Serie 3: Press
      { id: "s3", setNumber: 3, targetReps: "10", targetKg: "60", targetRir: "1", exerciseName: "Press", exerciseColor: "blue", setMuscleGroup: "Pectoral", actualReps: "10", actualKg: "60", actualRirR: "1", actualRpe: "9" },
      // Serie 4: Jalón
      { id: "s4", setNumber: 4, targetReps: "10", targetKg: "50", targetRir: "1", exerciseName: "Jalón", exerciseColor: "green", setMuscleGroup: "Dorsal", actualReps: "10", actualKg: "50", actualRirR: "1", actualRpe: "9" },
      // Serie 5: Press
      { id: "s5", setNumber: 5, targetReps: "10", targetKg: "60", targetRir: "0", exerciseName: "Press", exerciseColor: "blue", setMuscleGroup: "Pectoral", actualReps: "", actualKg: "", actualRirR: "", actualRpe: "" },
      // Serie 6: Jalón
      { id: "s6", setNumber: 6, targetReps: "10", targetKg: "50", targetRir: "0", exerciseName: "Jalón", exerciseColor: "green", setMuscleGroup: "Dorsal" },
    ],
  },
  // ========== MYO REPS ==========
  {
    id: "e3",
    name: "Curl de bíceps",
    muscleGroup: "Bíceps",
    targetReps: "Myo Reps",
    rest: "2-3",
    notes: "Técnica Myo Reps: Serie de activación 12-15 reps + 4 mini-series de 3-5 reps con 5-10s de descanso.",
    expanded: true,
    showingRegister: false,
    sets: [
      { id: "s7", setNumber: 1, targetReps: "10-12", targetKg: "15", targetRir: "2" },
      { 
        id: "s8", 
        setNumber: 2, 
        targetReps: "12-15", 
        targetKg: "12", 
        targetRir: "0",
        type: "myoreps",
        myoActivationReps: "12-15",
        myoMiniSets: 4,
        myoMiniReps: "3-5",
        myoMiniSetsActual: [
          { id: "myo1", actualReps: "" },
          { id: "myo2", actualReps: "" },
          { id: "myo3", actualReps: "" },
          { id: "myo4", actualReps: "" },
        ],
      },
    ],
  },
  // ========== REST-PAUSE ==========
  {
    id: "e4",
    name: "Press militar",
    muscleGroup: "Hombros",
    targetReps: "Rest-Pause",
    rest: "2-3",
    notes: "Técnica Rest-Pause: Hacer reps hasta RIR 0-1, descansar 10-15s, repetir 3 veces.",
    expanded: true,
    showingRegister: false,
    sets: [
      { id: "s9", setNumber: 1, targetReps: "10-12", targetKg: "30", targetRir: "2" },
      { 
        id: "s10", 
        setNumber: 2, 
        targetReps: "8-10", 
        targetKg: "30", 
        targetRir: "0",
        type: "restpause",
        restPauseSets: 3,
        restPauseRest: "10-15",
        restPauseSetsActual: [
          { id: "rp1", actualReps: "" },
          { id: "rp2", actualReps: "" },
          { id: "rp3", actualReps: "" },
        ],
      },
    ],
  },
  // ========== ISOHOLD ==========
  {
    id: "e5",
    name: "Sentadilla",
    muscleGroup: "Cuádriceps",
    targetReps: "8-10",
    rest: "2-3",
    notes: "Última serie con Isohold: Mantener 30 segundos en posición abajo antes de las reps.",
    expanded: true,
    showingRegister: false,
    sets: [
      { id: "s11", setNumber: 1, targetReps: "10", targetKg: "60", targetRir: "2" },
      { id: "s12", setNumber: 2, targetReps: "10", targetKg: "60", targetRir: "1" },
      { 
        id: "s13", 
        setNumber: 3, 
        targetReps: "8-10", 
        targetKg: "60", 
        targetRir: "0",
        type: "isohold",
        isoholdSeconds: "30",
        isoholdPosition: "abajo",
      },
    ],
  },
  // ========== DROP SET ==========
  {
    id: "e6",
    name: "Extensión de tríceps",
    muscleGroup: "Tríceps",
    targetReps: "12-15",
    rest: "2",
    notes: "Última serie con Drop Set: 3 drops bajando peso.",
    expanded: true,
    showingRegister: false,
    sets: [
      { id: "s14", setNumber: 1, targetReps: "12", targetKg: "25", targetRir: "2" },
      { id: "s15", setNumber: 2, targetReps: "12", targetKg: "25", targetRir: "1" },
      { 
        id: "s16", 
        setNumber: 3, 
        targetReps: "12-15", 
        targetKg: "25", 
        targetRir: "0", 
        type: "dropset",
        isDropSet: true,
        dropSetCount: 3,
        drops: [
          { id: "d1", targetKg: "20", actualReps: "", actualKg: "" },
          { id: "d2", targetKg: "15", actualReps: "", actualKg: "" },
          { id: "d3", targetKg: "10", actualReps: "", actualKg: "" },
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

// Helper: count completed sets in an exercise
const countCompletedSets = (exercise: ExerciseRecord) => {
  return exercise.sets.filter(isSetCompleted).length;
};

// ==================== SWIPEABLE EXERCISE CARD ====================
interface SwipeableExerciseCardProps {
  exercise: ExerciseRecord;
  isActive: boolean;
  onToggleView: (exerciseId: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, field: keyof SetRecord, value: string) => void;
  onUpdateDrop: (exerciseId: string, setId: string, dropId: string, field: "actualReps" | "actualKg", value: string) => void;
  onUpdateMyoMiniSet: (exerciseId: string, setId: string, miniSetId: string, value: string) => void;
  onUpdateRestPauseMiniSet: (exerciseId: string, setId: string, miniSetId: string, value: string) => void;
}

function SwipeableExerciseCard({
  exercise,
  isActive,
  onToggleView,
  onUpdateSet,
  onUpdateDrop,
  onUpdateMyoMiniSet,
  onUpdateRestPauseMiniSet,
}: SwipeableExerciseCardProps) {
  const exerciseCompleted = isExerciseCompleted(exercise);
  const completedCount = countCompletedSets(exercise);
  const showingRegister = exercise.showingRegister;
  
  // Verificar si hay carga sugerida en algún set
  const hasSuggestedWeight = exercise.sets.some(set => set.targetKg);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold && !showingRegister) {
      // Swipe left -> show register
      onToggleView(exercise.id);
    } else if (info.offset.x > threshold && showingRegister) {
      // Swipe right -> show consigna
      onToggleView(exercise.id);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Container con overflow hidden para el efecto de swipe */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="cursor-grab active:cursor-grabbing"
      >
        {/* Grid que contiene ambas cards para mantener altura consistente */}
        <div className="grid">
          {/* ==================== CARD CONSIGNA (PLANIFICACIÓN) ==================== */}
          <div 
            className={cn(
              "col-start-1 row-start-1 transition-opacity duration-200 h-full",
              showingRegister ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <Card 
              className={cn(
                "bg-[#13131a] border-[#1e1e2a] overflow-hidden relative h-full flex flex-col",
                exerciseCompleted && "border-l-2 border-l-emerald-500/50"
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
              {exercise.notes && (
                <div className="px-3 pb-2">
                  <div className="flex items-start gap-2 p-2 bg-blue-950/30 rounded border border-blue-900/30">
                    <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-300/80">{exercise.notes}</p>
                  </div>
                </div>
              )}

              {/* Tabla de consigna (solo planificación) - columnas dinámicas */}
              <div className="px-3 pb-3 flex-1">
                <div className={cn(
                  "grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500 bg-amber-500/10 rounded-t p-2",
                  exercise.isSuperset ? "grid-cols-6" : (hasSuggestedWeight ? "grid-cols-5" : "grid-cols-4")
                )}>
                  <span className="text-center">Serie</span>
                  {exercise.isSuperset && <span className="text-center">Ejercicio</span>}
                  <span className="text-center">Reps</span>
                  {hasSuggestedWeight && <span className="text-center">Carga</span>}
                  <span className="text-center">RIR</span>
                  <span className="text-center">Desc</span>
                </div>

                {exercise.sets.map((set) => {
                  // Detectar si el texto de reps o carga es especial (no numérico)
                  const isSpecialReps = set.targetReps && isNaN(Number(set.targetReps.replace('-', '')));
                  const isSpecialKg = set.targetKg && isNaN(Number(set.targetKg.replace('.', '').replace(',', '')));
                  
                  return (
                    <div
                      key={set.id}
                      className={cn(
                        "grid gap-1 py-2.5 px-2 border-b border-[#1e1e2a] items-center",
                        exercise.isSuperset ? "grid-cols-6" : (hasSuggestedWeight ? "grid-cols-5" : "grid-cols-4"),
                        set.isAmrap && "bg-purple-950/20",
                        set.isDropSet && "bg-orange-950/20",
                        // Colores para superserie
                        set.exerciseColor === "blue" && "bg-blue-950/20 border-l-2 border-l-blue-500",
                        set.exerciseColor === "green" && "bg-green-950/20 border-l-2 border-l-green-500"
                      )}
                    >
                      <span className="text-center text-sm text-gray-400">{set.setNumber}</span>
                      {/* Nombre del ejercicio y grupo muscular en superserie */}
                      {exercise.isSuperset && (
                        <div className="text-center flex flex-col">
                          <span className={cn(
                            "text-[11px] font-medium",
                            set.exerciseColor === "blue" && "text-blue-400",
                            set.exerciseColor === "green" && "text-green-400"
                          )}>
                            {set.exerciseName}
                          </span>
                          <span className="text-[9px] text-gray-500">{set.setMuscleGroup}</span>
                        </div>
                      )}
                      <div className="text-center flex items-center justify-center gap-1">
                        {set.isAmrap || set.type === "amrap" ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge className="bg-purple-600/80 text-white text-[9px] px-1.5 py-0.5 font-semibold">
                              <Flame className="w-3 h-3 mr-0.5" />
                              AMRAP
                            </Badge>
                            {isSpecialReps && (
                              <span className="text-[9px] text-purple-400 italic">{set.targetReps}</span>
                            )}
                          </div>
                        ) : set.type === "restpause" ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge className="bg-cyan-600/80 text-white text-[8px] px-1.5 py-0.5 font-semibold">
                              <Timer className="w-2.5 h-2.5 mr-0.5" />
                              RP {set.restPauseSets}x
                            </Badge>
                            <span className="text-[8px] text-cyan-400">{set.restPauseRest}s desc</span>
                          </div>
                        ) : set.type === "myoreps" ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge className="bg-pink-600/80 text-white text-[8px] px-1.5 py-0.5 font-semibold">
                              <Repeat className="w-2.5 h-2.5 mr-0.5" />
                              MYO
                            </Badge>
                            <span className="text-[8px] text-pink-400">{set.myoActivationReps} + {set.myoMiniSets}x{set.myoMiniReps}</span>
                          </div>
                        ) : set.type === "isohold" ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge className="bg-emerald-600/80 text-white text-[8px] px-1.5 py-0.5 font-semibold">
                              <Lock className="w-2.5 h-2.5 mr-0.5" />
                              {set.isoholdSeconds}s
                            </Badge>
                            <span className="text-[8px] text-emerald-400">{set.isoholdPosition}</span>
                          </div>
                        ) : (
                          <span className={cn(
                            "text-sm",
                            isSpecialReps ? "text-amber-400 italic text-[11px]" : "text-white"
                          )}>{set.targetReps}</span>
                        )}
                        {(set.isDropSet || set.type === "dropset") && (
                          <Badge className="bg-orange-600/80 text-white text-[8px] px-1 ml-1">
                            <ArrowDownToLine className="w-2.5 h-2.5" />
                          </Badge>
                        )}
                      </div>
                      {hasSuggestedWeight && (
                        <span className={cn(
                          "text-center text-sm font-medium",
                          isSpecialKg ? "text-cyan-400 italic text-[10px]" : "text-white"
                        )}>{set.targetKg || "—"}</span>
                      )}
                      <span className="text-center text-sm text-gray-500">{set.targetRir || "—"}</span>
                      <span className="text-center text-sm text-gray-500">{exercise.rest}&apos;</span>
                    </div>
                  );
                })}
              </div>

              {/* Botón para ir a registro */}
              <div className="px-3 pb-3">
                <Button 
                  variant="outline" 
                  className="w-full h-9 text-xs border-gray-700 text-gray-400 hover:bg-gray-800"
                  onClick={() => onToggleView(exercise.id)}
                >
                  Ir a registro
                  <ChevronLeft className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </Card>
          </div>

          {/* ==================== CARD REGISTRO (EJECUCIÓN DEL ALUMNO) ==================== */}
          <div 
            className={cn(
              "col-start-1 row-start-1 transition-opacity duration-200 h-full",
              showingRegister ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <Card 
              className={cn(
                "bg-[#13131a] border-[#1e1e2a] overflow-hidden relative border-l-2 border-l-amber-500/50 h-full flex flex-col",
                exerciseCompleted && "border-l-emerald-500"
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
                      <h3 className="font-medium text-sm text-white">Mi Registro - {exercise.name}</h3>
                      {exerciseCompleted && (
                        <Check className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-amber-500/80 mt-0.5">
                      Completá tus series · {completedCount}/{exercise.sets.length} hechas
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabla de registro - solo campos que el alumno completa */}
              <div className="px-3 pb-3 flex-1">
                <div className={cn(
                  "grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500 bg-amber-500/10 rounded-t p-2",
                  exercise.isSuperset ? "grid-cols-6" : "grid-cols-5"
                )}>
                  <span className="text-center">Serie</span>
                  {exercise.isSuperset && <span className="text-center">Ejercicio</span>}
                  <span className="text-center">Reps</span>
                  <span className="text-center">Carga</span>
                  <span className="text-center">RIR</span>
                  <span className="text-center">RPE</span>
                </div>

                {exercise.sets.map((set) => (
                  <div key={set.id}>
                    <div
                      className={cn(
                        "grid gap-1 py-2.5 px-2 border-b border-[#1e1e2a] items-center",
                        exercise.isSuperset ? "grid-cols-6" : "grid-cols-5",
                        set.isAmrap && "bg-purple-950/20",
                        set.isDropSet && "bg-orange-950/20",
                        // Colores para superserie
                        set.exerciseColor === "blue" && "bg-blue-950/20 border-l-2 border-l-blue-500",
                        set.exerciseColor === "green" && "bg-green-950/20 border-l-2 border-l-green-500"
                      )}
                    >
                      {/* Serie número */}
                      <span className="text-center text-sm text-gray-400">{set.setNumber}</span>
                      {/* Nombre del ejercicio y grupo muscular en superserie */}
                      {exercise.isSuperset && (
                        <div className="text-center flex flex-col">
                          <span className={cn(
                            "text-[11px] font-medium",
                            set.exerciseColor === "blue" && "text-blue-400",
                            set.exerciseColor === "green" && "text-green-400"
                          )}>
                            {set.exerciseName}
                          </span>
                          <span className="text-[9px] text-gray-500">{set.setMuscleGroup}</span>
                        </div>
                      )}

                      {/* REPS - input editable */}
                      {isActive ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={set.actualReps || ""}
                          onChange={(e) => onUpdateSet(exercise.id, set.id, "actualReps", e.target.value)}
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

                      {/* CARGA - input editable */}
                      {isActive ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={set.actualKg || ""}
                          onChange={(e) => onUpdateSet(exercise.id, set.id, "actualKg", e.target.value)}
                          className="w-full h-7 text-center text-sm bg-transparent border-b border-gray-700 text-white font-medium focus:outline-none focus:border-amber-500"
                          placeholder={set.targetKg || "—"}
                        />
                      ) : (
                        <span className={cn(
                          "text-center text-sm font-medium",
                          set.actualKg ? "text-white" : "text-gray-600"
                        )}>
                          {set.actualKg || "—"}
                        </span>
                      )}

                      {/* RIR - input editable */}
                      {isActive ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={set.actualRirR || ""}
                          onChange={(e) => onUpdateSet(exercise.id, set.id, "actualRirR", e.target.value)}
                          className="w-full h-7 text-center text-sm bg-transparent border-b border-gray-700 text-emerald-400 focus:outline-none focus:border-amber-500"
                          placeholder="—"
                        />
                      ) : (
                        <span className={cn(
                          "text-center text-sm",
                          set.actualRirR ? "text-emerald-400" : "text-gray-600"
                        )}>
                          {set.actualRirR || "—"}
                        </span>
                      )}

                      {/* RPE - input editable */}
                      {isActive ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={set.actualRpe || ""}
                          onChange={(e) => onUpdateSet(exercise.id, set.id, "actualRpe", e.target.value)}
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
                    {(set.isDropSet || set.type === "dropset") && set.drops && (
                      <div className="bg-orange-950/10 ml-4 border-l border-orange-600/30">
                        <div className="px-3 py-1.5 border-b border-[#1e1e2a]">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-500/80">
                            Drop Sets - Bajar peso y seguir
                          </span>
                        </div>
                        {set.drops.map((drop, dropIdx) => (
                          <div
                            key={drop.id}
                            className="grid grid-cols-5 gap-1 py-2 px-3 border-b border-[#1e1e2a]/50 items-center"
                          >
                            {/* Label Drop */}
                            <div className="text-center">
                              <span className="text-[11px] text-orange-500">↳ D{dropIdx + 1}</span>
                            </div>

                            {/* REPS (del drop) */}
                            {isActive ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={drop.actualReps || ""}
                                onChange={(e) => onUpdateDrop(exercise.id, set.id, drop.id, "actualReps", e.target.value)}
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
                                onChange={(e) => onUpdateDrop(exercise.id, set.id, drop.id, "actualKg", e.target.value)}
                                className="w-full h-7 text-center text-sm bg-transparent border-b border-orange-700/50 text-white focus:outline-none focus:border-orange-500"
                                placeholder={drop.targetKg || "—"}
                              />
                            ) : (
                              <span className="text-center text-sm text-gray-600">—</span>
                            )}

                            {/* Espacios vacíos */}
                            <span className="text-center text-gray-700">—</span>
                            <span className="text-center text-gray-700">—</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Myo Reps Mini-series (si aplica) */}
                    {set.type === "myoreps" && set.myoMiniSetsActual && (
                      <div className="bg-pink-950/10 ml-4 border-l border-pink-600/30">
                        <div className="px-3 py-1.5 border-b border-[#1e1e2a]">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-pink-500/80">
                            Mini-series Myo ({set.myoMiniReps} reps c/u, 5-10s descanso)
                          </span>
                        </div>
                        {set.myoMiniSetsActual.map((miniSet, idx) => (
                          <div
                            key={miniSet.id}
                            className="grid grid-cols-5 gap-1 py-2 px-3 border-b border-[#1e1e2a]/50 items-center"
                          >
                            {/* Label Mini-set */}
                            <div className="text-center">
                              <span className="text-[11px] text-pink-500">↳ M{idx + 1}</span>
                            </div>

                            {/* REPS */}
                            {isActive ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={miniSet.actualReps || ""}
                                onChange={(e) => onUpdateMyoMiniSet(exercise.id, set.id, miniSet.id, e.target.value)}
                                className="w-full h-7 text-center text-sm bg-transparent border-b border-pink-700/50 text-pink-400 focus:outline-none focus:border-pink-500"
                                placeholder={set.myoMiniReps || "—"}
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

                    {/* Rest-Pause Mini-series (si aplica) */}
                    {set.type === "restpause" && set.restPauseSetsActual && (
                      <div className="bg-cyan-950/10 ml-4 border-l border-cyan-600/30">
                        <div className="px-3 py-1.5 border-b border-[#1e1e2a]">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-500/80">
                            Rest-Pause ({set.restPauseRest}s descanso entre sets)
                          </span>
                        </div>
                        {set.restPauseSetsActual.map((rpSet, idx) => (
                          <div
                            key={rpSet.id}
                            className="grid grid-cols-5 gap-1 py-2 px-3 border-b border-[#1e1e2a]/50 items-center"
                          >
                            {/* Label Rest-Pause set */}
                            <div className="text-center">
                              <span className="text-[11px] text-cyan-500">↳ RP{idx + 1}</span>
                            </div>

                            {/* REPS */}
                            {isActive ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={rpSet.actualReps || ""}
                                onChange={(e) => onUpdateRestPauseMiniSet(exercise.id, set.id, rpSet.id, e.target.value)}
                                className="w-full h-7 text-center text-sm bg-transparent border-b border-cyan-700/50 text-cyan-400 focus:outline-none focus:border-cyan-500"
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
                ))}
              </div>

              {/* Botón guardar y volver */}
              <div className="px-3 pb-3">
                <Button 
                  variant="outline" 
                  className="w-full h-9 text-xs border-gray-700 text-gray-400 hover:bg-gray-800"
                  onClick={() => onToggleView(exercise.id)}
                >
                  <ChevronRight className="w-3 h-3 mr-1" />
                  Volver a consigna
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function DemoStudentRoutinePage() {
  const [exercises, setExercises] = useState<ExerciseRecord[]>(mockExercises);
  const [isActive, setIsActive] = useState(true); // Activado por defecto para la demo

  const toggleView = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId ? { ...e, showingRegister: !e.showingRegister } : e
      )
    );
  };

  const updateSet = (
    exerciseId: string,
    setId: string,
    field: keyof SetRecord,
    value: string
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

  const updateDrop = (
    exerciseId: string,
    setId: string,
    dropId: string,
    field: "actualReps" | "actualKg",
    value: string
  ) => {
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

  const updateMyoMiniSet = (
    exerciseId: string,
    setId: string,
    miniSetId: string,
    value: string
  ) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId
                  ? {
                      ...s,
                      myoMiniSetsActual: s.myoMiniSetsActual?.map((m) =>
                        m.id === miniSetId ? { ...m, actualReps: value } : m
                      ),
                    }
                  : s
              ),
            }
          : e
      )
    );
  };

  const updateRestPauseMiniSet = (
    exerciseId: string,
    setId: string,
    miniSetId: string,
    value: string
  ) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId
                  ? {
                      ...s,
                      restPauseSetsActual: s.restPauseSetsActual?.map((rp) =>
                        rp.id === miniSetId ? { ...rp, actualReps: value } : rp
                      ),
                    }
                  : s
              ),
            }
          : e
      )
    );
  };

  // Count completed sets
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

        {/* Instrucciones de uso */}
        <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-lg p-3">
          <p className="text-xs text-gray-400 text-center">
            <span className="text-white font-medium">Consigna</span> ← deslizá → <span className="text-amber-400 font-medium">Registro</span>
          </p>
        </div>

        {/* Banner Preview (oculto si está activo) */}
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

        {/* Lista de ejercicios con swipe */}
        {exercises.map((exercise, idx) => {
          const prevExercise = exercises[idx - 1];
          const isLinkedFromPrev = prevExercise?.linkWithNext;
          
          return (
            <div key={exercise.id}>
              {/* Indicador de superserie entre ejercicios */}
              {isLinkedFromPrev && (
                <div className="flex items-center justify-center -mt-1 -mb-1 relative z-10">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-2 bg-blue-500/50" />
                    <Badge className="bg-blue-600 text-white text-[9px] px-2 py-0.5 font-semibold">
                      <Link2 className="w-3 h-3 mr-1" />
                      SUPERSERIE
                    </Badge>
                    <div className="w-0.5 h-2 bg-blue-500/50" />
                  </div>
                </div>
              )}
              
              <div className={cn(
                exercise.linkWithNext && "border-b-2 border-blue-500/30 rounded-b-none",
                isLinkedFromPrev && "border-t-2 border-blue-500/30 rounded-t-none"
              )}>
                <SwipeableExerciseCard
                  exercise={exercise}
                  isActive={isActive}
                  onToggleView={toggleView}
                  onUpdateSet={updateSet}
                  onUpdateDrop={updateDrop}
                  onUpdateMyoMiniSet={updateMyoMiniSet}
                  onUpdateRestPauseMiniSet={updateRestPauseMiniSet}
                />
              </div>
            </div>
          );
        })}

        {/* Leyenda */}
        <Card className="bg-[#13131a] border-[#1e1e2a]">
          <CardContent className="p-3">
            <p className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Técnicas de Alta Intensidad</p>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
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
              <div className="flex items-center gap-1.5">
                <Badge className="bg-cyan-600/80 text-white text-[8px] px-1">
                  <Timer className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-gray-400">Rest-Pause</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-pink-600/80 text-white text-[8px] px-1">
                  <Repeat className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-gray-400">Myo Reps</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-emerald-600/80 text-white text-[8px] px-1">
                  <Lock className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-gray-400">Isohold</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-blue-600/80 text-white text-[8px] px-1">
                  <Link2 className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-gray-400">Superserie</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 mt-3">
              <span className="text-emerald-400">RIR</span>: real · <span className="text-amber-400">Reps/RPE</span>: completado
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

