"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dumbbell,
  Plus,
  Search,
  Trash2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Loader2,
  LayoutTemplate,
  Users,
  Edit,
  Save,
  X,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRoutineCache } from "@/stores/routine-cache";

interface Set {
  id?: number;
  order: number;
  reps: string;
  expectedRir: string;
  isAmrap?: boolean;
}

interface Exercise {
  id?: number;
  orden: number;
  exerciseCatalogId: number;
  series: string;
  repeticiones: string;
  descanso: string;
  rirEsperado: string;
  exerciseCatalog?: {
    id: number;
    name: string;
    muscleGroup: string;
    videoUrl?: string;
  };
  sets?: Set[];
}

interface Day {
  id: number;
  dia: number;
  nombre: string;
  esDescanso: boolean;
  exercises: Exercise[];
}

interface Microcycle {
  id: number;
  name: string;
  isDeload?: boolean;
  days: Day[];
}

interface Template {
  id: number;
  templateName: string;
  templateDescription?: string;
  templateCategory?: string;
  objetivo?: string;
  microcycles: Microcycle[];
}

interface CatalogExercise {
  id: number;
  name: string;
  muscleGroup: string;
  videoUrl?: string;
}

interface EditingExercise {
  microId: number;
  dayId: number;
  exercise: Exercise;
}

