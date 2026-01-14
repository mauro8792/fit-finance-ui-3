"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { getDailyFoodLog } from "@/lib/api/nutrition";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  Beef,
  Wheat,
  Droplets,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  Utensils,
  BookOpen,
  Loader2,
} from "lucide-react";
import { cn, formatDate, getTodayString } from "@/lib/utils";

// UI interface for dashboard
interface NutritionDashboard {
  calories: { current: number; target: number; percentage: number };
  protein: { current: number; target: number; percentage: number };
  carbs: { current: number; target: number; percentage: number };
  fat: { current: number; target: number; percentage: number };
}

interface FoodLogEntry {
  id: number;
  foodName?: string | { name: string };
  foodItem?: { 
    name: string; 
    brand?: string;
    caloriesPer100g?: string | number;
    proteinPer100g?: string | number;
    carbsPer100g?: string | number;
    fatPer100g?: string | number;
  };
  recipe?: {
    name: string;
    caloriesPer100g?: string | number;
    proteinPer100g?: string | number;
    carbsPer100g?: string | number;
    fatPer100g?: string | number;
  };
  mealType?: string | { name: string; id: number };
  mealTypeId?: number;
  quantity?: number | string;
  quantityGrams?: number | string;
  unit?: string;
  // Direct values from backend (as strings)
  calories?: number | string;
  protein?: number | string;
  carbs?: number | string;
  fat?: number | string;
  time?: string;
}

// Helper to get food name from entry
const getFoodName = (entry: FoodLogEntry): string => {
  if (entry.recipe?.name) return entry.recipe.name;
  if (entry.foodItem?.name) return entry.foodItem.name;
  if (typeof entry.foodName === "object" && entry.foodName?.name) return entry.foodName.name;
  if (typeof entry.foodName === "string") return entry.foodName;
  return "Alimento";
};

// Helper to parse number from string or number
const parseNum = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null) return 0;
  const num = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(num) ? 0 : num;
};

// Helper to get calories from entry
const getEntryCalories = (entry: FoodLogEntry): number => {
  // Try direct value first (backend sends as string)
  const direct = parseNum(entry.calories);
  if (direct > 0) return Math.round(direct);
  
  // Calculate from foodItem or recipe
  const grams = parseNum(entry.quantityGrams) || parseNum(entry.quantity) || 0;
  const per100g = parseNum(entry.foodItem?.caloriesPer100g) || parseNum(entry.recipe?.caloriesPer100g) || 0;
  return Math.round((per100g * grams) / 100);
};

// Helper to get protein from entry
const getEntryProtein = (entry: FoodLogEntry): number => {
  const direct = parseNum(entry.protein);
  if (direct > 0) return Math.round(direct * 10) / 10;
  
  const grams = parseNum(entry.quantityGrams) || parseNum(entry.quantity) || 0;
  const per100g = parseNum(entry.foodItem?.proteinPer100g) || parseNum(entry.recipe?.proteinPer100g) || 0;
  return Math.round((per100g * grams) / 100 * 10) / 10;
};

// Helper to get carbs from entry
const getEntryCarbs = (entry: FoodLogEntry): number => {
  const direct = parseNum(entry.carbs);
  if (direct > 0) return Math.round(direct * 10) / 10;
  
  const grams = parseNum(entry.quantityGrams) || parseNum(entry.quantity) || 0;
  const per100g = parseNum(entry.foodItem?.carbsPer100g) || parseNum(entry.recipe?.carbsPer100g) || 0;
  return Math.round((per100g * grams) / 100 * 10) / 10;
};

// Helper to get fat from entry
const getEntryFat = (entry: FoodLogEntry): number => {
  const direct = parseNum(entry.fat);
  if (direct > 0) return Math.round(direct * 10) / 10;
  
  const grams = parseNum(entry.quantityGrams) || parseNum(entry.quantity) || 0;
  const per100g = parseNum(entry.foodItem?.fatPer100g) || parseNum(entry.recipe?.fatPer100g) || 0;
  return Math.round((per100g * grams) / 100 * 10) / 10;
};

