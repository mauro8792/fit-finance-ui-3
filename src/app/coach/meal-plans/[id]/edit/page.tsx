"use client";

import { useState, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  GripVertical,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Save,
  ChevronDown,
  ChevronUp,
  Coffee,
  Sun,
  Moon,
  Apple,
  Dumbbell,
  UtensilsCrossed,
  X,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { getMealPlanTemplate, updateMealPlanTemplate } from "@/lib/api/meal-plan";
import { getCoachFoodItems, initializeCoachCatalog, type FoodItem as CatalogFoodItem } from "@/lib/api/nutrition";

// Types
interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  id: string;
  name: string;
  icon: string;
  order: number;
  foods: FoodItem[];
}

// El catálogo de alimentos se carga desde el backend

const MEAL_ICONS = [
  { id: "coffee", label: "Desayuno", icon: Coffee },
  { id: "apple", label: "Snack", icon: Apple },
  { id: "sun", label: "Almuerzo", icon: Sun },
  { id: "dumbbell", label: "Pre/Post entreno", icon: Dumbbell },
  { id: "moon", label: "Cena", icon: Moon },
  { id: "utensils", label: "Otro", icon: UtensilsCrossed },
];

const OBJECTIVES = [
  { value: "deficit", label: "Déficit calórico" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "surplus", label: "Superávit calórico" },
];

const UNITS = ["g", "ml", "u", "cdas", "tazas"];

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);