export default function TemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<Template | null>(null);
  
  // Expanded states
  const [expandedMicros, setExpandedMicros] = useState<number[]>([]);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);

  // Exercise catalog
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [selectedMicroId, setSelectedMicroId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [addingExercise, setAddingExercise] = useState(false);
  const [deletingMicro, setDeletingMicro] = useState<number | null>(null);
  const [addingMicro, setAddingMicro] = useState(false);
  
  // Replication checkbox
  const [replicateToNext, setReplicateToNext] = useState(true);

  // Edit exercise state
  const [editingExercise, setEditingExercise] = useState<EditingExercise | null>(null);
  const [editForm, setEditForm] = useState({
    series: "3",
    repeticiones: "8-12",
    descanso: "2",
    rirEsperado: "2",
  });
  const [savingExercise, setSavingExercise] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Cache
  const { getCatalog, setCatalog: cacheCatalog, getMuscleGroups, setMuscleGroups: cacheMuscleGroups } = useRoutineCache();

  // Ref para evitar duplicados
  const dataFetched = useRef(false);

  useEffect(() => {
    if (dataFetched.current) return;
    dataFetched.current = true;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar template
        const { data: templateData } = await api.get(`/templates/mesocycles/${templateId}`);
        setTemplate(templateData);
        
        // Expandir primer microciclo por defecto
        if (templateData.microcycles?.[0]?.id) {
          setExpandedMicros([templateData.microcycles[0].id]);
        }

        // Cargar catálogo (usar cache si existe)
        const cachedCatalog = getCatalog();
        if (cachedCatalog) {
          setCatalog(cachedCatalog);
        } else {
          const { data: catalogData } = await api.get("/exercise-catalog");
          setCatalog(catalogData);
          cacheCatalog(catalogData);
        }

        // Cargar muscle groups (usar cache si existe)
        const cachedGroups = getMuscleGroups();
        if (cachedGroups) {
          setMuscleGroups(cachedGroups);
        } else {
          const { data: groupsData } = await api.get("/exercise-catalog/muscle-groups");
          setMuscleGroups(groupsData || []);
          cacheMuscleGroups(groupsData || []);
        }
      } catch (error) {
        console.error("Error loading template:", error);
        toast.error("Error al cargar la plantilla");
        dataFetched.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [templateId]);

  // Ordenar microciclos por ID
  const sortedMicrocycles = template?.microcycles?.slice().sort((a, b) => a.id - b.id) || [];

  // Obtener índice del microciclo actual
  const getCurrentMicroIndex = (microId: number) => {
    return sortedMicrocycles.findIndex(m => m.id === microId);
  };

  const toggleMicro = (microId: number) => {
    setExpandedMicros((prev) =>
      prev.includes(microId) ? prev.filter((id) => id !== microId) : [...prev, microId]
    );
  };

  const toggleDay = (dayId: number) => {
    setExpandedDays((prev) =>
      prev.includes(dayId) ? prev.filter((id) => id !== dayId) : [...prev, dayId]
    );
  };

  const openAddExercise = (dayId: number, microId: number) => {
    setSelectedDayId(dayId);
    setSelectedMicroId(microId);
    setShowAddExercise(true);
    setSearchTerm("");
    setFilterGroup("all");
    setReplicateToNext(true); // Por defecto activado en templates
  };

  const openEditExercise = (microId: number, dayId: number, exercise: Exercise) => {
    setEditingExercise({ microId, dayId, exercise });
    setEditForm({
      series: exercise.series || "3",
      repeticiones: exercise.repeticiones || "8-12",
      descanso: exercise.descanso || "2",
      rirEsperado: exercise.rirEsperado || "2",
    });
  };

  const handleSaveExercise = async (replicate: boolean) => {
    if (!editingExercise?.exercise.id) return;

    setSavingExercise(true);
    setShowSaveDialog(false);
    
    try {
      // Guardar cambios en este ejercicio
      await api.patch(`/exercise/${editingExercise.exercise.id}`, {
        series: editForm.series,
        repeticiones: editForm.repeticiones,
        descanso: editForm.descanso,
        rirEsperado: editForm.rirEsperado,
      });

      // Si replica, también guardar en microciclos posteriores
      if (replicate) {
        const currentIndex = getCurrentMicroIndex(editingExercise.microId);
        const day = sortedMicrocycles[currentIndex]?.days?.find(d => d.id === editingExercise.dayId);
        
        if (day) {
          // Buscar ejercicios similares en microciclos posteriores
          for (let i = currentIndex + 1; i < sortedMicrocycles.length; i++) {
            const nextMicro = sortedMicrocycles[i];
            const sameDay = nextMicro.days?.find(d => d.dia === day.dia);
            
            if (sameDay) {
              // Buscar ejercicio con mismo catalogId
              const sameExercise = sameDay.exercises?.find(
                ex => ex.exerciseCatalogId === editingExercise.exercise.exerciseCatalogId
              );
              
              if (sameExercise?.id) {
                await api.patch(`/exercise/${sameExercise.id}`, {
                  series: editForm.series,
                  repeticiones: editForm.repeticiones,
                  descanso: editForm.descanso,
                  rirEsperado: editForm.rirEsperado,
                });
              }
            }
          }
        }
      }

      // Actualizar estado local
      setTemplate((prev) => {
        if (!prev) return prev;
        
        const currentIndex = getCurrentMicroIndex(editingExercise.microId);
        
        return {
          ...prev,
          microcycles: prev.microcycles.map((m, idx) => {
            const sortedIdx = sortedMicrocycles.findIndex(sm => sm.id === m.id);
            
            // Si es el micro actual o (replicate y es posterior)
            if (m.id === editingExercise.microId || (replicate && sortedIdx > currentIndex)) {
              const day = sortedMicrocycles[currentIndex]?.days?.find(d => d.id === editingExercise.dayId);
              
              return {
                ...m,
                days: m.days.map((d) => {
                  // Si es el día actual o (replicate y mismo número de día)
                  if (d.id === editingExercise.dayId || (replicate && d.dia === day?.dia)) {
                    return {
                      ...d,
                      exercises: d.exercises.map((e) => {
                        if (e.id === editingExercise.exercise.id || 
                            (replicate && e.exerciseCatalogId === editingExercise.exercise.exerciseCatalogId)) {
                          return { ...e, ...editForm };
                        }
                        return e;
                      }),
                    };
                  }
                  return d;
                }),
              };
            }
            return m;
          }),
        };
      });

      toast.success(replicate 
        ? "Ejercicio actualizado en este y microciclos posteriores" 
        : "Ejercicio actualizado"
      );
      setEditingExercise(null);
    } catch (error: any) {
      console.error("Error saving exercise:", error);
      toast.error(error.response?.data?.message || "Error al guardar");
    } finally {
      setSavingExercise(false);
    }
  };

  const handleAddExercise = async (catalogExercise: CatalogExercise) => {
    if (!selectedDayId || !selectedMicroId) return;

    const currentIndex = getCurrentMicroIndex(selectedMicroId);
    const micro = sortedMicrocycles[currentIndex];
    const day = micro?.days?.find((d) => d.id === selectedDayId);
    if (!day) return;

    setAddingExercise(true);
    try {
      const newExercise = {
        dayId: selectedDayId,
        dayNumber: day.dia,
        exerciseCatalogId: catalogExercise.id,
        name: catalogExercise.name,
        muscleGroup: catalogExercise.muscleGroup,
        series: "3",
        repeticiones: "8-12",
        descanso: "2",
        rirEsperado: "2",
        order: (day.exercises?.length || 0) + 1,
        sets: [
          { reps: "8-12", expectedRir: "2", order: 0 },
          { reps: "8-12", expectedRir: "2", order: 1 },
          { reps: "8-12", expectedRir: "2", order: 2 },
        ],
        replicateToNext,
      };

      const { data } = await api.post(`/microcycle/${selectedMicroId}/exercises`, newExercise);

      // Actualizar estado local
      setTemplate((prev): any => {
        if (!prev) return prev;
        return {
          ...prev,
          microcycles: prev.microcycles.map((m, idx) => {
            const sortedIdx = sortedMicrocycles.findIndex(sm => sm.id === m.id);
            
            // Si es el micro actual
            if (m.id === selectedMicroId) {
              return {
                ...m,
                days: m.days.map((d) =>
                  d.id === selectedDayId
                    ? {
                        ...d,
                        exercises: [
                          ...d.exercises,
                          {
                            ...newExercise,
                            id: data.exerciseId || data.exercise?.id || data.id,
                            exerciseCatalog: catalogExercise,
                            sets: data.exercise?.sets || newExercise.sets,
                          },
                        ],
                      }
                    : d
                ),
              };
            }
            
            // Si replica y es posterior
            if (replicateToNext && sortedIdx > currentIndex) {
              return {
                ...m,
                days: m.days.map((d) =>
                  d.dia === day.dia
                    ? {
                        ...d,
                        exercises: [
                          ...d.exercises,
                          {
                            ...newExercise,
                            id: undefined, // El ID real vendrá del backend
                            exerciseCatalog: catalogExercise,
                          },
                        ],
                      }
                    : d
                ),
              };
            }
            
            return m;
          }),
        };
      });

      if (replicateToNext) {
        toast.success(`Ejercicio agregado y replicado a ${sortedMicrocycles.length - currentIndex - 1} microciclos posteriores`);
      } else {
        toast.success("Ejercicio agregado");
      }
      setShowAddExercise(false);
    } catch (error: any) {
      console.error("Error adding exercise:", error);
      toast.error(error.response?.data?.message || "Error al agregar ejercicio");
    } finally {
      setAddingExercise(false);
    }
  };

  const handleDeleteExercise = async (microId: number, dayId: number, exerciseId: number, exercise: Exercise, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmDelete = window.confirm("¿Eliminar este ejercicio?");
    if (!confirmDelete) return;

    const currentIndex = getCurrentMicroIndex(microId);
    const hasNextMicros = currentIndex < sortedMicrocycles.length - 1;
    
    let replicateDelete = false;
    if (hasNextMicros) {
      replicateDelete = window.confirm(
        "¿Replicar eliminación a microciclos posteriores?\n\n✅ Aceptar = Eliminar de este y posteriores\n❌ Cancelar = Solo eliminar de este"
      );
    }

    try {
      if (replicateDelete) {
        // Eliminar de microciclos posteriores
        const day = sortedMicrocycles[currentIndex]?.days?.find(d => d.id === dayId);
        
        if (day) {
          for (let i = currentIndex + 1; i < sortedMicrocycles.length; i++) {
            const nextMicro = sortedMicrocycles[i];
            const sameDay = nextMicro.days?.find(d => d.dia === day.dia);
            
            if (sameDay) {
              const sameExercise = sameDay.exercises?.find(
                ex => ex.exerciseCatalogId === exercise.exerciseCatalogId
              );
              
              if (sameExercise?.id) {
                await api.delete(`/exercise/${sameExercise.id}`);
              }
            }
          }
        }
      }
      
      // Eliminar este ejercicio
      await api.delete(`/exercise/${exerciseId}`);
      
      // Actualizar estado local
      setTemplate((prev) => {
        if (!prev) return prev;
        
        const day = sortedMicrocycles[currentIndex]?.days?.find(d => d.id === dayId);
        
        return {
          ...prev,
          microcycles: prev.microcycles.map((m) => {
            const sortedIdx = sortedMicrocycles.findIndex(sm => sm.id === m.id);
            
            if (m.id === microId || (replicateDelete && sortedIdx > currentIndex)) {
              return {
                ...m,
                days: m.days.map((d) => {
                  if (d.id === dayId || (replicateDelete && d.dia === day?.dia)) {
                    return {
                      ...d,
                      exercises: d.exercises.filter((ex) => 
                        ex.id !== exerciseId && 
                        !(replicateDelete && ex.exerciseCatalogId === exercise.exerciseCatalogId)
                      ),
                    };
                  }
                  return d;
                }),
              };
            }
            return m;
          }),
        };
      });

      toast.success(
        replicateDelete
          ? "Ejercicio eliminado de este y microciclos posteriores"
          : "Ejercicio eliminado"
      );
    } catch (error) {
      console.error("Error deleting exercise:", error);
      toast.error("Error al eliminar ejercicio");
    }
  };

  const handleDeleteMicrocycle = async (microId: number, microName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm(`¿Eliminar "${microName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingMicro(microId);
    try {
      await api.delete(`/microcycle/${microId}`);
      toast.success(`"${microName}" eliminado`);
      
      setTemplate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          microcycles: prev.microcycles.filter((m) => m.id !== microId),
        };
      });
    } catch (error: any) {
      console.error("Error deleting microcycle:", error);
      toast.error(error.response?.data?.message || "Error al eliminar");
    } finally {
      setDeletingMicro(null);
    }
  };

  const handleAddMicrocycle = async () => {
    if (!template) return;
    
    setAddingMicro(true);
    try {
      const microCount = sortedMicrocycles.length;
      const lastMicro = sortedMicrocycles[microCount - 1];
      
      // Determinar número de días (del último microciclo o 4 por defecto)
      const daysCount = lastMicro?.days?.length || 4;
      
      // Crear estructura de días con ejercicios copiados del último micro
      const days = [];
      for (let i = 1; i <= daysCount; i++) {
        const sourceDay = lastMicro?.days?.find(d => d.dia === i);
        const exercises = sourceDay?.exercises?.map((ex, idx) => ({
          exerciseCatalogId: ex.exerciseCatalogId,
          series: ex.series,
          repeticiones: ex.repeticiones,
          descanso: ex.descanso,
          rirEsperado: ex.rirEsperado,
          orden: idx + 1,
          sets: ex.sets?.map((s, sIdx) => ({
            reps: s.reps,
            expectedRir: s.expectedRir,
            order: sIdx,
            isAmrap: s.isAmrap || false,
          })) || [],
        })) || [];
        
        days.push({
          dia: i,
          nombre: `Día ${i}`,
          esDescanso: false,
          exercises,
        });
      }
      
      const payload = {
        name: `Microciclo ${microCount + 1}`,
        isDeload: false,
        days,
      };
      
      const { data: newMicro } = await api.post(`/microcycle/${templateId}`, payload);
      
      // Actualizar template local
      setTemplate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          microcycles: [...prev.microcycles, newMicro],
        };
      });
      
      // Expandir el nuevo microciclo
      setExpandedMicros((prev) => [...prev, newMicro.id]);
      
      toast.success(`Microciclo ${microCount + 1} creado`);
    } catch (error: any) {
      console.error("Error creating microcycle:", error);
      toast.error(error.response?.data?.message || "Error al crear microciclo");
    } finally {
      setAddingMicro(false);
    }
  };

  const filteredCatalog = catalog.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroup === "all" || ex.muscleGroup === filterGroup;
    return matchesSearch && matchesGroup;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Cargando..." backHref="/coach/templates" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Error" backHref="/coach/templates" />
        <div className="px-4 py-8 text-center">
          <p className="text-text-muted">No se encontró la plantilla</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={template.templateName}
        subtitle="Editar plantilla"
        backHref="/coach/templates"
        rightContent={
          <Button
            size="sm"
            onClick={() => router.push(`/coach/templates/${templateId}/assign`)}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Users className="w-4 h-4 mr-1" />
            Asignar
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {/* Template Info Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <LayoutTemplate className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-text">{template.templateName}</h2>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <span>{sortedMicrocycles.length} microciclos</span>
                  <span>•</span>
                  <span>{sortedMicrocycles[0]?.days?.length || 0} días/microciclo</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Microcycles List */}
        {sortedMicrocycles.map((micro, idx) => {
          const isMicroExpanded = expandedMicros.includes(micro.id);
          const sortedDays = micro.days?.slice().sort((a, b) => a.dia - b.dia) || [];

          return (
            <Card key={`micro-${micro.id}`} className="bg-surface border-border overflow-hidden">
              {/* Microcycle Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => toggleMicro(micro.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-text">Microciclo {idx + 1}</p>
                      {micro.isDeload && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                          🔵 Descarga
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{sortedDays.length} días</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDeleteMicrocycle(micro.id, `Microciclo ${idx + 1}`, e)}
                    disabled={deletingMicro === micro.id}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      deletingMicro === micro.id 
                        ? "bg-red-500/20" 
                        : "hover:bg-red-500/20 text-text-muted hover:text-red-400"
                    )}
                    title="Eliminar microciclo"
                  >
                    {deletingMicro === micro.id ? (
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                  {isMicroExpanded ? (
                    <ChevronDown className="w-5 h-5 text-text-muted" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-text-muted" />
                  )}
                </div>
              </div>

              {/* Days List */}
              <AnimatePresence>
                {isMicroExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {sortedDays.map((day) => {
                        const isDayExpanded = expandedDays.includes(day.id);
                        const exerciseCount = day.exercises?.length || 0;

                        return (
                          <Card key={`day-${day.id}`} className="bg-background/50 border-border">
                            {/* Day Header */}
                            <div
                              className="p-3 flex items-center justify-between cursor-pointer"
                              onClick={() => toggleDay(day.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                  {day.dia}
                                </div>
                                <div>
                                  <p className="font-medium text-text text-sm">{day.nombre}</p>
                                  <p className="text-xs text-text-muted">{exerciseCount} ejercicio(s)</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-primary h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddExercise(day.id, micro.id);
                                  }}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                                {isDayExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-text-muted" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-text-muted" />
                                )}
                              </div>
                            </div>

                            {/* Exercises List */}
                            <AnimatePresence>
                              {isDayExpanded && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: "auto" }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3 space-y-2">
                                    {day.exercises?.length === 0 ? (
                                      <p className="text-xs text-text-muted text-center py-3">
                                        Sin ejercicios. Tocá + para agregar.
                                      </p>
                                    ) : (
                                      day.exercises?.map((exercise, exIdx) => (
                                        <div
                                          key={exercise.id ? `ex-${exercise.id}` : `ex-new-${exIdx}`}
                                          className="p-2 bg-surface/50 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-surface/80 transition-colors"
                                          onClick={() => exercise.id && openEditExercise(micro.id, day.id, exercise)}
                                        >
                                          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                            <Dumbbell className="w-3.5 h-3.5 text-primary" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-text truncate">
                                              {exercise.exerciseCatalog?.name || "Ejercicio"}
                                            </p>
                                            <p className="text-[10px] text-text-muted">
                                              {exercise.series || 3} series • {exercise.repeticiones || "8-12"} reps • RIR {exercise.rirEsperado || "2"}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7 text-text-muted hover:text-primary"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                exercise.id && openEditExercise(micro.id, day.id, exercise);
                                              }}
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7 text-red-500"
                                              onClick={(e) => exercise.id && handleDeleteExercise(micro.id, day.id, exercise.id, exercise, e)}
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Card>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}

        {/* Add Microcycle Button */}
        <Button
          variant="outline"
          className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/10"
          onClick={handleAddMicrocycle}
          disabled={addingMicro}
        >
          {addingMicro ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Agregar microciclo
            </>
          )}
        </Button>
      </div>

      {/* Edit Exercise Sheet */}
      <Sheet open={!!editingExercise} onOpenChange={(open) => !open && setEditingExercise(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl bg-surface border-border p-0">
          <SheetTitle className="sr-only">Editar ejercicio</SheetTitle>
          <SheetDescription className="sr-only">Configurar parámetros del ejercicio</SheetDescription>
          
          <div className="p-4 border-b border-border">
            <div className="w-12 h-1 bg-border/50 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text">
                  {editingExercise?.exercise.exerciseCatalog?.name || "Ejercicio"}
                </h3>
                <p className="text-sm text-text-muted">
                  {editingExercise?.exercise.exerciseCatalog?.muscleGroup}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Series */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-text-muted">Series</Label>
                <Input
                  type="number"
                  value={editForm.series}
                  onChange={(e) => setEditForm({ ...editForm, series: e.target.value })}
                  className="bg-background h-12 text-center text-lg"
                  min={1}
                  max={10}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-text-muted">Repeticiones</Label>
                <Input
                  value={editForm.repeticiones}
                  onChange={(e) => setEditForm({ ...editForm, repeticiones: e.target.value })}
                  placeholder="8-12"
                  className="bg-background h-12 text-center text-lg"
                />
              </div>
            </div>

            {/* Descanso y RIR */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-text-muted">Descanso (min)</Label>
                <Input
                  value={editForm.descanso}
                  onChange={(e) => setEditForm({ ...editForm, descanso: e.target.value })}
                  placeholder="2"
                  className="bg-background h-12 text-center text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-text-muted">RIR Esperado</Label>
                <Input
                  value={editForm.rirEsperado}
                  onChange={(e) => setEditForm({ ...editForm, rirEsperado: e.target.value })}
                  placeholder="2"
                  className="bg-background h-12 text-center text-lg"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => setEditingExercise(null)}
                disabled={savingExercise}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                className="flex-1 h-12 bg-primary text-black hover:bg-primary-hover"
                onClick={() => setShowSaveDialog(true)}
                disabled={savingExercise}
              >
                {savingExercise ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent className="bg-surface border-border max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text flex items-center gap-2">
              <Copy className="w-5 h-5 text-primary" />
              ¿Replicar cambios?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-muted">
              ¿Querés aplicar estos cambios también a los microciclos posteriores?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              className="bg-primary text-black hover:bg-primary-hover w-full"
              onClick={() => handleSaveExercise(true)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Este y posteriores
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-surface border border-border hover:bg-background text-text w-full"
              onClick={() => handleSaveExercise(false)}
            >
              Solo este microciclo
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-0">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Exercise Sheet */}
      <Sheet open={showAddExercise} onOpenChange={setShowAddExercise}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-surface border-border p-0">
          <SheetTitle className="sr-only">Agregar ejercicio</SheetTitle>
          <SheetDescription className="sr-only">Seleccioná un ejercicio del catálogo</SheetDescription>
          
          <div className="p-4 border-b border-border">
            <div className="w-12 h-1 bg-border/50 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-bold text-text mb-3">Agregar Ejercicio</h3>
            
            {/* Search & Filter */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-32 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {muscleGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Replicate Checkbox */}
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
              <Checkbox
                id="replicate"
                checked={replicateToNext}
                onCheckedChange={(checked) => setReplicateToNext(checked as boolean)}
              />
              <label htmlFor="replicate" className="text-sm text-text cursor-pointer flex items-center gap-2">
                <Copy className="w-4 h-4 text-primary" />
                Replicar a microciclos posteriores
              </label>
            </div>
          </div>

          {/* Exercise List */}
          <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(85vh-200px)] relative">
            {addingExercise && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-text-muted">
                    {replicateToNext ? "Agregando y replicando..." : "Agregando ejercicio..."}
                  </p>
                </div>
              </div>
            )}
            {filteredCatalog.map((exercise) => (
              <Card
                key={`catalog-${exercise.id}`}
                className={cn(
                  "bg-background/50 border-border cursor-pointer transition-colors",
                  addingExercise ? "opacity-50" : "hover:bg-background"
                )}
                onClick={() => !addingExercise && handleAddExercise(exercise)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text text-sm">{exercise.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {exercise.muscleGroup}
                    </Badge>
                  </div>
                  <Plus className="w-5 h-5 text-primary" />
                </CardContent>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
