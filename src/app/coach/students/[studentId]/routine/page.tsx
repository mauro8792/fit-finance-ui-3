"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getStudentById } from "@/lib/api/coach";
import { getMacrocyclesByStudent } from "@/lib/api/routine";
import * as routineV2Api from "@/lib/api/routine-v2";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dumbbell,
  Plus,
  ChevronRight,
  ChevronDown,
  Calendar,
  Target,
  Clock,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Play,
  Pause,
  CheckCircle2,
  Sparkles,
  Loader2,
  FolderPlus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import type { Student, Macrocycle } from "@/types";
import type { StudentMesocycle } from "@/types/routine-v2";

export default function StudentRoutinePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Number(params.studentId);

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [routinesV2, setRoutinesV2] = useState<StudentMesocycle[]>([]);
  const [expandedMacro, setExpandedMacro] = useState<number | null>(null);
  const [expandedMeso, setExpandedMeso] = useState<number | null>(null);
  const [expandedRoutineV2, setExpandedRoutineV2] = useState<string | null>(null);
  const [deletingMicro, setDeletingMicro] = useState<number | null>(null);
  
  // Estado para modal de activación
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [routineToActivate, setRoutineToActivate] = useState<StudentMesocycle | null>(null);
  const [selectedMacrocycleId, setSelectedMacrocycleId] = useState<number | "new" | null>(null);
  const [newMacrocycleName, setNewMacrocycleName] = useState("");
  const [activating, setActivating] = useState(false);
  
  // Ref para evitar llamadas duplicadas (StrictMode)
  const dataFetched = useRef(false);

  // Función para eliminar microciclo
  const handleDeleteMicrocycle = async (microId: number, microName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se abra el microciclo
    
    const confirmDelete = window.confirm(
      `¿Eliminar "${microName}"?\n\nEsta acción eliminará todos los ejercicios y series del microciclo.`
    );
    
    if (!confirmDelete) return;

    setDeletingMicro(microId);
    try {
      await api.delete(`/microcycle/${microId}`);
      toast.success("Microciclo eliminado");
      
      // Actualizar estado local
      setMacrocycles((prev) =>
        prev.map((macro) => ({
          ...macro,
          mesocycles: macro.mesocycles?.map((meso) => ({
            ...meso,
            microcycles: meso.microcycles?.filter((m) => m.id !== microId),
          })),
        }))
      );
    } catch (error: any) {
      console.error("Error deleting microcycle:", error);
      toast.error(error.response?.data?.message || "Error al eliminar");
    } finally {
      setDeletingMicro(null);
    }
  };

  // Función para recargar datos (accesible desde event handlers)
  const refreshData = async () => {
    try {
      const [studentData, routineData, routinesV2Data] = await Promise.all([
        getStudentById(studentId),
        getMacrocyclesByStudent(studentId),
        routineV2Api.getStudentRoutines(studentId).catch(() => []),
      ]);
      setStudent(studentData);
      setMacrocycles(routineData || []);
      setRoutinesV2(routinesV2Data || []);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  useEffect(() => {
    if (dataFetched.current) return;
    
    const loadData = async () => {
      try {
        dataFetched.current = true;
        setLoading(true);
        const [studentData, routineData, routinesV2Data] = await Promise.all([
          getStudentById(studentId),
          getMacrocyclesByStudent(studentId),
          routineV2Api.getStudentRoutines(studentId).catch(() => []), // No falla si no hay rutinas v2
        ]);
        setStudent(studentData);
        setMacrocycles(routineData || []);
        setRoutinesV2(routinesV2Data || []);

        // Auto-expand active macrocycle
        const active = routineData?.find((m: Macrocycle) => !m.endDate);
        if (active) setExpandedMacro(active.id);
        
        // Auto-expand active routine v2
        const activeV2 = routinesV2Data?.find((r: StudentMesocycle) => r.status === 'active');
        if (activeV2) setExpandedRoutineV2(activeV2.id);
      } catch (error) {
        console.error("Error loading routine:", error);
        dataFetched.current = false; // Permitir reintento en caso de error
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  const activeMacrocycle = macrocycles.find((m) => !m.endDate);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Rutina" backHref={`/coach/students/${studentId}`} />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Rutina"
        subtitle={`${student?.firstName} ${student?.lastName}`}
        backHref={`/coach/students/${studentId}`}
      />

      <div className="px-4 py-4 space-y-4">
        {/* No Routine - Solo mostrar si no hay macrocycles NI rutinas V2 */}
        {macrocycles.length === 0 && routinesV2.length === 0 ? (
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Sin rutina asignada</h3>
              <p className="text-text-muted text-sm mb-6">
                Este alumno no tiene ninguna rutina. Creá una nueva o asigná un template.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  className="bg-gradient-to-r from-primary to-primary-hover text-black"
                  onClick={() => router.push(`/coach/routines/create?studentId=${studentId}`)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Rutina Nueva
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/coach/routines-v2?assign=${studentId}`)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Usar Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-primary text-black"
                onClick={() => router.push(`/coach/routines/create?studentId=${studentId}`)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nuevo Macrociclo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/coach/routines-v2?assign=${studentId}`)}
              >
                <Copy className="w-4 h-4 mr-1" />
                Template
              </Button>
            </div>

            {/* Rutinas V2 sin macrociclo asignado (pendientes) */}
            {routinesV2.filter(r => !r.macrocycleId).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Rutinas pendientes de asignar a macrociclo</span>
                </div>
                {routinesV2.filter(r => !r.macrocycleId).map((routine) => {
                  const isActive = routine.status === 'active';
                  const isScheduled = routine.status === 'scheduled';
                  
                  return (
                    <Card
                      key={routine.id}
                      className={cn(
                        "bg-surface/80 border-border overflow-hidden",
                        isActive && "border-primary/30 bg-primary/5"
                      )}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Fila 1: Info */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                isActive ? "bg-primary/20" : "bg-accent/20"
                              )}
                            >
                              <Dumbbell
                                className={cn(
                                  "w-5 h-5",
                                  isActive ? "text-primary" : "text-accent"
                                )}
                              />
                            </div>
                            <div>
                              <p className="font-medium text-text">{routine.name}</p>
                              <p className="text-xs text-text-muted mt-1">
                                {routine.microcycles?.length || 0} microciclos
                              </p>
                            </div>
                          </div>
                          <Badge 
                            className={cn(
                              "text-xs shrink-0",
                              isActive && "bg-green-500/20 text-green-400",
                              isScheduled && "bg-blue-500/20 text-blue-400",
                              routine.status === 'completed' && "bg-gray-500/20 text-gray-400"
                            )}
                          >
                            {isActive ? "✓ Activo" : isScheduled ? "Programada" : "Completada"}
                          </Badge>
                        </div>
                        
                        {/* Fila 2: Acciones */}
                        <div className="flex items-center gap-2">
                          {/* Botón Activar */}
                          {isScheduled && (
                            <Button
                              size="sm"
                              className="flex-1 bg-primary text-black"
                              onClick={() => {
                                setRoutineToActivate(routine);
                                setSelectedMacrocycleId(null);
                                setNewMacrocycleName(routine.name || "");
                                setShowActivateModal(true);
                              }}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Activar
                            </Button>
                          )}
                          {/* Botón Pausar */}
                          {isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                              onClick={async () => {
                                try {
                                  await routineV2Api.deactivateRoutine(routine.id);
                                  toast.success("Rutina desactivada");
                                  refreshData();
                                } catch (error) {
                                  console.error("Error deactivate:", error);
                                  toast.error("Error al desactivar");
                                }
                              }}
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Pausar
                            </Button>
                          )}
                          {/* Botón Editar */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => router.push(`/coach/student-routine-v2/${routine.id}/edit`)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                          {/* Botón Ver */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-10 h-10"
                            onClick={() => router.push(`/coach/student-routine-v2/${routine.id}`)}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Macrocycles List */}
            <div className="space-y-3">
              {macrocycles.map((macro) => {
                const isExpanded = expandedMacro === macro.id;
                const isActive = !macro.endDate;
                // Rutinas v2 que pertenecen a este macrociclo
                const macroRoutinesV2 = routinesV2.filter(r => r.macrocycleId === macro.id);
                const totalMesocycles = (macro.mesocycles?.length || 0) + macroRoutinesV2.length;

                return (
                  <Card
                    key={macro.id}
                    className={cn(
                      "bg-surface/80 border-border overflow-hidden",
                      isActive && "border-primary/30"
                    )}
                  >
                    {/* Macro Header */}
                    <CardHeader
                      className="p-4 cursor-pointer touch-feedback"
                      onClick={() => setExpandedMacro(isExpanded ? null : macro.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              isActive ? "bg-primary/20" : "bg-surface"
                            )}
                          >
                            <Target
                              className={cn(
                                "w-5 h-5",
                                isActive ? "text-primary" : "text-text-muted"
                              )}
                            />
                          </div>
                          <div>
                            <CardTitle className="text-base">{macro.name}</CardTitle>
                            <p className="text-xs text-text-muted">
                              {totalMesocycles} mesociclos
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <Badge className="bg-primary/20 text-primary text-xs">
                              Activo
                            </Badge>
                          )}
                          <ChevronDown
                            className={cn(
                              "w-5 h-5 text-text-muted transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>
                      </div>
                    </CardHeader>

                    {/* Mesocycles */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <CardContent className="p-0 border-t border-border">
                            {macro.mesocycles?.length === 0 && macroRoutinesV2.length === 0 ? (
                              <div className="p-4 text-center">
                                <p className="text-sm text-text-muted">Sin mesociclos</p>
                                <Button
                                  size="sm"
                                  variant="link"
                                  className="text-primary"
                                  onClick={() =>
                                    router.push(`/coach/macrocycle/${macro.id}/add-meso`)
                                  }
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Agregar mesociclo
                                </Button>
                              </div>
                            ) : (
                              <div className="divide-y divide-border">
                                {macro.mesocycles?.map((meso) => {
                                  const isMesoExpanded = expandedMeso === meso.id;

                                  return (
                                    <div key={meso.id}>
                                      {/* Meso Header */}
                                      <div
                                        className="p-4 flex items-center justify-between cursor-pointer touch-feedback bg-background/30"
                                        onClick={() =>
                                          setExpandedMeso(isMesoExpanded ? null : meso.id)
                                        }
                                      >
                                        <div className="flex items-center gap-3">
                                          <Calendar className="w-4 h-4 text-accent" />
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <p className="font-medium text-text text-sm">
                                                {meso.name}
                                              </p>
                                              {meso.status && (
                                                <Badge 
                                                  variant="outline" 
                                                  className={cn(
                                                    "text-[10px] px-1.5 py-0",
                                                    meso.status === "active" && "bg-green-500/20 text-green-400 border-green-500/30",
                                                    meso.status === "draft" && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                                                    meso.status === "published" && "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                                  )}
                                                >
                                                  {meso.status === "active" ? "✓ Activo" : 
                                                   meso.status === "draft" ? "📝 Borrador" : 
                                                   meso.status === "published" ? "📢 Publicado" : meso.status}
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-xs text-text-muted">
                                              {meso.microcycles?.length || 0} microciclos
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="w-8 h-8"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              router.push(`/coach/mesocycle/${meso.id}`);
                                            }}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <ChevronRight
                                            className={cn(
                                              "w-4 h-4 text-text-muted transition-transform",
                                              isMesoExpanded && "rotate-90"
                                            )}
                                          />
                                        </div>
                                      </div>

                                      {/* Microcycles */}
                                      <AnimatePresence>
                                        {isMesoExpanded && (
                                          <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: "auto" }}
                                            exit={{ height: 0 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="px-4 pb-4 space-y-2">
                                              {meso.microcycles?.map((micro) => (
                                                <Card
                                                  key={micro.id}
                                                  className="bg-background/50 border-border cursor-pointer touch-feedback"
                                                  onClick={() =>
                                                    router.push(`/coach/microcycle/${micro.id}`)
                                                  }
                                                >
                                                  <CardContent className="p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                      {micro.isDeload && (
                                                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] shrink-0">
                                                          🔵 Descarga
                                                        </Badge>
                                                      )}
                                                      <span className="text-sm text-text truncate font-medium">
                                                        {micro.name}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                      <span className="text-xs text-text-muted">
                                                        {micro.days?.length || 0} días
                                                      </span>
                                                      <button
                                                        onClick={(e) => handleDeleteMicrocycle(micro.id, micro.name, e)}
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
                                                      <ChevronRight className="w-4 h-4 text-text-muted" />
                                                    </div>
                                                  </CardContent>
                                                </Card>
                                              ))}
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="w-full text-primary"
                                                onClick={() =>
                                                  router.push(`/coach/mesocycle/${meso.id}/add-micro`)
                                                }
                                              >
                                                <Plus className="w-4 h-4 mr-1" />
                                                Agregar microciclo
                                              </Button>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}

                                {/* Rutinas V2 asociadas a este macrociclo */}
                                {macroRoutinesV2.map((routineV2) => {
                                  const isV2Active = routineV2.status === 'active';
                                  const isV2Scheduled = routineV2.status === 'scheduled';
                                  
                                  return (
                                    <div 
                                      key={routineV2.id}
                                      className="p-4 bg-primary/5 border-b border-border space-y-3"
                                    >
                                      {/* Fila 1: Nombre + Badge */}
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                          <Calendar className="w-5 h-5 text-primary mt-0.5" />
                                          <div>
                                            <p className="font-medium text-text">
                                              {routineV2.name}
                                            </p>
                                            <p className="text-xs text-text-muted mt-1">
                                              {routineV2.microcycles?.length || 0} microciclos
                                            </p>
                                          </div>
                                        </div>
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            "text-xs shrink-0",
                                            isV2Active && "bg-green-500/20 text-green-400 border-green-500/30",
                                            isV2Scheduled && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                                            routineV2.status === 'completed' && "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                          )}
                                        >
                                          {isV2Active ? "✓ Activo" : isV2Scheduled ? "Programada" : "Completada"}
                                        </Badge>
                                      </div>
                                      
                                      {/* Fila 2: Acciones */}
                                      <div className="flex items-center gap-2">
                                        {/* Botón Activar */}
                                        {isV2Scheduled && (
                                          <Button
                                            size="sm"
                                            className="flex-1 bg-primary text-black"
                                            onClick={async () => {
                                              try {
                                                await routineV2Api.activateRoutine(routineV2.id, macro.id);
                                                toast.success("¡Rutina activada!");
                                                refreshData();
                                              } catch (error) {
                                                console.error("Error activate:", error);
                                                toast.error("Error al activar");
                                              }
                                            }}
                                          >
                                            <Play className="w-4 h-4 mr-2" />
                                            Activar
                                          </Button>
                                        )}
                                        {/* Botón Pausar */}
                                        {isV2Active && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                                            onClick={async () => {
                                              try {
                                                await routineV2Api.deactivateRoutine(routineV2.id);
                                                toast.success("Rutina desactivada");
                                                refreshData();
                                              } catch (error) {
                                                console.error("Error deactivate:", error);
                                                toast.error("Error al desactivar");
                                              }
                                            }}
                                          >
                                            <Pause className="w-4 h-4 mr-2" />
                                            Pausar
                                          </Button>
                                        )}
                                        {/* Botón Editar */}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1"
                                          onClick={() => router.push(`/coach/student-routine-v2/${routineV2.id}/edit`)}
                                        >
                                          <Edit className="w-4 h-4 mr-2" />
                                          Editar
                                        </Button>
                                        {/* Botón Ver */}
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="w-10 h-10"
                                          onClick={() => router.push(`/coach/student-routine-v2/${routineV2.id}`)}
                                        >
                                          <ChevronRight className="w-5 h-5" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Add Mesocycle Button */}
                                <div className="p-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() =>
                                      router.push(`/coach/macrocycle/${macro.id}/add-meso`)
                                    }
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Agregar mesociclo
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal de Activación - Seleccionar Macrociclo */}
      <Sheet open={showActivateModal} onOpenChange={setShowActivateModal}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] bg-background rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Activar Rutina
            </SheetTitle>
            <SheetDescription>
              Seleccioná a qué macrociclo pertenecerá esta rutina
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-4">
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
            {macrocycles.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Target className="w-4 h-4" />
                  <span>O agregá a un macrociclo existente</span>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {macrocycles.map((macro) => (
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
          </div>

          <SheetFooter className="border-t border-border pt-4">
            <Button
              onClick={async () => {
                if (!routineToActivate || !selectedMacrocycleId) {
                  toast.error("Seleccioná un macrociclo");
                  return;
                }

                setActivating(true);
                try {
                  if (selectedMacrocycleId === "new") {
                    // Crear nuevo macrociclo y activar
                    const newMacro = await api.post("/macrocycle", {
                      name: newMacrocycleName || routineToActivate.name,
                      studentId: studentId,
                      startDate: new Date().toISOString().split('T')[0], // Fecha de hoy
                    });
                    
                    // Activar rutina con el nuevo macrociclo
                    await routineV2Api.activateRoutine(
                      routineToActivate.id,
                      newMacro.data.id
                    );
                  } else {
                    // Activar rutina con macrociclo existente
                    await routineV2Api.activateRoutine(
                      routineToActivate.id,
                      selectedMacrocycleId
                    );
                  }

                  toast.success("¡Rutina activada!", {
                    description: selectedMacrocycleId === "new" 
                      ? `Se creó el macrociclo "${newMacrocycleName || routineToActivate.name}"`
                      : "Rutina agregada al macrociclo"
                  });
                  
                  setShowActivateModal(false);
                  dataFetched.current = false;
                  window.location.reload();
                } catch (e: unknown) {
                  console.error("Error activating:", e);
                  toast.error("Error al activar rutina");
                } finally {
                  setActivating(false);
                }
              }}
              disabled={!selectedMacrocycleId || activating}
              className="w-full h-12 bg-primary text-black"
            >
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Activar Rutina
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