export default function EditMealPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Plan info
  const [planName, setPlanName] = useState("");
  const [objective, setObjective] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);

  // Expanded meal
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  // Add meal dialog
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [newMealName, setNewMealName] = useState("");
  const [newMealIcon, setNewMealIcon] = useState("coffee");

  // Add food dialog - ahora busca del catálogo
  const [showAddFood, setShowAddFood] = useState(false);
  const [addFoodToMealId, setAddFoodToMealId] = useState<string | null>(null);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [selectedCatalogFood, setSelectedCatalogFood] = useState<CatalogFoodItem | null>(null);
  const [foodQuantity, setFoodQuantity] = useState("100");
  const [foodUnit, setFoodUnit] = useState("g");
  
  // Catálogo de alimentos cargado del backend
  const [catalogFoods, setCatalogFoods] = useState<CatalogFoodItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [initializingCatalog, setInitializingCatalog] = useState(false);

  // Inicializar catálogo con alimentos base
  const handleInitializeCatalog = async () => {
    setInitializingCatalog(true);
    try {
      const result = await initializeCoachCatalog();
      toast.success(`Se crearon ${result.created} alimentos en tu catálogo`);
      // Recargar catálogo
      const foods = await getCoachFoodItems();
      setCatalogFoods(foods);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al inicializar catálogo");
    } finally {
      setInitializingCatalog(false);
    }
  };

  // Load existing data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Cargar template y catálogo en paralelo
        const [templateData, foodsData] = await Promise.all([
          getMealPlanTemplate(parseInt(id)),
          getCoachFoodItems(),
        ]);
        
        setPlanName(templateData.name);
        setObjective(templateData.objective || "");
        
        // Convertir meals del backend al formato local (asegurar números válidos)
        const convertedMeals: Meal[] = templateData.meals.map((meal) => ({
          id: meal.id?.toString() || generateId(),
          name: meal.name,
          icon: meal.icon,
          order: meal.order,
          foods: meal.foods.map((food) => ({
            id: food.id?.toString() || generateId(),
            name: food.name,
            quantity: Number(food.quantity) || 0,
            unit: food.unit || "g",
            calories: Number(food.calories) || 0,
            protein: Number(food.protein) || 0,
            carbs: Number(food.carbs) || 0,
            fat: Number(food.fat) || 0,
          })),
        }));
        
        setMeals(convertedMeals);
        setCatalogFoods(foodsData);
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("Error al cargar el plan");
      } finally {
        setLoading(false);
        setCatalogLoading(false);
      }
    };
    loadData();
  }, [id]);

  // Calculate totals
  const totals = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    meals.forEach((meal) => {
      meal.foods.forEach((food) => {
        calories += Number(food.calories) || 0;
        protein += Number(food.protein) || 0;
        carbs += Number(food.carbs) || 0;
        fat += Number(food.fat) || 0;
      });
    });

    return { calories: Math.round(calories), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
  }, [meals]);

  // Filter catalog foods
  const filteredCatalogFoods = catalogFoods.filter(
    (f) => f.name.toLowerCase().includes(foodSearchQuery.toLowerCase())
  );

  const handleAddMeal = () => {
    if (!newMealName.trim()) {
      toast.error("Ingresá un nombre para la comida");
      return;
    }

    const newMeal: Meal = {
      id: generateId(),
      name: newMealName.trim(),
      icon: newMealIcon,
      order: meals.length + 1,
      foods: [],
    };

    setMeals([...meals, newMeal]);
    setShowAddMeal(false);
    setNewMealName("");
    setNewMealIcon("coffee");
    setExpandedMealId(newMeal.id);
  };

  const handleDeleteMeal = (mealId: string) => {
    setMeals(meals.filter((m) => m.id !== mealId));
    if (expandedMealId === mealId) {
      setExpandedMealId(null);
    }
  };

  const handleOpenAddFood = (mealId: string) => {
    setAddFoodToMealId(mealId);
    setFoodSearchQuery("");
    setSelectedCatalogFood(null);
    setFoodQuantity("100");
    setFoodUnit("g");
    setShowAddFood(true);
  };

  const handleSelectCatalogFood = (food: CatalogFoodItem) => {
    setSelectedCatalogFood(food);
    setFoodQuantity("100");
  };

  const handleAddFood = () => {
    if (!selectedCatalogFood) {
      toast.error("Seleccioná un alimento del catálogo");
      return;
    }

    if (!addFoodToMealId) return;

    // Calcular macros según cantidad
    const qty = parseFloat(foodQuantity) || 0;
    const factor = qty / 100;
    const food: FoodItem = {
      id: generateId(),
      name: selectedCatalogFood.name,
      quantity: qty,
      unit: foodUnit,
      calories: Math.round(selectedCatalogFood.caloriesPer100g * factor),
      protein: Math.round(selectedCatalogFood.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(selectedCatalogFood.carbsPer100g * factor * 10) / 10,
      fat: Math.round(selectedCatalogFood.fatPer100g * factor * 10) / 10,
    };

    setMeals(
      meals.map((meal) =>
        meal.id === addFoodToMealId
          ? { ...meal, foods: [...meal.foods, food] }
          : meal
      )
    );

    setShowAddFood(false);
    setAddFoodToMealId(null);
    setSelectedCatalogFood(null);
  };

  const handleDeleteFood = (mealId: string, foodId: string) => {
    setMeals(
      meals.map((meal) =>
        meal.id === mealId
          ? { ...meal, foods: meal.foods.filter((f) => f.id !== foodId) }
          : meal
      )
    );
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      toast.error("Ingresá un nombre para el plan");
      return;
    }
    if (!objective) {
      toast.error("Seleccioná un objetivo");
      return;
    }
    if (meals.length === 0) {
      toast.error("Agregá al menos una comida");
      return;
    }

    setSaving(true);
    try {
      await updateMealPlanTemplate(parseInt(id), {
        name: planName,
        objective,
        meals: meals.map((meal) => ({
          name: meal.name,
          icon: meal.icon,
          order: meal.order,
          foods: meal.foods.map((food) => ({
            name: food.name,
            quantity: Number(food.quantity) || 0,
            unit: food.unit || "g",
            calories: Math.round(Number(food.calories) || 0),
            protein: Math.round((Number(food.protein) || 0) * 10) / 10,
            carbs: Math.round((Number(food.carbs) || 0) * 10) / 10,
            fat: Math.round((Number(food.fat) || 0) * 10) / 10,
          })),
        })),
      });
      toast.success("Plan actualizado correctamente");
      router.push(`/coach/meal-plans/${id}`);
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("Error al guardar el plan");
    } finally {
      setSaving(false);
    }
  };

  const getMealIcon = (iconId: string) => {
    const found = MEAL_ICONS.find((m) => m.id === iconId);
    return found?.icon || UtensilsCrossed;
  };

  const getMealTotals = (meal: Meal) => {
    return meal.foods.reduce(
      (acc, food) => ({
        calories: acc.calories + (Number(food.calories) || 0),
        protein: acc.protein + (Number(food.protein) || 0),
        carbs: acc.carbs + (Number(food.carbs) || 0),
        fat: acc.fat + (Number(food.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Editar Plan" backHref={`/coach/meal-plans/${id}`} />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <PageHeader
        title="Editar Plan"
        backHref={`/coach/meal-plans/${id}`}
        rightContent={
          <Button
            size="sm"
            className="bg-primary text-black font-medium"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Plan Info */}
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-muted">Información del plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="planName">Nombre del plan</Label>
              <Input
                id="planName"
                placeholder="Ej: Plan Déficit 2000 kcal"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Seleccioná un objetivo" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {OBJECTIVES.map((obj) => (
                    <SelectItem key={obj.value} value={obj.value}>
                      {obj.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Totals Summary */}
        <Card className="bg-gradient-to-br from-surface to-surface/80 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-text-muted">Totales del plan</p>
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-lg font-bold text-text">{totals.calories}</span>
                <span className="text-sm text-text-muted">kcal</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <Beef className="w-4 h-4 text-red-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-text">{totals.protein}g</p>
                <p className="text-[10px] text-text-muted">Proteínas</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <Wheat className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-text">{totals.carbs}g</p>
                <p className="text-[10px] text-text-muted">Carbos</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-text">{totals.fat}g</p>
                <p className="text-[10px] text-text-muted">Grasas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meals List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-muted">
              Comidas ({meals.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddMeal(true)}
              className="border-primary/50 text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar comida
            </Button>
          </div>

          {meals.length === 0 ? (
            <Card className="bg-surface/50 border-dashed border-border">
              <CardContent className="p-8 text-center">
                <UtensilsCrossed className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  Agregá comidas al plan para empezar
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {meals.map((meal, index) => {
                const IconComponent = getMealIcon(meal.icon);
                const isExpanded = expandedMealId === meal.id;
                const mealTotals = getMealTotals(meal);

                return (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={cn(
                        "bg-surface/80 border-border overflow-hidden transition-all",
                        isExpanded && "ring-1 ring-primary/50"
                      )}
                    >
                      <CardContent className="p-0">
                        {/* Meal Header */}
                        <div
                          className="p-4 flex items-center gap-3 cursor-pointer"
                          onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-text-muted" />
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                              <IconComponent className="w-5 h-5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-text">{meal.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-text-muted flex items-center gap-1">
                                <Flame className="w-3 h-3 text-orange-400" />
                                {Math.round(mealTotals.calories)} kcal
                              </span>
                              <span className="text-xs text-text-muted">
                                {meal.foods.length} items
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMeal(meal.id);
                            }}
                            className="shrink-0 text-error hover:text-error hover:bg-error/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-text-muted" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-text-muted" />
                          )}
                        </div>

                        {/* Foods - Expandable */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-border"
                            >
                              <div className="p-3 space-y-2 bg-background/30">
                                {meal.foods.length === 0 ? (
                                  <p className="text-center text-sm text-text-muted py-4">
                                    Sin alimentos
                                  </p>
                                ) : (
                                  meal.foods.map((food) => (
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
                                      <div className="text-right mr-2">
                                        <p className="text-sm font-semibold text-text">
                                          {food.calories} kcal
                                        </p>
                                        <p className="text-[10px] text-text-muted">
                                          P:{food.protein}g C:{food.carbs}g G:{food.fat}g
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 w-8 h-8 text-error hover:text-error"
                                        onClick={() => handleDeleteFood(meal.id, food.id)}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-2 border-dashed"
                                  onClick={() => handleOpenAddFood(meal.id)}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Agregar alimento
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Meal Dialog */}
      <Dialog open={showAddMeal} onOpenChange={setShowAddMeal}>
        <DialogContent className="bg-surface border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva comida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Ej: Desayuno, Almuerzo, Cena..."
                value={newMealName}
                onChange={(e) => setNewMealName(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Ícono</Label>
              <div className="flex flex-wrap gap-2">
                {MEAL_ICONS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      type="button"
                      variant={newMealIcon === item.id ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "gap-1",
                        newMealIcon === item.id && "bg-primary text-black"
                      )}
                      onClick={() => setNewMealIcon(item.id)}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs">{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddMeal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMeal} className="bg-primary text-black">
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Food Dialog - Busca del catálogo del coach */}
      <Dialog open={showAddFood} onOpenChange={setShowAddFood}>
        <DialogContent className="bg-surface border-border max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Agregar alimento</DialogTitle>
          </DialogHeader>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Buscar en tu catálogo..."
              value={foodSearchQuery}
              onChange={(e) => setFoodSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>

          {/* Food List from Catalog */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[300px]">
            {catalogLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                <p className="text-sm text-text-muted">Cargando catálogo...</p>
              </div>
            ) : catalogFoods.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-text-muted">Tu catálogo de alimentos está vacío</p>
                <Button
                  size="sm"
                  onClick={handleInitializeCatalog}
                  disabled={initializingCatalog}
                  className="bg-primary text-black"
                >
                  {initializingCatalog ? "Creando..." : "Cargar alimentos base"}
                </Button>
                <p className="text-xs text-text-muted">
                  O andá a <span className="text-primary">Perfil → Alimentos</span> para crear los tuyos
                </p>
              </div>
            ) : filteredCatalogFoods.length === 0 ? (
              <p className="text-center text-sm text-text-muted py-8">
                No se encontraron alimentos con "{foodSearchQuery}"
              </p>
            ) : (
              filteredCatalogFoods.map((food) => (
                <div
                  key={food.id}
                  onClick={() => handleSelectCatalogFood(food)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all",
                    selectedCatalogFood?.id === food.id
                      ? "bg-primary/20 ring-1 ring-primary"
                      : "bg-background/50 hover:bg-background"
                  )}
                >
                  <p className="font-medium text-text text-sm">{food.name}</p>
                  <p className="text-xs text-text-muted">
                    Por 100g: {food.caloriesPer100g} kcal | P:{food.proteinPer100g}g C:{food.carbsPer100g}g G:{food.fatPer100g}g
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Quantity when food selected */}
          {selectedCatalogFood && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-medium text-text">
                {selectedCatalogFood.name}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Cantidad</Label>
                  <Input
                    type="number"
                    value={foodQuantity}
                    onChange={(e) => setFoodQuantity(e.target.value)}
                    placeholder="100"
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unidad</Label>
                  <Select value={foodUnit} onValueChange={setFoodUnit}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-border">
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <p className="text-sm text-text">
                  <span className="font-bold text-primary">
                    {Math.round(selectedCatalogFood.caloriesPer100g * (parseFloat(foodQuantity) || 0) / 100)}
                  </span> kcal |
                  P:{Math.round(selectedCatalogFood.proteinPer100g * (parseFloat(foodQuantity) || 0) / 100 * 10) / 10}g
                  C:{Math.round(selectedCatalogFood.carbsPer100g * (parseFloat(foodQuantity) || 0) / 100 * 10) / 10}g
                  G:{Math.round(selectedCatalogFood.fatPer100g * (parseFloat(foodQuantity) || 0) / 100 * 10) / 10}g
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddFood(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddFood} 
              className="bg-primary text-black"
              disabled={!selectedCatalogFood || !foodQuantity || parseFloat(foodQuantity) <= 0}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

