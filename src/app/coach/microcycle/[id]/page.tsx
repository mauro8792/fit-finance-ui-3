"use client";

import { PageHeader } from "@/components/navigation/PageHeader";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRoutineCache } from "@/stores/routine-cache";
import {
    ChevronDown,
    ChevronUp,
    Copy,
    Dumbbell,
    Loader2,
    Plus,
    Save,
    Search,
    Trash2,
    Youtube,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Exercise {
  id?: number;
  nombre?: string;
  grupoMuscular?: string;
  series: string;
  repeticiones: string;
  descanso: string;
  rirEsperado: string;
  orden: number;
  exerciseCatalogId?: number;
  exerciseCatalog?: {
    id: number;
    name: string;
    muscleGroup: string;
    videoUrl?: string;
  };
  sets?: Set[];
}

interface Set {
  id?: number;
  order: number;
  reps: string;
  expectedRir: string;
  load?: number;
  status?: string;
  isAmrap?: boolean;
  amrapInstruction?: string;
  amrapNotes?: string;
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
  mesocycle?: {
    id: number;
    name: string;
    macrocycle?: {
      id: number;
      studentId: number;
    };
  };
  days: Day[];
}

interface CatalogExercise {
  id: number;
  name: string;
  muscleGroup: string;
  videoUrl?: string;
}

export default function EditMicrocyclePage() {
  const params = useParams();
  const microcycleId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [microcycle, setMicrocycle] = useState<Microcycle | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  
  // Catálogo de ejercicios
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  
  // Modal para agregar ejercicio
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [replicateToNext, setReplicateToNext] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  
  // Confirmación de guardado
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pendingChanges, setPendingChanges] = useState<{ days: Day[] } | null>(null);

  // Ref para evitar llamadas duplicadas
  const dataFetched = useRef(false);
  
  // Cache store
  const { 
    getMicrocycle: getCachedMicrocycle, 
    setMicrocycle: cacheMicrocycle,
    getCatalog: getCachedCatalog,
    setCatalog: cacheCatalogData,
    getMuscleGroups: getCachedMuscleGroups,
    setMuscleGroups: cacheMuscleGroups,
    invalidateMicrocycle
  } = useRoutineCache();

  // Función para procesar y ordenar los días
  const processMicrocycleData = (microData: { days?: Day[] }) => {
    return (microData.days || [])
      .sort((a: Day, b: Day) => a.dia - b.dia)
      .map((day: Day) => ({
        ...day,
        exercises: (day.exercises || [])
          .sort((a: Exercise, b: Exercise) => (a.orden || 0) - (b.orden || 0))
          .map((ex: Exercise) => ({
            ...ex,
            sets: (ex.sets || []).sort((a: Set, b: Set) => (a.order || 0) - (b.order || 0))
          }))
      }));
  };

  // Cargar datos
  useEffect(() => {
    if (dataFetched.current) return;
    
    const loadData = async () => {
      try {
        dataFetched.current = true;
        setLoading(true);
        
        // Intentar obtener del caché primero
        const cachedMicro = getCachedMicrocycle(Number(microcycleId));
        const cachedCatalog = getCachedCatalog();
        
        let microData;
        if (cachedMicro) {
          console.log("📦 Using cached microcycle data");
          microData = cachedMicro;
        } else {
          console.log("🌐 Fetching microcycle from API");
          const { data } = await api.get(`/microcycle/${microcycleId}`);
          microData = data;
          cacheMicrocycle(Number(microcycleId), data);
        }
        
        setMicrocycle(microData);
        const sortedDays = processMicrocycleData(microData);
        setDays(sortedDays);
        setExpandedDays(sortedDays.map((d: Day) => d.id) || []);
        
        // Cargar catálogo de ejercicios (usar caché si existe)
        if (cachedCatalog) {
          console.log("📦 Using cached catalog");
          setCatalog(cachedCatalog);
        } else {
          console.log("🌐 Fetching catalog from API");
          const { data: catalogData } = await api.get("/exercise-catalog");
          setCatalog(catalogData);
          cacheCatalogData(catalogData);
        }
        
        // Cargar grupos musculares (usar caché si existe)
        const cachedGroups = getCachedMuscleGroups();
        if (cachedGroups) {
          console.log("📦 Using cached muscle groups");
          setMuscleGroups(cachedGroups);
        } else {
          console.log("🌐 Fetching muscle groups from API");
          const { data: groupsData } = await api.get("/exercise-catalog/muscle-groups");
          setMuscleGroups(groupsData || []);
          cacheMuscleGroups(groupsData || []);
        }
        
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar el microciclo");
        dataFetched.current = false;
      } finally {
        setLoading(false);
      }
    };

    if (microcycleId) {
      loadData();
    }
  }, [microcycleId, getCachedMicrocycle, getCachedCatalog, getCachedMuscleGroups, cacheMicrocycle, cacheCatalogData, cacheMuscleGroups]);

  // Toggle día expandido
  const toggleDay = (dayId: number) => {
    setExpandedDays((prev) =>
      prev.includes(dayId) ? prev.filter((id) => id !== dayId) : [...prev, dayId]
    );
  };

  // Abrir modal para agregar ejercicio
  const openAddExercise = (dayId: number) => {
    setSelectedDayId(dayId);
    setSearchTerm("");
    setFilterGroup("");
    setReplicateToNext(false);
    setShowAddExercise(true);
  };

  // Agregar ejercicio del catálogo
  const handleAddExercise = async (catalogExercise: CatalogExercise) => {
    if (!selectedDayId || !microcycleId) return;

    const selectedDay = days.find((d) => d.id === selectedDayId);
    if (!selectedDay) return;

    const newExercise: Exercise = {
      nombre: catalogExercise.name,
      grupoMuscular: catalogExercise.muscleGroup,
      series: "3",
      repeticiones: "8-12",
      descanso: "2",
      rirEsperado: "2",
      orden: (selectedDay.exercises?.length || 0) + 1,
      exerciseCatalogId: catalogExercise.id,
      sets: [
        { order: 0, reps: "8-12", expectedRir: "2" },
        { order: 1, reps: "8-12", expectedRir: "2" },
        { order: 2, reps: "8-12", expectedRir: "2" },
      ],
    };

    // Guardar en el servidor usando el endpoint correcto
    setAddingExercise(true);
    try {
      const { data } = await api.post(`/microcycle/${microcycleId}/exercises`, {
        dayId: selectedDayId,
        dayNumber: selectedDay.dia,
        exerciseCatalogId: catalogExercise.id,
        name: catalogExercise.name,
        muscleGroup: catalogExercise.muscleGroup,
        series: "3",
        repeticiones: "8-12",
        descanso: "2",
        rirEsperado: "2",
        order: (selectedDay.exercises?.length || 0) + 1,
        sets: [
          { reps: "8-12", expectedRir: "2", order: 0 },
          { reps: "8-12", expectedRir: "2", order: 1 },
          { reps: "8-12", expectedRir: "2", order: 2 },
        ],
        replicateToNext,
      });

      // Actualizar estado local con el ejercicio creado
      const exerciseWithCatalog = {
        ...newExercise,
        id: data.exercise?.id,
        exerciseCatalog: {
          id: catalogExercise.id,
          name: catalogExercise.name,
          muscleGroup: catalogExercise.muscleGroup,
          videoUrl: catalogExercise.videoUrl,
        },
        sets: data.exercise?.sets || newExercise.sets,
      };
      setDays((prevDays) =>
        prevDays.map((day) =>
          day.id === selectedDayId
            ? { ...day, exercises: [...day.exercises, exerciseWithCatalog] }
            : day
        )
      );
      
      if (replicateToNext) {
        toast.success(`Ejercicio agregado y replicado a ${data.replicatedCount || 0} microciclos posteriores`);
      } else {
        toast.success("Ejercicio agregado");
      }
      setShowAddExercise(false);
    } catch (error) {
      console.error("Error adding exercise:", error);
      toast.error("Error al agregar el ejercicio");
    } finally {
      setAddingExercise(false);
    }
  };

  // Eliminar ejercicio
  const handleDeleteExercise = async (dayId: number, exerciseId: number) => {
    const confirmDelete = window.confirm("¿Eliminar este ejercicio?");
    
    if (!confirmDelete) return;

    const replicateDelete = window.confirm(
      "¿Replicar eliminación a microciclos posteriores?\n\n✅ Aceptar = Eliminar de este y posteriores\n❌ Cancelar = Solo eliminar de este"
    );

    try {
      if (replicateDelete) {
        // Usar endpoint de plantilla para eliminar y replicar
        await api.post(`/exercise/${exerciseId}/delete-template`, {
          fromMicrocycle: parseInt(microcycleId),
        });
      } else {
        // Solo eliminar este ejercicio
        await api.delete(`/exercise/${exerciseId}`);
      }
      
      // Actualizar estado local
      setDays((prevDays) =>
        prevDays.map((day) =>
          day.id === dayId
            ? { ...day, exercises: day.exercises.filter((e) => e.id !== exerciseId) }
            : day
        )
      );

      toast.success(
        replicateDelete
          ? "Ejercicio eliminado de este y microciclos posteriores"
          : "Ejercicio eliminado"
      );
    } catch (error) {
      console.error("Error deleting exercise:", error);
      toast.error("Error al eliminar el ejercicio");
    }
  };

  // Actualizar ejercicio (series, reps, etc)
  const updateExercise = (dayId: number, exerciseIndex: number, field: string, value: string | number | boolean) => {
    setDays((prevDays) =>
      prevDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((ex, idx) =>
                idx === exerciseIndex ? { ...ex, [field]: value } : ex
              ),
            }
          : day
      )
    );
  };

  // Agregar serie a un ejercicio (localmente, se guardará con el botón Guardar)
  const handleAddSet = (dayId: number, exercise: Exercise) => {
    // Obtener valores de la primera serie como referencia
    const firstSet = exercise.sets?.[0];
    const newSetOrder = (exercise.sets?.length || 0);
    
    const newSet: Set = {
      order: newSetOrder,
      reps: firstSet?.reps || "8-12",
      expectedRir: firstSet?.expectedRir || "2",
      isAmrap: false,
    };

    // Actualizar estado local
    setDays((prevDays) =>
      prevDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((ex) =>
                ex.id === exercise.id
                  ? { ...ex, sets: [...(ex.sets || []), newSet] }
                  : ex
              ),
            }
          : day
      )
    );
  };

  // Eliminar serie localmente
  const handleRemoveSet = (dayId: number, exercise: Exercise, setIndex: number) => {
    setDays((prevDays) =>
      prevDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((ex) =>
                ex.id === exercise.id
                  ? { 
                      ...ex, 
                      sets: ex.sets?.filter((_, idx) => idx !== setIndex)
                        .map((s, idx) => ({ ...s, order: idx })) // Reordenar
                    }
                  : ex
              ),
            }
          : day
      )
    );
  };

  // Actualizar una serie
  const updateSet = (dayId: number, exercise: Exercise, setIndex: number, field: string, value: string | number | boolean) => {
    setDays((prevDays) =>
      prevDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((ex) =>
                ex.id === exercise.id
                  ? {
                      ...ex,
                      sets: ex.sets?.map((s, idx) =>
                        idx === setIndex ? { ...s, [field]: value } : s
                      ),
                    }
                  : ex
              ),
            }
          : day
      )
    );
  };

  // Autocompletar series siguientes cuando se pierde foco en la primera serie
  const handleSetBlur = (dayId: number, exercise: Exercise, setIndex: number, field: string) => {
    // Solo autocompletar desde la primera serie
    if (setIndex !== 0) return;
    if (field !== "expectedRir" && field !== "reps") return;

    const firstSet = exercise.sets?.[0];
    if (!firstSet) return;

    const valueToPropagate = firstSet[field as keyof Set];
    if (!valueToPropagate) return;

    setDays((prevDays) =>
      prevDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((ex) =>
                ex.id === exercise.id
                  ? {
                      ...ex,
                      sets: ex.sets?.map((s, idx) => {
                        // Saltar la primera serie (ya tiene el valor)
                        if (idx === 0) return s;
                        
                        const currentValue = s[field as keyof Set];
                        // Solo autocompletar si está vacío o tiene valor por defecto
                        if (!currentValue || currentValue === "" || currentValue === "8-12" || currentValue === "2") {
                          return { ...s, [field]: valueToPropagate };
                        }
                        return s;
                      }),
                    }
                  : ex
              ),
            }
          : day
      )
    );
  };


  // Guardar todos los cambios
  const handleSaveAll = () => {
    setPendingChanges({ days });
    setShowSaveConfirm(true);
  };

  const confirmSave = async (replicate: boolean) => {
    setSaving(true);
    try {
      // Procesar cada ejercicio
      for (const day of days) {
        for (let exIdx = 0; exIdx < day.exercises.length; exIdx++) {
          const exercise = day.exercises[exIdx];
          if (!exercise.id) continue;

          // Actualizar ejercicio
          await api.patch(`/exercise/${exercise.id}`, {
            orden: exIdx + 1,
            descanso: exercise.descanso,
            series: String(exercise.sets?.length || 3),
            repeticiones: exercise.sets?.[0]?.reps || "8-12",
            rirEsperado: exercise.sets?.[0]?.expectedRir || "2",
          });

          // Procesar sets
          const setsToUpdate: Array<{id: number; order: number; reps: string; expectedRir: string; isAmrap: boolean; amrapInstruction: string | null; amrapNotes: string | null;}> = [];
          const setsToCreate: Array<{exerciseId: number; order: number; reps: string; expectedRir: string; isAmrap: boolean;}> = [];

          exercise.sets?.forEach((s, sIdx) => {
            const setData = {
              order: sIdx,
              reps: s.reps || "8-12",
              expectedRir: s.expectedRir || "2",
              isAmrap: s.isAmrap || false,
              amrapInstruction: s.isAmrap ? (s.amrapInstruction || null) : null,
              amrapNotes: s.isAmrap ? (s.amrapNotes || null) : null,
            };

            if (s.id) {
              setsToUpdate.push({ id: s.id, ...setData });
            } else {
              setsToCreate.push({ exerciseId: exercise.id!, ...setData, isAmrap: setData.isAmrap });
            }
          });

          // Actualizar sets existentes
          for (const setData of setsToUpdate) {
            const { id, ...dataWithoutId } = setData;
            await api.patch(`/set/${id}`, dataWithoutId);
          }

          // Crear sets nuevos
          for (const setData of setsToCreate) {
            await api.post(`/set/${setData.exerciseId}`, setData);
          }
        }
      }

      // Si se solicitó replicar, llamar al endpoint de replicación
      if (replicate) {
        const { data: replicateResult } = await api.post(`/microcycle/${microcycleId}/replicate-to-next`);
        console.log("Replicate result:", replicateResult);
        toast.success(replicateResult.message || `Cambios guardados y replicados a ${replicateResult.replicatedTo} microciclos`);
        
        // Invalidar caché de todos los microciclos afectados
        // (El caché se regenerará la próxima vez que se visiten)
      } else {
        toast.success("Cambios guardados");
      }

      // Invalidar caché del microciclo actual
      invalidateMicrocycle(Number(microcycleId));

      // Recargar datos para tener los IDs actualizados
      dataFetched.current = false;
      const { data: microData } = await api.get(`/microcycle/${microcycleId}`);
      const sortedDays = processMicrocycleData(microData);
      setDays(sortedDays);
      
      // Actualizar caché con los nuevos datos
      cacheMicrocycle(Number(microcycleId), microData);
      dataFetched.current = true;

      setShowSaveConfirm(false);
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  // Filtrar ejercicios del catálogo
  const filteredCatalog = catalog.filter((ex) => {
    const matchesSearch =
      !searchTerm || ex.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = !filterGroup || filterGroup === "all" || ex.muscleGroup === filterGroup;
    return matchesSearch && matchesGroup;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Cargando..." backHref="/coach/students" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={`${microcycle?.isDeload ? "🔵 " : ""}${microcycle?.name || "Microciclo"}`}
        subtitle={microcycle?.isDeload ? "Semana de Descarga" : microcycle?.mesocycle?.name}
        backHref={microcycle?.mesocycle?.macrocycle?.studentId 
          ? `/coach/students/${microcycle.mesocycle.macrocycle.studentId}/routine`
          : `/coach/students`}
        rightContent={
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-primary text-black"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Info del microciclo */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-text">{microcycle?.name}</h2>
                <p className="text-sm text-text-muted">
                  {days.length} días • {days.reduce((acc, d) => acc + d.exercises.length, 0)} ejercicios
                </p>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {microcycle?.mesocycle?.name}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Días */}
        {days.map((day) => (
          <Card key={day.id} className="bg-surface/80 border-border overflow-hidden">
            {/* Header del día */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface/50"
              onClick={() => toggleDay(day.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold">{day.dia}</span>
                </div>
                <div>
                  <p className="font-medium text-text">{day.nombre}</p>
                  <p className="text-xs text-text-muted">
                    {day.exercises.length} ejercicio(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    openAddExercise(day.id);
                  }}
                  className="text-primary"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                {expandedDays.includes(day.id) ? (
                  <ChevronUp className="w-5 h-5 text-text-muted" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-text-muted" />
                )}
              </div>
            </div>

            {/* Ejercicios del día */}
            {expandedDays.includes(day.id) && (
              <div className="border-t border-border">
                {day.exercises.length === 0 ? (
                  <div className="p-6 text-center">
                    <Dumbbell className="w-10 h-10 text-text-muted mx-auto mb-2" />
                    <p className="text-text-muted text-sm">Sin ejercicios</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddExercise(day.id)}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar ejercicio
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {day.exercises.map((exercise, exIdx) => (
                      <div key={exercise.id || exIdx} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 mt-1">
                            <Dumbbell className="w-4 h-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-text truncate">
                                {exercise.exerciseCatalog?.name || exercise.nombre || "Sin nombre"}
                              </p>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (!exercise.id) {
                                    toast.error("El ejercicio no tiene ID, recargá la página");
                                    return;
                                  }
                                  handleDeleteExercise(day.id, exercise.id);
                                }}
                                className="h-7 w-7 text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <Badge variant="outline" className="text-xs mb-3">
                              {exercise.exerciseCatalog?.muscleGroup || exercise.grupoMuscular || "N/A"}
                            </Badge>

                            {/* Series individuales */}
                            <div className="space-y-2 mt-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-text-muted">Series</Label>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAddSet(day.id, exercise)}
                                  className="h-6 text-xs text-primary"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Serie
                                </Button>
                              </div>
                              
                              {(exercise.sets && exercise.sets.length > 0) ? (
                                <div className="space-y-2">
                                  {exercise.sets
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .map((set, setIdx) => (
                                    <div
                                      key={set.id || setIdx}
                                      className={cn(
                                        "p-2 rounded-lg border",
                                        set.isAmrap
                                          ? "bg-amber-500/10 border-amber-500/30"
                                          : "bg-background border-border"
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-text-muted w-6">#{setIdx + 1}</span>
                                        
                                        <div className="flex-1">
                                          <div className="grid grid-cols-4 gap-1">
                                            <div>
                                              <span className="text-[10px] text-text-muted block mb-0.5">Reps</span>
                                              <Input
                                                placeholder="8-12"
                                                value={set.reps || ""}
                                                onChange={(e) => updateSet(day.id, exercise, setIdx, "reps", e.target.value)}
                                                onBlur={() => handleSetBlur(day.id, exercise, setIdx, "reps")}
                                                className="h-7 text-xs bg-background/50"
                                              />
                                            </div>
                                            <div>
                                              <span className="text-[10px] text-text-muted block mb-0.5">RIR</span>
                                              <Input
                                                placeholder="2"
                                                value={set.expectedRir || ""}
                                                onChange={(e) => updateSet(day.id, exercise, setIdx, "expectedRir", e.target.value)}
                                                onBlur={() => handleSetBlur(day.id, exercise, setIdx, "expectedRir")}
                                                className="h-7 text-xs bg-background/50"
                                                disabled={set.isAmrap}
                                              />
                                            </div>
                                            <div className="flex flex-col items-center">
                                              <span className="text-[10px] text-amber-500 block mb-0.5">🔥</span>
                                              <Checkbox
                                                id={`amrap-${set.id || setIdx}`}
                                                checked={set.isAmrap || false}
                                                onCheckedChange={(checked) => updateSet(day.id, exercise, setIdx, "isAmrap", checked)}
                                                className={cn(
                                                  "mt-0.5",
                                                  set.isAmrap && "border-amber-500 bg-amber-500"
                                                )}
                                              />
                                            </div>
                                            <div className="flex items-end justify-end">
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleRemoveSet(day.id, exercise, setIdx)}
                                                className="h-6 w-6 text-red-500/70 hover:text-red-500"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {set.isAmrap && (
                                        <div className="mt-2 pt-2 border-t border-amber-500/20">
                                          <Select
                                            value={set.amrapInstruction || "misma_carga"}
                                            onValueChange={(val) => updateSet(day.id, exercise, setIdx, "amrapInstruction", val)}
                                          >
                                            <SelectTrigger className="h-7 text-xs bg-transparent border-amber-500/30">
                                              <SelectValue placeholder="Instrucción" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="misma_carga">Misma carga</SelectItem>
                                              <SelectItem value="bajar_carga">Bajar carga</SelectItem>
                                              <SelectItem value="subir_carga">Subir carga</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-text-muted text-center py-2">
                                  Sin series configuradas
                                </p>
                              )}
                              
                              {/* Descanso general */}
                              <div className="flex items-center gap-2 pt-2">
                                <Label className="text-xs text-text-muted">Descanso (min):</Label>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={exercise.descanso}
                                  onChange={(e) => updateExercise(day.id, exIdx, "descanso", e.target.value)}
                                  className="h-7 w-20 text-xs bg-background"
                                  placeholder="1.5"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Modal Agregar Ejercicio */}
      <Sheet open={showAddExercise} onOpenChange={setShowAddExercise}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-surface border-border">
          <SheetHeader>
            <SheetTitle className="text-text">Agregar Ejercicio</SheetTitle>
            <SheetDescription className="text-text-muted">
              Seleccioná un ejercicio del catálogo
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Búsqueda y filtros */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input
                  placeholder="Buscar ejercicio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-32 bg-background">
                  <SelectValue placeholder="Grupo" />
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

            {/* Checkbox replicar */}
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
              <Checkbox
                id="replicate"
                checked={replicateToNext}
                onCheckedChange={(checked) => setReplicateToNext(checked as boolean)}
              />
              <label htmlFor="replicate" className="text-sm text-text cursor-pointer">
                🔄 Replicar a microciclos posteriores
              </label>
            </div>

            {/* Lista de ejercicios */}
            <div className="h-[50vh] overflow-y-auto space-y-2 pb-4">
              {addingExercise && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-text-muted">Agregando ejercicio...</p>
                  </div>
                </div>
              )}
              {filteredCatalog.map((exercise) => (
                <Card
                  key={exercise.id}
                  className={cn(
                    "bg-background/50 border-border transition-colors",
                    addingExercise 
                      ? "opacity-50 cursor-not-allowed" 
                      : "cursor-pointer hover:bg-background/80"
                  )}
                  onClick={() => !addingExercise && handleAddExercise(exercise)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-text text-sm">{exercise.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {exercise.muscleGroup}
                          </Badge>
                          {exercise.videoUrl && (
                            <Youtube className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmación de guardado */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text">Guardar cambios</AlertDialogTitle>
            <AlertDialogDescription className="text-text-muted">
              ¿Querés aplicar estos cambios también a los microciclos posteriores?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="bg-background">Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => confirmSave(false)}
              disabled={saving}
            >
              Solo este microciclo
            </Button>
            <Button
              onClick={() => confirmSave(true)}
              disabled={saving}
              className="bg-primary text-black"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Este y posteriores
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

