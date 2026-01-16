"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Edit,
  Trash2,
  Copy,
  User,
  Flame,
  Beef,
  Wheat,
  Droplets,
  ChevronRight,
  Coffee,
  Sun,
  Moon,
  Apple,
  Dumbbell,
  UtensilsCrossed,
  Users,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getMealPlanTemplate, deleteMealPlanTemplate, duplicateMealPlanTemplate } from "@/lib/api/meal-plan";

// Types
interface FoodItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  id: number;
  name: string;
  icon: string;
  order: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  foods: FoodItem[];
}

interface MealPlanTemplate {
  id: number;
  name: string;
  objective: string;
  status: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  meals: Meal[];
  assignedStudents?: { id: number; name: string; isCustomized: boolean }[];
  createdAt: string;
}

const MEAL_ICONS: Record<string, React.ElementType> = {
  coffee: Coffee,
  apple: Apple,
  sun: Sun,
  moon: Moon,
  dumbbell: Dumbbell,
};

export default function MealPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<MealPlanTemplate | null>(null);
  const [expandedMealId, setExpandedMealId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getMealPlanTemplate(parseInt(id));
        setTemplate(data);
      } catch (error) {
        console.error("Error cargando plan:", error);
        toast.error("Error al cargar el plan");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleDelete = async () => {
    try {
      await deleteMealPlanTemplate(parseInt(id));
      toast.success("Plantilla eliminada");
      router.push("/coach/meal-plans");
    } catch (error) {
      console.error("Error eliminando:", error);
      toast.error("Error al eliminar");
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateMealPlanTemplate(parseInt(id));
      toast.success("Plantilla duplicada");
      router.push("/coach/meal-plans");
    } catch (error) {
      console.error("Error duplicando:", error);
      toast.error("Error al duplicar");
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
    if (objective === "deficit") return "text-red-400 border-red-500/50";
    if (objective === "surplus") return "text-green-400 border-green-500/50";
    return "text-primary border-primary/50";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Cargando..." backHref="/coach/meal-plans" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="No encontrado" backHref="/coach/meal-plans" />
        <div className="px-4 py-8 text-center">
          <p className="text-text-muted">Plantilla no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={template.name}
        backHref="/coach/meal-plans"
        actions={[
          {
            label: "Editar",
            icon: Edit,
            onClick: () => router.push(`/coach/meal-plans/${id}/edit`),
          },
          {
            label: "Duplicar",
            icon: Copy,
            onClick: handleDuplicate,
          },
          {
            label: "Asignar",
            icon: User,
            onClick: () => router.push(`/coach/meal-plans/${id}/assign`),
          },
          {
            label: "Eliminar",
            icon: Trash2,
            onClick: () => setShowDeleteDialog(true),
            variant: "destructive",
          },
        ]}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Summary Card */}
        <Card className="bg-gradient-to-br from-surface to-surface/80 border-border overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              {template.status === "draft" ? (
                <Badge
                  variant="outline"
                  className="text-xs text-warning border-warning/50 bg-warning/10"
                >
                  Borrador
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={cn("text-xs", getObjectiveColor(template.objective))}
                >
                  {getObjectiveLabel(template.objective)}
                </Badge>
              )}
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{template.totalCalories}</p>
                <p className="text-xs text-text-muted">kcal/día</p>
              </div>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <Beef className="w-4 h-4 text-red-400 mx-auto mb-1" />
                <p className="text-base font-bold text-text">{template.totalProtein}g</p>
                <p className="text-[10px] text-text-muted">Proteínas</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <Wheat className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-base font-bold text-text">{template.totalCarbs}g</p>
                <p className="text-[10px] text-text-muted">Carbos</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-base font-bold text-text">{template.totalFat}g</p>
                <p className="text-[10px] text-text-muted">Grasas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Students */}
        {template.assignedStudents && template.assignedStudents.length > 0 && (
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-text">
                    Alumnos asignados ({template.assignedStudents.length})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => router.push(`/coach/meal-plans/${id}/assign`)}
                >
                  <User className="w-4 h-4 mr-1" />
                  Asignar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {template.assignedStudents.map((student) => (
                  <Badge
                    key={student.id}
                    variant="secondary"
                    className={cn(
                      "cursor-pointer hover:bg-primary/20",
                      student.isCustomized && "border-accent/50"
                    )}
                    onClick={() => router.push(`/coach/students/${student.id}/meal-plan`)}
                  >
                    {student.name}
                    {student.isCustomized && (
                      <span className="ml-1 text-[10px] text-accent">✎</span>
                    )}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meals */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-muted px-1">
            Comidas ({template.meals.length})
          </h3>

          {template.meals.map((meal, index) => {
            const IconComponent = MEAL_ICONS[meal.icon] || UtensilsCrossed;
            const isExpanded = expandedMealId === meal.id;

            return (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    "bg-surface/80 border-border overflow-hidden cursor-pointer transition-all",
                    isExpanded && "ring-1 ring-primary/50"
                  )}
                  onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
                >
                  <CardContent className="p-0">
                    {/* Meal Header */}
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-text">{meal.name}</p>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-background/50">
                            {meal.foods.length} items
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            {meal.totalCalories} kcal
                          </span>
                          <span className="text-xs text-red-400">P:{Math.round(Number(meal.totalProtein))}g</span>
                          <span className="text-xs text-amber-400">C:{Math.round(Number(meal.totalCarbs))}g</span>
                          <span className="text-xs text-blue-400">G:{Math.round(Number(meal.totalFat))}g</span>
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          "w-5 h-5 text-text-muted transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </div>

                    {/* Foods Detail */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border"
                      >
                        <div className="p-3 space-y-2 bg-background/30">
                          {meal.foods.map((food) => (
                            <div
                              key={food.id}
                              className="flex items-center justify-between py-2 px-3 bg-surface/50 rounded-lg"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text truncate">
                                  {food.name}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {food.quantity} {food.unit}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-text">
                                  {food.calories} kcal
                                </p>
                                <p className="text-[10px] text-text-muted">
                                  P:{food.protein}g C:{food.carbs}g G:{food.fat}g
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los planes asignados a alumnos no se verán
              afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-error text-white hover:bg-error/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

