"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Flame,
  Beef,
  Wheat,
  Droplets,
  ChevronRight,
  Clock,
  UtensilsCrossed,
  Salad,
  ChefHat,
  Coffee,
  Moon,
  Sun,
  Dumbbell,
  Apple,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMyMealPlans, type StudentMealPlan } from "@/lib/api/meal-plan";

// Interfaz extendida para el plan con totales de comidas (calculados)
interface MealWithTotals {
  id?: number;
  name: string;
  order: number;
  icon: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: {
    id?: number;
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
}

interface StudentMealPlanWithTotals extends Omit<StudentMealPlan, "meals"> {
  meals: MealWithTotals[];
}

const MEAL_ICONS: Record<string, React.ElementType> = {
  coffee: Coffee,
  apple: Apple,
  sun: Sun,
  moon: Moon,
  dumbbell: Dumbbell,
  salad: Salad,
};

export default function MealPlanPage() {
  const router = useRouter();
  const { student } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [mealPlans, setMealPlans] = useState<StudentMealPlanWithTotals[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [expandedMealId, setExpandedMealId] = useState<number | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Evitar doble llamado en StrictMode
    if (hasFetched.current) return;
    hasFetched.current = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const plans = await getMyMealPlans();
        
        // Calcular totales por comida desde los alimentos
        const plansWithTotals: StudentMealPlanWithTotals[] = plans.map((plan) => ({
          ...plan,
          meals: plan.meals.map((meal) => ({
            ...meal,
            calories: meal.totalCalories || meal.foods.reduce((sum, f) => sum + (f.calories || 0), 0),
            protein: meal.totalProtein || meal.foods.reduce((sum, f) => sum + (f.protein || 0), 0),
            carbs: meal.totalCarbs || meal.foods.reduce((sum, f) => sum + (f.carbs || 0), 0),
            fat: meal.totalFat || meal.foods.reduce((sum, f) => sum + (f.fat || 0), 0),
          })),
        }));
        
        setMealPlans(plansWithTotals);
        
        // Seleccionar el plan activo por defecto
        const activePlan = plansWithTotals.find((p) => p.isActive);
        setSelectedPlanId(activePlan?.id || plansWithTotals[0]?.id || null);
      } catch (error) {
        console.error("Error cargando planes:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [student?.id]);

  const selectedPlan = mealPlans.find((p) => p.id === selectedPlanId);

  const toggleMeal = (mealId: number) => {
    setExpandedMealId(expandedMealId === mealId ? null : mealId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Plan de Alimentación" backHref="/student" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Plan de Alimentación" backHref="/student" />
        <div className="px-4 py-8 text-center">
          <UtensilsCrossed className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text mb-2">Sin plan asignado</h2>
          <p className="text-text-muted text-sm">
            Tu coach aún no te ha asignado un plan de alimentación.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Plan de Alimentación" backHref="/student" />

      <div className="px-4 py-4 space-y-4">
        {/* Plan Tabs - solo si hay alternativas */}
        {mealPlans.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs text-text-muted text-center">
              🔄 Tenés {mealPlans.length} opciones de plan - Podés alternar según tu preferencia
            </p>
            <Tabs
              value={String(selectedPlanId)}
              onValueChange={(v) => {
                setSelectedPlanId(Number(v));
                setExpandedMealId(null);
              }}
            >
              <TabsList className="w-full bg-surface/80 border border-border">
                {mealPlans.map((plan) => (
                  <TabsTrigger
                    key={plan.id}
                    value={String(plan.id)}
                    className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-black"
                  >
                    {plan.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Plan Summary */}
        <Card className="bg-gradient-to-br from-surface to-surface/80 border-border overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-text">{selectedPlan.name}</h2>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs mt-1",
                    selectedPlan.objective.includes("Déficit")
                      ? "border-red-500/50 text-red-400"
                      : selectedPlan.objective.includes("Superávit")
                      ? "border-green-500/50 text-green-400"
                      : "border-primary/50 text-primary"
                  )}
                >
                  {selectedPlan.objective}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {selectedPlan.totalCalories}
                </p>
                <p className="text-xs text-text-muted">kcal/día</p>
              </div>
            </div>

            {/* Macros Summary */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <Beef className="w-4 h-4 text-red-400 mx-auto mb-1" />
                <p className="text-base font-bold text-text">{selectedPlan.totalProtein}g</p>
                <p className="text-[10px] text-text-muted">Proteínas</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <Wheat className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-base font-bold text-text">{selectedPlan.totalCarbs}g</p>
                <p className="text-[10px] text-text-muted">Carbos</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-base font-bold text-text">{selectedPlan.totalFat}g</p>
                <p className="text-[10px] text-text-muted">Grasas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meals List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-muted flex items-center gap-2">
            <ChefHat className="w-4 h-4" />
            Comidas del día ({selectedPlan.meals.length})
          </h3>

          {selectedPlan.meals.map((meal, index) => {
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
                    "bg-surface/80 border-border overflow-hidden transition-all cursor-pointer",
                    isExpanded && "ring-1 ring-primary/50"
                  )}
                  onClick={() => toggleMeal(meal.id)}
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
                            {meal.calories} kcal
                          </span>
                          <span className="text-xs text-red-400">P:{meal.protein}g</span>
                          <span className="text-xs text-amber-400">C:{meal.carbs}g</span>
                          <span className="text-xs text-blue-400">G:{meal.fat}g</span>
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          "w-5 h-5 text-text-muted transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </div>

                    {/* Foods Detail - Expandable */}
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

        {/* Tips o Info */}
        <Card className="bg-surface/50 border-border/50">
          <CardContent className="p-3">
            <p className="text-xs text-text-muted text-center">
              💡 Este plan fue creado por tu coach. Tocá cada comida para ver el detalle de alimentos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

