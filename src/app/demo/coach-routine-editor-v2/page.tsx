"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/sheet";
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Settings2,
  Pencil,
  Timer,
  Repeat,
  Lock,
  Link2,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================
interface DropConfig {
  kg: string;             // Kg sugeridos para este drop
  reps?: string;          // Opcional: reps para este drop
}

// Tipos de técnicas de alta intensidad
type SetType = "normal" | "amrap" | "dropset" | "restpause" | "myoreps" | "isohold";

interface SetConfig {
  id: string;
  reps: string;           // "12", "10-12", "AMRAP", "las que salgan", etc.
  kg: string;             // "50", "bajar carga", "kg serie anterior", etc.
  rir: string;
  rpe: string;
  type: SetType;
  dropCount?: number;
  drops?: DropConfig[];   // Configuración de kg para cada drop
  // Rest Pause config
  restPauseSets?: number;    // Cantidad de mini-series (ej: 3)
  restPauseRest?: string;    // Descanso entre mini-series (ej: "10-15")
  // Myo Reps config
  myoActivationReps?: string; // Reps de activación (ej: "12-15")
  myoMiniSets?: number;       // Mini-series después de activación
  myoMiniReps?: string;       // Reps por mini-serie (ej: "3-5")
  // Isohold config
  isoholdSeconds?: string;    // Tiempo de isometría (ej: "30")
  isoholdPosition?: string;   // Posición (ej: "abajo", "arriba", "90°")
}

interface ExerciseConfig {
  id: string;
  name: string;
  muscleGroup: string;
  rest: string;
  sets: SetConfig[];
  notes: string;
  linkWithNext?: boolean;  // Marca si se puede combinar con el siguiente ejercicio (superserie)
}

// ==================== MOCK EXERCISES LIBRARY ====================
const exerciseLibrary = [
  { id: "ex1", name: "Remo con barra", muscleGroup: "Espalda alta" },
  { id: "ex2", name: "Press banca", muscleGroup: "Pectoral" },
  { id: "ex3", name: "Sentadilla", muscleGroup: "Cuádriceps" },
  { id: "ex4", name: "Jalón al pecho", muscleGroup: "Espalda" },
  { id: "ex5", name: "Press inclinado c/mancuernas", muscleGroup: "Pectoral superior" },
  { id: "ex6", name: "Estocadas búlgaras", muscleGroup: "Cuádriceps" },
  { id: "ex7", name: "Curl de bíceps", muscleGroup: "Bíceps" },
  { id: "ex8", name: "Elevaciones laterales", muscleGroup: "Hombros" },
];

// Textos rápidos para reps
const repsQuickOptions = [
  { label: "8-10", value: "8-10" },
  { label: "10-12", value: "10-12" },
  { label: "12-15", value: "12-15" },
  { label: "15-20", value: "15-20" },
  { label: "AMRAP", value: "AMRAP" },
  { label: "las que salgan", value: "las que salgan" },
];

// Opciones rápidas para kg (numéricas + textos especiales)
const kgQuickOptionsNumeric = [
  "10", "15", "20", "25", "30", "35", "40", "45", "50", "55", "60"
];

// Textos especiales para kg
const kgQuickOptionsText = [
  { label: "bajar carga", value: "bajar carga" },
  { label: "kg serie anterior", value: "kg serie anterior" },
  { label: "subir carga", value: "subir carga" },
];

