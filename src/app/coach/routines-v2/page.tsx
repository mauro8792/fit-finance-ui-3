"use client";

import { PageHeader } from "@/components/navigation/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplates } from "@/hooks/useRoutineV2";
import api from "@/lib/api";
import { getStudentById } from "@/lib/api/coach";
import { getMacrocyclesByStudent } from "@/lib/api/routine";
import * as routineV2Api from "@/lib/api/routine-v2";
import { cn } from "@/lib/utils";
import type { Macrocycle, Student } from "@/types";
import type { MesocycleTemplate } from "@/types/routine-v2";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  FileText,
  Filter,
  FolderPlus,
  LayoutTemplate,
  Loader2,
  Plus,
  Search,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ==================== COMPONENT ====================
export default function RoutinesV2Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignStudentId = searchParams.get("assign");
  
  const { templates, loading, error } = useTemplates();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "published">("all");
  const [assigningTo] = useState<string | null>(null);
  const [studentToAssign, setStudentToAssign] = useState<Student | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  
  // Estados para modal de selección de macrociclo
  const [showMacrocycleModal, setShowMacrocycleModal] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<MesocycleTemplate | null>(null);
  const [studentMacrocycles, setStudentMacrocycles] = useState<Macrocycle[]>([]);
  const [loadingMacrocycles, setLoadingMacrocycles] = useState(false);
  const [selectedMacrocycleId, setSelectedMacrocycleId] = useState<number | "new" | null>(null);
  const [newMacrocycleName, setNewMacrocycleName] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Cargar info del alumno si estamos en modo asignación
  useEffect(() => {
    if (assignStudentId) {
      setFilterStatus("published"); // Solo mostrar publicadas
      setLoadingStudent(true);
      getStudentById(Number(assignStudentId))
        .then(setStudentToAssign)
        .catch(() => toast.error("Error al cargar alumno"))
        .finally(() => setLoadingStudent(false));
    }
  }, [assignStudentId]);

  // Cargar macrociclos del alumno cuando se abre el modal
  const loadStudentMacrocycles = async () => {
    if (!assignStudentId) return;
    setLoadingMacrocycles(true);
    try {
      const macros = await getMacrocyclesByStudent(Number(assignStudentId));
      setStudentMacrocycles(macros || []);
    } catch (e) {
      console.error("Error loading macrocycles:", e);
    } finally {
      setLoadingMacrocycles(false);
    }
  };

  // Abrir modal de selección de macrociclo
  const handleAssign = async (template: MesocycleTemplate) => {
    if (!assignStudentId || template.status !== "published") return;
    
    setTemplateToAssign(template);
    setSelectedMacrocycleId(null);
    setNewMacrocycleName(template.name);
    setShowMacrocycleModal(true);
    loadStudentMacrocycles();
  };

  // Confirmar asignación con macrociclo seleccionado
  const confirmAssign = async () => {
    if (!templateToAssign || !assignStudentId || !selectedMacrocycleId) {
      toast.error("Seleccioná un macrociclo");
      return;
    }

    setAssigning(true);
    try {
      let macrocycleId: number;

      if (selectedMacrocycleId === "new") {
        // Crear nuevo macrociclo
        const newMacro = await api.post("/macrocycle", {
          name: newMacrocycleName || templateToAssign.name,
          studentId: Number(assignStudentId),
          startDate: new Date().toISOString().split('T')[0], // Fecha de hoy
        });
        macrocycleId = newMacro.data.id;
      } else {
        macrocycleId = selectedMacrocycleId;
      }

      // Asignar plantilla al macrociclo (queda en estado SCHEDULED)
      await routineV2Api.assignTemplate({
        templateId: templateToAssign.id,
        studentId: Number(assignStudentId),
        macrocycleId: macrocycleId,
        autoCreateMicrocycles: true,
      });

      toast.success("¡Plantilla asignada!", {
        description: selectedMacrocycleId === "new"
          ? `Se creó "${newMacrocycleName}" y se asignó la rutina (en estado Programada)`
          : `Rutina asignada al macrociclo (en estado Programada)`,
      });
      
      setShowMacrocycleModal(false);
      router.push(`/coach/students/${assignStudentId}/routine`);
    } catch (err: unknown) {
      console.error("Error assigning:", err);
      const errorMsg = err instanceof Error ? err.message : "Error al asignar";
      toast.error(errorMsg);
    } finally {
      setAssigning(false);
    }
  };

  // Calcular stats de cada template
  const getTemplateStats = (t: MesocycleTemplate) => {
    const microcyclesCount = t.microcycles?.length || 0;
    const firstMicro = t.microcycles?.[0];
    const daysPerMicrocycle = firstMicro?.days?.length || t.targetDaysPerWeek || 0;
    let exercisesCount = 0;
    t.microcycles?.forEach((m) => {
      m.days?.forEach((d) => {
        exercisesCount += d.exercises?.length || 0;
      });
    });
    return { microcyclesCount, daysPerMicrocycle, exercisesCount };
  };

  // Filtrar templates
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const draftsCount = templates.filter(t => t.status === "draft").length;
  const publishedCount = templates.filter(t => t.status === "published").length;

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Mis Plantillas" subtitle="Biblioteca de rutinas" backHref="/coach" />
        <div className="px-4 py-8 text-center">
          <p className="text-red-400 mb-4">Error al cargar plantillas: {error}</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  const isAssignMode = !!assignStudentId;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={isAssignMode ? "Seleccionar Plantilla" : "Mis Plantillas"}
        subtitle={
          isAssignMode 
            ? loadingStudent 
              ? "Cargando..." 
              : `Asignar a ${studentToAssign?.firstName} ${studentToAssign?.lastName}`
            : `${templates.length} plantillas`
        }
        backHref={isAssignMode ? `/coach/students/${assignStudentId}/routine` : "/coach"}
        rightContent={
          !isAssignMode && (
            <Button
              size="sm"
              onClick={() => router.push("/coach/routines-v2/create")}
              className="bg-primary text-black hover:bg-primary-hover"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nueva
            </Button>
          )
        }
      />

      {/* Banner de modo asignación */}
      {isAssignMode && studentToAssign && (
        <div className="mx-4 mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">
              Seleccioná una plantilla publicada para asignarla
            </span>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{templates.length}</p>
              <p className="text-xs text-text-muted">Plantillas</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-accent">{publishedCount}</p>
              <p className="text-xs text-text-muted">Publicadas</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-400">{draftsCount}</p>
              <p className="text-xs text-text-muted">Borradores</p>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda y filtros */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Buscar plantilla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-surface border-border"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "border-border",
              filterStatus !== "all" && "border-primary text-primary"
            )}
            onClick={() => {
              const next = filterStatus === "all" ? "published" : filterStatus === "published" ? "draft" : "all";
              setFilterStatus(next);
            }}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Filtro activo */}
        {filterStatus !== "all" && (
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "cursor-pointer",
                filterStatus === "published" ? "border-accent text-accent" : "border-orange-400 text-orange-400"
              )}
              onClick={() => setFilterStatus("all")}
            >
              {filterStatus === "published" ? "Publicadas" : "Borradores"} ×
            </Badge>
          </div>
        )}

        {/* Lista de plantillas */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-8 text-center">
              <LayoutTemplate className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted mb-4">
                {searchTerm ? "No se encontraron plantillas" : "No tenés plantillas todavía"}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push("/coach/routines-v2/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primera plantilla
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredTemplates.map((template, index) => {
                const stats = getTemplateStats(template);
                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className={cn(
                        "bg-surface/80 border-border overflow-hidden transition-colors",
                        isAssignMode && template.status === "published" 
                          ? "cursor-pointer hover:border-primary/50 hover:bg-primary/5" 
                          : isAssignMode && template.status === "draft"
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:border-primary/50"
                      )}
                      onClick={() => {
                        if (isAssignMode) {
                          if (template.status === "published") {
                            handleAssign(template);
                          }
                        } else {
                          router.push(`/coach/routines-v2/${template.id}`);
                        }
                      }}
                    >
                      <CardContent className="p-0">
                        {/* Header */}
                        <div className="p-4 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                template.status === "draft" ? "bg-orange-500/20" : "bg-primary/20"
                              )}>
                                <Dumbbell className={cn(
                                  "w-5 h-5",
                                  template.status === "draft" ? "text-orange-400" : "text-primary"
                                )} />
                              </div>
                              <div>
                                <h3 className="font-semibold text-text">{template.name}</h3>
                                {template.description && (
                                  <p className="text-xs text-text-muted line-clamp-1">
                                    {template.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px]",
                                template.status === "draft" 
                                  ? "border-orange-500/50 text-orange-400" 
                                  : "border-accent/50 text-accent"
                              )}
                            >
                              {template.status === "draft" ? "Borrador" : "Publicada"}
                            </Badge>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="px-4 pb-3 flex items-center gap-4 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {stats.microcyclesCount || template.estimatedWeeks} microciclos
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {stats.daysPerMicrocycle} días/sem
                          </span>
                          <span className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" />
                            {stats.exercisesCount} ejercicios
                          </span>
                        </div>

                        {/* Tags */}
                        {template.tags && template.tags.length > 0 && (
                          <div className="px-4 pb-3 flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="outline" 
                                className="text-[10px] border-border text-text-muted"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {template.tags.length > 3 && (
                              <Badge variant="outline" className="text-[10px] border-border text-text-muted">
                                +{template.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="px-4 py-2 bg-background/30 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-text-muted">
                            <Users className="w-3 h-3" />
                            <span>{template.assignedCount || 0} asignados</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-text-muted">
                            <Clock className="w-3 h-3" />
                            <span>Editado {new Date(template.updatedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
                          </div>
                          {assigningTo === template.id ? (
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          ) : isAssignMode && template.status === "published" ? (
                            <UserPlus className="w-4 h-4 text-primary" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-text-muted" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal de selección de macrociclo */}
      <Sheet open={showMacrocycleModal} onOpenChange={setShowMacrocycleModal}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] bg-background rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Asignar a Macrociclo
            </SheetTitle>
            <SheetDescription>
              Seleccioná a qué macrociclo agregar la plantilla
            </SheetDescription>
          </SheetHeader>

          {loadingMacrocycles ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 pb-4 max-h-[50vh] overflow-y-auto">
              {/* Opción: Crear nuevo macrociclo */}
              <div
                className={cn(
                  "p-4 rounded-lg border-2 cursor-pointer transition-all",
                  selectedMacrocycleId === "new"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setSelectedMacrocycleId("new")}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    selectedMacrocycleId === "new" ? "bg-primary/20" : "bg-surface"
                  )}>
                    <FolderPlus className={cn(
                      "w-5 h-5",
                      selectedMacrocycleId === "new" ? "text-primary" : "text-text-muted"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Crear nuevo macrociclo</p>
                    <p className="text-xs text-text-muted">
                      Se creará un nuevo macrociclo para esta rutina
                    </p>
                  </div>
                  {selectedMacrocycleId === "new" && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
                
                {selectedMacrocycleId === "new" && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Label htmlFor="newMacroName" className="text-sm">
                      Nombre del macrociclo
                    </Label>
                    <Input
                      id="newMacroName"
                      value={newMacrocycleName}
                      onChange={(e) => setNewMacrocycleName(e.target.value)}
                      placeholder="Ej: Bloque de Hipertrofia 2026"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Macrociclos existentes */}
              {studentMacrocycles.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Target className="w-4 h-4" />
                    <span>O agregá a un macrociclo existente</span>
                  </div>
                  
                  <div className="space-y-2">
                    {studentMacrocycles.map((macro) => (
                      <div
                        key={macro.id}
                        className={cn(
                          "p-3 rounded-lg border-2 cursor-pointer transition-all",
                          selectedMacrocycleId === macro.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => setSelectedMacrocycleId(macro.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Target className={cn(
                              "w-5 h-5",
                              selectedMacrocycleId === macro.id ? "text-primary" : "text-text-muted"
                            )} />
                            <div>
                              <p className="font-medium">{macro.name}</p>
                              <p className="text-xs text-text-muted">
                                {macro.mesocycles?.length || 0} mesociclos
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!macro.endDate && (
                              <Badge className="bg-primary/20 text-primary text-[10px]">
                                Activo
                              </Badge>
                            )}
                            {selectedMacrocycleId === macro.id && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Info sobre el estado */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400">
                  💡 La rutina se asignará en estado <strong>Programada</strong>. 
                  El alumno no podrá verla hasta que la actives.
                </p>
              </div>
            </div>
          )}

          <SheetFooter className="border-t border-border pt-4">
            <Button
              onClick={confirmAssign}
              disabled={!selectedMacrocycleId || assigning}
              className="w-full h-12 bg-primary text-black"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Asignar Plantilla
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
