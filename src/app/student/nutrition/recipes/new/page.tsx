"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { searchFoods, createRecipe } from "@/lib/api/nutrition";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Trash2,
  X,
  Save,
  Flame,
  ChefHat,
} from "lucide-react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";

interface Ingredient {
  foodItemId: number;
  name: string;
  quantity: number;
  // Original values per 100g for recalculation
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  // Calculated values for display
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodItem {
  id: number;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export default function NewRecipePage() {
  const router = useRouter();
  const { student } = useAuthStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState(1);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search foods
  const debouncedSearch = useDebouncedCallback(async (query: string) => {
    if (!student?.id || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await searchFoods(student.id, query);
      const items = response?.value || response || [];
      setSearchResults(items.map((item: any) => ({
        id: item.id,
        name: item.name,
        caloriesPer100g: parseFloat(item.caloriesPer100g) || 0,
        proteinPer100g: parseFloat(item.proteinPer100g) || 0,
        carbsPer100g: parseFloat(item.carbsPer100g) || 0,
        fatPer100g: parseFloat(item.fatPer100g) || 0,
      })));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const addIngredient = (food: FoodItem) => {
    const quantity = 100; // Default 100g
    const multiplier = quantity / 100;

    const newIngredient: Ingredient = {
      foodItemId: food.id,
      name: food.name,
      quantity,
      // Store original per100g values
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      // Calculated values
      calories: Math.round(food.caloriesPer100g * multiplier),
      protein: Math.round(food.proteinPer100g * multiplier * 10) / 10,
      carbs: Math.round(food.carbsPer100g * multiplier * 10) / 10,
      fat: Math.round(food.fatPer100g * multiplier * 10) / 10,
    };

    setIngredients([...ingredients, newIngredient]);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const updateIngredientQuantity = (index: number, quantity: number) => {
    const updated = [...ingredients];
    const ingredient = updated[index];
    
    // If quantity is 0 (user is typing), just update the quantity display
    if (quantity === 0 || isNaN(quantity)) {
      updated[index] = { 
        ...ingredient, 
        quantity: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      setIngredients(updated);
      return;
    }
    
    // Recalculate with new quantity using original per100g values
    const multiplier = quantity / 100;
    const calPer100 = ingredient.caloriesPer100g || 0;
    const protPer100 = ingredient.proteinPer100g || 0;
    const carbsPer100 = ingredient.carbsPer100g || 0;
    const fatPer100 = ingredient.fatPer100g || 0;
    
    updated[index] = {
      ...ingredient,
      quantity,
      calories: Math.round(calPer100 * multiplier) || 0,
      protein: Math.round(protPer100 * multiplier * 10) / 10 || 0,
      carbs: Math.round(carbsPer100 * multiplier * 10) / 10 || 0,
      fat: Math.round(fatPer100 * multiplier * 10) / 10 || 0,
    };

    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totals = ingredients.reduce(
    (acc, ing) => ({
      grams: acc.grams + (ing.quantity || 0),
      calories: acc.calories + (ing.calories || 0),
      protein: acc.protein + (ing.protein || 0),
      carbs: acc.carbs + (ing.carbs || 0),
      fat: acc.fat + (ing.fat || 0),
    }),
    { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Per 100g - ensure no NaN
  const per100g = totals.grams > 0 ? {
    calories: Math.round((totals.calories / totals.grams) * 100) || 0,
    protein: Math.round((totals.protein / totals.grams) * 100 * 10) / 10 || 0,
    carbs: Math.round((totals.carbs / totals.grams) * 100 * 10) / 10 || 0,
    fat: Math.round((totals.fat / totals.grams) * 100 * 10) / 10 || 0,
  } : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const handleSave = async () => {
    if (!student?.id) return;

    if (!name.trim()) {
      toast.error("Ingresá un nombre para la receta");
      return;
    }

    if (ingredients.length === 0) {
      toast.error("Agregá al menos un ingrediente");
      return;
    }

    setSaving(true);
    try {
      await createRecipe(student.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        ingredients: ingredients.map((ing) => ({
          foodItemId: ing.foodItemId,
          quantityGrams: ing.quantity,
        })),
      });

      toast.success("¡Receta creada! 🍳");
      router.push("/student/nutrition/recipes");
    } catch (error) {
      console.error("Error creating recipe:", error);
      toast.error("Error al crear la receta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Nueva Receta" backHref="/student/nutrition/recipes" />

      <div className="px-4 py-4 space-y-4">
        {/* Recipe Info */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-text-muted">Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Arroz con pollo"
                className="bg-background border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-text-muted">Descripción (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe tu receta..."
                className="bg-background border-border mt-1 resize-none"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-text-muted">Porciones</Label>
              <Input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                className="bg-background border-border mt-1 w-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">Ingredientes</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSearch(true)}
                className="border-primary text-primary"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>

            {ingredients.length === 0 ? (
              <div className="text-center py-6">
                <ChefHat className="w-12 h-12 text-text-muted mx-auto mb-2" />
                <p className="text-text-muted text-sm">
                  Agregá ingredientes a tu receta
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-3 bg-background/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text text-sm truncate">
                        {ingredient.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {ingredient.calories || 0} kcal · P:{ingredient.protein || 0}g · C:{ingredient.carbs || 0}g · G:{ingredient.fat || 0}g
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={ingredient.quantity || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow empty or numeric values
                          if (val === "" || /^\d+$/.test(val)) {
                            updateIngredientQuantity(index, val === "" ? 0 : parseInt(val));
                          }
                        }}
                        onBlur={(e) => {
                          // On blur, ensure minimum value of 1
                          const val = parseInt(e.target.value) || 100;
                          updateIngredientQuantity(index, Math.max(1, val));
                        }}
                        className="w-20 h-8 text-center text-sm bg-surface border-border"
                      />
                      <span className="text-xs text-text-muted">g</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeIngredient(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        {ingredients.length > 0 && (
          <Card className="bg-gradient-to-br from-primary/10 to-surface border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-semibold text-text mb-3">Valores por 100g</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-background/50 rounded-lg">
                  <Flame className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                  <p className="font-bold text-text">{per100g.calories}</p>
                  <p className="text-xs text-text-muted">kcal</p>
                </div>
                <div className="p-2 bg-background/50 rounded-lg">
                  <p className="text-lg">🥩</p>
                  <p className="font-bold text-text">{per100g.protein}g</p>
                  <p className="text-xs text-text-muted">prot</p>
                </div>
                <div className="p-2 bg-background/50 rounded-lg">
                  <p className="text-lg">🌾</p>
                  <p className="font-bold text-text">{per100g.carbs}g</p>
                  <p className="text-xs text-text-muted">carbs</p>
                </div>
                <div className="p-2 bg-background/50 rounded-lg">
                  <p className="text-lg">💧</p>
                  <p className="font-bold text-text">{per100g.fat}g</p>
                  <p className="text-xs text-text-muted">grasas</p>
                </div>
              </div>
              <p className="text-center text-sm text-text-muted mt-3">
                Total: {totals.grams}g | {totals.calories} kcal
              </p>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <Button
          className="w-full h-14 bg-gradient-to-r from-success to-green-500 text-white font-semibold text-lg rounded-xl shadow-lg shadow-success/20"
          disabled={saving || !name.trim() || ingredients.length === 0}
          onClick={handleSave}
        >
          {saving ? (
            "Guardando..."
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Guardar Receta
            </>
          )}
        </Button>
      </div>

      {/* Search Modal - Full Page */}
      {showSearch && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          className="fixed inset-0 bg-background z-50"
        >
          <PageHeader
            title="Agregar Ingrediente"
            showBack
            onBack={() => {
              setShowSearch(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
          />
          <div className="px-4 py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar alimento..."
                className="pl-10 bg-surface border-border"
                autoFocus
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              )}
            </div>

            {searching ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-surface/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((food) => (
                  <div
                    key={food.id}
                    className="p-4 bg-surface/80 rounded-xl border border-border cursor-pointer hover:border-primary/50"
                    onClick={() => addIngredient(food)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text">{food.name}</p>
                        <p className="text-sm text-text-muted">
                          100g · {Math.round(food.caloriesPer100g)} kcal
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="text-center py-8">
                <p className="text-text-muted">No se encontraron alimentos</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-text-muted">Escribí al menos 2 letras para buscar</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

