"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Dumbbell,
  Calendar,
  Edit,
  Users,
  Copy,
  Trash2,
  ChevronRight,
  FileText,
  Target,
  Clock,
  MoreVertical,
  Check,
  Share2,
  Eye,
  ArrowDownToLine,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================
interface ExerciseSet {
  id: string;
  setNumber: number;
  reps: string;
  weight?: string;
  rest?: string;
  isDropSet?: boolean;
  dropSetCount?: number;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
  sets: ExerciseSet[];
  notes?: string;
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

interface AssignedStudent {
  id: number;
  name: string;
  avatar?: string;
  assignedAt: string;
  progress: number; // 0-100
}

interface Template {
  id: number;
  name: string;
  description?: string;
  objetivo?: string;
  microcycles: Microcycle[];
  daysPerMicrocycle: number;
  status: "draft" | "published";
  assignedStudents: AssignedStudent[];
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

// Mock template
const mockTemplate: Template = {
  id: 1,
  name: "Hipertrofia Full Body",
  description: "Rutina de 4 días enfocada en hipertrofia para principiantes. Incluye técnicas avanzadas como drop sets y AMRAP.",
  objetivo: "Hipertrofia",
  daysPerMicrocycle: 4,
  status: "published",
  createdAt: "2026-01-10",
  updatedAt: "2026-01-15",
  tags: ["Hipertrofia", "Full Body", "Principiante"],
  assignedStudents: [
    { id: 1, name: "Juan Pérez", assignedAt: "2026-01-12", progress: 45 },
    { id: 2, name: "María García", assignedAt: "2026-01-14", progress: 25 },
  ],
  microcycles: [
    {
      id: 1,
      weekNumber: 1,
      days: [
        {
          id: "d1",
          name: "Día 1",
          exercises: [
            {
              id: "e1",
              name: "Press de Banca",
              muscleGroup: "Pecho",
              sets: [
                { id: "s1", setNumber: 1, reps: "8-12", weight: "RPE 7", rest: "2 min" },
                { id: "s2", setNumber: 2, reps: "8-12", weight: "RPE 8", rest: "2 min" },
                { id: "s3", setNumber: 3, reps: "8-12", weight: "RPE 9", rest: "2 min", isDropSet: true, dropSetCount: 2 },
              ],
            },
            {
              id: "e2",
              name: "Press Militar",
              muscleGroup: "Hombros",
              sets: [
                { id: "s4", setNumber: 1, reps: "10", weight: "RPE 7" },
                { id: "s5", setNumber: 2, reps: "10", weight: "RPE 8" },
                { id: "s6", setNumber: 3, reps: "AMRAP", weight: "RPE 9" },
              ],
            },
            {
              id: "e3",
              name: "Elevaciones Laterales",
              muscleGroup: "Hombros",
              sets: [
                { id: "s7", setNumber: 1, reps: "15", rest: "1 min" },
                { id: "s8", setNumber: 2, reps: "15", rest: "1 min" },
                { id: "s9", setNumber: 3, reps: "0-F", rest: "1 min" },
              ],
            },
          ],
        },
        {
          id: "d2",
          name: "Día 2",
          exercises: [
            {
              id: "e4",
              name: "Dominadas",
              muscleGroup: "Espalda",
              sets: [
                { id: "s10", setNumber: 1, reps: "AMRAP" },
                { id: "s11", setNumber: 2, reps: "AMRAP" },
                { id: "s12", setNumber: 3, reps: "AMRAP" },
              ],
            },
            {
              id: "e5",
              name: "Remo con Barra",
              muscleGroup: "Espalda",
              sets: [
                { id: "s13", setNumber: 1, reps: "8-12", weight: "RPE 8" },
                { id: "s14", setNumber: 2, reps: "8-12", weight: "RPE 9" },
                { id: "s15", setNumber: 3, reps: "8-12", weight: "RPE 9", isDropSet: true, dropSetCount: 1 },
              ],
            },
          ],
        },
        {
          id: "d3",
          name: "Día 3",
          exercises: [
            {
              id: "e6",
              name: "Sentadilla",
              muscleGroup: "Piernas",
              sets: [
                { id: "s16", setNumber: 1, reps: "5", weight: "85%" },
                { id: "s17", setNumber: 2, reps: "5", weight: "85%" },
                { id: "s18", setNumber: 3, reps: "5", weight: "85%" },
              ],
            },
          ],
        },
        {
          id: "d4",
          name: "Día 4",
          exercises: [],
        },
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
export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showActions, setShowActions] = useState(false);
  const [showDayPreview, setShowDayPreview] = useState(false);
  const [previewDay, setPreviewDay] = useState<Day | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTemplate(mockTemplate);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const currentMicrocycle = template?.microcycles.find((m) => m.weekNumber === selectedWeek);

  // Calculate totals
  const totalExercises = template?.microcycles.reduce(
    (acc, m) => acc + m.days.reduce((a, d) => a + d.exercises.length, 0),
    0
  ) || 0;

  const totalSets = template?.microcycles.reduce(
    (acc, m) => acc + m.days.reduce((a, d) => a + d.exercises.reduce((a2, e) => a2 + e.sets.length, 0), 0),
    0
  ) || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="" backHref="/coach/routines-v2" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Plantilla no encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={template.name}
        subtitle={`${template.microcycles.length} semanas · ${template.daysPerMicrocycle} días/sem`}
        backHref="/coach/routines-v2"
        rightContent={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowActions(true)}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              template.status === "draft"
                ? "border-orange-500/50 text-orange-400"
                : "border-accent/50 text-accent"
            )}
          >
            {template.status === "draft" ? "Borrador" : "Publicada"}
          </Badge>
          {template.objetivo && (
            <Badge variant="secondary" className="text-[10px]">
              {template.objetivo}
            </Badge>
          )}
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-sm text-text-muted">{template.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-primary">{template.microcycles.length}</p>
              <p className="text-[10px] text-text-muted">Microciclos</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-accent">{template.daysPerMicrocycle}</p>
              <p className="text-[10px] text-text-muted">Días/sem</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-purple-400">{totalExercises}</p>
              <p className="text-[10px] text-text-muted">Ejercicios</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-orange-400">{totalSets}</p>
              <p className="text-[10px] text-text-muted">Series</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12"
            onClick={() => router.push(`/coach/routines-v2/${template.id}/edit?micro=1`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            className="h-12 bg-primary text-black"
            onClick={() => router.push(`/coach/routines-v2/${template.id}/assign`)}
          >
            <Users className="w-4 h-4 mr-2" />
            Asignar
          </Button>
        </div>

        {/* Assigned students */}
        {template.assignedStudents.length > 0 && (
          <Card className="bg-surface/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Alumnos asignados ({template.assignedStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {template.assignedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-2 bg-background/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-[10px] text-text-muted">
                        Asignado {new Date(student.assignedAt).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">{student.progress}%</p>
                    <p className="text-[10px] text-text-muted">completado</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Week selector */}
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              Vista por microciclo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Week tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {template.microcycles.map((m) => (
                <Badge
                  key={m.id}
                  variant={m.weekNumber === selectedWeek ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer shrink-0",
                    m.weekNumber === selectedWeek && "bg-accent text-black"
                  )}
                  onClick={() => setSelectedWeek(m.weekNumber)}
                >
                  M{m.weekNumber}
                </Badge>
              ))}
            </div>

            {/* Days preview */}
            <div className="space-y-2">
              {currentMicrocycle?.days.map((day) => (
                <div
                  key={day.id}
                  className="p-3 bg-background/50 rounded-lg cursor-pointer hover:bg-background/80 transition-colors"
                  onClick={() => {
                    setPreviewDay(day);
                    setShowDayPreview(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-primary" />
                      <span className="font-medium">{day.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {day.exercises.length} ejercicios
                      </span>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </div>
                  {day.exercises.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {day.exercises.slice(0, 3).map((e) => (
                        <Badge key={e.id} variant="secondary" className="text-[10px]">
                          {e.name}
                        </Badge>
                      ))}
                      {day.exercises.length > 3 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{day.exercises.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions sheet */}
      <Sheet open={showActions} onOpenChange={setShowActions}>
        <SheetContent side="bottom" className="h-auto bg-background rounded-t-2xl">
          <div className="py-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start h-12"
              onClick={() => {
                setShowActions(false);
                toast.success("Plantilla duplicada");
              }}
            >
              <Copy className="w-5 h-5 mr-3" />
              Duplicar plantilla
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-12"
              onClick={() => {
                setShowActions(false);
                // TODO: Publish logic
              }}
            >
              <Share2 className="w-5 h-5 mr-3" />
              {template.status === "draft" ? "Publicar" : "Despublicar"}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-red-400 hover:text-red-400"
              onClick={() => {
                setShowActions(false);
                // TODO: Delete logic
              }}
            >
              <Trash2 className="w-5 h-5 mr-3" />
              Eliminar plantilla
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Day preview sheet */}
      <Sheet open={showDayPreview} onOpenChange={setShowDayPreview}>
        <SheetContent side="bottom" className="h-[80vh] bg-background rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              {previewDay?.name}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100%-80px)]">
            {previewDay?.exercises.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No hay ejercicios en este día
              </div>
            ) : (
              <div className="space-y-3">
                {previewDay?.exercises.map((exercise, idx) => (
                  <Card key={exercise.id} className="bg-surface/80 border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-text-muted">{idx + 1}.</span>
                        <span className="font-medium">{exercise.name}</span>
                        {exercise.muscleGroup && (
                          <Badge variant="secondary" className="text-[10px]">
                            {exercise.muscleGroup}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        {exercise.sets.map((set) => (
                          <div
                            key={set.id}
                            className={cn(
                              "flex items-center justify-between text-sm p-2 rounded",
                              set.isDropSet && "bg-orange-500/10"
                            )}
                          >
                            <span className="text-text-muted">Serie {set.setNumber}</span>
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "font-medium",
                                (set.reps.includes("AMRAP") || set.reps.includes("0-F")) && "text-purple-400"
                              )}>
                                {set.reps}
                              </span>
                              {set.weight && (
                                <span className="text-text-muted">{set.weight}</span>
                              )}
                              {set.rest && (
                                <span className="text-text-muted text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {set.rest}
                                </span>
                              )}
                              {set.isDropSet && (
                                <Badge variant="outline" className="text-[10px] border-orange-500/50 text-orange-400">
                                  <ArrowDownToLine className="w-3 h-3 mr-1" />
                                  +{set.dropSetCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {exercise.notes && (
                        <p className="text-xs text-text-muted mt-2 italic">
                          {exercise.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