// ==================== COMPONENT ====================
export default function CoachRoutineEditorV2Page() {
  const [exercises, setExercises] = useState<ExerciseConfig[]>([]);
  
  // Microciclo y día
  const [currentMicrocycle, setCurrentMicrocycle] = useState(1);
  const [currentDay, setCurrentDay] = useState(1);
  const [microcycleName, setMicrocycleName] = useState("Microciclo 1");
  const totalMicrocycles = 11;
  const [days, setDays] = useState([1, 2, 3]);
  
  // Sheet states
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showSeriesEditor, setShowSeriesEditor] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<typeof exerciseLibrary[0] | null>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  
  // Exercise form state
  const [editingSets, setEditingSets] = useState<SetConfig[]>([]);
  const [rest, setRest] = useState("2-3");
  const [notes, setNotes] = useState("");
  const [linkWithNext, setLinkWithNext] = useState(false);
  
  // Expanded set for detailed edit
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);

  // Filter exercises
  const filteredExercises = exerciseLibrary.filter(
    (ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create default set
  const createDefaultSet = (index: number): SetConfig => ({
    id: `set-${Date.now()}-${index}`,
    reps: "10-12",
    kg: "",
    rir: "2",
    rpe: "",
    type: "normal",
  });

  // Handle exercise selection
  const handleSelectExercise = (exercise: typeof exerciseLibrary[0]) => {
    setSelectedExercise(exercise);
    setShowExerciseSearch(false);
    
    // Create 3 default sets
    setEditingSets([
      createDefaultSet(0),
      createDefaultSet(1),
      createDefaultSet(2),
    ]);
    setRest("2-3");
    setNotes("");
    setLinkWithNext(false);
    setExpandedSetId(null);
    setShowSeriesEditor(true);
  };

  // Add set
  const handleAddSet = () => {
    setEditingSets([...editingSets, createDefaultSet(editingSets.length)]);
  };

  // Remove set
  const handleRemoveSet = (setId: string) => {
    if (editingSets.length > 1) {
      setEditingSets(editingSets.filter(s => s.id !== setId));
    }
  };

  // Update set field
  const updateSetField = (setId: string, field: keyof SetConfig, value: string | number) => {
    setEditingSets(editingSets.map(s => 
      s.id === setId ? { ...s, [field]: value } : s
    ));
  };

  // Toggle set type
  const toggleSetType = (setId: string, type: SetType) => {
    setEditingSets(editingSets.map(s => {
      if (s.id !== setId) return s;
      
      if (s.type === type) {
        // Desactivar - volver a normal
        return { 
          ...s, 
          type: "normal", 
          reps: s.reps === "AMRAP" ? "10-12" : s.reps, 
          drops: undefined, 
          dropCount: undefined,
          restPauseSets: undefined,
          restPauseRest: undefined,
          myoActivationReps: undefined,
          myoMiniSets: undefined,
          myoMiniReps: undefined,
          isoholdSeconds: undefined,
          isoholdPosition: undefined,
        };
      } else {
        // Activar
        const defaultDropCount = 2;
        const baseSet = { 
          ...s, 
          type,
          // Limpiar configs de otros tipos
          drops: undefined, 
          dropCount: undefined,
          restPauseSets: undefined,
          restPauseRest: undefined,
          myoActivationReps: undefined,
          myoMiniSets: undefined,
          myoMiniReps: undefined,
          isoholdSeconds: undefined,
          isoholdPosition: undefined,
        };
        
        switch (type) {
          case "amrap":
            return { ...baseSet, reps: "AMRAP" };
          case "dropset":
            return { 
              ...baseSet, 
              dropCount: defaultDropCount,
              drops: Array.from({ length: defaultDropCount }, () => ({ kg: "", reps: "" })),
            };
          case "restpause":
            return {
              ...baseSet,
              restPauseSets: 3,
              restPauseRest: "10-15",
            };
          case "myoreps":
            return {
              ...baseSet,
              myoActivationReps: "12-15",
              myoMiniSets: 4,
              myoMiniReps: "3-5",
            };
          case "isohold":
            return {
              ...baseSet,
              isoholdSeconds: "30",
              isoholdPosition: "abajo",
            };
          default:
            return baseSet;
        }
      }
    }));
  };

  // Update drop count and adjust drops array
  const updateDropCount = (setId: string, count: number) => {
    setEditingSets(editingSets.map(s => {
      if (s.id !== setId) return s;
      
      const currentDrops = s.drops || [];
      let newDrops: DropConfig[];
      
      if (count > currentDrops.length) {
        // Agregar drops
        newDrops = [...currentDrops, ...Array.from({ length: count - currentDrops.length }, () => ({ kg: "", reps: "" }))];
      } else {
        // Remover drops
        newDrops = currentDrops.slice(0, count);
      }
      
      return { ...s, dropCount: count, drops: newDrops };
    }));
  };

  // Update drop kg
  const updateDropKg = (setId: string, dropIndex: number, kg: string) => {
    setEditingSets(editingSets.map(s => {
      if (s.id !== setId || !s.drops) return s;
      
      const newDrops = [...s.drops];
      newDrops[dropIndex] = { ...newDrops[dropIndex], kg };
      
      return { ...s, drops: newDrops };
    }));
  };

  // Apply same value to all sets
  const applyToAllSets = (field: keyof SetConfig, value: string) => {
    setEditingSets(editingSets.map(s => ({ ...s, [field]: value })));
  };

  // Save exercise
  const handleSaveExercise = () => {
    if (!selectedExercise) return;

    const newExercise: ExerciseConfig = {
      id: `ex-${Date.now()}`,
      name: selectedExercise.name,
      muscleGroup: selectedExercise.muscleGroup,
      rest,
      sets: editingSets,
      notes,
      linkWithNext,
    };

    setExercises([...exercises, newExercise]);
    setShowSeriesEditor(false);
    setSelectedExercise(null);
  };

  // Toggle link with next exercise
  const toggleExerciseLink = (exerciseId: string) => {
    setExercises(exercises.map(e => 
      e.id === exerciseId ? { ...e, linkWithNext: !e.linkWithNext } : e
    ));
  };

  // Delete exercise
  const handleDeleteExercise = (exerciseId: string) => {
    setExercises(exercises.filter((e) => e.id !== exerciseId));
  };

  // Count total series
  const totalSeries = exercises.reduce((acc, e) => acc + e.sets.length, 0);

  // Navigation
  const goToPrevMicrocycle = () => {
    if (currentMicrocycle > 1) {
      setCurrentMicrocycle(currentMicrocycle - 1);
      setMicrocycleName(`Microciclo ${currentMicrocycle - 1}`);
    }
  };

  const goToNextMicrocycle = () => {
    if (currentMicrocycle < totalMicrocycles) {
      setCurrentMicrocycle(currentMicrocycle + 1);
      setMicrocycleName(`Microciclo ${currentMicrocycle + 1}`);
    }
  };

  const addDay = () => {
    const newDay = days.length + 1;
    setDays([...days, newDay]);
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0d0d12] border-b border-[#1a1a24]">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button className="text-gray-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-white">Editando Rutina</h1>
              <p className="text-xs text-gray-500">Rutina: Mesociclo 2</p>
            </div>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Check className="w-4 h-4 mr-1" />
            Guardar
          </Button>
        </div>

        {/* Microcycle selector */}
        <div className="px-4 pb-3 flex items-center justify-center gap-3">
          <button 
            onClick={goToPrevMicrocycle}
            disabled={currentMicrocycle === 1}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              currentMicrocycle === 1 
                ? "bg-[#1a1a24] text-gray-600" 
                : "bg-[#1a1a24] text-gray-400 hover:bg-[#252530] hover:text-white"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 bg-[#1a1a24] rounded-full px-4 py-2">
            <span className="text-white font-medium">{microcycleName}</span>
            <button className="text-gray-500 hover:text-amber-400 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          <button 
            onClick={goToNextMicrocycle}
            disabled={currentMicrocycle === totalMicrocycles}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              currentMicrocycle === totalMicrocycles 
                ? "bg-[#1a1a24] text-gray-600" 
                : "bg-[#1a1a24] text-gray-400 hover:bg-[#252530] hover:text-white"
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button className="w-8 h-8 rounded-full bg-[#1a1a24] text-gray-400 hover:bg-[#252530] hover:text-white flex items-center justify-center transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-[11px] text-gray-600 pb-2">{currentMicrocycle} de {totalMicrocycles}</p>

        {/* Day selector */}
        <div className="px-4 pb-3 flex items-center justify-center gap-2">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setCurrentDay(day)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                currentDay === day
                  ? "bg-amber-500 text-black"
                  : "bg-[#1a1a24] text-gray-400 hover:bg-[#252530]"
              )}
            >
              Día {day}
            </button>
          ))}
          <button 
            onClick={addDay}
            className="w-9 h-9 rounded-full bg-[#1a1a24] text-gray-400 hover:bg-[#252530] hover:text-white flex items-center justify-center transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Info header */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm bg-[#1a1a24] rounded-full px-4 py-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-white font-medium">M{currentMicrocycle} · Día {currentDay}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">{exercises.length} ejercicios · {totalSeries} series</span>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-sm text-blue-200/90">
            <strong>Nuevo enfoque:</strong> Cada serie se configura individualmente. 
            Podés poner AMRAP en cualquier serie, usar textos como &quot;bajar carga&quot; o &quot;las que salgan&quot;.
          </p>
        </div>

        {/* Lista de ejercicios */}
        <AnimatePresence>
          {exercises.map((exercise, idx) => {
            const nextExercise = exercises[idx + 1];
            const prevExercise = exercises[idx - 1];
            const isLinkedFromPrev = prevExercise?.linkWithNext;
            
            return (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: idx * 0.05 }}
            >
              {/* Indicador de link superior */}
              {isLinkedFromPrev && (
                <div className="flex items-center justify-center -mb-2 relative z-10">
                  <div className="bg-blue-600 text-white text-[9px] font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    SUPERSERIE
                  </div>
                </div>
              )}
              
              <Card className={cn(
                "bg-[#13131a] border-[#1e1e2a] overflow-hidden",
                exercise.linkWithNext && "border-b-blue-500/50 border-b-2",
                isLinkedFromPrev && "border-t-blue-500/50 border-t-2"
              )}>
                {/* Header del ejercicio */}
                <div className="p-4 flex items-start justify-between border-b border-[#1e1e2a]/50">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-5 h-5 text-gray-600 mt-0.5 cursor-grab" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base text-white">{exercise.name}</h3>
                        {exercise.linkWithNext && (
                          <Badge className="bg-blue-600/20 text-blue-400 text-[8px] px-1.5">
                            <Link2 className="w-2.5 h-2.5" />
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {exercise.muscleGroup} · {exercise.sets.length} series · Descanso: {exercise.rest}&apos;
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Toggle link button */}
                    <button
                      onClick={() => toggleExerciseLink(exercise.id)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        exercise.linkWithNext 
                          ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" 
                          : "hover:bg-gray-800 text-gray-600 hover:text-gray-400"
                      )}
                      title={exercise.linkWithNext ? "Quitar combinación" : "Combinar con siguiente"}
                    >
                      {exercise.linkWithNext ? <Link2 className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteExercise(exercise.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Notas */}
                {exercise.notes && (
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-2 p-3 bg-blue-950/40 rounded-lg border border-blue-900/30">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-300/90">{exercise.notes}</p>
                    </div>
                  </div>
                )}

                {/* Tabla de series */}
                <div className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-5 text-[10px] font-semibold uppercase tracking-wide text-amber-500 bg-amber-500/10 rounded-t-lg py-2.5">
                    <span className="text-center">Serie</span>
                    <span className="text-center">Reps</span>
                    <span className="text-center">Carga</span>
                    <span className="text-center">RIR</span>
                    <span className="text-center">Desc</span>
                  </div>

                  {exercise.sets.map((set, setIdx) => (
                    <div key={set.id}>
                      <div
                        className={cn(
                          "grid grid-cols-5 py-3 border-b border-[#1e1e2a]/60 items-center",
                          set.type === "amrap" && "bg-purple-950/30",
                          set.type === "dropset" && "bg-orange-950/20",
                          set.type === "restpause" && "bg-cyan-950/20",
                          set.type === "myoreps" && "bg-pink-950/20",
                          set.type === "isohold" && "bg-emerald-950/20"
                        )}
                      >
                        <span className="text-center text-sm text-gray-400">{setIdx + 1}</span>
                        
                        {/* REPS / Técnica */}
                        <div className="flex items-center justify-center">
                          {set.type === "amrap" || set.reps === "AMRAP" ? (
                            <Badge className="bg-purple-600 text-white text-[9px] px-2 py-0.5 font-semibold">
                              <Flame className="w-3 h-3 mr-0.5" />
                              MAX
                            </Badge>
                          ) : set.type === "restpause" ? (
                            <Badge className="bg-cyan-600 text-white text-[8px] px-1.5 py-0.5 font-semibold">
                              <Timer className="w-2.5 h-2.5 mr-0.5" />
                              RP {set.restPauseSets}x
                            </Badge>
                          ) : set.type === "myoreps" ? (
                            <Badge className="bg-pink-600 text-white text-[8px] px-1.5 py-0.5 font-semibold">
                              <Repeat className="w-2.5 h-2.5 mr-0.5" />
                              MYO
                            </Badge>
                          ) : set.type === "isohold" ? (
                            <Badge className="bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 font-semibold">
                              <Lock className="w-2.5 h-2.5 mr-0.5" />
                              {set.isoholdSeconds}s
                            </Badge>
                          ) : set.reps === "las que salgan" ? (
                            <span className="text-[10px] text-purple-400 italic">las que salgan</span>
                          ) : (
                            <span className="text-sm text-white font-medium">{set.reps}</span>
                          )}
                        </div>

                        {/* CARGA */}
                        <div className="text-center">
                          {set.kg === "bajar carga" ? (
                            <span className="text-[10px] text-orange-400 italic">bajar carga</span>
                          ) : set.kg === "kg serie anterior" ? (
                            <span className="text-[9px] text-cyan-400 italic">kg anterior</span>
                          ) : (
                            <span className="text-sm text-white font-semibold">{set.kg || "—"}</span>
                          )}
                        </div>

                        {/* RIR */}
                        <span className="text-center text-sm text-gray-400">{set.rir || "—"}</span>

                        {/* DESC */}
                        <span className="text-center text-sm text-gray-500">{exercise.rest}&apos;</span>
                      </div>

                      {/* Drop Sets detalle */}
                      {set.type === "dropset" && set.dropCount && (
                        <>
                          {Array.from({ length: set.dropCount }, (_, i) => {
                            const dropKg = set.drops?.[i]?.kg;
                            return (
                              <div
                                key={i}
                                className="grid grid-cols-5 py-2.5 border-b border-[#1e1e2a]/40 items-center bg-orange-950/10 border-l-2 border-l-orange-500/50"
                              >
                                <div className="flex justify-center">
                                  <span className="text-xs font-medium text-orange-400">↳ D{i + 1}</span>
                                </div>
                                <span className="text-center text-sm text-gray-500">máx</span>
                                <span className={cn(
                                  "text-center text-sm font-semibold",
                                  dropKg ? "text-orange-300" : "text-gray-600"
                                )}>
                                  {dropKg || "—"}
                                </span>
                                <span className="text-center text-sm text-gray-600">0</span>
                                <span className="text-center text-sm text-gray-600">—</span>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* Rest-Pause detalle */}
                      {set.type === "restpause" && (
                        <div className="py-2 px-3 border-b border-[#1e1e2a]/40 bg-cyan-950/10 border-l-2 border-l-cyan-500/50">
                          <p className="text-[10px] text-cyan-400">
                            → {set.restPauseSets} mini-series con {set.restPauseRest}s descanso entre cada una
                          </p>
                        </div>
                      )}

                      {/* Myo Reps detalle */}
                      {set.type === "myoreps" && (
                        <div className="py-2 px-3 border-b border-[#1e1e2a]/40 bg-pink-950/10 border-l-2 border-l-pink-500/50">
                          <p className="text-[10px] text-pink-400">
                            → Activación {set.myoActivationReps} reps + {set.myoMiniSets}x{set.myoMiniReps} reps
                          </p>
                        </div>
                      )}

                      {/* Isohold detalle */}
                      {set.type === "isohold" && (
                        <div className="py-2 px-3 border-b border-[#1e1e2a]/40 bg-emerald-950/10 border-l-2 border-l-emerald-500/50">
                          <p className="text-[10px] text-emerald-400">
                            → Mantener {set.isoholdSeconds}s en posición &quot;{set.isoholdPosition}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
              
              {/* Indicador de link inferior */}
              {exercise.linkWithNext && nextExercise && (
                <div className="flex justify-center py-1">
                  <div className="w-0.5 h-3 bg-blue-500/50 rounded-full" />
                </div>
              )}
            </motion.div>
          );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {exercises.length === 0 && (
          <div className="text-center py-12">
            <Dumbbell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay ejercicios</p>
            <p className="text-gray-600 text-xs mt-1">Tocá el botón + para agregar</p>
          </div>
        )}

        {/* Leyenda */}
        {exercises.length > 0 && (
          <Card className="bg-[#13131a] border-[#1e1e2a] p-4">
            <p className="text-[10px] font-semibold text-gray-500 mb-3 uppercase tracking-wide">Técnicas de Alta Intensidad</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600 text-white text-[8px] px-1.5 py-0.5">
                  <Flame className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-[10px] text-gray-400">AMRAP</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-600 text-white text-[8px] px-1.5 py-0.5">
                  <ArrowDownToLine className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-[10px] text-gray-400">Drop Set</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-600 text-white text-[8px] px-1.5 py-0.5">
                  <Timer className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-[10px] text-gray-400">Rest-Pause</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-pink-600 text-white text-[8px] px-1.5 py-0.5">
                  <Repeat className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-[10px] text-gray-400">Myo Reps</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white text-[8px] px-1.5 py-0.5">
                  <Lock className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-[10px] text-gray-400">Isohold</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5">
                  <Link2 className="w-2.5 h-2.5" />
                </Badge>
                <span className="text-[10px] text-gray-400">Superserie</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* FAB - Agregar ejercicio */}
      <button
        onClick={() => {
          setSearchQuery("");
          setShowExerciseSearch(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
      >
        <Plus className="w-6 h-6 text-black" />
      </button>

      {/* Sheet: Buscar ejercicio */}
      <Sheet open={showExerciseSearch} onOpenChange={setShowExerciseSearch}>
        <SheetContent side="bottom" className="bg-[#13131a] border-[#1e1e2a] h-[85vh] rounded-t-2xl mx-auto max-w-[420px] sm:max-w-[480px]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-white">Agregar ejercicio</SheetTitle>
          </SheetHeader>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ejercicio..."
              className="pl-10 bg-[#1a1a24] border-[#2a2a35] text-white"
            />
          </div>

          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {filteredExercises.map((exercise) => (
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
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editor de series avanzado */}
      <Sheet open={showSeriesEditor} onOpenChange={setShowSeriesEditor}>
        <SheetContent side="bottom" className="bg-[#13131a] border-[#1e1e2a] h-[90vh] rounded-t-2xl overflow-hidden mx-auto max-w-[420px] sm:max-w-[480px]">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-white flex items-center gap-2 text-base">
              <Dumbbell className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="truncate">{selectedExercise?.name}</span>
            </SheetTitle>
            <p className="text-xs text-gray-500">{selectedExercise?.muscleGroup} · Configurá las series y repeticiones</p>
          </SheetHeader>

          <div className="overflow-y-auto h-[calc(90vh-180px)] pb-4 -mx-6 px-6">
            {/* Quick actions */}
            <div className="flex items-center justify-between py-3 border-b border-[#1e1e2a]">
              <span className="text-xs text-gray-400">{editingSets.length} series</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveSet(editingSets[editingSets.length - 1]?.id)}
                  disabled={editingSets.length <= 1}
                  className="h-8 px-3 text-xs border-gray-700 text-gray-400 hover:bg-gray-800"
                >
                  <Minus className="w-3 h-3 mr-1" />
                  Quitar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddSet}
                  className="h-8 px-3 text-xs border-amber-700 text-amber-400 hover:bg-amber-500/10"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>

            {/* Series list */}
            <div className="space-y-2 py-3">
              {editingSets.map((set, idx) => (
                <div
                  key={set.id}
                  className={cn(
                    "rounded-xl border transition-all",
                    expandedSetId === set.id 
                      ? "border-amber-500/50 bg-amber-500/5" 
                      : "border-[#2a2a35] bg-[#1a1a24]",
                    set.type === "amrap" && "border-purple-500/30 bg-purple-500/5",
                    set.type === "dropset" && "border-orange-500/30 bg-orange-500/5"
                  )}
                >
                  {/* Serie header - siempre visible */}
                  <button
                    onClick={() => setExpandedSetId(expandedSetId === set.id ? null : set.id)}
                    className="w-full p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                        set.type === "amrap" ? "bg-purple-600 text-white" :
                        set.type === "dropset" ? "bg-orange-600 text-white" :
                        "bg-gray-700 text-white"
                      )}>
                        {set.type === "amrap" ? <Flame className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">
                          {set.type === "amrap" ? "AMRAP" : set.reps} reps
                          {set.kg && <span className="text-gray-400"> · {set.kg}kg</span>}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {set.type === "amrap" && "Al fallo · "}
                          {set.type === "dropset" && (
                            <>
                              {set.dropCount} drops
                              {set.drops?.some(d => d.kg) && (
                                <span className="text-orange-400"> ({set.drops.filter(d => d.kg).map(d => d.kg + "kg").join(" → ")})</span>
                              )}
                              {" · "}
                            </>
                          )}
                          RIR: {set.rir || "—"}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-gray-500 transition-transform",
                      expandedSetId === set.id && "rotate-180"
                    )} />
                  </button>

                  {/* Serie expandida - edición detallada */}
                  <AnimatePresence>
                    {expandedSetId === set.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-4 space-y-4 border-t border-[#2a2a35]">
                          {/* Tipo de serie */}
                          <div className="pt-3">
                            <Label className="text-[10px] text-gray-400 mb-2 block">Técnica de alta intensidad</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => toggleSetType(set.id, "normal")}
                                className={cn(
                                  "p-2 rounded-lg text-[10px] font-medium transition-all",
                                  set.type === "normal"
                                    ? "bg-gray-600 text-white"
                                    : "bg-[#252530] text-gray-400"
                                )}
                              >
                                Normal
                              </button>
                              <button
                                onClick={() => toggleSetType(set.id, "amrap")}
                                className={cn(
                                  "p-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1",
                                  set.type === "amrap"
                                    ? "bg-purple-600 text-white"
                                    : "bg-[#252530] text-gray-400"
                                )}
                              >
                                <Flame className="w-3 h-3" />
                                AMRAP
                              </button>
                              <button
                                onClick={() => toggleSetType(set.id, "dropset")}
                                className={cn(
                                  "p-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1",
                                  set.type === "dropset"
                                    ? "bg-orange-600 text-white"
                                    : "bg-[#252530] text-gray-400"
                                )}
                              >
                                <ArrowDownToLine className="w-3 h-3" />
                                Drop
                              </button>
                              <button
                                onClick={() => toggleSetType(set.id, "restpause")}
                                className={cn(
                                  "p-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1",
                                  set.type === "restpause"
                                    ? "bg-cyan-600 text-white"
                                    : "bg-[#252530] text-gray-400"
                                )}
                              >
                                <Timer className="w-3 h-3" />
                                Rest-Pause
                              </button>
                              <button
                                onClick={() => toggleSetType(set.id, "myoreps")}
                                className={cn(
                                  "p-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1",
                                  set.type === "myoreps"
                                    ? "bg-pink-600 text-white"
                                    : "bg-[#252530] text-gray-400"
                                )}
                              >
                                <Repeat className="w-3 h-3" />
                                Myo Reps
                              </button>
                              <button
                                onClick={() => toggleSetType(set.id, "isohold")}
                                className={cn(
                                  "p-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1",
                                  set.type === "isohold"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-[#252530] text-gray-400"
                                )}
                              >
                                <Lock className="w-3 h-3" />
                                Isohold
                              </button>
                            </div>
                          </div>

                          {/* Drop Set config */}
                          {set.type === "dropset" && (
                            <div className="space-y-4">
                              <div>
                                <Label className="text-[10px] text-gray-400 mb-2 block">Cantidad de drops</Label>
                                <div className="flex gap-2">
                                  {[1, 2, 3].map(n => (
                                    <button
                                      key={n}
                                      onClick={() => updateDropCount(set.id, n)}
                                      className={cn(
                                        "w-10 h-8 rounded-lg text-sm font-medium",
                                        set.dropCount === n
                                          ? "bg-orange-600 text-white"
                                          : "bg-[#252530] text-gray-400"
                                      )}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Kg para cada drop */}
                              <div className="bg-orange-950/20 rounded-lg p-3 border border-orange-500/20">
                                <Label className="text-[10px] text-orange-400 mb-3 block font-semibold">
                                  <ArrowDownToLine className="w-3 h-3 inline mr-1" />
                                  Configurar kg de cada drop
                                </Label>
                                <div className="space-y-2">
                                  {set.drops?.map((drop, dropIdx) => (
                                    <div key={dropIdx} className="flex items-center gap-2">
                                      <span className="text-xs text-orange-400 font-medium w-12">Drop {dropIdx + 1}:</span>
                                      <Input
                                        value={drop.kg}
                                        onChange={(e) => updateDropKg(set.id, dropIdx, e.target.value)}
                                        placeholder="Ej: 60"
                                        className="flex-1 bg-[#252530] border-orange-500/30 text-white text-center h-8 text-sm"
                                        inputMode="decimal"
                                      />
                                      <span className="text-[10px] text-gray-500">kg</span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-[9px] text-gray-500 mt-2">
                                  Ej: Serie principal 100kg → Drop 1: 60kg → Drop 2: 30kg
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Rest-Pause config */}
                          {set.type === "restpause" && (
                            <div className="bg-cyan-950/20 rounded-lg p-3 border border-cyan-500/20">
                              <Label className="text-[10px] text-cyan-400 mb-3 block font-semibold">
                                <Timer className="w-3 h-3 inline mr-1" />
                                Configurar Rest-Pause
                              </Label>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-cyan-400 font-medium w-24">Mini-series:</span>
                                  <div className="flex gap-1">
                                    {[2, 3, 4, 5].map(n => (
                                      <button
                                        key={n}
                                        onClick={() => updateSetField(set.id, "restPauseSets", n)}
                                        className={cn(
                                          "w-8 h-7 rounded text-xs font-medium",
                                          set.restPauseSets === n
                                            ? "bg-cyan-600 text-white"
                                            : "bg-[#252530] text-gray-400"
                                        )}
                                      >
                                        {n}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-cyan-400 font-medium w-24">Descanso:</span>
                                  <Input
                                    value={set.restPauseRest || ""}
                                    onChange={(e) => updateSetField(set.id, "restPauseRest", e.target.value)}
                                    placeholder="10-15"
                                    className="flex-1 bg-[#252530] border-cyan-500/30 text-white text-center h-8 text-sm"
                                  />
                                  <span className="text-[10px] text-gray-500">seg</span>
                                </div>
                              </div>
                              <p className="text-[9px] text-gray-500 mt-2">
                                Hacer reps hasta RIR 0-1, descansar {set.restPauseRest || "10-15"}s, repetir {set.restPauseSets || 3}x
                              </p>
                            </div>
                          )}

                          {/* Myo Reps config */}
                          {set.type === "myoreps" && (
                            <div className="bg-pink-950/20 rounded-lg p-3 border border-pink-500/20">
                              <Label className="text-[10px] text-pink-400 mb-3 block font-semibold">
                                <Repeat className="w-3 h-3 inline mr-1" />
                                Configurar Myo Reps
                              </Label>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-pink-400 font-medium w-24">Activación:</span>
                                  <Input
                                    value={set.myoActivationReps || ""}
                                    onChange={(e) => updateSetField(set.id, "myoActivationReps", e.target.value)}
                                    placeholder="12-15"
                                    className="flex-1 bg-[#252530] border-pink-500/30 text-white text-center h-8 text-sm"
                                  />
                                  <span className="text-[10px] text-gray-500">reps</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-pink-400 font-medium w-24">Mini-series:</span>
                                  <div className="flex gap-1">
                                    {[3, 4, 5, 6].map(n => (
                                      <button
                                        key={n}
                                        onClick={() => updateSetField(set.id, "myoMiniSets", n)}
                                        className={cn(
                                          "w-8 h-7 rounded text-xs font-medium",
                                          set.myoMiniSets === n
                                            ? "bg-pink-600 text-white"
                                            : "bg-[#252530] text-gray-400"
                                        )}
                                      >
                                        {n}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-pink-400 font-medium w-24">Reps/mini:</span>
                                  <Input
                                    value={set.myoMiniReps || ""}
                                    onChange={(e) => updateSetField(set.id, "myoMiniReps", e.target.value)}
                                    placeholder="3-5"
                                    className="flex-1 bg-[#252530] border-pink-500/30 text-white text-center h-8 text-sm"
                                  />
                                  <span className="text-[10px] text-gray-500">reps</span>
                                </div>
                              </div>
                              <p className="text-[9px] text-gray-500 mt-2">
                                {set.myoActivationReps || "12-15"} reps activación + {set.myoMiniSets || 4}x{set.myoMiniReps || "3-5"} reps (5-10s desc)
                              </p>
                            </div>
                          )}

                          {/* Isohold config */}
                          {set.type === "isohold" && (
                            <div className="bg-emerald-950/20 rounded-lg p-3 border border-emerald-500/20">
                              <Label className="text-[10px] text-emerald-400 mb-3 block font-semibold">
                                <Lock className="w-3 h-3 inline mr-1" />
                                Configurar Isohold
                              </Label>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-emerald-400 font-medium w-20">Tiempo:</span>
                                  <Input
                                    value={set.isoholdSeconds || ""}
                                    onChange={(e) => updateSetField(set.id, "isoholdSeconds", e.target.value)}
                                    placeholder="30"
                                    className="flex-1 bg-[#252530] border-emerald-500/30 text-white text-center h-8 text-sm"
                                  />
                                  <span className="text-[10px] text-gray-500">seg</span>
                                </div>
                                <div>
                                  <span className="text-xs text-emerald-400 font-medium block mb-2">Posición:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {["abajo", "arriba", "90°", "punto muerto"].map(pos => (
                                      <button
                                        key={pos}
                                        onClick={() => updateSetField(set.id, "isoholdPosition", pos)}
                                        className={cn(
                                          "px-2.5 py-1 rounded text-[10px] font-medium",
                                          set.isoholdPosition === pos
                                            ? "bg-emerald-600 text-white"
                                            : "bg-[#252530] text-gray-400"
                                        )}
                                      >
                                        {pos}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <p className="text-[9px] text-gray-500 mt-2">
                                Mantener {set.isoholdSeconds || "30"}s en posición &quot;{set.isoholdPosition || "abajo"}&quot;
                              </p>
                            </div>
                          )}

                          {/* Reps */}
                          {set.type !== "amrap" && (
                            <div>
                              <Label className="text-[10px] text-gray-400 mb-2 block">Repeticiones</Label>
                              <Input
                                value={set.reps}
                                onChange={(e) => updateSetField(set.id, "reps", e.target.value)}
                                placeholder="10-12"
                                className="bg-[#252530] border-[#3a3a45] text-white text-center h-10"
                              />
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {repsQuickOptions.map(opt => (
                                  <button
                                    key={opt.value}
                                    onClick={() => updateSetField(set.id, "reps", opt.value)}
                                    className={cn(
                                      "px-2 py-1 rounded text-[10px] transition-all",
                                      set.reps === opt.value
                                        ? "bg-amber-500/30 text-amber-400"
                                        : "bg-[#252530] text-gray-500 hover:text-gray-300"
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Carga */}
                          <div>
                            <Label className="text-[10px] text-gray-400 mb-2 block">Carga sugerida (kg)</Label>
                            <Input
                              value={set.kg}
                              onChange={(e) => updateSetField(set.id, "kg", e.target.value)}
                              placeholder="Ej: 50"
                              className="bg-[#252530] border-[#3a3a45] text-white text-center h-10"
                              inputMode="decimal"
                            />
                            
                            {/* Opciones numéricas rápidas */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {kgQuickOptionsNumeric.map(kg => (
                                <button
                                  key={kg}
                                  onClick={() => updateSetField(set.id, "kg", kg)}
                                  className={cn(
                                    "w-9 h-7 rounded text-[11px] font-medium transition-all",
                                    set.kg === kg
                                      ? "bg-emerald-500/30 text-emerald-400"
                                      : "bg-[#252530] text-gray-500 hover:text-gray-300"
                                  )}
                                >
                                  {kg}
                                </button>
                              ))}
                            </div>

                            {/* Opciones de texto especiales */}
                            <p className="text-[9px] text-gray-600 mt-3 mb-1.5">O usar indicación especial:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {kgQuickOptionsText.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => updateSetField(set.id, "kg", opt.value)}
                                  className={cn(
                                    "px-2.5 py-1 rounded text-[10px] transition-all",
                                    set.kg === opt.value
                                      ? "bg-cyan-500/30 text-cyan-400"
                                      : "bg-[#252530] text-gray-500 hover:text-gray-300"
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* RIR + RPE */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-[10px] text-gray-400 mb-2 block">RIR</Label>
                              <Input
                                value={set.rir}
                                onChange={(e) => updateSetField(set.id, "rir", e.target.value)}
                                placeholder="2"
                                className="bg-[#252530] border-[#3a3a45] text-white text-center h-10"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-gray-400 mb-2 block">RPE</Label>
                              <Input
                                value={set.rpe}
                                onChange={(e) => updateSetField(set.id, "rpe", e.target.value)}
                                placeholder="8"
                                className="bg-[#252530] border-[#3a3a45] text-white text-center h-10"
                              />
                            </div>
                          </div>

                          {/* Apply to all button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              applyToAllSets("reps", set.reps);
                              applyToAllSets("kg", set.kg);
                              applyToAllSets("rir", set.rir);
                            }}
                            className="w-full h-8 text-xs text-gray-400 hover:text-amber-400"
                          >
                            <Settings2 className="w-3 h-3 mr-1" />
                            Aplicar a todas las series
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Descanso + Notas */}
            <div className="space-y-4 pt-4 border-t border-[#1e1e2a]">
              <div>
                <Label className="text-[10px] text-gray-400 mb-2 block">Descanso entre series</Label>
                <Input
                  value={rest}
                  onChange={(e) => setRest(e.target.value)}
                  placeholder="2-3"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white text-center h-10"
                />
              </div>
              
              <div>
                <Label className="text-[10px] text-gray-400 mb-2 block">Notas para el alumno</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Priorizar movimiento escapular por sobre flexión del codo"
                  className="bg-[#1a1a24] border-[#2a2a35] text-white min-h-[60px] text-sm"
                />
              </div>

              {/* Combinar con siguiente */}
              <div className="pt-2">
                <button
                  onClick={() => setLinkWithNext(!linkWithNext)}
                  className={cn(
                    "w-full p-3 rounded-lg border flex items-center gap-3 transition-all",
                    linkWithNext
                      ? "bg-blue-500/10 border-blue-500/50"
                      : "bg-[#1a1a24] border-[#2a2a35] hover:border-gray-600"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    linkWithNext ? "bg-blue-600" : "bg-gray-700"
                  )}>
                    {linkWithNext ? <Link2 className="w-4 h-4 text-white" /> : <Unlink className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="text-left flex-1">
                    <p className={cn(
                      "text-sm font-medium",
                      linkWithNext ? "text-blue-400" : "text-gray-400"
                    )}>
                      {linkWithNext ? "Combinable con siguiente" : "Combinar con siguiente ejercicio"}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {linkWithNext 
                        ? "El alumno puede alternar series con el siguiente ejercicio (superserie)" 
                        : "Marcar para que el alumno pueda hacer superserie"}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <SheetFooter className="absolute bottom-0 left-0 right-0 p-4 bg-[#13131a] border-t border-[#1e1e2a]">
            <Button
              onClick={handleSaveExercise}
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              <Check className="w-4 h-4 mr-2" />
              Guardar cambios
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
