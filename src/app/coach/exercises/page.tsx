"use client";

import { useState, useEffect, useRef } from "react";
import { useRoutineCache } from "@/stores/routine-cache";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  Edit,
  Trash2,
  Youtube,
  Download,
  Filter,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  description?: string;
  videoUrl?: string;
  isBase?: boolean;
  isActive?: boolean;
}

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  "Pecho": "bg-red-500/20 text-red-400 border-red-500/30",
  "Espalda": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Hombros": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Bíceps": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Tríceps": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Piernas": "bg-green-500/20 text-green-400 border-green-500/30",
  "Cuádriceps": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Isquiotibiales": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "Glúteos": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Core": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Abdominales": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Pantorrillas": "bg-lime-500/20 text-lime-400 border-lime-500/30",
  "Antebrazo": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "Trapecio": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "Cardio": "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export default function ExerciseCatalogPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("");

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    muscleGroup: "",
    description: "",
    videoUrl: "",
  });

  // Delete confirmation
  const [deleteExercise, setDeleteExercise] = useState<Exercise | null>(null);

  // Ref para prevenir llamados duplicados (React StrictMode)
  const initialFetchDone = useRef(false);
  const lastFilters = useRef({ searchTerm: "", filterGroup: "" });

  // Cache de muscle groups
  const { getMuscleGroups, setMuscleGroups: cacheMuscleGroups } = useRoutineCache();

  const loadData = async (forceRefresh = false) => {
    // Evitar llamada duplicada en el mount inicial
    if (!forceRefresh && initialFetchDone.current && 
        lastFilters.current.searchTerm === searchTerm && 
        lastFilters.current.filterGroup === filterGroup) {
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterGroup && filterGroup !== "all") params.append("muscleGroup", filterGroup);
      if (searchTerm) params.append("search", searchTerm);

      // Usar cache de muscle groups si existe
      const cachedGroups = getMuscleGroups();
      
      const exercisesPromise = api.get(`/exercise-catalog${params.toString() ? `?${params.toString()}` : ""}`);
      const groupsPromise = cachedGroups ? Promise.resolve({ data: cachedGroups }) : api.get("/exercise-catalog/muscle-groups");

      const [exercisesRes, groupsRes] = await Promise.all([exercisesPromise, groupsPromise]);

      setExercises(exercisesRes.data);
      setMuscleGroups(groupsRes.data || []);
      
      // Cachear muscle groups si no estaba cacheado
      if (!cachedGroups && groupsRes.data) {
        cacheMuscleGroups(groupsRes.data);
      }

      // Guardar estado de filtros
      lastFilters.current = { searchTerm, filterGroup };
      initialFetchDone.current = true;
    } catch (error) {
      console.error("Error loading exercises:", error);
      toast.error("Error al cargar ejercicios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterGroup, searchTerm]);

  const handleImportBase = async () => {
    try {
      setImporting(true);
      await api.post("/exercise-catalog/import-base");
      toast.success("Ejercicios base importados correctamente");
      loadData();
    } catch (error) {
      console.error("Error importing:", error);
      toast.error("Error al importar ejercicios");
    } finally {
      setImporting(false);
    }
  };

  const openCreateForm = () => {
    setEditingExercise(null);
    setFormData({
      name: "",
      muscleGroup: "",
      description: "",
      videoUrl: "",
    });
    setShowForm(true);
  };

  const openEditForm = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      description: exercise.description || "",
      videoUrl: exercise.videoUrl || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!formData.muscleGroup.trim()) {
      toast.error("El grupo muscular es requerido");
      return;
    }

    try {
      setFormLoading(true);
      if (editingExercise) {
        await api.put(`/exercise-catalog/${editingExercise.id}`, formData);
        toast.success("Ejercicio actualizado");
      } else {
        await api.post("/exercise-catalog", formData);
        toast.success("Ejercicio creado");
      }
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteExercise) return;

    try {
      await api.delete(`/exercise-catalog/${deleteExercise.id}`);
      toast.success("Ejercicio eliminado");
      setDeleteExercise(null);
      loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Error al eliminar");
    }
  };

  const getMuscleGroupColor = (group: string) => {
    return MUSCLE_GROUP_COLORS[group] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const groupedExercises = exercises.reduce((acc, ex) => {
    const group = ex.muscleGroup || "Sin grupo";
    if (!acc[group]) acc[group] = [];
    acc[group].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Catálogo de Ejercicios"
        subtitle={`${exercises.length} ejercicios`}
        backHref="/coach/routines"
      />

      <div className="px-4 py-4 space-y-4">
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={openCreateForm}
            className="flex-1 bg-gradient-to-r from-primary to-primary-hover text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Ejercicio
          </Button>
          <Button
            onClick={handleImportBase}
            variant="outline"
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Buscar ejercicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-surface"
            />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-36 bg-surface">
              <Filter className="w-4 h-4 mr-2" />
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

        {/* Muscle Group Pills */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer transition-colors",
              !filterGroup || filterGroup === "all"
                ? "bg-primary/20 text-primary border-primary"
                : "bg-surface text-text-muted"
            )}
            onClick={() => setFilterGroup("all")}
          >
            Todos ({exercises.length})
          </Badge>
          {muscleGroups.slice(0, 6).map((group) => {
            const count = exercises.filter((e) => e.muscleGroup === group).length;
            return (
              <Badge
                key={group}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-colors",
                  filterGroup === group
                    ? getMuscleGroupColor(group)
                    : "bg-surface text-text-muted hover:bg-surface/80"
                )}
                onClick={() => setFilterGroup(group)}
              >
                {group} ({count})
              </Badge>
            );
          })}
        </div>

        {/* Exercise List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <Card className="bg-surface/50 border-border">
            <CardContent className="p-8 text-center">
              <Dumbbell className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted mb-4">
                {searchTerm || filterGroup
                  ? "No se encontraron ejercicios"
                  : "No tenés ejercicios en tu catálogo"}
              </p>
              {!searchTerm && !filterGroup && (
                <Button onClick={handleImportBase} variant="outline" disabled={importing}>
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Importar Base
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : filterGroup && filterGroup !== "all" ? (
          // Filtered view - flat list
          <div className="space-y-2">
            {exercises.map((exercise, idx) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={idx}
                onEdit={() => openEditForm(exercise)}
                onDelete={() => setDeleteExercise(exercise)}
                getMuscleGroupColor={getMuscleGroupColor}
              />
            ))}
          </div>
        ) : (
          // Grouped view
          <div className="space-y-6">
            {Object.entries(groupedExercises).map(([group, exs]) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={getMuscleGroupColor(group)}>
                    {group}
                  </Badge>
                  <span className="text-xs text-text-muted">
                    {exs.length} ejercicio(s)
                  </span>
                </div>
                <div className="space-y-2">
                  {exs.map((exercise, idx) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      index={idx}
                      onEdit={() => openEditForm(exercise)}
                      onDelete={() => setDeleteExercise(exercise)}
                      getMuscleGroupColor={getMuscleGroupColor}
                      hideGroup
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl bg-gradient-to-b from-surface to-background border-border p-0">
          {/* Hidden accessibility elements */}
          <SheetTitle className="sr-only">
            {editingExercise ? "Editar Ejercicio" : "Nuevo Ejercicio"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {editingExercise ? "Formulario para editar un ejercicio" : "Formulario para crear un nuevo ejercicio"}
          </SheetDescription>
          
          {/* Header con gradiente */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="w-12 h-1 bg-border/50 rounded-full mx-auto mb-6" />
            
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  editingExercise 
                    ? "bg-gradient-to-br from-primary/30 to-accent/30" 
                    : "bg-gradient-to-br from-green-500/30 to-emerald-500/30"
                )}
              >
                {editingExercise ? (
                  <Edit className="w-7 h-7 text-primary" />
                ) : (
                  <Plus className="w-7 h-7 text-green-400" />
                )}
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-text">
                  {editingExercise ? "Editar Ejercicio" : "Nuevo Ejercicio"}
                </h2>
                <p className="text-sm text-text-muted">
                  {editingExercise
                    ? "Modificá los datos del ejercicio"
                    : "Agregá un ejercicio a tu biblioteca"}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 pb-8 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Nombre */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <Label className="text-sm font-medium text-text flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                Nombre del ejercicio
                <span className="text-red-400">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Press Banca con Barra"
                className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-base"
              />
            </motion.div>

            {/* Grupo Muscular con Pills */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="space-y-3"
            >
              <Label className="text-sm font-medium text-text flex items-center gap-2">
                <span className="text-lg">💪</span>
                Grupo Muscular
                <span className="text-red-400">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Pecho", emoji: "🫁" },
                  { name: "Espalda", emoji: "🔙" },
                  { name: "Hombros", emoji: "🏋️" },
                  { name: "Bíceps", emoji: "💪" },
                  { name: "Tríceps", emoji: "🦾" },
                  { name: "Piernas", emoji: "🦵" },
                  { name: "Cuádriceps", emoji: "🦿" },
                  { name: "Isquiotibiales", emoji: "🦵" },
                  { name: "Glúteos", emoji: "🍑" },
                  { name: "Core", emoji: "🎯" },
                  { name: "Abdominales", emoji: "🔥" },
                  { name: "Pantorrillas", emoji: "🦶" },
                  { name: "Trapecio", emoji: "🪨" },
                  { name: "Cardio", emoji: "❤️" },
                ].map((group) => (
                  <motion.button
                    key={group.name}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFormData({ ...formData, muscleGroup: group.name })}
                    className={cn(
                      "px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                      formData.muscleGroup === group.name
                        ? getMuscleGroupColor(group.name) + " ring-2 ring-offset-2 ring-offset-surface"
                        : "bg-background/50 text-text-muted hover:bg-background border border-border/30"
                    )}
                  >
                    {group.emoji} {group.name}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Descripción */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <Label className="text-sm font-medium text-text flex items-center gap-2">
                <span className="text-lg">📝</span>
                Descripción
                <span className="text-xs text-text-muted font-normal">(opcional)</span>
              </Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Instrucciones, técnica, notas importantes..."
                rows={3}
                className="w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-base text-text placeholder:text-text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </motion.div>

            {/* Video URL */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="space-y-2"
            >
              <Label className="text-sm font-medium text-text flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500" />
                Video Demostrativo
                <span className="text-xs text-text-muted font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <Input
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="h-12 pl-12 bg-background/50 border-border/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl text-base"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-red-500/20 flex items-center justify-center">
                  <Youtube className="w-3.5 h-3.5 text-red-500" />
                </div>
              </div>
              {formData.videoUrl && (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Video vinculado
                </p>
              )}
            </motion.div>

            {/* Preview Card */}
            {formData.name && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="p-4 rounded-xl bg-background/30 border border-border/30 space-y-2"
              >
                <p className="text-xs text-text-muted uppercase tracking-wide">Vista previa</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text">{formData.name}</p>
                    <div className="flex items-center gap-2">
                      {formData.muscleGroup && (
                        <Badge variant="outline" className={cn("text-xs", getMuscleGroupColor(formData.muscleGroup))}>
                          {formData.muscleGroup}
                        </Badge>
                      )}
                      {formData.videoUrl && (
                        <span className="text-xs text-red-400 flex items-center gap-1">
                          <Youtube className="w-3 h-3" /> Video
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Buttons - Fixed */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl border-border/50 hover:bg-background"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-black font-semibold shadow-lg shadow-primary/25"
                disabled={formLoading || !formData.name || !formData.muscleGroup}
                onClick={handleSubmit}
              >
                {formLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    {editingExercise ? "Guardar Cambios" : "Crear Ejercicio"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteExercise} onOpenChange={() => setDeleteExercise(null)}>
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text">¿Eliminar ejercicio?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-muted">
              Se eliminará "{deleteExercise?.name}" del catálogo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Exercise Card Component
function ExerciseCard({
  exercise,
  index,
  onEdit,
  onDelete,
  getMuscleGroupColor,
  hideGroup = false,
}: {
  exercise: Exercise;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  getMuscleGroupColor: (group: string) => string;
  hideGroup?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <Card className="bg-surface/60 border-border hover:bg-surface/80 transition-colors">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-text text-sm truncate">{exercise.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {!hideGroup && (
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getMuscleGroupColor(exercise.muscleGroup))}
                  >
                    {exercise.muscleGroup}
                  </Badge>
                )}
                {exercise.videoUrl && (
                  <a
                    href={exercise.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                  >
                    <Youtube className="w-3 h-3" />
                    Video
                  </a>
                )}
                {exercise.isBase && (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400">
                    Base
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8">
                <Edit className="w-4 h-4 text-text-muted" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                className="h-8 w-8 text-red-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

