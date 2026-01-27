"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
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
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Dumbbell,
  Calendar,
  Plus,
  Minus,
  Flame,
  ArrowDownToLine,
  Info,
  ArrowLeft,
  GripVertical,
  Trash2,
  Edit3,
  Search,
  Check,
  Loader2,
  Timer,
  Repeat,
  Lock,
  Link2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTemplate } from "@/hooks/useRoutineV2";
import { getExerciseCatalog, type CatalogExercise } from "@/lib/api/coach";
import * as routineV2Api from "@/lib/api/routine-v2";
import type { TemplateExercise, TemplateSet } from "@/types/routine-v2";

// ==================== TYPES ====================
type SetType = "normal" | "amrap" | "dropset" | "restpause" | "myoreps" | "isohold";

interface DropConfig {
  kg: string;
  reps?: string;
}

interface SetConfig {
  id: string;
  reps: string;
  kg: string;
  rir: string;
  type: SetType;
  dropCount?: number;
  drops?: DropConfig[];
  restPauseSets?: number;
  restPauseRest?: string;
  myoActivationReps?: string;
  myoMiniSets?: number;
  myoMiniReps?: string;
  isoholdSeconds?: string;
  isoholdPosition?: string;
}

// Helper functions
const createDefaultSet = (index: number): SetConfig => ({
  id: `set-${Date.now()}-${index}`,
  reps: "10-12",
  kg: "",
  rir: "2",
  type: "normal",
});

const repsQuickOptions = [
  { label: "8-10", value: "8-10" },
  { label: "10-12", value: "10-12" },
  { label: "12-15", value: "12-15" },
  { label: "15-20", value: "15-20" },
  { label: "AMRAP", value: "AMRAP" },
  { label: "las que salgan", value: "las que salgan" },
];

const kgQuickOptionsNumeric = ["10", "15", "20", "25", "30", "35", "40", "45", "50", "55", "60"];

