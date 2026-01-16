"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Plus,
  Minus,
  Dumbbell,
  GripVertical,
  Trash2,
  Edit,
  Save,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Clock,
  Flame,
  Info,
  Target,
  ArrowDownToLine,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================
interface ExerciseSet {
  id: string;
  setNumber: number;
  reps: string; // "8-12", "10", "AMRAP", "0-F"
  kg?: string; // Peso sugerido en kg
  rir?: string; // "2", "3"
  rpe?: string; // "8", "9"
  rest?: string; // "2 min"
  isDropSet?: boolean;
  dropSetCount?: number; // Cantidad de drops
  notes?: string;
}

interface Exercise {
  id: string;
  exerciseId: number;
  name: string;
  muscleGroup?: string;
  sets: ExerciseSet[];
  notes?: string;
  order: number;
}

interface Day {
  id: string;
  name: string;
  exercises: Exercise[];
}

interface Microcycle {
  id: number;
  weekNumber: number;
  days: Day[];
}

interface Template {
  id: number;
  name: string;
  description?: string;
  objetivo?: string;
  microcycles: Microcycle[];
  daysPerMicrocycle: number;
  status: "draft" | "published";
}

// Mock ejercicios disponibles
const mockExerciseLibrary = [
  { id: 1, name: "Press de Banca", muscleGroup: "Pecho" },
  { id: 2, name: "Sentadilla", muscleGroup: "Piernas" },
  { id: 3, name: "Peso Muerto", muscleGroup: "Espalda" },
  { id: 4, name: "Press Militar", muscleGroup: "Hombros" },
  { id: 5, name: "Curl de Bíceps", muscleGroup: "Bíceps" },
  { id: 6, name: "Extensiones de Tríceps", muscleGroup: "Tríceps" },
  { id: 7, name: "Dominadas", muscleGroup: "Espalda" },
  { id: 8, name: "Remo con Barra", muscleGroup: "Espalda" },
  { id: 9, name: "Zancadas", muscleGroup: "Piernas" },
  { id: 10, name: "Press Inclinado", muscleGroup: "Pecho" },
  { id: 11, name: "Elevaciones Laterales", muscleGroup: "Hombros" },
  { id: 12, name: "Curl Martillo", muscleGroup: "Bíceps" },
  { id: 13, name: "Fondos en Paralelas", muscleGroup: "Tríceps" },
  { id: 14, name: "Prensa de Piernas", muscleGroup: "Piernas" },
  { id: 15, name: "Hip Thrust", muscleGroup: "Glúteos" },
];

// Mock template
const mockTemplate: Template = {
  id: 1,
  name: "Hipertrofia Full Body",
  description: "Rutina de 4 días enfocada en hipertrofia para principiantes",
  objetivo: "Hipertrofia",
  daysPerMicrocycle: 4,
  status: "draft",
  microcycles: [
    {
      id: 1,
      weekNumber: 1,
      days: [
        { id: "d1", name: "Día 1", exercises: [] },
        { id: "d2", name: "Día 2", exercises: [] },
        { id: "d3", name: "Día 3", exercises: [] },
        { id: "d4", name: "Día 4", exercises: [] },
      ],
    },
    {
      id: 2,
      weekNumber: 2,
      days: [
        { id: "d1-2", name: "Día 1", exercises: [] },
        { id: "d2-2", name: "Día 2", exercises: [] },
        { id: "d3-2", name: "Día 3", exercises: [] },
        { id: "d4-2", name: "Día 4", exercises: [] },
      ],
    },
    {
      id: 3,
      weekNumber: 3,
      days: [
        { id: "d1-3", name: "Día 1", exercises: [] },
        { id: "d2-3", name: "Día 2", exercises: [] },
        { id: "d3-3", name: "Día 3", exercises: [] },
        { id: "d4-3", name: "Día 4", exercises: [] },
      ],
    },
    {
      id: 4,
      weekNumber: 4,
      days: [
        { id: "d1-4", name: "Día 1", exercises: [] },
        { id: "d2-4", name: "Día 2", exercises: [] },
        { id: "d3-4", name: "Día 3", exercises: [] },
        { id: "d4-4", name: "Día 4", exercises: [] },
      ],
    },
  ],
};

