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
  MoreVertical,
  Trash2,
  Edit3,
  Search,
  X,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================
interface SetRecord {
  id: string;
  targetReps: string;
  targetKg?: string;
  targetRir?: string;
  targetRpe?: string;
  isAmrap?: boolean;
  isDropSet?: boolean;
  dropSetCount?: number;
}

interface ExerciseRecord {
  id: string;
  name: string;
  muscleGroup?: string;
  rest?: string;
  sets: SetRecord[];
  notes?: string;
}

// ==================== MOCK EXERCISES LIBRARY ====================
const exerciseLibrary = [
  { id: "ex1", name: "Peso muerto rumano", muscleGroup: "Isquiotibiales" },
  { id: "ex2", name: "Hip thrust", muscleGroup: "Glúteos" },
  { id: "ex3", name: "Press con mancuernas", muscleGroup: "Hombros" },
  { id: "ex4", name: "Sentadilla búlgara", muscleGroup: "Cuádriceps" },
  { id: "ex5", name: "Jalón al pecho", muscleGroup: "Espalda" },
  { id: "ex6", name: "Remo con barra", muscleGroup: "Espalda" },
  { id: "ex7", name: "Curl de bíceps", muscleGroup: "Bíceps" },
  { id: "ex8", name: "Press banca", muscleGroup: "Pectoral" },
  { id: "ex9", name: "Fondos en paralelas", muscleGroup: "Tríceps" },
  { id: "ex10", name: "Elevaciones laterales", muscleGroup: "Hombros" },
];

