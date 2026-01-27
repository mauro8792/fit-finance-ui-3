"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
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
  ChevronLeft,
  Clock,
  MoreVertical,
  Share2,
  ArrowDownToLine,
  Loader2,
  Flame,
  Search,
  UserPlus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTemplate, useAssignedStudents } from "@/hooks/useRoutineV2";
import * as routineV2Api from "@/lib/api/routine-v2";
import { getCoachStudents } from "@/lib/api/coach";
import type { TemplateDay, TemplateExercise, TemplateSet } from "@/types/routine-v2";
import type { Student } from "@/types";

// ==================== COMPONENT ====================
export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  
  const { template, loading, error, refetch } = useTemplate(templateId);
  const { students: assignedStudents, loading: loadingStudents } = useAssignedStudents(templateId);
  
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [showDayPreview, setShowDayPreview] = useState(false);
  const [previewDay, setPreviewDay] = useState<TemplateDay | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Assign states
  const [showAssign, setShowAssign] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents2, setLoadingStudents2] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [assigning, setAssigning] = useState(false);

  const sortedMicrocycles = template?.microcycles?.slice().sort((a, b) => a.order - b.order) || [];
  const currentMicrocycle = sortedMicrocycles[selectedWeek];

  // Load students when assign modal opens
  useEffect(() => {
    if (showAssign && students.length === 0) {
      loadStudents();
    }
  }, [showAssign]);

  const loadStudents = async () => {
    setLoadingStudents2(true);
    try {
      // Obtener el userId del token (asumimos que está en localStorage)
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const coachStudents = await getCoachStudents(payload.id);
        setStudents(coachStudents);
      }
    } catch (err) {
      console.error("Error loading students:", err);
      toast.error("Error al cargar alumnos");
    } finally {
      setLoadingStudents2(false);
    }
  };

  // Filter students by search
  const filteredStudents = students.filter(s => 
    s.firstName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.lastName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Toggle student selection
  const toggleStudent = (student: Student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.some(s => s.id === student.id);
      if (isSelected) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  // Check if student is selected
  const isStudentSelected = (studentId: number) => {
    return selectedStudents.some(s => s.id === studentId);
  };

  // Handle assign to multiple students
  const handleAssign = async () => {
    if (selectedStudents.length === 0 || !template) return;
    
    setAssigning(true);
    try {
      // Asignar a todos los alumnos seleccionados
      const results = await Promise.allSettled(
        selectedStudents.map(student => 
          routineV2Api.assignTemplate({
            templateId: template.id,
            studentId: student.id,
            autoCreateMicrocycles: true,
          })
        )
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (failed === 0) {
        toast.success("¡Plantilla asignada!", {
          description: `${template.name} asignada a ${successful} alumno${successful > 1 ? 's' : ''}`,
        });
      } else {
        toast.warning("Asignación parcial", {
          description: `${successful} exitosas, ${failed} fallidas`,
        });
      }
      
      setShowAssign(false);
      setSelectedStudents([]);
      setStudentSearch("");
      refetch(); // Actualizar contadores
    } catch (err) {
      console.error("Error assigning:", err);
      toast.error("Error al asignar plantilla");
    } finally {
      setAssigning(false);
    }
  };

  // Calculate totals
  const totalExercises = template?.microcycles?.reduce(
    (acc, m) => acc + (m.days?.reduce((a, d) => a + (d.exercises?.length || 0), 0) || 0),
    0
  ) || 0;

  const totalSets = template?.microcycles?.reduce(
    (acc, m) => acc + (m.days?.reduce((a, d) => a + (d.exercises?.reduce((a2, e) => a2 + (e.sets?.length || 0), 0) || 0), 0) || 0),
    0
  ) || 0;

  // Calculate muscle group summary for current microcycle
  const getMicrocycleMuscleGroups = () => {
    if (!currentMicrocycle?.days) return {};
    
    const muscleGroups: Record<string, number> = {};
    
    currentMicrocycle.days.forEach(day => {
      day.exercises?.forEach(exercise => {
        const group = exercise.exerciseCatalog?.muscleGroup || "Sin grupo";
        muscleGroups[group] = (muscleGroups[group] || 0) + 1;
      });
    });
    
    return muscleGroups;
  };

  const muscleGroupsSummary = getMicrocycleMuscleGroups();
  const sortedMuscleGroups = Object.entries(muscleGroupsSummary).sort((a, b) => b[1] - a[1]);

  // Publish template
  const handlePublish = async () => {
    if (!template) return;
    setActionLoading(true);
    try {
      await routineV2Api.publishTemplate(template.id);
      await refetch();
      toast.success(template.status === 'draft' ? "Plantilla publicada" : "Estado actualizado");
      setShowActions(false);
    } catch (err) {
      console.error("Error publishing:", err);
      toast.error("Error al publicar");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete template
  const handleDelete = async () => {
    if (!template) return;
    if (!confirm("¿Estás seguro de eliminar esta plantilla?")) return;
    
    setActionLoading(true);
    try {
      await routineV2Api.deleteTemplate(template.id);
      toast.success("Plantilla eliminada");
      router.push("/coach/routines-v2");
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error("Error al eliminar");
    } finally {
      setActionLoading(false);
    }
  };

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

  if (error || !template) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Error" backHref="/coach/routines-v2" />
        <div className="px-4 py-8 text-center">
          <p className="text-red-400 mb-4">{error || "Plantilla no encontrada"}</p>
          <Button onClick={() => router.push("/coach/routines-v2")}>Volver</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={template.name}
        subtitle={`${template.microcycles?.length || template.estimatedWeeks} semanas · ${template.targetDaysPerWeek} días/sem`}
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
          {template.objective && (
            <Badge variant="secondary" className="text-[10px]">
              {template.objective}
            </Badge>
          )}
        </div>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Description */}
        {template.description && (
          <p className="text-sm text-text-muted">{template.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-primary">{template.microcycles?.length || template.estimatedWeeks}</p>
              <p className="text-[10px] text-text-muted">Microciclos</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-accent">{template.targetDaysPerWeek}</p>
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
            onClick={() => router.push(`/coach/routines-v2/${template.id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            className="h-12 bg-primary text-black"
            disabled={template.status === 'draft'}
            onClick={() => setShowAssign(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Asignar
          </Button>
        </div>

        {/* Assigned students */}
        {!loadingStudents && assignedStudents.length > 0 && (
          <Card className="bg-surface/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Alumnos asignados ({assignedStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assignedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-2 bg-background/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                      {student.studentName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{student.studentName}</p>
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
        {template.microcycles && template.microcycles.length > 0 && (
          <Card className="bg-surface/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                Vista por microciclo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Microcycle navigation - Centrado con flechas */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => selectedWeek > 0 && setSelectedWeek(selectedWeek - 1)}
                  disabled={selectedWeek === 0}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    selectedWeek === 0
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-gray-400 hover:bg-surface hover:text-white"
                  )}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-2 bg-surface rounded-full px-4 py-2 min-w-[140px] justify-center">
                  <span className="text-accent font-bold text-lg">
                    Microciclo {currentMicrocycle?.order || 1}
                  </span>
                  <span className="text-text-muted text-sm">
                    / {sortedMicrocycles.length}
                  </span>
                </div>
                
                <button
                  onClick={() => selectedWeek < sortedMicrocycles.length - 1 && setSelectedWeek(selectedWeek + 1)}
                  disabled={selectedWeek >= sortedMicrocycles.length - 1}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    selectedWeek >= sortedMicrocycles.length - 1
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-gray-400 hover:bg-surface hover:text-white"
                  )}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Muscle group summary for current microcycle */}
              {sortedMuscleGroups.length > 0 && (
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-text-muted mb-2">Grupos musculares en M{currentMicrocycle?.order}:</p>
                  <div className="flex flex-wrap gap-2">
                    {sortedMuscleGroups.map(([group, count]) => (
                      <Badge 
                        key={group} 
                        variant="outline" 
                        className="text-[10px] border-accent/30 text-accent"
                      >
                        {group}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Days preview */}
              <div className="space-y-2">
                {currentMicrocycle?.days?.map((day) => (
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
                          {day.exercises?.length || 0} ejercicios
                        </span>
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      </div>
                    </div>
                    {day.exercises && day.exercises.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {day.exercises.slice(0, 3).map((e) => (
                          <Badge key={e.id} variant="secondary" className="text-[10px]">
                            {e.exerciseCatalog?.name || `Ejercicio ${e.exerciseCatalogId}`}
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
        )}

        {/* Empty state if no microcycles */}
        {(!template.microcycles || template.microcycles.length === 0) && (
          <Card className="bg-surface/80 border-border border-dashed">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted mb-4">
                No hay microciclos configurados
              </p>
              <Button onClick={() => router.push(`/coach/routines-v2/${template.id}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                Configurar plantilla
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions sheet */}
      <Sheet open={showActions} onOpenChange={setShowActions}>
        <SheetContent side="bottom" className="h-auto bg-background rounded-t-2xl">
          <SheetHeader className="pb-2">
            <SheetTitle>Acciones</SheetTitle>
            <SheetDescription>Opciones de la plantilla</SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start h-12"
              onClick={() => {
                setShowActions(false);
                toast.info("Función de duplicar próximamente");
              }}
            >
              <Copy className="w-5 h-5 mr-3" />
              Duplicar plantilla
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-12"
              onClick={handlePublish}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              ) : (
                <Share2 className="w-5 h-5 mr-3" />
              )}
              {template.status === "draft" ? "Publicar" : "Ya publicada"}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-red-400 hover:text-red-400"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5 mr-3" />
              )}
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
            <SheetDescription>Ejercicios del día</SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100%-80px)]">
            {!previewDay?.exercises || previewDay.exercises.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No hay ejercicios en este día
              </div>
            ) : (
              <div className="space-y-3">
                {previewDay.exercises.map((exercise, idx) => (
                  <ExercisePreviewCard key={exercise.id} exercise={exercise} index={idx} />
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Assign sheet */}
      <Sheet open={showAssign} onOpenChange={setShowAssign}>
        <SheetContent side="bottom" className="h-[85vh] bg-background rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Asignar plantilla
            </SheetTitle>
            <SheetDescription>
              Seleccioná un alumno para asignarle esta plantilla
            </SheetDescription>
          </SheetHeader>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Buscar alumno..."
              className="pl-10"
            />
          </div>

          {/* Students list */}
          <ScrollArea className="h-[calc(100%-200px)]">
            {loadingStudents2 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                {studentSearch ? "No se encontraron alumnos" : "No tenés alumnos registrados"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => toggleStudent(student)}
                    className={cn(
                      "w-full p-3 flex items-center gap-3 rounded-lg transition-colors text-left",
                      isStudentSelected(student.id)
                        ? "bg-primary/20 border border-primary/50"
                        : "bg-surface hover:bg-surface/80"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors",
                      isStudentSelected(student.id)
                        ? "bg-primary text-black"
                        : "bg-primary/10 text-primary"
                    )}>
                      {isStudentSelected(student.id) ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <>{student.firstName?.[0]}{student.lastName?.[0]}</>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-text-muted">{student.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <SheetFooter className="pt-4 border-t border-border mt-4">
            <Button
              onClick={handleAssign}
              disabled={selectedStudents.length === 0 || assigning}
              className="w-full h-12 bg-primary text-black"
            >
              {assigning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {selectedStudents.length === 0 
                ? "Seleccioná alumnos" 
                : selectedStudents.length === 1
                  ? `Asignar a ${selectedStudents[0].firstName}`
                  : `Asignar a ${selectedStudents.length} alumnos`
              }
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ==================== EXERCISE PREVIEW CARD ====================
function ExercisePreviewCard({ exercise, index }: { exercise: TemplateExercise; index: number }) {
  const exerciseName = exercise.exerciseCatalog?.name || `Ejercicio ${exercise.exerciseCatalogId}`;
  const muscleGroup = exercise.exerciseCatalog?.muscleGroup;

  return (
    <Card className="bg-surface/80 border-border">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-text-muted">{index + 1}.</span>
          <span className="font-medium">{exerciseName}</span>
          {muscleGroup && (
            <Badge variant="secondary" className="text-[10px]">
              {muscleGroup}
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          {exercise.sets?.map((set, setIdx) => (
            <SetPreviewRow key={set.id} set={set} setNumber={setIdx + 1} />
          ))}
        </div>

        {exercise.notes && (
          <p className="text-xs text-text-muted mt-2 italic">
            📝 {exercise.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== SET PREVIEW ROW ====================
function SetPreviewRow({ set, setNumber }: { set: TemplateSet; setNumber: number }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between text-sm p-2 rounded",
        set.isDropSet && "bg-orange-500/10",
        set.isAmrap && "bg-purple-500/10"
      )}
    >
      <span className="text-text-muted">Serie {setNumber}</span>
      <div className="flex items-center gap-3">
        <span className={cn(
          "font-medium",
          set.isAmrap && "text-purple-400"
        )}>
          {set.isAmrap ? (
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3" /> AMRAP
            </span>
          ) : set.targetReps}
        </span>
        {set.targetLoad && (
          <span className="text-text-muted">{set.targetLoad}kg</span>
        )}
        {set.targetRir && (
          <span className="text-text-muted text-xs">RIR {set.targetRir}</span>
        )}
        {set.restSeconds && (
          <span className="text-text-muted text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {Math.floor(set.restSeconds / 60)}:{String(set.restSeconds % 60).padStart(2, '0')}
          </span>
        )}
        {set.isDropSet && (
          <Badge variant="outline" className="text-[10px] border-orange-500/50 text-orange-400">
            <ArrowDownToLine className="w-3 h-3 mr-1" />
            Drop
          </Badge>
        )}
      </div>
    </div>
  );
}
