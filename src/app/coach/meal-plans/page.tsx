"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  FileText,
  Users,
  ChevronRight,
  Flame,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  User,
  CheckCircle,
  FileEdit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getMealPlanTemplates, getAssignedPlans, deleteMealPlanTemplate, duplicateMealPlanTemplate, updateMealPlanTemplate } from "@/lib/api/meal-plan";
import { toast } from "sonner";

// Types del backend
interface MealPlanTemplate {
  id: number;
  name: string;
  objective: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealsCount: number;
  assignedCount: number;
  status: "draft" | "active";
  createdAt: string;
}

interface AssignedPlan {
  id: number;
  templateId: number;
  templateName: string;
  studentId: number;
  studentName: string;
  studentAvatar?: string;
  isCustomized: boolean;
  assignedAt: string;
}

export default function MealPlansPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MealPlanTemplate[]>([]);
  const [assignedPlans, setAssignedPlans] = useState<AssignedPlan[]>([]);
  const [activeTab, setActiveTab] = useState("templates");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [templatesData, assignedData] = await Promise.all([
          getMealPlanTemplates(),
          getAssignedPlans(),
        ]);
        setTemplates(templatesData.map(t => ({
          ...t,
          assignedCount: t.assignedCount || 0,
          status: t.status || "active",
        })));
        setAssignedPlans(assignedData);
      } catch (error) {
        console.error("Error cargando planes:", error);
        toast.error("Error al cargar los planes");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDeleteTemplate = async (id: number) => {
    try {
      await deleteMealPlanTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Plan eliminado");
    } catch (error) {
      console.error("Error eliminando plan:", error);
      toast.error("Error al eliminar el plan");
    }
  };

  const handleDuplicateTemplate = async (id: number) => {
    try {
      const newTemplate = await duplicateMealPlanTemplate(id);
      setTemplates((prev) => [{
        ...newTemplate,
        assignedCount: 0,
        status: newTemplate.status || "draft",
      }, ...prev]);
      toast.success("Plan duplicado");
    } catch (error) {
      console.error("Error duplicando plan:", error);
      toast.error("Error al duplicar el plan");
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: "draft" | "active") => {
    const newStatus = currentStatus === "draft" ? "active" : "draft";
    try {
      await updateMealPlanTemplate(id, { status: newStatus });
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
      );
      toast.success(newStatus === "active" ? "Plan publicado" : "Plan pasado a borrador");
    } catch (error) {
      console.error("Error cambiando estado:", error);
      toast.error("Error al cambiar el estado");
    }
  };

  const getObjectiveLabel = (objective: string) => {
    const labels: Record<string, string> = {
      deficit: "Déficit calórico",
      maintenance: "Mantenimiento",
      surplus: "Superávit calórico",
    };
    return labels[objective] || objective;
  };

  const getObjectiveColor = (objective: string) => {
    if (objective === "deficit" || objective.toLowerCase().includes("déficit")) return "text-red-400 border-red-500/50";
    if (objective === "surplus" || objective.toLowerCase().includes("superávit")) return "text-green-400 border-green-500/50";
    return "text-primary border-primary/50";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Planes de Alimentación" backHref="/coach" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Planes de Alimentación"
        backHref="/coach"
        rightContent={
          <Button
            size="sm"
            className="bg-primary text-black font-medium"
            onClick={() => router.push("/coach/meal-plans/create")}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-surface/80 border border-border">
            <TabsTrigger
              value="templates"
              className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              <FileText className="w-4 h-4" />
              Plantillas
              <Badge variant="secondary" className="ml-1 bg-background/50 text-xs">
                {templates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="assigned"
              className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              <Users className="w-4 h-4" />
              Asignados
              <Badge variant="secondary" className="ml-1 bg-background/50 text-xs">
                {assignedPlans.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-4 space-y-3">
            {templates.length === 0 ? (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <h3 className="font-semibold text-text mb-1">Sin plantillas</h3>
                  <p className="text-sm text-text-muted mb-4">
                    Creá tu primera plantilla de plan de alimentación
                  </p>
                  <Button
                    onClick={() => router.push("/coach/meal-plans/create")}
                    className="bg-primary text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear plantilla
                  </Button>
                </CardContent>
              </Card>
            ) : (
              templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-surface/80 border-border overflow-hidden">
                    <CardContent className="p-0">
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => router.push(`/coach/meal-plans/${template.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-text truncate">
                                {template.name}
                              </h3>
                              {template.status === "draft" ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs shrink-0 text-warning border-warning/50 bg-warning/10"
                                >
                                  Borrador
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={cn("text-xs shrink-0", getObjectiveColor(template.objective))}
                                >
                                  {getObjectiveLabel(template.objective)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-text-muted flex items-center gap-1">
                                <Flame className="w-3 h-3 text-orange-400" />
                                {template.totalCalories} kcal
                              </span>
                              <span className="text-red-400">P:{template.totalProtein}g</span>
                              <span className="text-amber-400">C:{template.totalCarbs}g</span>
                              <span className="text-blue-400">G:{template.totalFat}g</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                              <span>{template.mealsCount} comidas</span>
                              <span>
                                {template.assignedCount} alumno{template.assignedCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="shrink-0 -mr-2">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-surface border-border">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(template.id, template.status);
                                }}
                                className={template.status === "draft" ? "text-success focus:text-success" : "text-warning focus:text-warning"}
                              >
                                {template.status === "draft" ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Publicar
                                  </>
                                ) : (
                                  <>
                                    <FileEdit className="w-4 h-4 mr-2" />
                                    Pasar a borrador
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/coach/meal-plans/${template.id}/edit`);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateTemplate(template.id);
                                }}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/coach/meal-plans/${template.id}/assign`);
                                }}
                              >
                                <User className="w-4 h-4 mr-2" />
                                Asignar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTemplate(template.id);
                                }}
                                className="text-error focus:text-error"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Assigned Tab */}
          <TabsContent value="assigned" className="mt-4 space-y-3">
            {assignedPlans.length === 0 ? (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <h3 className="font-semibold text-text mb-1">Sin asignaciones</h3>
                  <p className="text-sm text-text-muted">
                    Asigná plantillas a tus alumnos desde la pestaña de plantillas
                  </p>
                </CardContent>
              </Card>
            ) : (
              assignedPlans.map((assigned, index) => (
                <motion.div
                  key={assigned.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="bg-surface/80 border-border cursor-pointer touch-feedback"
                    onClick={() =>
                      router.push(`/coach/students/${assigned.studentId}/meal-plan`)
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {assigned.studentName[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-text truncate">
                              {assigned.studentName}
                            </p>
                            {assigned.isCustomized && (
                              <Badge variant="outline" className="text-[10px] text-accent border-accent/50">
                                Personalizado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-text-muted truncate">
                            {assigned.templateName}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-muted shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