// ==================== COMPONENT ====================
export default function CoachRoutineEditorPage() {
  const [microcycle, setMicrocycle] = useState(1);
  const [day, setDay] = useState(1);
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  
  // Sheet states
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [showEditExercise, setShowEditExercise] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<typeof exerciseLibrary[0] | null>(null);
  const [editingExercise, setEditingExercise] = useState<ExerciseRecord | null>(null);
  
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

  const totalMicrocycles = 4;
  const totalDays = 4;

  // Filter exercises
  const filteredExercises = exerciseLibrary.filter(
    (ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
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
  };

  // Handle exercise selection
  const handleSelectExercise = (exercise: typeof exerciseLibrary[0]) => {
    setSelectedExercise(exercise);
    setShowExerciseSearch(false);
    resetForm();
    setShowSeriesForm(true);
  };

  // Add exercise with series
  const handleAddExercise = () => {
    if (!selectedExercise) return;

    const count = parseInt(seriesCount) || 3;
    const sets: SetRecord[] = [];

    // Normal series
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      
      sets.push({
        id: `set-${Date.now()}-${i}`,
        targetReps: (isLast && includeAmrap) ? "AMRAP" : repsRange,
        targetKg: kg || undefined,
        targetRir: rir || undefined,
        targetRpe: rpe || undefined,
        isAmrap: isLast && includeAmrap,
        isDropSet: isLast && includeDropSet,
        dropSetCount: (isLast && includeDropSet) ? parseInt(dropSetCount) || 2 : undefined,
      });
    }

    const newExercise: ExerciseRecord = {
      id: `ex-${Date.now()}`,
      name: selectedExercise.name,
      muscleGroup: selectedExercise.muscleGroup,
      rest: rest ? `${rest}` : undefined,
      sets,
      notes: notes || undefined,
    };

    setExercises([...exercises, newExercise]);
    setShowSeriesForm(false);
    setSelectedExercise(null);
    resetForm();
  };

  // Delete exercise
  const handleDeleteExercise = (exerciseId: string) => {
    setExercises(exercises.filter((e) => e.id !== exerciseId));
  };

  // Edit exercise
  const handleEditExercise = (exercise: ExerciseRecord) => {
    setEditingExercise(exercise);
    setNotes(exercise.notes || "");
    setRest(exercise.rest || "2");
    setShowEditExercise(true);
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingExercise) return;
    
    setExercises(exercises.map((e) =>
      e.id === editingExercise.id
        ? { ...e, notes, rest }
        : e
    ));
    setShowEditExercise(false);
    setEditingExercise(null);
  };

  // Count total series
  const totalSeries = exercises.reduce((acc, e) => acc + e.sets.length, 0);

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0d0d12] border-b border-[#1a1a24]">
        <div className="flex items-center gap-4 p-4">
          <button className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white">Editando Rutina</h1>
            <p className="text-xs text-gray-500">Plantilla: Hipertrofia Principiante</p>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Check className="w-4 h-4 mr-1" />
            Guardar
          </Button>
        </div>

        {/* Microcycle selector */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: totalMicrocycles }, (_, i) => (
              <button
                key={i}
                onClick={() => setMicrocycle(i + 1)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                  microcycle === i + 1
                    ? "bg-amber-500 text-black"
                    : "bg-[#1a1a24] text-gray-400 hover:bg-[#252530]"
                )}
              >
                M{i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Day selector */}
        <div className="px-4 pb-3 border-b border-[#1a1a24]">
          <div className="flex gap-2 overflow-x-auto">
            {Array.from({ length: totalDays }, (_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDay(i + 1);
                  // En producción cargaría los ejercicios de ese día
                }}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  day === i + 1
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                    : "bg-[#1a1a24] text-gray-500 hover:text-gray-300 hover:bg-[#252530]"
                )}
              >
                Día {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Info header */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm bg-[#1a1a24] rounded-full px-4 py-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-white font-medium">M{microcycle} · Día {day}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">{exercises.length} ejercicios · {totalSeries} series</span>
          </div>
        </div>

        {/* Tip */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
          <span className="text-amber-500 text-xl">💡</span>
          <p className="text-sm text-amber-200/90">
            Tocá en cada fila para cargar tu peso, RIR y RPE
          </p>
        </div>

        {/* Lista de ejercicios - VISTA IGUAL QUE ALUMNO */}
        <AnimatePresence>
          {exercises.map((exercise, idx) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="bg-[#13131a] border-[#1e1e2a] overflow-hidden">
                {/* Header del ejercicio */}
                <div className="p-4 flex items-start justify-between border-b border-[#1e1e2a]/50">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-5 h-5 text-gray-600 mt-0.5 cursor-grab active:cursor-grabbing" />
                    <div>
                      <h3 className="font-semibold text-base text-white">{exercise.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {exercise.muscleGroup} · {exercise.sets.length} series · Reps: {exercise.sets[0]?.targetReps} · Descanso: {exercise.rest} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditExercise(exercise)}
                      className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
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
                  {/* Header de tabla */}
                  <div className="grid grid-cols-6 text-[10px] font-semibold uppercase tracking-wide text-amber-500 bg-amber-500/10 rounded-t-lg py-2.5">
                    <span className="text-center">Reps</span>
                    <span className="text-center">Real</span>
                    <span className="text-center">Carga</span>
                    <span className="text-center">RIR-E</span>
                    <span className="text-center">RIR-R</span>
                    <span className="text-center">RPE</span>
                  </div>

                  {/* Filas de series */}
                  {exercise.sets.map((set, setIdx) => (
                    <div key={set.id}>
                      <div
                        className={cn(
                          "grid grid-cols-6 py-3 border-b border-[#1e1e2a]/60 items-center",
                          set.isAmrap && "bg-purple-950/30",
                          set.isDropSet && "bg-orange-950/20 border-l-2 border-l-orange-500/60",
                          setIdx === exercise.sets.length - 1 && !set.isDropSet && "border-b-0 rounded-b-lg"
                        )}
                      >
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

                        {/* REAL */}
                        <span className="text-center text-sm text-gray-600">—</span>

                        {/* CARGA */}
                        <span className="text-center text-sm text-white font-semibold">
                          {set.targetKg || "—"}
                        </span>

                        {/* RIR-E */}
                        <span className="text-center text-sm text-gray-400">
                          {set.targetRir || "—"}
                        </span>

                        {/* RIR-R */}
                        <span className="text-center text-sm text-gray-600">—</span>

                        {/* RPE */}
                        <span className="text-center text-sm text-gray-400">
                          {set.targetRpe || "—"}
                        </span>
                      </div>

                      {/* Drop Sets */}
                      {set.isDropSet && set.dropSetCount && (
                        <>
                          {Array.from({ length: set.dropSetCount }, (_, i) => (
                            <div
                              key={i}
                              className="grid grid-cols-6 py-3 border-b border-[#1e1e2a]/40 items-center bg-orange-950/10 border-l-2 border-l-orange-500/50"
                            >
                              <div className="flex justify-center">
                                <span className="text-xs font-medium text-orange-400">Drop {i + 1}</span>
                              </div>
                              <span className="text-center text-sm text-gray-600">—</span>
                              <span className="text-center text-sm text-gray-600">—</span>
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
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {exercises.length === 0 && (
          <div className="text-center py-12">
            <Dumbbell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay ejercicios en este día</p>
            <p className="text-gray-600 text-xs mt-1">Tocá el botón + para agregar</p>
          </div>
        )}

        {/* Leyenda */}
        {exercises.length > 0 && (
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

      {/* Sheet: Configurar series */}
      <Sheet open={showSeriesForm} onOpenChange={setShowSeriesForm}>
        <SheetContent side="bottom" className="bg-[#13131a] border-[#1e1e2a] h-[85vh] rounded-t-2xl overflow-y-auto mx-auto max-w-[420px] sm:max-w-[480px]">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-white flex items-center gap-2 text-base">
              <Dumbbell className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="truncate">{selectedExercise?.name}</span>
            </SheetTitle>
            <p className="text-xs text-gray-500">{selectedExercise?.muscleGroup}</p>
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

            {/* AMRAP / Drop Set toggles */}
            <div className="space-y-2">
              <Label className="text-[11px] text-gray-400 block">Última serie especial</Label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIncludeAmrap(!includeAmrap);
                    if (!includeAmrap) setIncludeDropSet(false);
                  }}
                  className={cn(
                    "p-3 rounded-lg flex flex-col items-center gap-1.5 transition-all",
                    includeAmrap
                      ? "bg-purple-600/20 border border-purple-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <Flame className={cn("w-5 h-5", includeAmrap ? "text-purple-400" : "text-gray-500")} />
                  <span className="text-xs font-medium text-white">AMRAP</span>
                </button>

                <button
                  onClick={() => {
                    setIncludeDropSet(!includeDropSet);
                    if (!includeDropSet) setIncludeAmrap(false);
                  }}
                  className={cn(
                    "p-3 rounded-lg flex flex-col items-center gap-1.5 transition-all",
                    includeDropSet
                      ? "bg-orange-600/20 border border-orange-500/50"
                      : "bg-[#1a1a24] border border-transparent"
                  )}
                >
                  <ArrowDownToLine className={cn("w-5 h-5", includeDropSet ? "text-orange-400" : "text-gray-500")} />
                  <span className="text-xs font-medium text-white">Drop Set</span>
                </button>
              </div>

              {/* Drop set count */}
              {includeDropSet && (
                <div className="flex items-center gap-2 pt-1">
                  <Label className="text-[11px] text-gray-400">Drops:</Label>
                  <div className="flex gap-1.5">
                    {["1", "2", "3"].map((n) => (
                      <button
                        key={n}
                        onClick={() => setDropSetCount(n)}
                        className={cn(
                          "w-9 h-8 rounded-lg text-sm font-medium transition-all",
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

          <SheetFooter className="sticky bottom-0 left-0 right-0 p-4 bg-[#13131a] border-t border-[#1e1e2a] -mx-6 px-6 mt-4">
            <Button
              onClick={handleAddExercise}
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar ejercicio
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar ejercicio */}
      <Sheet open={showEditExercise} onOpenChange={setShowEditExercise}>
        <SheetContent side="bottom" className="bg-[#13131a] border-[#1e1e2a] rounded-t-2xl mx-auto max-w-[420px] sm:max-w-[480px]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-white">Editar {editingExercise?.name}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-4">
            <div>
              <Label className="text-xs text-gray-400 mb-2 block">Descanso (min)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={rest}
                onChange={(e) => setRest(e.target.value)}
                className="bg-[#1a1a24] border-[#2a2a35] text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-2 block">Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-[#1a1a24] border-[#2a2a35] text-white min-h-[80px]"
              />
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 p-4 bg-[#13131a] border-t border-[#1e1e2a] -mx-6 px-6">
            <Button
              onClick={handleSaveEdit}
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              Guardar cambios
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