// ==================== COMPONENT ====================
export default function EditRoutineV2Page() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const { template, loading, error, refetch } = useTemplate(templateId);
  const [saving, setSaving] = useState(false);

  // Navigation
  const [currentMicroIndex, setCurrentMicroIndex] = useState(0);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // Exercise catalog
  const [exerciseCatalog, setExerciseCatalog] = useState<CatalogExercise[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Sheet states
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [showEditExercise, setShowEditExercise] = useState(false);
  const [selectedCatalogExercise, setSelectedCatalogExercise] = useState<CatalogExercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<TemplateExercise | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Series form state - Nuevo sistema con array de sets
  const [editingSets, setEditingSets] = useState<SetConfig[]>([]);
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [rest, setRest] = useState("2");
  const [notes, setNotes] = useState("");
  const [linkWithNext, setLinkWithNext] = useState(false);

  // Helper: Add set
  const handleAddSet = () => {
    setEditingSets([...editingSets, createDefaultSet(editingSets.length)]);
  };

  // Helper: Remove set
  const handleRemoveSet = () => {
    if (editingSets.length > 1) {
      setEditingSets(editingSets.slice(0, -1));
    }
  };

  // Helper: Update set field
  const updateSetField = (setId: string, field: keyof SetConfig, value: string | number | DropConfig[]) => {
    setEditingSets(editingSets.map(s => 
      s.id === setId ? { ...s, [field]: value } : s
    ));
  };

  // Helper: Toggle set type
  const toggleSetType = (setId: string, type: SetType) => {
    setEditingSets(editingSets.map(s => {
      if (s.id !== setId) return s;
      
      if (s.type === type) {
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
        const baseSet = { 
          ...s, 
          type,
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
            return { ...baseSet, dropCount: 2, drops: [{ kg: "", reps: "" }, { kg: "", reps: "" }] };
          case "restpause":
            return { ...baseSet, restPauseSets: 3, restPauseRest: "10-15" };
          case "myoreps":
            return { ...baseSet, myoActivationReps: "12-15", myoMiniSets: 4, myoMiniReps: "3-5" };
          case "isohold":
            return { ...baseSet, isoholdSeconds: "30", isoholdPosition: "abajo" };
          default:
            return baseSet;
        }
      }
    }));
  };

  // Helper: Update drop count
  const updateDropCount = (setId: string, count: number) => {
    setEditingSets(editingSets.map(s => {
      if (s.id !== setId) return s;
      const currentDrops = s.drops || [];
      let newDrops: DropConfig[];
      if (count > currentDrops.length) {
        newDrops = [...currentDrops, ...Array.from({ length: count - currentDrops.length }, () => ({ kg: "", reps: "" }))];
      } else {
        newDrops = currentDrops.slice(0, count);
      }
      return { ...s, dropCount: count, drops: newDrops };
    }));
  };

  // Helper: Update drop kg
  const updateDropKg = (setId: string, dropIndex: number, kg: string) => {
    setEditingSets(editingSets.map(s => {
      if (s.id !== setId || !s.drops) return s;
      const newDrops = [...s.drops];
      newDrops[dropIndex] = { ...newDrops[dropIndex], kg };
      return { ...s, drops: newDrops };
    }));
  };

  // Replication dialog
  const [showReplicateDialog, setShowReplicateDialog] = useState(false);
  const [replicating, setReplicating] = useState(false);

  // Load exercise catalog
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const catalog = await getExerciseCatalog();
        setExerciseCatalog(catalog);
      } catch (err) {
        console.error("Error loading catalog:", err);
        setExerciseCatalog([
          { id: 1, name: "Press de Banca", muscleGroup: "Pecho" },
          { id: 2, name: "Sentadilla", muscleGroup: "Piernas" },
          { id: 3, name: "Peso Muerto", muscleGroup: "Espalda" },
          { id: 4, name: "Press Militar", muscleGroup: "Hombros" },
          { id: 5, name: "Curl de Bíceps", muscleGroup: "Bíceps" },
        ]);
      } finally {
        setCatalogLoading(false);
      }
    };
    loadCatalog();
  }, []);

  // Sort microcycles and days
  const sortedMicrocycles = template?.microcycles?.slice().sort((a, b) => a.order - b.order) || [];
  const currentMicrocycle = sortedMicrocycles[currentMicroIndex];
  const sortedDays = currentMicrocycle?.days?.slice().sort((a, b) => (a.dayNumber || a.order || 0) - (b.dayNumber || b.order || 0)) || [];
  const currentDay = sortedDays[currentDayIndex];
  const sortedExercises = currentDay?.exercises?.slice().sort((a, b) => a.order - b.order) || [];

  // Filter exercises
  const filteredCatalog = exerciseCatalog.filter(
    (ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscleGroup?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset form
  const resetForm = () => {
    setEditingSets([createDefaultSet(0), createDefaultSet(1), createDefaultSet(2)]);
    setExpandedSetId(null);
    setRest("2");
    setNotes("");
    setLinkWithNext(false);
  };

  // Handle exercise selection from catalog
  const handleSelectExercise = (exercise: CatalogExercise) => {
    setSelectedCatalogExercise(exercise);
    setShowExerciseSearch(false);
    resetForm();
    setShowSeriesForm(true);
  };

  // Add exercise with sets
  const handleAddExercise = async () => {
    if (!selectedCatalogExercise || !currentDay || editingSets.length === 0) return;

    setSaving(true);
    try {
      // 1. Create exercise using first set's reps as default
      const firstSet = editingSets[0];
      const newExercise = await routineV2Api.addExercise(currentDay.id, {
        exerciseCatalogId: selectedCatalogExercise.id,
        defaultReps: firstSet.reps !== "AMRAP" ? firstSet.reps : "10-12",
        defaultRestSeconds: rest ? parseInt(rest) * 60 : 120,
        defaultRir: firstSet.rir ? parseInt(firstSet.rir) : undefined,
        notes: notes || undefined,
        linkWithNext: linkWithNext || undefined,
      });

      // 2. Create sets - each with its individual config
      for (const set of editingSets) {
        const setData: Record<string, unknown> = {
          targetReps: set.reps,
          targetLoad: set.kg ? parseFloat(set.kg) : undefined,
          targetRir: set.rir ? parseInt(set.rir) : undefined,
          isAmrap: set.type === "amrap",
          isDropSet: set.type === "dropset",
        };
        
        // Apply technique-specific data
        if (set.type === "dropset") {
          setData.dropSetCount = set.dropCount || 2;
          setData.dropSetTargets = set.drops?.map(d => ({
            targetLoad: d.kg ? parseFloat(d.kg) : undefined,
            targetReps: d.reps || undefined,
          }));
        } else if (set.type === "restpause") {
          setData.isRestPause = true;
          setData.restPauseSets = set.restPauseSets || 3;
          setData.restPauseRest = set.restPauseRest || "10-15";
        } else if (set.type === "myoreps") {
          setData.isMyoReps = true;
          setData.myoActivationReps = set.myoActivationReps || "12-15";
          setData.myoMiniSets = set.myoMiniSets || 4;
          setData.myoMiniReps = set.myoMiniReps || "3-5";
        } else if (set.type === "isohold") {
          setData.isIsohold = true;
          setData.isoholdSeconds = set.isoholdSeconds || "30";
          setData.isoholdPosition = set.isoholdPosition || "abajo";
        }
        
        await routineV2Api.addSet(newExercise.id, setData);
      }

      await refetch();
      setShowSeriesForm(false);
      setSelectedCatalogExercise(null);
      resetForm();
      toast.success("Ejercicio agregado");
    } catch (err) {
      console.error("Error adding exercise:", err);
      toast.error("Error al agregar ejercicio");
    } finally {
      setSaving(false);
    }
  };

  // Delete exercise
  const handleDeleteExercise = async (exerciseId: string) => {
    try {
      await routineV2Api.deleteExercise(exerciseId);
      await refetch();
      toast.success("Ejercicio eliminado");
    } catch (err) {
      console.error("Error deleting exercise:", err);
      toast.error("Error al eliminar");
    }
  };

  // Edit exercise
  const handleEditExercise = (exercise: TemplateExercise) => {
    setEditingExercise(exercise);
    setNotes(exercise.notes || "");
    setRest(exercise.defaultRestSeconds ? String(exercise.defaultRestSeconds / 60) : "2");
    setLinkWithNext(exercise.linkWithNext || false);
    
    // Convert existing sets to SetConfig format
    const sortedSets = exercise.sets?.slice().sort((a, b) => a.order - b.order) || [];
    const convertedSets: SetConfig[] = sortedSets.map((set, idx) => {
      let type: SetType = "normal";
      if (set.isAmrap) type = "amrap";
      else if (set.isDropSet) type = "dropset";
      else if (set.isRestPause) type = "restpause";
      else if (set.isMyoReps) type = "myoreps";
      else if (set.isIsohold) type = "isohold";
      
      // Convert dropSetTargets to drops format
      const drops: DropConfig[] | undefined = set.dropSetTargets?.map(d => ({
        kg: d.targetLoad?.toString() || "",
        reps: d.targetReps || ""
      }));
      
      return {
        id: `set-edit-${idx}-${Date.now()}`,
        reps: set.isAmrap ? "AMRAP" : (set.targetReps || "10-12"),
        kg: set.targetLoad?.toString() || "",
        rir: set.targetRir?.toString() || "2",
        type,
        dropCount: set.dropSetCount,
        drops: drops,
        restPauseSets: set.restPauseSets,
        restPauseRest: set.restPauseRest,
        myoActivationReps: set.myoActivationReps,
        myoMiniSets: set.myoMiniSets,
        myoMiniReps: set.myoMiniReps,
        isoholdSeconds: set.isoholdSeconds,
        isoholdPosition: set.isoholdPosition,
      };
    });
    
    // If no sets, create 3 default ones
    if (convertedSets.length === 0) {
      setEditingSets([
        createDefaultSet(0),
        createDefaultSet(1),
        createDefaultSet(2),
      ]);
    } else {
      setEditingSets(convertedSets);
    }
    
    setExpandedSetId(null);
    setShowEditExercise(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingExercise) return;
    
    setSaving(true);
    try {
      // Update exercise basic info
      await routineV2Api.updateExercise(editingExercise.id, {
        notes: notes || undefined,
        defaultRestSeconds: rest ? parseInt(rest) * 60 : undefined,
        linkWithNext: linkWithNext || undefined,
      });

      // Get existing sets
      const existingSets = editingExercise.sets?.slice().sort((a, b) => a.order - b.order) || [];
      const existingCount = existingSets.length;
      const newCount = editingSets.length;

      // Delete extra sets if we have fewer now
      if (newCount < existingCount) {
        for (let i = newCount; i < existingCount; i++) {
          await routineV2Api.deleteSet(existingSets[i].id);
        }
      }

      // Update existing sets or add new ones
      for (let i = 0; i < editingSets.length; i++) {
        const setConfig = editingSets[i];
        const isAmrap = setConfig.type === "amrap";
        const isDropSet = setConfig.type === "dropset";
        const isRestPause = setConfig.type === "restpause";
        const isMyoReps = setConfig.type === "myoreps";
        const isIsohold = setConfig.type === "isohold";

        const setData = {
          targetReps: isAmrap ? "AMRAP" : setConfig.reps,
          targetRir: setConfig.rir ? parseInt(setConfig.rir) : undefined,
          targetLoad: setConfig.kg ? parseFloat(setConfig.kg) : undefined,
          restSeconds: rest ? parseInt(rest) * 60 : 120,
          order: i + 1,
          isAmrap,
          isDropSet,
          dropSetCount: isDropSet ? setConfig.dropCount : undefined,
          dropSetTargets: isDropSet && setConfig.drops ? setConfig.drops.map((d, idx) => ({
            order: idx + 1,
            targetReps: d.reps || setConfig.reps,
            targetLoad: d.kg ? parseFloat(d.kg) : undefined,
          })) : undefined,
          isRestPause,
          restPauseSets: isRestPause ? setConfig.restPauseSets : undefined,
          restPauseRest: isRestPause ? setConfig.restPauseRest : undefined,
          isMyoReps,
          myoActivationReps: isMyoReps ? setConfig.myoActivationReps : undefined,
          myoMiniSets: isMyoReps ? setConfig.myoMiniSets : undefined,
          myoMiniReps: isMyoReps ? setConfig.myoMiniReps : undefined,
          isIsohold,
          isoholdSeconds: isIsohold ? setConfig.isoholdSeconds : undefined,
          isoholdPosition: isIsohold ? setConfig.isoholdPosition : undefined,
        };

        if (i < existingCount) {
          // Update existing set
          await routineV2Api.updateSet(existingSets[i].id, setData);
        } else {
          // Add new set
          await routineV2Api.addSet(editingExercise.id, setData);
        }
      }

      await refetch();
      setShowEditExercise(false);
      setEditingExercise(null);
      resetForm();
      toast.success("Cambios guardados");
    } catch (err) {
      console.error("Error updating:", err);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Count total series
  const totalSeries = sortedExercises.reduce((acc, e) => acc + (e.sets?.length || 0), 0);

  // Handle save button - ask about replication
  const handleSaveClick = () => {
    if (sortedMicrocycles.length > 1) {
      setShowReplicateDialog(true);
    } else {
      // Solo hay 1 microciclo, no hay nada que replicar
      toast.success("¡Cambios guardados!", {
        description: "Los ejercicios ya están guardados automáticamente",
      });
      router.push(`/coach/routines-v2/${templateId}`);
    }
  };

  // Handle replication
  const handleReplicate = async (replicate: boolean) => {
    setShowReplicateDialog(false);
    
    if (!replicate) {
      toast.success("¡Cambios guardados!", {
        description: "Solo se guardó el microciclo actual",
      });
      router.push(`/coach/routines-v2/${templateId}`);
      return;
    }

    // Replicar usando el endpoint del backend (una sola llamada)
    setReplicating(true);
    try {
      const sourceMicro = currentMicrocycle;
      if (!sourceMicro) throw new Error("No hay microciclo seleccionado");

      const result = await routineV2Api.replicateMicrocycle(templateId, sourceMicro.id);
      
      toast.success("¡Cambios replicados!", {
        description: `Los ejercicios de M${sourceMicro.order} se copiaron a ${result.replicatedCount} microciclos`,
      });
      router.push(`/coach/routines-v2/${templateId}`);
    } catch (err) {
      console.error("Error replicating:", err);
      toast.error("Error al replicar", {
        description: "Intentá de nuevo",
      });
    } finally {
      setReplicating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center">
        <p className="text-red-400">Error al cargar la plantilla</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0d0d12] border-b border-[#1a1a24]">
        <div className="flex items-center gap-4 p-4">
          <button 
            onClick={() => router.back()}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white">Editando Rutina</h1>
            <p className="text-xs text-gray-500">Plantilla: {template.name}</p>
          </div>
          <Button 
            size="sm" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSaveClick}
            disabled={replicating}
          >
            {replicating ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-1" />
            )}
            Guardar
          </Button>
        </div>

        {/* Microcycle selector - Centrado con flechas */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                if (currentMicroIndex > 0) {
                  setCurrentMicroIndex(currentMicroIndex - 1);
                  setCurrentDayIndex(0);
                }
              }}
              disabled={currentMicroIndex === 0}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                currentMicroIndex === 0
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-gray-400 hover:bg-[#1a1a24] hover:text-white"
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 bg-[#1a1a24] rounded-full px-4 py-2 min-w-[140px] justify-center">
              <span className="text-amber-500 font-bold text-lg">
                Microciclo {currentMicrocycle?.order || 1}
              </span>
              <span className="text-gray-500 text-sm">
                / {sortedMicrocycles.length}
              </span>
            </div>
            
            <button
              onClick={() => {
                if (currentMicroIndex < sortedMicrocycles.length - 1) {
                  setCurrentMicroIndex(currentMicroIndex + 1);
                  setCurrentDayIndex(0);
                }
              }}
              disabled={currentMicroIndex >= sortedMicrocycles.length - 1}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                currentMicroIndex >= sortedMicrocycles.length - 1
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-gray-400 hover:bg-[#1a1a24] hover:text-white"
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Day selector */}
        <div className="px-4 pb-3 border-b border-[#1a1a24]">
          <div className="flex gap-2 overflow-x-auto">
            {sortedDays.map((d, idx) => (
              <button
                key={d.id}
                onClick={() => setCurrentDayIndex(idx)}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  idx === currentDayIndex
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                    : "bg-[#1a1a24] text-gray-500 hover:text-gray-300 hover:bg-[#252530]"
                )}
              >
                {d.name}
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
            <span className="text-white font-medium">M{currentMicrocycle?.order} · {currentDay?.name}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">{sortedExercises.length} ejercicios · {totalSeries} series</span>
          </div>
        </div>

        {/* Tip */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
          <span className="text-amber-500 text-xl">💡</span>
          <p className="text-sm text-amber-200/90">
            Tocá en cada fila para cargar tu peso, RIR y RPE
          </p>
        </div>

        {/* Lista de ejercicios */}
        <AnimatePresence>
          {sortedExercises.map((exercise, idx) => (
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
                      <h3 className="font-semibold text-base text-white">
                        {exercise.exerciseCatalog?.name || `Ejercicio ${exercise.order}`}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {exercise.exerciseCatalog?.muscleGroup} · {exercise.sets?.length || 0} series · 
                        Reps: {exercise.defaultReps} · Descanso: {Math.round((exercise.defaultRestSeconds || 120) / 60)} min
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
                  {exercise.sets?.slice().sort((a, b) => a.order - b.order).map((set, setIdx) => (
                    <div key={set.id}>
                      <div
                        className={cn(
                          "grid grid-cols-6 py-3 border-b border-[#1e1e2a]/60 items-center",
                          set.isAmrap && "bg-purple-950/30",
                          set.isDropSet && "bg-orange-950/20 border-l-2 border-l-orange-500/60",
                          setIdx === (exercise.sets?.length || 0) - 1 && !set.isDropSet && "border-b-0 rounded-b-lg"
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
                          {set.targetLoad || "—"}
                        </span>

                        {/* RIR-E */}
                        <span className="text-center text-sm text-gray-400">
                          {set.targetRir ?? "—"}
                        </span>

                        {/* RIR-R */}
                        <span className="text-center text-sm text-gray-600">—</span>

                        {/* RPE */}
                        <span className="text-center text-sm text-gray-400">
                          {set.targetRpe ?? "—"}
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
        {sortedExercises.length === 0 && (
          <div className="text-center py-12">
            <Dumbbell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay ejercicios en este día</p>
            <p className="text-gray-600 text-xs mt-1">Tocá el botón + para agregar</p>
          </div>
        )}

        {/* Leyenda */}
        {sortedExercises.length > 0 && (
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
        className="fixed bottom-24 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 transition-all hover:scale-105 z-40"
      >
        <Plus className="w-6 h-6 text-black" />
      </button>

      {/* Sheet: Buscar ejercicio */}
      <Sheet open={showExerciseSearch} onOpenChange={setShowExerciseSearch}>
        <SheetContent side="bottom" className="bg-[#13131a] border-[#1e1e2a] h-[85vh] rounded-t-2xl mx-auto max-w-[420px] sm:max-w-[480px]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-white">Agregar ejercicio</SheetTitle>
            <SheetDescription className="text-gray-500">
              Buscá un ejercicio del catálogo para agregarlo al día
            </SheetDescription>
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
            {catalogLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              </div>
            ) : (
              filteredCatalog.map((exercise) => (
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
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet: Configurar series */}
      <Sheet open={showSeriesForm} onOpenChange={setShowSeriesForm}>
        <SheetContent side="bottom" className="bg-[#13131a] border-[#1e1e2a] h-[90vh] rounded-t-2xl overflow-hidden mx-auto max-w-[420px] sm:max-w-[480px]">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-white flex items-center gap-2 text-base">
              <Dumbbell className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="truncate">{selectedCatalogExercise?.name}</span>
            </SheetTitle>
            <SheetDescription className="text-gray-500">
              {selectedCatalogExercise?.muscleGroup} · Configurá las series y repeticiones
            </SheetDescription>
          </SheetHeader>

          <div className="overflow-y-auto h-[calc(90vh-180px)] pb-4 -mx-6 px-6">
            {/* Quick actions */}
            <div className="flex items-center justify-between py-3 border-b border-[#1e1e2a]">
              <span className="text-xs text-gray-400">{editingSets.length} series</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveSet}
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
                    set.type === "dropset" && "border-orange-500/30 bg-orange-500/5",
                    set.type === "restpause" && "border-cyan-500/30 bg-cyan-500/5",
                    set.type === "myoreps" && "border-pink-500/30 bg-pink-500/5",
                    set.type === "isohold" && "border-emerald-500/30 bg-emerald-500/5"
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
                        set.type === "restpause" ? "bg-cyan-600 text-white" :
                        set.type === "myoreps" ? "bg-pink-600 text-white" :
                        set.type === "isohold" ? "bg-emerald-600 text-white" :
                        "bg-gray-700 text-white"
                      )}>
                        {set.type === "amrap" ? <Flame className="w-4 h-4" /> : 
                         set.type === "dropset" ? <ArrowDownToLine className="w-4 h-4" /> :
                         set.type === "restpause" ? <Timer className="w-4 h-4" /> :
                         set.type === "myoreps" ? <Repeat className="w-4 h-4" /> :
                         set.type === "isohold" ? <Lock className="w-4 h-4" /> :
                         idx + 1}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">
                          {set.reps} reps
                          {set.kg && <span className="text-gray-400"> · {set.kg}kg</span>}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {set.type !== "normal" && <span className="text-amber-400 capitalize">{set.type} · </span>}
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
                              <button onClick={() => toggleSetType(set.id, "normal")} className={cn("p-2 rounded-lg text-[10px] font-medium transition-all", set.type === "normal" ? "bg-gray-600 text-white" : "bg-[#252530] text-gray-400")}>Normal</button>
                              <button onClick={() => toggleSetType(set.id, "amrap")} className={cn("p-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1", set.type === "amrap" ? "bg-purple-600 text-white" : "bg-[#252530] text-gray-400")}><Flame className="w-3 h-3" />AMRAP</button>
                              <button onClick={() => toggleSetType(set.id, "dropset")} className={cn("p-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1", set.type === "dropset" ? "bg-orange-600 text-white" : "bg-[#252530] text-gray-400")}><ArrowDownToLine className="w-3 h-3" />Drop</button>
                              <button onClick={() => toggleSetType(set.id, "restpause")} className={cn("p-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1", set.type === "restpause" ? "bg-cyan-600 text-white" : "bg-[#252530] text-gray-400")}><Timer className="w-3 h-3" />Rest-Pause</button>
                              <button onClick={() => toggleSetType(set.id, "myoreps")} className={cn("p-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1", set.type === "myoreps" ? "bg-pink-600 text-white" : "bg-[#252530] text-gray-400")}><Repeat className="w-3 h-3" />Myo Reps</button>
                              <button onClick={() => toggleSetType(set.id, "isohold")} className={cn("p-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1", set.type === "isohold" ? "bg-emerald-600 text-white" : "bg-[#252530] text-gray-400")}><Lock className="w-3 h-3" />Isohold</button>
                            </div>
                          </div>

                          {/* Repeticiones */}
                          {set.type !== "amrap" && (
                            <div>
                              <Label className="text-[10px] text-gray-400 mb-2 block">Repeticiones</Label>
                              <Input
                                value={set.reps}
                                onChange={(e) => updateSetField(set.id, "reps", e.target.value)}
                                placeholder="10-12"
                                className="bg-[#252530] border-gray-700 text-white text-center h-10"
                              />
                              <div className="flex flex-wrap gap-1 mt-2">
                                {repsQuickOptions.map(opt => (
                                  <button key={opt.value} onClick={() => updateSetField(set.id, "reps", opt.value)} className={cn("px-2 py-1 rounded text-[10px]", set.reps === opt.value ? "bg-amber-600 text-white" : "bg-[#252530] text-gray-400")}>{opt.label}</button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Carga sugerida */}
                          <div>
                            <Label className="text-[10px] text-gray-400 mb-2 block">Carga sugerida (kg)</Label>
                            <Input
                              value={set.kg}
                              onChange={(e) => updateSetField(set.id, "kg", e.target.value)}
                              placeholder="Ej: 50"
                              className="bg-[#252530] border-gray-700 text-white text-center h-10"
                              inputMode="decimal"
                            />
                            <div className="flex flex-wrap gap-1 mt-2">
                              {kgQuickOptionsNumeric.slice(0, 8).map(kg => (
                                <button key={kg} onClick={() => updateSetField(set.id, "kg", kg)} className={cn("px-2 py-1 rounded text-[10px]", set.kg === kg ? "bg-amber-600 text-white" : "bg-[#252530] text-gray-400")}>{kg}</button>
                              ))}
                            </div>
                          </div>

                          {/* Drop Set config */}
                          {set.type === "dropset" && (
                            <div className="bg-orange-950/20 rounded-lg p-3 border border-orange-500/20">
                              <Label className="text-[10px] text-orange-400 mb-3 block font-semibold">Configurar drops</Label>
                              <div className="flex gap-2 mb-3">
                                {[1, 2, 3].map(n => (
                                  <button key={n} onClick={() => updateDropCount(set.id, n)} className={cn("w-10 h-8 rounded-lg text-sm font-medium", set.dropCount === n ? "bg-orange-600 text-white" : "bg-[#252530] text-gray-400")}>{n}</button>
                                ))}
                              </div>
                              <div className="space-y-2">
                                {set.drops?.map((drop, dropIdx) => (
                                  <div key={dropIdx} className="flex items-center gap-2">
                                    <span className="text-xs text-orange-400 font-medium w-12">Drop {dropIdx + 1}:</span>
                                    <Input value={drop.kg} onChange={(e) => updateDropKg(set.id, dropIdx, e.target.value)} placeholder="Ej: 60" className="flex-1 bg-[#252530] border-orange-500/30 text-white text-center h-8 text-sm" inputMode="decimal" />
                                    <span className="text-[10px] text-gray-500">kg</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Rest-Pause config */}
                          {set.type === "restpause" && (
                            <div className="bg-cyan-950/20 rounded-lg p-3 border border-cyan-500/20">
                              <Label className="text-[10px] text-cyan-400 mb-3 block font-semibold">Configurar Rest-Pause</Label>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-cyan-400 font-medium w-24">Mini-series:</span>
                                  <div className="flex gap-1">
                                    {[2, 3, 4, 5].map(n => (
                                      <button key={n} onClick={() => updateSetField(set.id, "restPauseSets", n)} className={cn("w-8 h-7 rounded text-xs font-medium", set.restPauseSets === n ? "bg-cyan-600 text-white" : "bg-[#252530] text-gray-400")}>{n}</button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-cyan-400 font-medium w-24">Descanso:</span>
                                  <Input value={set.restPauseRest || ""} onChange={(e) => updateSetField(set.id, "restPauseRest", e.target.value)} placeholder="10-15" className="flex-1 bg-[#252530] border-cyan-500/30 text-white text-center h-8 text-sm" />
                                  <span className="text-[10px] text-gray-500">seg</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Myo Reps config */}
                          {set.type === "myoreps" && (
                            <div className="bg-pink-950/20 rounded-lg p-3 border border-pink-500/20">
                              <Label className="text-[10px] text-pink-400 mb-3 block font-semibold">Configurar Myo Reps</Label>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-pink-400 font-medium w-24">Activación:</span>
                                  <Input value={set.myoActivationReps || ""} onChange={(e) => updateSetField(set.id, "myoActivationReps", e.target.value)} placeholder="12-15" className="flex-1 bg-[#252530] border-pink-500/30 text-white text-center h-8 text-sm" />
                                  <span className="text-[10px] text-gray-500">reps</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-pink-400 font-medium w-24">Mini-series:</span>
                                  <div className="flex gap-1">
                                    {[3, 4, 5, 6].map(n => (
                                      <button key={n} onClick={() => updateSetField(set.id, "myoMiniSets", n)} className={cn("w-8 h-7 rounded text-xs font-medium", set.myoMiniSets === n ? "bg-pink-600 text-white" : "bg-[#252530] text-gray-400")}>{n}</button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-pink-400 font-medium w-24">Reps/mini:</span>
                                  <Input value={set.myoMiniReps || ""} onChange={(e) => updateSetField(set.id, "myoMiniReps", e.target.value)} placeholder="3-5" className="flex-1 bg-[#252530] border-pink-500/30 text-white text-center h-8 text-sm" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Isohold config */}
                          {set.type === "isohold" && (
                            <div className="bg-emerald-950/20 rounded-lg p-3 border border-emerald-500/20">
                              <Label className="text-[10px] text-emerald-400 mb-3 block font-semibold">Configurar Isohold</Label>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-emerald-400 font-medium w-24">Segundos:</span>
                                  <Input value={set.isoholdSeconds || ""} onChange={(e) => updateSetField(set.id, "isoholdSeconds", e.target.value)} placeholder="30" className="flex-1 bg-[#252530] border-emerald-500/30 text-white text-center h-8 text-sm" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-emerald-400 font-medium w-24">Posición:</span>
                                  <div className="flex gap-1">
                                    {["abajo", "medio", "arriba"].map(pos => (
                                      <button key={pos} onClick={() => updateSetField(set.id, "isoholdPosition", pos)} className={cn("flex-1 h-7 rounded text-[9px] font-medium capitalize", set.isoholdPosition === pos ? "bg-emerald-600 text-white" : "bg-[#252530] text-gray-400")}>{pos}</button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Superserie toggle */}
            <div className="space-y-2 py-3 border-t border-[#1e1e2a]">
              <button
                onClick={() => setLinkWithNext(!linkWithNext)}
                className={cn(
                  "w-full p-3 rounded-lg flex items-center justify-between transition-all",
                  linkWithNext
                    ? "bg-blue-600/20 border border-blue-500/50"
                    : "bg-[#1a1a24] border border-transparent"
                )}
              >
                <div className="flex items-center gap-2">
                  <Link2 className={cn("w-4 h-4", linkWithNext ? "text-blue-400" : "text-gray-500")} />
                  <span className="text-xs font-medium text-white">Combinar con siguiente (Superserie)</span>
                </div>
                <div className={cn("w-10 h-5 rounded-full transition-all relative", linkWithNext ? "bg-blue-600" : "bg-gray-700")}>
                  <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", linkWithNext ? "left-5" : "left-0.5")} />
                </div>
              </button>
            </div>

            {/* Notes */}
            <div className="py-3">
              <Label className="text-[11px] text-gray-400 mb-1.5 block">Notas para el alumno</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Agarre supino, controlar la bajada..."
                className="bg-[#1a1a24] border-[#2a2a35] text-white min-h-[60px] text-sm"
              />
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 p-4 bg-[#13131a] border-t border-[#1e1e2a]">
            <Button
              onClick={handleAddExercise}
              disabled={saving || editingSets.length === 0}
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Agregar ejercicio
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar ejercicio */}
      <Sheet open={showEditExercise} onOpenChange={setShowEditExercise}>
        <SheetContent side="bottom" className="bg-[#13131a] border-[#1e1e2a] rounded-t-2xl h-[90vh] overflow-y-auto mx-auto max-w-[420px] sm:max-w-[480px]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-white flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-amber-500" />
              {editingExercise?.exerciseCatalog?.name}
            </SheetTitle>
            <SheetDescription className="text-gray-500">
              {editingExercise?.exerciseCatalog?.muscleGroup} · Configurá las series y repeticiones
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-24">
            {/* Series count controls */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{editingSets.length} series</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveSet}
                  disabled={editingSets.length <= 1}
                  className="h-8 px-3 bg-[#1a1a24] border-[#2a2a35] text-gray-400 hover:text-white"
                >
                  <Minus className="w-4 h-4 mr-1" />
                  Quitar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddSet}
                  className="h-8 px-3 bg-[#1a1a24] border-[#2a2a35] text-amber-500 hover:text-amber-400"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>

            {/* Sets list */}
            <div className="space-y-2">
              {editingSets.map((setConfig, idx) => (
                <div 
                  key={setConfig.id} 
                  className="bg-[#1a1a24] rounded-lg border border-[#2a2a35] overflow-hidden"
                >
                  {/* Set header - clickable to expand */}
                  <button
                    onClick={() => setExpandedSetId(expandedSetId === setConfig.id ? null : setConfig.id)}
                    className="w-full p-3 flex items-center justify-between hover:bg-[#1e1e28] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </span>
                      <div className="text-left">
                        <span className="text-white font-medium">
                          {setConfig.type === "amrap" ? "AMRAP" : `${setConfig.reps} reps`}
                        </span>
                        {setConfig.kg && <span className="text-gray-500 ml-2">· {setConfig.kg}kg</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {setConfig.type !== "normal" && (
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          setConfig.type === "amrap" && "border-purple-500/50 text-purple-400",
                          setConfig.type === "dropset" && "border-orange-500/50 text-orange-400",
                          setConfig.type === "restpause" && "border-blue-500/50 text-blue-400",
                          setConfig.type === "myoreps" && "border-green-500/50 text-green-400",
                          setConfig.type === "isohold" && "border-cyan-500/50 text-cyan-400"
                        )}>
                          {setConfig.type === "amrap" && "AMRAP"}
                          {setConfig.type === "dropset" && `Drop x${setConfig.dropCount || 2}`}
                          {setConfig.type === "restpause" && "Rest-Pause"}
                          {setConfig.type === "myoreps" && "Myo Reps"}
                          {setConfig.type === "isohold" && "Isohold"}
                        </Badge>
                      )}
                      <ChevronDown className={cn(
                        "w-4 h-4 text-gray-500 transition-transform",
                        expandedSetId === setConfig.id && "rotate-180"
                      )} />
                    </div>
                  </button>

                  {/* Expanded content */}
                  {expandedSetId === setConfig.id && (
                    <div className="px-3 pb-3 space-y-4 border-t border-[#2a2a35]">
                      {/* Technique selection */}
                      <div className="pt-3">
                        <Label className="text-xs text-gray-400 mb-2 block">Técnica de alta intensidad</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { type: "normal" as SetType, label: "Normal" },
                            { type: "amrap" as SetType, label: "AMRAP", icon: Flame },
                            { type: "dropset" as SetType, label: "Drop", icon: ArrowDownToLine },
                          ].map(({ type, label, icon: Icon }) => (
                            <button
                              key={type}
                              onClick={() => toggleSetType(setConfig.id, type)}
                              className={cn(
                                "py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1",
                                setConfig.type === type
                                  ? "bg-amber-500 text-black"
                                  : "bg-[#252530] text-gray-400 hover:text-white"
                              )}
                            >
                              {Icon && <Icon className="w-3 h-3" />}
                              {label}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[
                            { type: "restpause" as SetType, label: "Rest-Pause", icon: Timer },
                            { type: "myoreps" as SetType, label: "Myo Reps", icon: Repeat },
                            { type: "isohold" as SetType, label: "Isohold", icon: Lock },
                          ].map(({ type, label, icon: Icon }) => (
                            <button
                              key={type}
                              onClick={() => toggleSetType(setConfig.id, type)}
                              className={cn(
                                "py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1",
                                setConfig.type === type
                                  ? "bg-amber-500 text-black"
                                  : "bg-[#252530] text-gray-400 hover:text-white"
                              )}
                            >
                              {Icon && <Icon className="w-3 h-3" />}
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reps */}
                      <div>
                        <Label className="text-xs text-gray-400 mb-2 block">Repeticiones</Label>
                        <Input
                          value={setConfig.reps}
                          onChange={(e) => updateSetField(setConfig.id, "reps", e.target.value)}
                          className="bg-[#252530] border-[#2a2a35] text-white text-center text-lg"
                          placeholder="10-12"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {repsQuickOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateSetField(setConfig.id, "reps", opt.value)}
                              className={cn(
                                "px-2.5 py-1 rounded text-xs transition-colors",
                                setConfig.reps === opt.value
                                  ? "bg-amber-500 text-black"
                                  : "bg-[#252530] text-gray-400 hover:text-white"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Load */}
                      <div>
                        <Label className="text-xs text-gray-400 mb-2 block">Carga sugerida (kg)</Label>
                        <Input
                          value={setConfig.kg}
                          onChange={(e) => updateSetField(setConfig.id, "kg", e.target.value)}
                          className="bg-[#252530] border-[#2a2a35] text-white text-center"
                          placeholder="Ej: 50"
                          inputMode="decimal"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {kgQuickOptionsNumeric.map((kg) => (
                            <button
                              key={kg}
                              onClick={() => updateSetField(setConfig.id, "kg", kg)}
                              className={cn(
                                "px-2 py-1 rounded text-xs transition-colors",
                                setConfig.kg === kg
                                  ? "bg-amber-500 text-black"
                                  : "bg-[#252530] text-gray-400 hover:text-white"
                              )}
                            >
                              {kg}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* RIR */}
                      <div>
                        <Label className="text-xs text-gray-400 mb-2 block">RIR esperado</Label>
                        <Input
                          value={setConfig.rir}
                          onChange={(e) => updateSetField(setConfig.id, "rir", e.target.value)}
                          className="bg-[#252530] border-[#2a2a35] text-white text-center w-20"
                          placeholder="2"
                          inputMode="numeric"
                        />
                      </div>

                      {/* Drop Set config */}
                      {setConfig.type === "dropset" && (
                        <div className="p-3 bg-orange-950/20 rounded-lg border border-orange-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-orange-400">Cantidad de drops</Label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateDropCount(setConfig.id, Math.max(1, (setConfig.dropCount || 2) - 1))}
                                className="w-7 h-7 rounded bg-[#252530] text-gray-400 hover:text-white"
                              >
                                -
                              </button>
                              <span className="text-white font-medium w-6 text-center">{setConfig.dropCount || 2}</span>
                              <button
                                onClick={() => updateDropCount(setConfig.id, Math.min(5, (setConfig.dropCount || 2) + 1))}
                                className="w-7 h-7 rounded bg-[#252530] text-gray-400 hover:text-white"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          {setConfig.drops?.map((drop, dropIdx) => (
                            <div key={dropIdx} className="flex items-center gap-2">
                              <span className="text-xs text-orange-400 w-16">Drop {dropIdx + 1}:</span>
                              <Input
                                value={drop.kg}
                                onChange={(e) => updateDropKg(setConfig.id, dropIdx, e.target.value)}
                                className="bg-[#252530] border-orange-500/30 text-white text-center flex-1"
                                placeholder="kg"
                                inputMode="decimal"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Rest-Pause config */}
                      {setConfig.type === "restpause" && (
                        <div className="p-3 bg-blue-950/20 rounded-lg border border-blue-500/30 space-y-3">
                          <div>
                            <Label className="text-xs text-blue-400 mb-1 block">Mini-sets</Label>
                            <Input
                              type="number"
                              value={setConfig.restPauseSets || 3}
                              onChange={(e) => updateSetField(setConfig.id, "restPauseSets", parseInt(e.target.value) || 3)}
                              className="bg-[#252530] border-blue-500/30 text-white w-20"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-blue-400 mb-1 block">Descanso entre mini-sets (seg)</Label>
                            <Input
                              value={setConfig.restPauseRest || "10-15"}
                              onChange={(e) => updateSetField(setConfig.id, "restPauseRest", e.target.value)}
                              className="bg-[#252530] border-blue-500/30 text-white"
                              placeholder="10-15"
                            />
                          </div>
                        </div>
                      )}

                      {/* Myo Reps config */}
                      {setConfig.type === "myoreps" && (
                        <div className="p-3 bg-green-950/20 rounded-lg border border-green-500/30 space-y-3">
                          <div>
                            <Label className="text-xs text-green-400 mb-1 block">Reps activación</Label>
                            <Input
                              value={setConfig.myoActivationReps || "12-15"}
                              onChange={(e) => updateSetField(setConfig.id, "myoActivationReps", e.target.value)}
                              className="bg-[#252530] border-green-500/30 text-white"
                              placeholder="12-15"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-green-400 mb-1 block">Mini-sets</Label>
                              <Input
                                type="number"
                                value={setConfig.myoMiniSets || 4}
                                onChange={(e) => updateSetField(setConfig.id, "myoMiniSets", parseInt(e.target.value) || 4)}
                                className="bg-[#252530] border-green-500/30 text-white"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-green-400 mb-1 block">Reps x mini</Label>
                              <Input
                                value={setConfig.myoMiniReps || "3-5"}
                                onChange={(e) => updateSetField(setConfig.id, "myoMiniReps", e.target.value)}
                                className="bg-[#252530] border-green-500/30 text-white"
                                placeholder="3-5"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Isohold config */}
                      {setConfig.type === "isohold" && (
                        <div className="p-3 bg-cyan-950/20 rounded-lg border border-cyan-500/30 space-y-3">
                          <div>
                            <Label className="text-xs text-cyan-400 mb-1 block">Duración (segundos)</Label>
                            <Input
                              value={setConfig.isoholdSeconds || "30"}
                              onChange={(e) => updateSetField(setConfig.id, "isoholdSeconds", e.target.value)}
                              className="bg-[#252530] border-cyan-500/30 text-white"
                              placeholder="30"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-cyan-400 mb-1 block">Posición</Label>
                            <div className="flex gap-2">
                              {["abajo", "arriba", "medio"].map((pos) => (
                                <button
                                  key={pos}
                                  onClick={() => updateSetField(setConfig.id, "isoholdPosition", pos)}
                                  className={cn(
                                    "flex-1 py-2 rounded text-xs font-medium transition-colors",
                                    setConfig.isoholdPosition === pos
                                      ? "bg-cyan-500 text-black"
                                      : "bg-[#252530] text-gray-400 hover:text-white"
                                  )}
                                >
                                  {pos.charAt(0).toUpperCase() + pos.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Rest */}
            <div>
              <Label className="text-xs text-gray-400 mb-2 block">Descanso entre series (min)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={rest}
                onChange={(e) => setRest(e.target.value)}
                className="bg-[#1a1a24] border-[#2a2a35] text-white"
              />
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs text-gray-400 mb-2 block">Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-[#1a1a24] border-[#2a2a35] text-white min-h-[60px]"
                placeholder="Instrucciones especiales..."
              />
            </div>

            {/* Link with next */}
            <div className="flex items-center justify-between p-3 bg-[#1a1a24] rounded-lg border border-[#2a2a35]">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">Superserie con siguiente</span>
              </div>
              <button
                onClick={() => setLinkWithNext(!linkWithNext)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  linkWithNext ? "bg-blue-500" : "bg-[#2a2a35]"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  linkWithNext ? "translate-x-7" : "translate-x-1"
                )} />
              </button>
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 py-4 bg-[#13131a] border-t border-[#1e1e2a]">
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar cambios
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Dialog: Replicar a otros microciclos */}
      <AlertDialog open={showReplicateDialog} onOpenChange={setShowReplicateDialog}>
        <AlertDialogContent className="bg-[#13131a] border-[#1e1e2a] max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Replicar a otros microciclos?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Editaste el microciclo <span className="text-amber-500 font-medium">M{currentMicrocycle?.order}</span>. 
              ¿Querés copiar estos ejercicios a los demás microciclos (M2, M3, etc)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              onClick={() => handleReplicate(false)}
              className="bg-[#1a1a24] border-[#2a2a35] text-white hover:bg-[#252530] hover:text-white"
            >
              No, solo este
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleReplicate(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Sí, replicar a todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
