"use client";

import { PageHeader } from "@/components/navigation/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addFoodLog, getMealTypes, searchFoods, getRecipes } from "@/lib/api/nutrition";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useNutritionStore } from "@/stores/nutrition-store";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  Flame,
  Minus,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";

interface FoodItem {
  id: number;
  name: string;
  brand?: string;
  category?: string;
  portionGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformFoodItem = (item: any): FoodItem => {
  const portion = item.portionGrams || 100;
  const multiplier = portion / 100;
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    category: item.category,
    portionGrams: portion,
    caloriesPer100g: parseFloat(item.caloriesPer100g) || 0,
    proteinPer100g: parseFloat(item.proteinPer100g) || 0,
    carbsPer100g: parseFloat(item.carbsPer100g) || 0,
    fatPer100g: parseFloat(item.fatPer100g) || 0,
    servingSize: portion,
    servingUnit: "g",
    calories: Math.round((parseFloat(item.caloriesPer100g) || 0) * multiplier),
    protein: Math.round((parseFloat(item.proteinPer100g) || 0) * multiplier * 10) / 10,
    carbs: Math.round((parseFloat(item.carbsPer100g) || 0) * multiplier * 10) / 10,
    fat: Math.round((parseFloat(item.fatPer100g) || 0) * multiplier * 10) / 10,
  };
};

interface MealType {
  id: string;
  name: string;
  icon: string;
}

const DEFAULT_MEAL_TYPES: MealType[] = [
  { id: "1", name: "Desayuno", icon: "🌅" },
  { id: "2", name: "Media Mañana", icon: "☕" },
  { id: "3", name: "Almuerzo", icon: "☀️" },
  { id: "4", name: "Merienda", icon: "🍎" },
  { id: "5", name: "Cena", icon: "🌙" },
  { id: "6", name: "Pre-entreno", icon: "💪" },
  { id: "7", name: "Post-entreno", icon: "🥤" },
];

