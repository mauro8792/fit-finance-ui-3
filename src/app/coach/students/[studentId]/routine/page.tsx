"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getStudentById } from "@/lib/api/coach";
import { getMacrocyclesByStudent } from "@/lib/api/routine";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import type { Student, Macrocycle } from "@/types";

export default function StudentRoutinePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Number(params.studentId);

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [expandedMacro, setExpandedMacro] = useState<number | null>(null);
  const [expandedMeso, setExpandedMeso] = useState<number | null>(null);
  const [deletingMicro, setDeletingMicro] = useState<number | null>(null);
  
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

  useEffect(() => {
    if (dataFetched.current) return;
    
    const loadData = async () => {
      try {
        dataFetched.current = true;
        setLoading(true);
        const [studentData, routineData] = await Promise.all([
          getStudentById(studentId),
          getMacrocyclesByStudent(studentId),
        ]);
        setStudent(studentData);
        setMacrocycles(routineData || []);

        // Auto-expand active macrocycle
        const active = routineData?.find((m: Macrocycle) => !m.endDate);
        if (active) setExpandedMacro(active.id);
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
        {/* No Routine */}
        {macrocycles.length === 0 ? (
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
                  onClick={() => router.push(`/coach/templates?assign=${studentId}`)}
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
                onClick={() => router.push(`/coach/templates?assign=${studentId}`)}
              >
                <Copy className="w-4 h-4 mr-1" />
                Template
              </Button>
            </div>

            {/* Macrocycles List */}
            <div className="space-y-3">
              {macrocycles.map((macro) => {
                const isExpanded = expandedMacro === macro.id;
                const isActive = !macro.endDate;

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
                              {macro.mesocycles?.length || 0} mesociclos
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
                            {macro.mesocycles?.length === 0 ? (
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
    </div>
  );
}