// Helper to get meal type key
const getMealTypeKey = (entry: FoodLogEntry): string => {
  if (typeof entry.mealType === "object" && entry.mealType?.id) return String(entry.mealType.id);
  if (typeof entry.mealType === "string") return entry.mealType;
  return "other";
};

// Helper to get meal type name for display
const getMealTypeName = (entry: FoodLogEntry): string => {
  if (typeof entry.mealType === "object" && entry.mealType?.name) return entry.mealType.name;
  if (typeof entry.mealType === "string") return MEAL_NAMES[entry.mealType] || entry.mealType;
  return "Otro";
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
  pre_workout: "💪",
  post_workout: "🥤",
};

const MEAL_NAMES: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
  pre_workout: "Pre-entreno",
  post_workout: "Post-entreno",
};

// Interface para el cache
interface CachedDayData {
  dashboard: NutritionDashboard | null;
  logs: FoodLogEntry[];
  timestamp: number;
}

export default function NutritionPage() {
  const router = useRouter();
  const { student } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [changingDay, setChangingDay] = useState(false);
  const [dashboard, setDashboard] = useState<NutritionDashboard | null>(null);
  const [todayLogs, setTodayLogs] = useState<FoodLogEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  // Cache de días consultados (5 min para día actual, sin expiración para días pasados)
  const daysCacheRef = useRef<Map<string, CachedDayData>>(new Map());

  const todayStr = getTodayString();
  const isToday = selectedDate === todayStr;

  // Verificar si el cache es válido
  const isCacheValid = useCallback((date: string): boolean => {
    const cached = daysCacheRef.current.get(date);
    if (!cached) return false;
    
    // Para el día actual, el cache expira en 2 minutos
    if (date === getTodayString()) {
      const twoMinutes = 2 * 60 * 1000;
      return Date.now() - cached.timestamp < twoMinutes;
    }
    
    // Para días pasados, el cache no expira (los datos no cambian)
    return true;
  }, []);

  // Navegación de días
  const goToPrevDay = () => {
    const current = new Date(selectedDate + "T12:00:00");
    current.setDate(current.getDate() - 1);
    const newDate = current.toISOString().split("T")[0];
    
    // Si hay cache válido, no mostrar spinner
    if (!isCacheValid(newDate)) {
      setChangingDay(true);
    }
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const current = new Date(selectedDate + "T12:00:00");
    current.setDate(current.getDate() + 1);
    const newDate = current.toISOString().split("T")[0];
    if (newDate <= todayStr) {
      // Si hay cache válido, no mostrar spinner
      if (!isCacheValid(newDate)) {
        setChangingDay(true);
      }
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    if (!isToday) {
      // Si hay cache válido, no mostrar spinner
      if (!isCacheValid(todayStr)) {
        setChangingDay(true);
      }
      setSelectedDate(todayStr);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!student?.id) return;

      // Verificar si hay datos en cache válidos
      if (isCacheValid(selectedDate)) {
        const cached = daysCacheRef.current.get(selectedDate)!;
        setDashboard(cached.dashboard);
        setTodayLogs(cached.logs);
        setLoading(false);
        setChangingDay(false);
        console.log(`[Cache] Usando datos en cache para ${selectedDate}`);
        return;
      }

      try {
        // Solo mostrar loading completo en la primera carga
        if (!changingDay) {
          setLoading(true);
        }
        
        console.log(`[API] Cargando datos de nutrición para ${selectedDate}`);
        
        // Get food log for selected date - includes totals and targets
        const logsData = await getDailyFoodLog(student.id, selectedDate);
        
        // Build dashboard from food log data (more accurate for selected date)
        let newDashboard: NutritionDashboard | null = null;
        if (logsData) {
          const totalCal = parseFloat(logsData.totalCalories || '0') || 0;
          const totalProt = parseFloat(logsData.totalProtein || '0') || 0;
          const totalCarbs = parseFloat(logsData.totalCarbs || '0') || 0;
          const totalFat = parseFloat(logsData.totalFat || '0') || 0;
          
          const targetCal = parseFloat(logsData.targetCalories || '0') || 2000;
          const targetProt = parseFloat(logsData.targetProtein || '0') || 150;
          const targetCarbs = parseFloat(logsData.targetCarbs || '0') || 200;
          const targetFat = parseFloat(logsData.targetFat || '0') || 70;
          
          newDashboard = {
            calories: { current: Math.round(totalCal), target: Math.round(targetCal), percentage: targetCal > 0 ? Math.round((totalCal / targetCal) * 100) : 0 },
            protein: { current: Math.round(totalProt), target: Math.round(targetProt), percentage: targetProt > 0 ? Math.round((totalProt / targetProt) * 100) : 0 },
            carbs: { current: Math.round(totalCarbs), target: Math.round(targetCarbs), percentage: targetCarbs > 0 ? Math.round((totalCarbs / targetCarbs) * 100) : 0 },
            fat: { current: Math.round(totalFat), target: Math.round(targetFat), percentage: targetFat > 0 ? Math.round((totalFat / targetFat) * 100) : 0 },
          };
          setDashboard(newDashboard);
        }
        
        const newLogs = logsData?.entries || [];
        setTodayLogs(newLogs);
        
        // Guardar en cache
        daysCacheRef.current.set(selectedDate, {
          dashboard: newDashboard,
          logs: newLogs,
          timestamp: Date.now(),
        });
        console.log(`[Cache] Guardado en cache: ${selectedDate}`);
        
      } catch (error) {
        console.error("Error loading nutrition:", error);
      } finally {
        setLoading(false);
        setChangingDay(false);
      }
    };

    loadData();
  }, [student?.id, selectedDate]);

  // Group logs by meal type
  const logsByMeal = todayLogs.reduce((acc, log) => {
    const meal = getMealTypeKey(log);
    if (!acc[meal]) acc[meal] = [];
    acc[meal].push(log);
    return acc;
  }, {} as Record<string, FoodLogEntry[]>);

  const getMealTotals = (entries: FoodLogEntry[]) => ({
    calories: entries.reduce((sum, e) => sum + getEntryCalories(e), 0),
    protein: entries.reduce((sum, e) => sum + getEntryProtein(e), 0),
    carbs: entries.reduce((sum, e) => sum + getEntryCarbs(e), 0),
    fat: entries.reduce((sum, e) => sum + getEntryFat(e), 0),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Nutrición" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Nutrición"
        actions={[
          {
            label: "Semanal",
            onClick: () => router.push("/student/nutrition/weekly"),
          },
        ]}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Date Navigator */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={goToPrevDay}
                disabled={changingDay}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <button 
                onClick={goToToday}
                disabled={changingDay}
                className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg hover:bg-background/50 transition-colors disabled:opacity-50"
              >
                {changingDay ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-5 h-5 text-primary" />
                  </motion.div>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-text">
                      {formatDate(selectedDate, { weekday: "long" })}
                    </span>
                    <span className="text-xs text-text-muted">
                      {formatDate(selectedDate, { day: "numeric", month: "long" })}
                    </span>
                    {isToday && (
                      <Badge variant="outline" className="text-[10px] mt-1 px-2 py-0 h-4 text-primary border-primary/50">
                        Hoy
                      </Badge>
                    )}
                  </>
                )}
              </button>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={goToNextDay}
                disabled={isToday || changingDay}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Macros Summary */}
        <Card className="bg-surface/80 border-border overflow-hidden">
          <CardContent className="p-4">
            {/* Calories */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="font-medium text-text">Calorías</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-text">
                    {dashboard?.calories?.current || 0}
                  </span>
                  <span className="text-text-muted text-sm">
                    /{dashboard?.calories?.target || 0}
                  </span>
                </div>
              </div>
              <Progress
                value={dashboard?.calories?.percentage || 0}
                className="h-2"
              />
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Protein */}
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <Beef className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-text">
                  {dashboard?.protein?.current || 0}g
                </p>
                <p className="text-xs text-text-muted">
                  /{dashboard?.protein?.target || 0}g
                </p>
                <Progress
                  value={dashboard?.protein?.percentage || 0}
                  className="h-1 mt-2"
                />
              </div>

              {/* Carbs */}
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <Wheat className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-text">
                  {dashboard?.carbs?.current || 0}g
                </p>
                <p className="text-xs text-text-muted">
                  /{dashboard?.carbs?.target || 0}g
                </p>
                <Progress
                  value={dashboard?.carbs?.percentage || 0}
                  className="h-1 mt-2"
                />
              </div>

              {/* Fat */}
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-text">
                  {dashboard?.fat?.current || 0}g
                </p>
                <p className="text-xs text-text-muted">
                  /{dashboard?.fat?.target || 0}g
                </p>
                <Progress
                  value={dashboard?.fat?.percentage || 0}
                  className="h-1 mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-auto py-4 flex flex-col items-center gap-2 bg-gradient-to-br from-primary to-primary-hover text-black font-medium"
            onClick={() => router.push("/student/nutrition/add-food")}
          >
            <Plus className="w-6 h-6" />
            <span>Agregar comida</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 bg-surface/50 border-border"
            onClick={() => router.push("/student/nutrition/recipes")}
          >
            <BookOpen className="w-6 h-6 text-accent" />
            <span>Mis recetas</span>
          </Button>
        </div>

        {/* Day's Meals */}
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="w-4 h-4 text-primary" />
              {isToday ? "Comidas de hoy" : `Comidas del ${formatDate(selectedDate, { day: "numeric", month: "short" })}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {Object.keys(logsByMeal).length === 0 ? (
              <div className="text-center py-6">
                <p className="text-text-muted text-sm">
                  {isToday ? "No hay comidas registradas hoy" : "No hay comidas registradas este día"}
                </p>
                <Button
                  variant="link"
                  className="text-primary mt-2"
                  onClick={() => router.push("/student/nutrition/add-food")}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar primera comida
                </Button>
              </div>
            ) : (
              Object.entries(logsByMeal).map(([mealTypeKey, entries]) => {
                const totals = getMealTotals(entries);
                const firstEntry = entries[0];
                const displayName = getMealTypeName(firstEntry);

                return (
                  <motion.div
                    key={mealTypeKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-background/50 rounded-lg overflow-hidden"
                  >
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {MEAL_ICONS[mealTypeKey] || "🍽️"}
                        </span>
                        <div>
                          <p className="font-medium text-text text-sm">
                            {displayName}
                          </p>
                          <p className="text-xs text-text-muted">
                            {entries.length} item{entries.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-text text-sm">
                          {Math.round(totals.calories)} kcal
                        </p>
                        <p className="text-xs text-text-muted">
                          P:{Math.round(totals.protein)}g C:{Math.round(totals.carbs)}g G:{Math.round(totals.fat)}g
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border divide-y divide-border">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="px-3 py-2 flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text truncate">
                              {getFoodName(entry)}
                            </p>
                            <p className="text-xs text-text-muted">
                              {entry.quantityGrams || entry.quantity || 0}g
                            </p>
                          </div>
                          <span className="text-sm text-text-muted ml-2">
                            {Math.round(getEntryCalories(entry))} kcal
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Weekly Average */}
        {(dashboard as any)?.weeklyAverage && (
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-text">Promedio semanal</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold text-text">
                    {(dashboard as any).weeklyAverage.calories}
                  </p>
                  <p className="text-xs text-text-muted">kcal</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400">
                    {(dashboard as any).weeklyAverage.protein}g
                  </p>
                  <p className="text-xs text-text-muted">prot</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-400">
                    {(dashboard as any).weeklyAverage.carbs}g
                  </p>
                  <p className="text-xs text-text-muted">carbs</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-400">
                    {(dashboard as any).weeklyAverage.fat}g
                  </p>
                  <p className="text-xs text-text-muted">grasas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