export default function AddFoodPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { student } = useAuthStore();
  const { recentFoods, addRecentFood, getFromSearchCache, addToSearchCache } = useNutritionStore();

  // States
  const [step, setStep] = useState<"search" | "quantity">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [mealTypes, setMealTypes] = useState<MealType[]>(DEFAULT_MEAL_TYPES);
  const [selectedMeal, setSelectedMeal] = useState(
    searchParams.get("meal") || "3" // Default to Almuerzo
  );
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [showMealPage, setShowMealPage] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [grams, setGrams] = useState(100); // Input in grams
  const [saving, setSaving] = useState(false);
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const [showAllFoods, setShowAllFoods] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [showRecipes, setShowRecipes] = useState(false);

  // Get selected meal info
  const selectedMealInfo = mealTypes.find((m) => m.id === selectedMeal) || mealTypes[2];

  useEffect(() => {
    const loadMealTypes = async () => {
      if (!student?.id) return;
      try {
        const types = await getMealTypes(student.id);
        if (types?.length) setMealTypes(types);
      } catch {
        // Use defaults
      }
    };
    loadMealTypes();
  }, [student?.id]);

  const debouncedSearch = useDebouncedCallback(async (query: string) => {
    if (!student?.id || query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Check cache first
    const cached = getFromSearchCache(query);
    if (cached) {
      console.log("[Nutrition] Using cached results for:", query);
      setSearchResults(cached.map(c => ({
        ...c,
        servingSize: c.portionGrams,
        servingUnit: "g",
        caloriesPer100g: (c.calories / c.portionGrams) * 100,
        proteinPer100g: (c.protein / c.portionGrams) * 100,
        carbsPer100g: (c.carbs / c.portionGrams) * 100,
        fatPer100g: (c.fat / c.portionGrams) * 100,
      })));
      return;
    }

    setSearching(true);
    try {
      const response = await searchFoods(student.id, query);
      const items = response?.value || response || [];
      const transformed = items.map(transformFoodItem);
      setSearchResults(transformed);
      
      // Cache results
      addToSearchCache(query, transformed.map((t: any) => ({
        id: t.id,
        name: t.name,
        calories: t.calories,
        protein: t.protein,
        carbs: t.carbs,
        fat: t.fat,
        portionGrams: t.portionGrams,
        usedAt: Date.now(),
      })));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowAllFoods(false);
    debouncedSearch(value);
  };

  const loadAllFoods = async () => {
    if (!student?.id) return;
    
    // If already loaded, just show
    if (allFoods.length > 0) {
      setShowAllFoods(true);
      setShowRecipes(false);
      return;
    }
    
    setLoadingAll(true);
    try {
      // Search with empty string or '*' to get all foods
      const response = await searchFoods(student.id, "");
      const items = response?.value || response || [];
      const transformed = items.map(transformFoodItem);
      setAllFoods(transformed);
      setShowAllFoods(true);
      setShowRecipes(false);
    } catch {
      toast.error("Error al cargar alimentos");
    } finally {
      setLoadingAll(false);
    }
  };

  const loadRecipes = async () => {
    if (!student?.id) return;
    
    // If already loaded, just show
    if (recipes.length > 0) {
      setShowRecipes(true);
      setShowAllFoods(false);
      return;
    }
    
    setLoadingAll(true);
    try {
      const response = await getRecipes(student.id);
      const items = response?.value || response || [];
      setRecipes(items);
      setShowRecipes(true);
      setShowAllFoods(false);
    } catch {
      toast.error("Error al cargar recetas");
    } finally {
      setLoadingAll(false);
    }
  };

  const handleSelectRecipe = (recipe: any) => {
    // Transform recipe to food item format
    const foodItem: FoodItem = {
      id: recipe.id,
      name: recipe.name,
      portionGrams: recipe.totalGrams || 100,
      caloriesPer100g: recipe.caloriesPer100g || 0,
      proteinPer100g: recipe.proteinPer100g || 0,
      carbsPer100g: recipe.carbsPer100g || 0,
      fatPer100g: recipe.fatPer100g || 0,
      servingSize: recipe.totalGrams || 100,
      servingUnit: "g",
      calories: Math.round((recipe.caloriesPer100g || 0) * (recipe.totalGrams || 100) / 100),
      protein: Math.round((recipe.proteinPer100g || 0) * (recipe.totalGrams || 100) / 100 * 10) / 10,
      carbs: Math.round((recipe.carbsPer100g || 0) * (recipe.totalGrams || 100) / 100 * 10) / 10,
      fat: Math.round((recipe.fatPer100g || 0) * (recipe.totalGrams || 100) / 100 * 10) / 10,
    };
    setSelectedFood(foodItem);
    setSelectedRecipeId(recipe.id);
    setGrams(recipe.totalGrams || 100);
    setStep("quantity");
  };

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setSelectedRecipeId(null); // Reset recipe id
    setGrams(food.portionGrams); // Default to one portion
    setStep("quantity");
  };

  const handleAddFood = async () => {
    if (!student?.id || !selectedFood) return;

    if (grams <= 0) {
      toast.error("Ingresá una cantidad válida");
      return;
    }

    setSaving(true);
    try {
      // Send recipeId or foodItemId depending on selection
      const logData: {
        foodItemId?: number;
        recipeId?: number;
        quantityGrams: number;
        mealTypeId: number;
      } = {
        quantityGrams: grams,
        mealTypeId: parseInt(selectedMeal),
      };

      if (selectedRecipeId) {
        logData.recipeId = selectedRecipeId;
      } else {
        logData.foodItemId = selectedFood.id;
      }

      await addFoodLog(student.id, logData);
      
      // Save to recents (only for regular foods, not recipes)
      if (!selectedRecipeId) {
        addRecentFood({
          id: selectedFood.id,
          name: selectedFood.name,
          calories: selectedFood.calories,
          protein: selectedFood.protein,
          carbs: selectedFood.carbs,
          fat: selectedFood.fat,
          portionGrams: selectedFood.portionGrams,
          usedAt: Date.now(),
        });
      }
      
      toast.success(`✓ ${selectedFood.name} agregado`);
      router.push("/student/nutrition");
    } catch {
      toast.error("Error al agregar");
    } finally {
      setSaving(false);
    }
  };

  // Calculated values based on grams
  const calculatedMacros = selectedFood
    ? {
        calories: Math.round((selectedFood.caloriesPer100g / 100) * grams),
        protein: Math.round((selectedFood.proteinPer100g / 100) * grams * 10) / 10,
        carbs: Math.round((selectedFood.carbsPer100g / 100) * grams * 10) / 10,
        fat: Math.round((selectedFood.fatPer100g / 100) * grams * 10) / 10,
        grams: grams,
      }
    : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        title={step === "search" ? "Agregar comida" : selectedFood?.name || "Cantidad"} 
        backHref="/student/nutrition"
        onBack={step === "quantity" ? () => setStep("search") : undefined}
      />

      <AnimatePresence mode="wait">
        {step === "search" ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 py-4 space-y-4"
          >
            {/* Meal Selector - Compact */}
            <div 
              className="flex items-center justify-between p-3 bg-surface/80 rounded-xl border border-border cursor-pointer"
              onClick={() => setShowMealPage(true)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedMealInfo.icon}</span>
                <div>
                  <p className="text-xs text-text-muted">Agregar a</p>
                  <p className="font-semibold text-text">{selectedMealInfo.name}</p>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-text-muted" />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="¿Qué comiste?"
                className="pl-12 pr-4 h-14 bg-surface border-border text-base rounded-xl"
                autoFocus
              />
              {searchQuery && (
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              )}
            </div>

            {/* Quick Actions - Only when not searching */}
            {!searchQuery && (
              <div className="space-y-3">
                {/* Recent Foods - Real from store */}
                {recentFoods.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-text-muted">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Recientes</span>
                    </div>
                    <div className="space-y-2">
                      {recentFoods.slice(0, 5).map((food) => (
                        <div
                          key={food.id}
                          className="p-3 bg-surface/80 rounded-xl border border-border cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-between"
                          onClick={() => {
                            const fullFood: FoodItem = {
                              id: food.id,
                              name: food.name,
                              portionGrams: food.portionGrams,
                              calories: food.calories,
                              protein: food.protein,
                              carbs: food.carbs,
                              fat: food.fat,
                              servingSize: food.portionGrams,
                              servingUnit: "g",
                              caloriesPer100g: (food.calories / food.portionGrams) * 100,
                              proteinPer100g: (food.protein / food.portionGrams) * 100,
                              carbsPer100g: (food.carbs / food.portionGrams) * 100,
                              fatPer100g: (food.fat / food.portionGrams) * 100,
                            };
                            handleSelectFood(fullFood);
                          }}
                        >
                          <div>
                            <p className="font-medium text-text text-sm">{food.name}</p>
                            <p className="text-xs text-text-muted">
                              {food.portionGrams}g · {food.calories} kcal
                            </p>
                          </div>
                          <Plus className="w-5 h-5 text-primary" />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Actions Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Card 
                    className="bg-surface/80 border-border cursor-pointer hover:bg-surface transition-colors"
                    onClick={loadAllFoods}
                  >
                    <CardContent className="p-3 flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Search className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-xs font-medium text-text text-center">Alimentos</span>
                    </CardContent>
                  </Card>
                  <Card 
                    className="bg-surface/80 border-border cursor-pointer hover:bg-surface transition-colors"
                    onClick={loadRecipes}
                  >
                    <CardContent className="p-3 flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <ChefHat className="w-5 h-5 text-purple-400" />
                      </div>
                      <span className="text-xs font-medium text-text text-center">Recetas</span>
                    </CardContent>
                  </Card>
                  <Card 
                    className="bg-surface/80 border-border cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => router.push("/student/nutrition/create-food")}
                  >
                    <CardContent className="p-3 flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-text text-center">Crear</span>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* All Foods List */}
            {showAllFoods && !searchQuery && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-muted">
                    {allFoods.length} alimentos disponibles
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllFoods(false)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cerrar
                  </Button>
                </div>
                {loadingAll ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 bg-surface/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pb-20">
                    {allFoods.map((food) => (
                      <motion.div
                        key={food.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-surface/80 rounded-xl border border-border cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => handleSelectFood(food)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text truncate">{food.name}</p>
                            <p className="text-sm text-text-muted">
                              {food.servingSize}g · <span className="text-orange-400">{food.calories} kcal</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-xs">
                              <span className="text-red-400">P:{food.protein}g</span>
                              <span className="text-text-muted mx-1">·</span>
                              <span className="text-amber-400">C:{food.carbs}g</span>
                              <span className="text-text-muted mx-1">·</span>
                              <span className="text-blue-400">G:{food.fat}g</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recipes List */}
            {showRecipes && !searchQuery && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-muted">
                    <ChefHat className="w-4 h-4 inline mr-1" />
                    {recipes.length} recetas
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRecipes(false)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cerrar
                  </Button>
                </div>
                {loadingAll ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-surface/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : recipes.length === 0 ? (
                  <Card className="bg-surface/80 border-border">
                    <CardContent className="p-6 text-center">
                      <ChefHat className="w-10 h-10 text-text-muted mx-auto mb-2" />
                      <p className="text-text-muted text-sm mb-3">No tenés recetas</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary"
                        onClick={() => router.push("/student/nutrition/recipes/new")}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Crear receta
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pb-20">
                    {recipes.map((recipe) => (
                      <motion.div
                        key={recipe.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-surface/80 rounded-xl border border-purple-500/30 cursor-pointer hover:border-purple-500/60 transition-colors"
                        onClick={() => handleSelectRecipe(recipe)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <ChefHat className="w-4 h-4 text-purple-400 shrink-0" />
                              <p className="font-medium text-text truncate">{recipe.name}</p>
                            </div>
                            <p className="text-sm text-text-muted">
                              {recipe.totalGrams}g · <span className="text-orange-400">{Math.round(recipe.caloriesPer100g * recipe.totalGrams / 100)} kcal</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-xs">
                              <span className="text-red-400">P:{Math.round(recipe.proteinPer100g)}g</span>
                              <span className="text-text-muted mx-1">·</span>
                              <span className="text-amber-400">C:{Math.round(recipe.carbsPer100g)}g</span>
                              <span className="text-text-muted mx-1">·</span>
                              <span className="text-blue-400">G:{Math.round(recipe.fatPer100g)}g</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Results */}
            {searchQuery && (
              <div className="space-y-2">
                {searching ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-surface/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  <Card className="bg-surface/80 border-border">
                    <CardContent className="p-6 text-center">
                      <Sparkles className="w-10 h-10 text-text-muted mx-auto mb-3" />
                      <p className="text-text-muted mb-3">No encontramos &quot;{searchQuery}&quot;</p>
                      <Button
                        variant="outline"
                        className="text-primary border-primary"
                        onClick={() => router.push("/student/nutrition/create-food")}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Crear alimento
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((food) => (
                      <motion.div
                        key={food.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-surface/80 rounded-xl border border-border cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => handleSelectFood(food)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text truncate">{food.name}</p>
                            <p className="text-sm text-text-muted">
                              {food.servingSize}g · <span className="text-orange-400">{food.calories} kcal</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-xs">
                              <span className="text-red-400">P:{food.protein}g</span>
                              <span className="text-text-muted mx-1">·</span>
                              <span className="text-amber-400">C:{food.carbs}g</span>
                              <span className="text-text-muted mx-1">·</span>
                              <span className="text-blue-400">G:{food.fat}g</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          // Quantity Step
          <motion.div
            key="quantity"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-4 py-4 space-y-6"
          >
            {selectedFood && calculatedMacros && (
              <>
                {/* Food Info */}
                <Card className="bg-gradient-to-br from-primary/10 to-surface border-primary/20">
                  <CardContent className="p-4">
                    <div className="text-center mb-4">
                      <p className="text-sm text-text-muted">{selectedMealInfo.icon} {selectedMealInfo.name}</p>
                    </div>

                    {/* Grams Input */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full border-2"
                        onClick={() => setGrams(Math.max(10, grams - 10))}
                        disabled={grams <= 10}
                      >
                        <Minus className="w-5 h-5" />
                      </Button>
                      
                      <div className="relative">
                        <Input
                          type="number"
                          value={grams}
                          onChange={(e) => setGrams(Math.max(0, parseInt(e.target.value) || 0))}
                          className="text-center text-3xl font-bold h-16 w-32 bg-background/50 border-2 border-primary/30 rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted font-medium">g</span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full border-2"
                        onClick={() => setGrams(grams + 10)}
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>

                    {/* Quick Grams - Common portions */}
                    <div className="flex gap-2 justify-center mb-4 flex-wrap">
                      {[50, 100, 150, 200, 250].map((g) => (
                        <Button
                          key={g}
                          variant={grams === g ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "rounded-full text-xs px-3",
                            grams === g && "bg-primary text-black"
                          )}
                          onClick={() => setGrams(g)}
                        >
                          {g}g
                        </Button>
                      ))}
                    </div>

                    {/* Portion Reference */}
                    <p className="text-xs text-text-muted text-center mb-4">
                      1 porción = {selectedFood.portionGrams}g
                    </p>

                    {/* Macros Display */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-3 bg-background/50 rounded-xl">
                        <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                        <p className="text-xl font-bold text-text">{calculatedMacros.calories}</p>
                        <p className="text-xs text-text-muted">kcal</p>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-xl">
                        <div className="w-5 h-5 mx-auto text-red-400 mb-1 text-lg">🥩</div>
                        <p className="text-xl font-bold text-text">{calculatedMacros.protein}</p>
                        <p className="text-xs text-text-muted">prot</p>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-xl">
                        <div className="w-5 h-5 mx-auto text-amber-400 mb-1 text-lg">🌾</div>
                        <p className="text-xl font-bold text-text">{calculatedMacros.carbs}</p>
                        <p className="text-xs text-text-muted">carbs</p>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-xl">
                        <div className="w-5 h-5 mx-auto text-blue-400 mb-1 text-lg">💧</div>
                        <p className="text-xl font-bold text-text">{calculatedMacros.fat}</p>
                        <p className="text-xs text-text-muted">grasas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Add Button */}
                <Button
                  className="w-full h-14 bg-gradient-to-r from-success to-green-500 text-white font-semibold text-lg rounded-xl shadow-lg shadow-success/20"
                  disabled={saving || grams <= 0}
                  onClick={handleAddFood}
                >
                  {saving ? (
                    "Agregando..."
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Agregar {grams}g ({calculatedMacros.calories} kcal)
                    </>
                  )}
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meal Type Selector - Full Page for PWA */}
      <AnimatePresence>
        {showMealPage && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed inset-0 bg-background z-50"
          >
            <PageHeader 
              title="Seleccionar comida" 
              showBack
              onBack={() => setShowMealPage(false)}
            />
            <div className="px-4 py-4 space-y-2 overflow-y-auto h-[calc(100vh-56px)]">
              {mealTypes.map((meal) => (
                <button
                  key={meal.id}
                  className={cn(
                    "w-full p-4 rounded-xl flex items-center gap-3 transition-colors",
                    selectedMeal === meal.id
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-surface/80 border border-border"
                  )}
                  onClick={() => {
                    setSelectedMeal(meal.id);
                    setShowMealPage(false);
                  }}
                >
                  <span className="text-3xl">{meal.icon}</span>
                  <span className="font-medium text-text text-lg">{meal.name}</span>
                  {selectedMeal === meal.id && (
                    <Check className="w-6 h-6 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