// ==================== COMPONENT ====================
export default function EditRoutineV2Page() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const [template, setTemplate] = useState<Template>(mockTemplate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Navigation
  const [currentMicro, setCurrentMicro] = useState(1);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  
  // Sheets
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showEditExercise, setShowEditExercise] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showReplicateDialog, setShowReplicateDialog] = useState(false);
  
  // Search
  const [exerciseSearch, setExerciseSearch] = useState("");
  
  // Filtered exercises
  const filteredLibrary = mockExerciseLibrary.filter(
    (e) => e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
           e.muscleGroup?.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  // Current day
  const currentMicrocycle = template.microcycles.find((m) => m.weekNumber === currentMicro);
  const currentDay = currentMicrocycle?.days[currentDayIndex];

  // Load initial micro from URL
  useEffect(() => {
    const microParam = searchParams.get("micro");
    if (microParam) {
      setCurrentMicro(parseInt(microParam));
    }
    
    // Simular carga
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add exercise - sin series, abre el editor directo
  const handleAddExercise = (libraryExercise: typeof mockExerciseLibrary[0]) => {
    if (!currentDay) return;

    const newExercise: Exercise = {
      id: generateId(),
      exerciseId: libraryExercise.id,
      name: libraryExercise.name,
      muscleGroup: libraryExercise.muscleGroup,
      sets: [], // Sin series - el usuario las crea
      order: currentDay.exercises.length,
    };

    setTemplate((prev) => ({
      ...prev,
      microcycles: prev.microcycles.map((m) =>
        m.weekNumber === currentMicro
          ? {
              ...m,
              days: m.days.map((d, idx) =>
                idx === currentDayIndex
                  ? { ...d, exercises: [...d.exercises, newExercise] }
                  : d
              ),
            }
          : m
      ),
    }));

    setShowAddExercise(false);
    
    // Abrir editor directo para que cree las series
    setSelectedExercise(newExercise);
    setShowEditExercise(true);
  };

  // Remove exercise
  const handleRemoveExercise = (exerciseId: string) => {
    setTemplate((prev) => ({
      ...prev,
      microcycles: prev.microcycles.map((m) =>
        m.weekNumber === currentMicro
          ? {
              ...m,
              days: m.days.map((d, idx) =>
                idx === currentDayIndex
                  ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
                  : d
              ),
            }
          : m
      ),
    }));
    toast.success("Ejercicio eliminado");
  };

  // Edit exercise
  const openEditExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowEditExercise(true);
  };

  // Update exercise
  const handleUpdateExercise = (updated: Exercise) => {
    setTemplate((prev) => ({
      ...prev,
      microcycles: prev.microcycles.map((m) =>
        m.weekNumber === currentMicro
          ? {
              ...m,
              days: m.days.map((d, idx) =>
                idx === currentDayIndex
                  ? {
                      ...d,
                      exercises: d.exercises.map((e) =>
                        e.id === updated.id ? updated : e
                      ),
                    }
                  : d
              ),
            }
          : m
      ),
    }));
    setShowEditExercise(false);
    setSelectedExercise(null);
    toast.success("Ejercicio actualizado");
  };

  // Reorder exercises
  const handleReorder = (newOrder: Exercise[]) => {
    setTemplate((prev) => ({
      ...prev,
      microcycles: prev.microcycles.map((m) =>
        m.weekNumber === currentMicro
          ? {
              ...m,
              days: m.days.map((d, idx) =>
                idx === currentDayIndex
                  ? { ...d, exercises: newOrder }
                  : d
              ),
            }
          : m
      ),
    }));
  };

  // Replicate to other microcycles
  const handleReplicateToAll = () => {
    if (!currentMicrocycle) return;

    setTemplate((prev) => ({
      ...prev,
      microcycles: prev.microcycles.map((m) =>
        m.weekNumber > currentMicro
          ? {
              ...m,
              days: currentMicrocycle.days.map((d, idx) => ({
                ...d,
                id: `${d.id}-${m.weekNumber}`,
                exercises: d.exercises.map((e) => ({
                  ...e,
                  id: generateId(),
                  sets: e.sets.map((s) => ({ ...s, id: generateId() })),
                })),
              })),
            }
          : m
      ),
    }));

    toast.success(`Ejercicios replicados a M${currentMicro + 1}-M${template.microcycles.length}`);
  };

  // Check if current microcycle has exercises
  const currentHasExercises = currentMicrocycle?.days.some(d => d.exercises.length > 0) || false;

  // Save template - pregunta si replicar
  const handleSave = async () => {
    // Si estamos en M1 y hay ejercicios, preguntar si replicar
    if (currentMicro === 1 && currentHasExercises && template.microcycles.length > 1) {
      setShowReplicateDialog(true);
      return;
    }
    
    await doSave();
  };

  // Guardar sin replicar
  const doSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    toast.success("Plantilla guardada");
  };

  // Guardar y replicar
  const handleSaveAndReplicate = async () => {
    setShowReplicateDialog(false);
    handleReplicateToAll();
    await doSave();
  };

  // Guardar sin replicar
  const handleSaveWithoutReplicate = async () => {
    setShowReplicateDialog(false);
    await doSave();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={template.name}
        subtitle={`M${currentMicro} · Día ${currentDayIndex + 1}`}
        backHref="/coach/routines-v2"
        rightContent={
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Navegación de semanas */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMicro(Math.max(1, currentMicro - 1))}
                disabled={currentMicro <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-2 overflow-x-auto">
                {template.microcycles.map((m) => (
                  <Badge
                    key={m.id}
                    variant={m.weekNumber === currentMicro ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-colors shrink-0",
                      m.weekNumber === currentMicro && "bg-primary text-black"
                    )}
                    onClick={() => setCurrentMicro(m.weekNumber)}
                  >
                    M{m.weekNumber}
                  </Badge>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMicro(Math.min(template.microcycles.length, currentMicro + 1))}
                disabled={currentMicro >= template.microcycles.length}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selector de día */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {currentMicrocycle?.days.map((day, idx) => (
            <Button
              key={day.id}
              variant={idx === currentDayIndex ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentDayIndex(idx)}
              className={cn(
                "shrink-0 min-w-[70px]",
                idx === currentDayIndex && "bg-accent text-black"
              )}
            >
              Día {idx + 1}
            </Button>
          ))}
        </div>

        {/* Lista de ejercicios */}
        {currentDay && currentDay.exercises.length === 0 ? (
          <Card className="bg-surface/80 border-border border-dashed">
            <CardContent className="p-8 text-center">
              <Dumbbell className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted mb-4">
                No hay ejercicios en este día
              </p>
              <Button onClick={() => setShowAddExercise(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar ejercicio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <Reorder.Group
              axis="y"
              values={currentDay?.exercises || []}
              onReorder={handleReorder}
              className="space-y-3"
            >
              {currentDay?.exercises.map((exercise, idx) => (
                <Reorder.Item
                  key={exercise.id}
                  value={exercise}
                  className="list-none"
                >
                  <ExerciseCard
                    exercise={exercise}
                    index={idx}
                    onEdit={() => openEditExercise(exercise)}
                    onRemove={() => handleRemoveExercise(exercise.id)}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>

            {/* Botón agregar más */}
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setShowAddExercise(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar ejercicio
            </Button>
          </div>
        )}
      </div>

      {/* Sheet: Agregar ejercicio */}
      <Sheet open={showAddExercise} onOpenChange={setShowAddExercise}>
        <SheetContent side="bottom" className="h-[85vh] bg-background rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Agregar ejercicio</SheetTitle>
          </SheetHeader>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Buscar ejercicio..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[calc(100%-100px)]">
            <div className="space-y-2">
              {filteredLibrary.map((exercise) => (
                <Card
                  key={exercise.id}
                  className="bg-surface/80 border-border cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleAddExercise(exercise)}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text">{exercise.name}</p>
                      <p className="text-xs text-text-muted">{exercise.muscleGroup}</p>
                    </div>
                    <Plus className="w-5 h-5 text-primary" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar ejercicio */}
      <Sheet open={showEditExercise} onOpenChange={setShowEditExercise}>
        <SheetContent side="bottom" className="h-[90vh] bg-background rounded-t-2xl">
          {selectedExercise && (
            <ExerciseEditor
              exercise={selectedExercise}
              onSave={handleUpdateExercise}
              onCancel={() => setShowEditExercise(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog: Replicar a otros microciclos */}
      <AnimatePresence>
        {showReplicateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-surface rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Copy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-text">¿Replicar a otros microciclos?</h3>
                  <p className="text-xs text-text-muted">M1 tiene ejercicios configurados</p>
                </div>
              </div>
              
              <p className="text-sm text-text-muted">
                ¿Querés copiar los ejercicios de <strong className="text-text">M1</strong> a los microciclos <strong className="text-text">M2-M{template.microcycles.length}</strong>?
              </p>

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full bg-primary text-black"
                  onClick={handleSaveAndReplicate}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  Sí, replicar y guardar
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSaveWithoutReplicate}
                  disabled={saving}
                >
                  No, solo guardar M1
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-text-muted"
                  onClick={() => setShowReplicateDialog(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== EXERCISE CARD ====================
function ExerciseCard({
  exercise,
  index,
  onEdit,
  onRemove,
}: {
  exercise: Exercise;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const hasDropSet = exercise.sets.some((s) => s.isDropSet);
  const hasAmrap = exercise.sets.some((s) => s.reps.includes("AMRAP") || s.reps.includes("0-F"));

  return (
    <Card 
      className="bg-surface/80 border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onEdit}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-3 flex items-center gap-3 border-b border-border">
          <div 
            className="cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-text-muted" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">{index + 1}.</span>
              <span className="font-medium text-text">{exercise.name}</span>
            </div>
            {exercise.muscleGroup && (
              <span className="text-xs text-text-muted">{exercise.muscleGroup}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasDropSet && (
              <Badge variant="outline" className="text-[10px] border-orange-500/50 text-orange-400">
                Drop
              </Badge>
            )}
            {hasAmrap && (
              <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-400">
                AMRAP
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-400" 
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Sets preview - compacto */}
        <div className="p-3 flex items-center gap-2 text-sm">
          <span className="text-text-muted">{exercise.sets.length} series:</span>
          <div className="flex flex-wrap gap-1">
            {exercise.sets.map((set) => (
              <Badge 
                key={set.id} 
                variant="secondary" 
                className={cn(
                  "text-[10px]",
                  set.isDropSet && "border-orange-500/50 text-orange-400",
                  (set.reps.includes("AMRAP") || set.reps.includes("0-F")) && "border-purple-500/50 text-purple-400"
                )}
              >
                {set.reps}
                {set.isDropSet && ` +${set.dropSetCount || 1}D`}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== EXERCISE EDITOR ====================
function ExerciseEditor({
  exercise,
  onSave,
  onCancel,
}: {
  exercise: Exercise;
  onSave: (exercise: Exercise) => void;
  onCancel: () => void;
}) {
  const [editedExercise, setEditedExercise] = useState<Exercise>(exercise);
  const [showAddSeries, setShowAddSeries] = useState(false);
  
  // Form para agregar series en bloque
  const [newSeriesCount, setNewSeriesCount] = useState(3);
  const [newSeriesReps, setNewSeriesReps] = useState("10-12");
  const [newSeriesKg, setNewSeriesKg] = useState("");
  const [newSeriesRir, setNewSeriesRir] = useState("");
  const [newSeriesRpe, setNewSeriesRpe] = useState("");
  const [newSeriesRest, setNewSeriesRest] = useState("2");
  const [newSeriesNotes, setNewSeriesNotes] = useState("");
  const [newDropSetCount, setNewDropSetCount] = useState(2);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Presets rápidos
  const applyPreset = (preset: { count: number; reps: string; rir?: string; rpe?: string; rest: string }) => {
    setNewSeriesCount(preset.count);
    setNewSeriesReps(preset.reps);
    setNewSeriesRir(preset.rir || "");
    setNewSeriesRpe(preset.rpe || "");
    setNewSeriesRest(preset.rest);
  };

  // Agregar múltiples series con misma config
  const addMultipleSets = () => {
    const startNumber = editedExercise.sets.length + 1;
    const newSets: ExerciseSet[] = [];
    
    for (let i = 0; i < newSeriesCount; i++) {
      newSets.push({
        id: generateId(),
        setNumber: startNumber + i,
        reps: newSeriesReps,
        kg: newSeriesKg || undefined,
        rir: newSeriesRir || undefined,
        rpe: newSeriesRpe || undefined,
        rest: newSeriesRest ? `${newSeriesRest} min` : undefined,
        notes: newSeriesNotes || undefined,
      });
    }
    
    setEditedExercise({
      ...editedExercise,
      sets: [...editedExercise.sets, ...newSets],
    });
    setShowAddSeries(false);
    setNewSeriesNotes("");
  };

  // Agregar serie AMRAP
  const addAmrapSet = () => {
    const newSetNumber = editedExercise.sets.length + 1;
    setEditedExercise({
      ...editedExercise,
      sets: [
        ...editedExercise.sets,
        {
          id: generateId(),
          setNumber: newSetNumber,
          reps: "AMRAP",
          kg: newSeriesKg || undefined,
          rir: newSeriesRir || undefined,
          rpe: newSeriesRpe || undefined,
          rest: newSeriesRest ? `${newSeriesRest} min` : undefined,
          notes: newSeriesNotes || undefined,
        },
      ],
    });
    setShowAddSeries(false);
    setNewSeriesNotes("");
  };

  // Agregar serie con Drop Set
  const addDropSet = () => {
    const newSetNumber = editedExercise.sets.length + 1;
    setEditedExercise({
      ...editedExercise,
      sets: [
        ...editedExercise.sets,
        {
          id: generateId(),
          setNumber: newSetNumber,
          reps: newSeriesReps,
          kg: newSeriesKg || undefined,
          rir: newSeriesRir || undefined,
          rpe: newSeriesRpe || undefined,
          rest: newSeriesRest ? `${newSeriesRest} min` : undefined,
          isDropSet: true,
          dropSetCount: newDropSetCount,
          notes: newSeriesNotes || undefined,
        },
      ],
    });
    setShowAddSeries(false);
    setNewSeriesNotes("");
  };

  // Remove set
  const removeSet = (setId: string) => {
    setEditedExercise({
      ...editedExercise,
      sets: editedExercise.sets
        .filter((s) => s.id !== setId)
        .map((s, idx) => ({ ...s, setNumber: idx + 1 })),
    });
  };

  // Editar serie individual inline
  const updateSet = (setId: string, field: keyof ExerciseSet, value: string | boolean | number) => {
    setEditedExercise({
      ...editedExercise,
      sets: editedExercise.sets.map((s) =>
        s.id === setId ? { ...s, [field]: value } : s
      ),
    });
  };

  // Agrupar series iguales para mostrar compacto
  const groupedSets = editedExercise.sets.reduce((acc, set) => {
    const key = `${set.reps}|${set.weight || ""}|${set.rest || ""}|${set.isDropSet ? "drop" : ""}`;
    if (!acc[key]) {
      acc[key] = { ...set, count: 1, ids: [set.id] };
    } else {
      acc[key].count++;
      acc[key].ids.push(set.id);
    }
    return acc;
  }, {} as Record<string, ExerciseSet & { count: number; ids: string[] }>);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <SheetHeader className="pb-4 shrink-0">
        <SheetTitle className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" />
          {exercise.name}
        </SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto -mx-6 px-6">
        <div className="space-y-4 pb-32">
          {/* Notas del ejercicio */}
          <div className="space-y-2">
            <Label>Notas del ejercicio</Label>
            <Textarea
              placeholder="Instrucciones, técnica, etc..."
              value={editedExercise.notes || ""}
              onChange={(e) => setEditedExercise({ ...editedExercise, notes: e.target.value })}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Series actuales - Vista compacta */}
          <div className="space-y-2">
            <Label>Series ({editedExercise.sets.length})</Label>
            
            {editedExercise.sets.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">
                No hay series configuradas
              </p>
            ) : (
              <div className="space-y-2">
                {editedExercise.sets.map((set) => (
                  <div
                    key={set.id}
                    className={cn(
                      "p-3 rounded-lg bg-surface/80 border border-border",
                      set.isDropSet && "border-orange-500/50",
                      (set.reps === "AMRAP" || set.reps === "0-F") && "border-purple-500/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted w-6">#{set.setNumber}</span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium",
                              set.isDropSet && "text-orange-400",
                              (set.reps === "AMRAP" || set.reps === "0-F") && "text-purple-400"
                            )}>
                              {set.reps}
                            </span>
                            {set.isDropSet && (
                              <Badge variant="outline" className="text-[10px] border-orange-500/50 text-orange-400">
                                +{set.dropSetCount || 2} drops
                              </Badge>
                            )}
                          </div>
                        <span className="text-xs text-text-muted">
                          {[
                            set.kg && `${set.kg}kg`,
                            set.rir && `RIR ${set.rir}`,
                            set.rpe && `RPE ${set.rpe}`,
                            set.rest
                          ].filter(Boolean).join(" · ") || "Sin config"}
                        </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 shrink-0"
                        onClick={() => removeSet(set.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {set.notes && (
                      <p className="text-xs text-text-muted mt-2 pl-9 italic">
                        📝 {set.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agregar series */}
          {!showAddSeries ? (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setShowAddSeries(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar series
            </Button>
          ) : (
            <Card className="bg-surface/80 border-primary/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-primary">Nueva serie</Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowAddSeries(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Presets rápidos */}
                <div className="flex flex-wrap gap-1">
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-[10px] hover:bg-primary/20"
                    onClick={() => applyPreset({ count: 3, reps: "10-12", rir: "2", rest: "2" })}
                  >
                    3x10-12 RIR2
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-[10px] hover:bg-primary/20"
                    onClick={() => applyPreset({ count: 4, reps: "8-12", rir: "2", rest: "2" })}
                  >
                    4x8-12 RIR2
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-[10px] hover:bg-primary/20"
                    onClick={() => applyPreset({ count: 5, reps: "5", rpe: "8", rest: "3" })}
                  >
                    5x5 RPE8
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-[10px] hover:bg-primary/20"
                    onClick={() => applyPreset({ count: 3, reps: "15", rir: "1", rest: "1" })}
                  >
                    3x15 RIR1
                  </Badge>
                </div>

                {/* Config compartida - Fila 1 */}
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <Label className="text-xs text-text-muted">Reps</Label>
                    <Input
                      value={newSeriesReps}
                      onChange={(e) => setNewSeriesReps(e.target.value)}
                      placeholder="10-12"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-text-muted">Kg</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={newSeriesKg}
                      onChange={(e) => setNewSeriesKg(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-text-muted">RIR</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={newSeriesRir}
                      onChange={(e) => setNewSeriesRir(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-text-muted">RPE</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={newSeriesRpe}
                      onChange={(e) => setNewSeriesRpe(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-text-muted">Desc</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={newSeriesRest}
                      onChange={(e) => setNewSeriesRest(e.target.value)}
                      placeholder="min"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Quick reps */}
                <div className="flex flex-wrap gap-1">
                  {["8-12", "10-12", "10", "12", "15", "6-8"].map((rep) => (
                    <Badge
                      key={rep}
                      variant={newSeriesReps === rep ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-[10px]",
                        newSeriesReps === rep && "bg-primary text-black"
                      )}
                      onClick={() => setNewSeriesReps(rep)}
                    >
                      {rep}
                    </Badge>
                  ))}
                </div>

                {/* Nota para las series */}
                <div>
                  <Label className="text-xs text-text-muted">Nota (opcional)</Label>
                  <Input
                    value={newSeriesNotes}
                    onChange={(e) => setNewSeriesNotes(e.target.value)}
                    placeholder="Ej: Pausa en el pecho, tempo 3-1-2..."
                    className="h-9 text-sm"
                  />
                </div>

                {/* Opciones de agregar */}
                <div className="space-y-2">
                  {/* Series normales */}
                  <div className="p-3 bg-background/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setNewSeriesCount(Math.max(1, newSeriesCount - 1))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-lg font-bold w-8 text-center">{newSeriesCount}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setNewSeriesCount(Math.min(10, newSeriesCount + 1))}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-text-muted flex-1">series de {newSeriesReps}</span>
                      <Button
                        size="sm"
                        className="bg-primary text-black"
                        onClick={addMultipleSets}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  </div>

                  {/* Serie AMRAP */}
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-purple-400">Serie AMRAP</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                        onClick={addAmrapSet}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                    <p className="text-xs text-text-muted">
                      Usa la config de arriba (peso, descanso, nota)
                    </p>
                  </div>

                  {/* Serie Drop Set */}
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowDownToLine className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-medium text-orange-400">Serie con Drop Set</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">Cantidad de drops:</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setNewDropSetCount(Math.max(1, newDropSetCount - 1))}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-bold text-orange-400 w-6 text-center">{newDropSetCount}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setNewDropSetCount(Math.min(5, newDropSetCount + 1))}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                        onClick={addDropSet}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                    <p className="text-xs text-text-muted">
                      Usa la config de arriba (reps, peso, descanso, nota)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            className="flex-1 bg-primary text-black" 
            onClick={() => onSave(editedExercise)}
          >
            <Check className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

