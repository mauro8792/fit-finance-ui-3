"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  Check,
  Cloud,
  CloudOff,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createMealPlanTemplate, updateMealPlanTemplate } from "@/lib/api/meal-plan";
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

// El catálogo de alimentos se carga del backend

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

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function CreateMealPlanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Draft tracking
  const [draftId, setDraftId] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Add/Edit food dialog - busca del catálogo
  const [showAddFood, setShowAddFood] = useState(false);
  const [addFoodToMealId, setAddFoodToMealId] = useState<string | null>(null);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [selectedCatalogFood, setSelectedCatalogFood] = useState<CatalogFoodItem | null>(null);
  const [foodQuantity, setFoodQuantity] = useState("100");
  const [foodUnit, setFoodUnit] = useState("g");
  
  // Catálogo de alimentos cargado del backend
  const [catalogFoods, setCatalogFoods] = useState<CatalogFoodItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [initializingCatalog, setInitializingCatalog] = useState(false);

  // Cargar catálogo de alimentos al montar
  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const foods = await getCoachFoodItems();
      setCatalogFoods(foods);
    } catch (error) {
      console.error("Error cargando catálogo:", error);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Inicializar catálogo con alimentos base
  const handleInitializeCatalog = async () => {
    setInitializingCatalog(true);
    try {
      const result = await initializeCoachCatalog();
      toast.success(`Se crearon ${result.created} alimentos en tu catálogo`);
      await loadCatalog();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al inicializar catálogo");
    } finally {
      setInitializingCatalog(false);
    }
  };

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

  // Mark as having unsaved changes
  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Auto-save as draft
  const autoSave = useCallback(async () => {
    if (!planName.trim()) return;
    
    setSaving(true);
    try {
      const payload = {
        name: planName || "Sin nombre",
        objective: objective || "maintenance",
        status: "draft" as const,
        meals: meals.map((m, idx) => ({
          name: m.name,
          icon: m.icon,
          order: idx + 1,
          foods: m.foods.map((f) => ({
            name: f.name,
            quantity: f.quantity,
            unit: f.unit,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
          })),
        })),
      };

      if (draftId) {
        await updateMealPlanTemplate(draftId, payload);
      } else {
        const created = await createMealPlanTemplate(payload);
        setDraftId(created.id);
      }
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error en auto-guardado:", error);
    } finally {
      setSaving(false);
    }
  }, [planName, objective, meals, draftId]);

  // Trigger auto-save after changes (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges || !planName.trim()) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 2000); // Auto-save después de 2 segundos de inactividad

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, autoSave, planName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

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
    markUnsaved();
  };

  const handleDeleteMeal = (mealId: string) => {
    setMeals(meals.filter((m) => m.id !== mealId));
    if (expandedMealId === mealId) {
      setExpandedMealId(null);
    }
    markUnsaved();
  };

  const handleOpenAddFood = (mealId: string, foodToEdit?: FoodItem) => {
    setAddFoodToMealId(mealId);
    setFoodSearchQuery("");
    
    if (foodToEdit) {
      // Modo edición: cargar datos del alimento
      setEditingFood(foodToEdit);
      setFoodQuantity(foodToEdit.quantity.toString());
      setFoodUnit(foodToEdit.unit);
      // Buscar en el catálogo por nombre
      const catalogFood = catalogFoods.find(f => f.name === foodToEdit.name);
      setSelectedCatalogFood(catalogFood || null);
      setFoodSearchQuery(foodToEdit.name);
    } else {
      // Modo agregar
      setEditingFood(null);
      setSelectedCatalogFood(null);
      setFoodQuantity("100");
      setFoodUnit("g");
    }
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

    const qty = parseFloat(foodQuantity) || 0;
    const factor = qty / 100;
    const food: FoodItem = {
      id: editingFood?.id || generateId(),
      name: selectedCatalogFood.name,
      quantity: qty,
      unit: foodUnit,
      calories: Math.round(selectedCatalogFood.caloriesPer100g * factor),
      protein: Math.round(selectedCatalogFood.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(selectedCatalogFood.carbsPer100g * factor * 10) / 10,
      fat: Math.round(selectedCatalogFood.fatPer100g * factor * 10) / 10,
    };

    if (editingFood) {
      // Modo edición: reemplazar el alimento
      setMeals(
        meals.map((meal) =>
          meal.id === addFoodToMealId
            ? { ...meal, foods: meal.foods.map(f => f.id === editingFood.id ? food : f) }
            : meal
        )
      );
      toast.success("Alimento actualizado");
    } else {
      // Modo agregar
      setMeals(
        meals.map((meal) =>
          meal.id === addFoodToMealId
            ? { ...meal, foods: [...meal.foods, food] }
            : meal
        )
      );
    }

    setShowAddFood(false);
    setAddFoodToMealId(null);
    setSelectedCatalogFood(null);
    setEditingFood(null);
    markUnsaved();
  };

  const handleDeleteFood = (mealId: string, foodId: string) => {
    setMeals(
      meals.map((meal) =>
        meal.id === mealId
          ? { ...meal, foods: meal.foods.filter((f) => f.id !== foodId) }
          : meal
      )
    );
    markUnsaved();
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

    // Verificar que todas las comidas tengan al menos un alimento
    const emptyMeal = meals.find(m => m.foods.length === 0);
    if (emptyMeal) {
      toast.error(`La comida "${emptyMeal.name}" no tiene alimentos`);
      return;
    }

    setPublishing(true);
    try {
      const payload = {
        name: planName,
        objective: objective as "deficit" | "maintenance" | "surplus",
        status: "active" as const,
        meals: meals.map((m, idx) => ({
          name: m.name,
          icon: m.icon,
          order: idx + 1,
          foods: m.foods.map((f) => ({
            name: f.name,
            quantity: f.quantity,
            unit: f.unit,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
          })),
        })),
      };

      if (draftId) {
        await updateMealPlanTemplate(draftId, payload);
      } else {
        await createMealPlanTemplate(payload);
      }
      
      toast.success("Plan publicado correctamente ✓");
      router.push("/coach/meal-plans");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al publicar el plan");
    } finally {
      setPublishing(false);
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

  return (
    <div className="min-h-screen bg-background pb-32">
      <PageHeader
        title="Nueva Plantilla"
        backHref="/coach/meal-plans"
        rightContent={
          <div className="flex items-center gap-2">
            {/* Indicador de guardado */}
            {draftId && (
              <div className="flex items-center gap-1 text-xs text-text-muted">
                {saving ? (
                  <>
                    <Cloud className="w-3 h-3 animate-pulse" />
                    <span>Guardando...</span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <CloudOff className="w-3 h-3 text-warning" />
                    <span>Sin guardar</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3 text-success" />
                    <span>Guardado</span>
                  </>
                )}
              </div>
            )}
            <Button
              size="sm"
              className="bg-primary text-black font-medium"
              onClick={handleSave}
              disabled={publishing}
            >
              <Save className="w-4 h-4 mr-1" />
              {publishing ? "Publicando..." : "Publicar"}
            </Button>
          </div>
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
                onChange={(e) => {
                  setPlanName(e.target.value);
                  markUnsaved();
                }}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Select value={objective} onValueChange={(val) => {
                setObjective(val);
                markUnsaved();
              }}>
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
                                      className="flex items-center justify-between py-2 px-3 bg-surface/50 rounded-lg cursor-pointer hover:bg-surface/70 transition-colors group"
                                      onClick={() => handleOpenAddFood(meal.id, food)}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text truncate flex items-center gap-1">
                                          {food.name}
                                          <Edit3 className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteFood(meal.id, food.id);
                                        }}
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

      {/* Add/Edit Food Dialog - Busca del catálogo del coach */}
      <Dialog open={showAddFood} onOpenChange={(open) => {
        setShowAddFood(open);
        if (!open) {
          setEditingFood(null);
        }
      }}>
        <DialogContent className="bg-surface border-border max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingFood ? "Editar alimento" : "Agregar alimento"}</DialogTitle>
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
            <Button variant="ghost" onClick={() => {
              setShowAddFood(false);
              setEditingFood(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddFood} 
              className="bg-primary text-black"
              disabled={!selectedCatalogFood || !foodQuantity || parseFloat(foodQuantity) <= 0}
            >
              {editingFood ? "Guardar cambios" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
