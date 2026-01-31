"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { useRoutineStore } from "@/stores/routine-store";
import { useHistoryCache } from "@/stores/history-cache";
import { getDashboardSummary, getStudentFees, getWeightHistory } from "@/lib/api/student";
import { getSleepWeeklyStats, type SleepWeeklyStats } from "@/lib/api/health";
import { getCaloriesWeeklyStats, getNutritionProfile, type CaloriesWeeklyStats } from "@/lib/api/nutrition";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Footprints,
  Scale,
  Dumbbell,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  CreditCard,
  Zap,
  Play,
  CheckCircle2,
  Loader2,
  Timer,
  Flame,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { DashboardSummary, Fee } from "@/types";

// Lazy load del gráfico para no bloquear la carga inicial
const StepsWeightCorrelationChart = lazy(() => 
  import("@/components/charts/StepsWeightCorrelationChart").then(mod => ({ 
    default: mod.StepsWeightCorrelationChart 
  }))
);

// Skeleton para el gráfico mientras carga
function ChartSkeleton() {
  return (
    <Card className="bg-surface/80 border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user, student } = useAuthStore();
  
  // Use routine store (cached)
  const { 
    macrocycle, 
    activeMeso,
    routineV2,
    isV2,
    selectedMicroIndex, 
    loadRoutine,
    getCurrentMicro,
  } = useRoutineStore();
  
  // Use cache store
  const {
    getDashboardSummary: getCachedSummary,
    setDashboardSummary: setCachedSummary,
    getStudentFees: getCachedFees,
    setStudentFees: setCachedFees,
    getWeightHistory: getCachedWeight,
    setWeightHistory: setCachedWeight,
  } = useHistoryCache();
  
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Stats adicionales para el home rediseñado
  const [sleepStats, setSleepStats] = useState<SleepWeeklyStats | null>(null);
  const [caloriesStats, setCaloriesStats] = useState<CaloriesWeeklyStats | null>(null);
  const [nutritionTargets, setNutritionTargets] = useState<{
    dailyCalories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!student?.id) return;

      try {
        // Primero mostrar datos del cache si existen (carga instantánea)
        const cachedSummary = getCachedSummary(student.id);
        const cachedFees = getCachedFees(student.id);
        const cachedWeight = getCachedWeight(student.id);
        
        if (cachedSummary || cachedFees || cachedWeight) {
          if (cachedSummary) setSummary(cachedSummary);
          if (cachedFees) setFees(cachedFees);
          if (cachedWeight && cachedWeight.length > 0) {
            const w = cachedWeight[0].weight;
            setLastWeight(typeof w === 'number' ? w : parseFloat(w));
          }
          setLoading(false); // Mostrar UI inmediatamente con datos del cache
        } else {
          setLoading(true);
        }
        
        // Cargar rutina (ya tiene su propio cache)
        await loadRoutine(student.id);
        
        // Cargar datos frescos en paralelo
        const [summaryData, feesData, weightData, sleepData, caloriesData, nutritionProfile] = await Promise.all([
          getDashboardSummary(student.id).catch(() => null),
          getStudentFees(student.id).catch(() => []),
          getWeightHistory(student.id, 1).catch(() => []),
          getSleepWeeklyStats(student.id, 2).catch(() => null),
          getCaloriesWeeklyStats(student.id, 2).catch(() => null),
          getNutritionProfile(student.id).catch(() => null),
        ]);
        
        // Actualizar state y cache
        if (summaryData) {
          setSummary(summaryData);
          setCachedSummary(student.id, summaryData);
        }
        
        if (feesData) {
          setFees(feesData);
          setCachedFees(student.id, feesData);
        }
        
        if (weightData && weightData.length > 0) {
          const w = weightData[0].weight;
          setLastWeight(typeof w === 'number' ? w : parseFloat(w));
          setCachedWeight(student.id, weightData);
        }
        
        // Stats adicionales
        if (sleepData) setSleepStats(sleepData);
        if (caloriesData) setCaloriesStats(caloriesData);
        if (nutritionProfile) {
          setNutritionTargets({
            dailyCalories: nutritionProfile.targetDailyCalories,
            protein: nutritionProfile.targetProteinGrams,
            carbs: nutritionProfile.targetCarbsGrams,
            fat: nutritionProfile.targetFatGrams,
          });
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [student?.id, loadRoutine, getCachedSummary, getCachedFees, getCachedWeight, setCachedSummary, setCachedFees, setCachedWeight]);
  
  // Compute active micro info from store
  const currentMicro = getCurrentMicro();
  // Para V2, routineV2 es el mesocycle, para V1 es activeMeso
  const effectiveMeso = isV2 ? routineV2 : activeMeso;
  // También obtener el micro anterior si existe (para mostrar último entreno)
  const previousMicro = effectiveMeso?.microcycles?.[selectedMicroIndex - 1] || null;
  
  // Funciona para V1 (con macrocycle y activeMeso) y V2 (con routineV2)
  const activeMicro = currentMicro && effectiveMeso ? (() => {
    let totalSets = 0;
    let completedSets = 0;
    let nextWorkout: string | null = null;
    let lastWorkout: string | null = null;
    
    // Fecha de hoy (solo fecha, sin hora)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Ordenar días por día si existe
    // Ordenar días - usar 'dayNumber' para V2 (StudentDay) o 'dia' para V1 (Day)
    const sortedDays = [...(currentMicro.days || [])].sort((a, b) => {
      const orderA: number = 'dayNumber' in a ? (a.dayNumber as number) : ('dia' in a ? (a.dia as number) : 0);
      const orderB: number = 'dayNumber' in b ? (b.dayNumber as number) : ('dia' in b ? (b.dia as number) : 0);
      return orderA - orderB;
    });
    
    // Primero calculamos el estado de cada día
    const daysStatus = sortedDays.map((day, index) => {
      // Recolectar todos los sets para calcular stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allSets: any[] = day.exercises?.flatMap((ex: any) => ex.sets || []) || [];
      const dayTotalSets = allSets.length;
      // V2 usa isCompleted o completedAt (ambos indican completado), V1 usa status === "completed"
      const completedSetsList = allSets.filter(s => 
        ('isCompleted' in s ? (s.isCompleted || s.completedAt) : s.status === "completed")
      );
      const dayCompletedSets = completedSetsList.length;
      
      // Encontrar la fecha más reciente de set completado
      // V2 usa completedAt, V1 usa updatedAt
      const setDates = completedSetsList
        .filter(s => ('completedAt' in s ? s.completedAt : s.updatedAt))
        .map(s => new Date(('completedAt' in s ? s.completedAt : s.updatedAt) as string).getTime());
      const lastSetTimestamp = setDates.length > 0 ? Math.max(...setDates) : null;
      const lastSetDate = lastSetTimestamp ? new Date(lastSetTimestamp) : null;
      
      // Sumar al total global
      totalSets += dayTotalSets;
      completedSets += dayCompletedSets;
      
      const dayNumber = index + 1;
      // V2 usa name, V1 usa nombre
      const dayNameRaw: string | null = 'name' in day ? (day.name as string) : ('nombre' in day ? (day.nombre as string) : null);
      const dayName: string = dayNameRaw && dayNameRaw !== `Día ${dayNumber}` ? dayNameRaw : `Día ${dayNumber}`;
      
      // Un día se considera "cerrado" si se trabajó antes de hoy (aunque tenga pendientes)
      const wasWorkedBeforeToday = lastSetDate !== null && lastSetDate.getTime() < today.getTime();
      const isClosedIncomplete = wasWorkedBeforeToday && dayCompletedSets < dayTotalSets;
      
      return {
        dayName,
        dayTotalSets,
        dayCompletedSets,
        isCompleted: dayTotalSets > 0 && dayCompletedSets === dayTotalSets,
        isStarted: dayCompletedSets > 0,
        hasSets: dayTotalSets > 0,
        lastSetDate,
        isClosedIncomplete, // Se trabajó antes de hoy pero quedó incompleto
      };
    });
    
    // Encontrar el último día trabajado (con fecha más reciente o por orden si no hay fechas)
    let lastWorkedDayIndex = -1;
    let lastWorkedDate: Date | null = null;
    
    daysStatus.forEach((day, index) => {
      if (day.lastSetDate && (!lastWorkedDate || day.lastSetDate.getTime() > lastWorkedDate.getTime())) {
        lastWorkedDate = day.lastSetDate;
        lastWorkedDayIndex = index;
      }
    });
    
    // Fallback: si no hay fechas pero hay días con sets completados, usar el último en orden
    if (lastWorkedDayIndex === -1) {
      for (let i = daysStatus.length - 1; i >= 0; i--) {
        if (daysStatus[i].isStarted) {
          lastWorkedDayIndex = i;
          break;
        }
      }
    }
    
    // Último entreno: el día con la fecha más reciente de trabajo
    let lastWorkoutMicroIndex = selectedMicroIndex;
    
    if (lastWorkedDayIndex >= 0) {
      lastWorkout = daysStatus[lastWorkedDayIndex].dayName;
    } else {
      // Si no hay último en el micro actual, buscar en micros anteriores
      const allMicros = effectiveMeso.microcycles || [];
      for (let microIdx = selectedMicroIndex - 1; microIdx >= 0; microIdx--) {
        const micro = allMicros[microIdx];
        if (!micro) continue;
        
        // Ordenar días - usar 'dayNumber' para V2 (StudentDay) o 'dia' para V1 (Day)
        const prevDays = [...(micro.days || [])].sort((a, b) => {
          const orderA: number = 'dayNumber' in a ? (a.dayNumber as number) : ('dia' in a ? (a.dia as number) : 0);
          const orderB: number = 'dayNumber' in b ? (b.dayNumber as number) : ('dia' in b ? (b.dia as number) : 0);
          return orderA - orderB;
        });
        let found = false;
        
        for (let i = prevDays.length - 1; i >= 0; i--) {
          const day = prevDays[i];
          // V2 usa isCompleted o completedAt, V1 usa status === "completed"
          const hasCompletedSets = day.exercises?.some(ex => 
            ex.sets?.some(s => ('isCompleted' in s ? (s.isCompleted || s.completedAt) : s.status === "completed"))
          );
          if (hasCompletedSets) {
            const dayNumber = i + 1;
            // V2 usa name, V1 usa nombre
            const dayNameVal: string | null = 'name' in day ? (day.name as string) : ('nombre' in day ? (day.nombre as string) : null);
            lastWorkout = dayNameVal && dayNameVal !== `Día ${dayNumber}` ? dayNameVal : `Día ${dayNumber}`;
            lastWorkoutMicroIndex = microIdx;
            found = true;
            break;
          }
        }
        
        if (found) break;
      }
      
      // Fallback final: si seguimos sin encontrar nada pero sabemos que hay progreso
      if (!lastWorkout && completedSets === 0 && selectedMicroIndex > 0) {
        // Mostrar referencia genérica al micro anterior
        lastWorkout = `Micro ${selectedMicroIndex}`; // Micro anterior (sin especificar día)
        lastWorkoutMicroIndex = selectedMicroIndex - 1;
      }
    }
    
    // Próximo entreno: siempre es el siguiente día después del último trabajado
    // NO volvemos atrás a días anteriores incompletos
    let nextMicroIndex = selectedMicroIndex; // Por defecto, mismo micro
    
    // Buscar el siguiente día con ejercicios después del último trabajado
    const nextDayIndex = lastWorkedDayIndex >= 0 ? lastWorkedDayIndex + 1 : 0;
    
    // Buscar el próximo día con sets (sin importar si está completo)
    for (let i = nextDayIndex; i < daysStatus.length; i++) {
      if (daysStatus[i].hasSets) {
        nextWorkout = daysStatus[i].dayName;
        break;
      }
    }
    
    // Si no hay más días en este micro, pasar al siguiente
    if (!nextWorkout) {
      nextMicroIndex = selectedMicroIndex + 1;
      nextWorkout = "Día 1"; // Primer día del siguiente micro
    }
    
    // Verificar si el siguiente micro existe
    const totalMicros = effectiveMeso.microcycles?.length || 0;
    const nextMicroExists = nextMicroIndex < totalMicros;
    
    return {
      micro: currentMicro,
      microIndex: selectedMicroIndex,
      mesoName: effectiveMeso.name,
      macroName: macrocycle?.name || effectiveMeso.name, // En V2 no hay macrocycle separado
      totalSets,
      completedSets,
      nextWorkout: nextMicroExists || nextMicroIndex === selectedMicroIndex ? nextWorkout : null,
      lastWorkout,
      lastWorkoutMicroIndex,
      lastWorkoutDate: lastWorkedDate,
      nextMicroIndex: nextMicroExists ? nextMicroIndex : selectedMicroIndex,
      isNextMicroDifferent: nextMicroIndex !== selectedMicroIndex && nextMicroExists,
    };
  })() : null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const firstName = user?.fullName?.split(" ")[0] || student?.firstName || "Atleta";

  // Solo mostrar cuotas vencidas o la cuota actual, no las futuras
  const pendingFees = (fees || []).filter((f) => f.status !== "paid" && (f.isOverdue || f.isCurrent));
  const hasPendingFees = pendingFees.length > 0;

  // Calculate steps progress (promedio semanal vs objetivo)
  const stepsProgress = summary?.steps
    ? Math.min((summary.steps.weekAverage / summary.steps.dailyGoal) * 100, 100)
    : 0;

  // Current weight - prefer summary, fallback to last recorded weight
  const currentWeight = typeof summary?.weight?.current === 'number' 
    ? summary.weight.current 
    : lastWeight;
  
  // Weight change comes in GRAMS from backend, convert to KG
  const weightChangeGrams = typeof summary?.weight?.weeklyChange === 'number' ? summary.weight.weeklyChange : 0;
  const weightChange = weightChangeGrams / 1000; // Convert to kg
  const weightGoal = typeof summary?.weight?.weeklyGoal === 'number' ? summary.weight.weeklyGoal / 1000 : 0; // Also in grams
  const isOnTrack = weightGoal !== 0 
    ? (weightGoal < 0 && weightChange < 0) || (weightGoal > 0 && weightChange > 0)
    : true;

  // Sleep stats
  const currentSleepWeek = sleepStats?.weeks?.[0];
  const previousSleepWeek = sleepStats?.weeks?.[1];
  const sleepAverage = currentSleepWeek?.displayFormat || null;
  const sleepAverageMinutes = currentSleepWeek 
    ? (currentSleepWeek.averageHours * 60 + currentSleepWeek.averageMinutes)
    : 0;
  const previousSleepMinutes = previousSleepWeek 
    ? (previousSleepWeek.averageHours * 60 + previousSleepWeek.averageMinutes)
    : 0;
  const sleepDiffMinutes = sleepAverageMinutes - previousSleepMinutes;

  // Calories stats
  const currentCaloriesWeek = caloriesStats?.weeks?.[0];
  const previousCaloriesWeek = caloriesStats?.weeks?.[1];
  const caloriesAverage = currentCaloriesWeek?.averageCalories || 0;
  const caloriesDiff = currentCaloriesWeek && previousCaloriesWeek 
    ? Math.round(currentCaloriesWeek.averageCalories - previousCaloriesWeek.averageCalories)
    : 0;
  const caloriesGoal = caloriesStats?.targets?.dailyCalories || nutritionTargets?.dailyCalories || 0;
  const caloriesPercent = caloriesGoal > 0 ? Math.round((caloriesAverage / caloriesGoal) * 100) : 0;

  // Steps diff vs previous week
  const stepsDiff = summary?.steps?.weeklyChange ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-text-muted text-sm">{getGreeting()}</p>
            <h1 className="text-2xl font-bold text-text">{firstName} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-lg font-bold text-black">
                {firstName[0]?.toUpperCase()}
              </span>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Content */}
      <div className="px-4 space-y-4 stagger-children">
        {/* Weekly Goals Section */}
        <motion.div>
          <p className="text-xs text-text-muted mb-2 px-1">Objetivos para esta semana (promedio)</p>
          <div className="flex gap-2">
            {/* Steps Goal */}
            {summary?.steps?.dailyGoal && summary.steps.dailyGoal > 0 && (
              <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-surface border border-border">
                <Footprints className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-text whitespace-nowrap">
                    {summary.steps.dailyGoal.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-text-muted whitespace-nowrap">pasos</span>
                </div>
              </div>
            )}
            
            {/* Macros Goal */}
            {nutritionTargets?.dailyCalories && nutritionTargets.dailyCalories > 0 && (
              <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-surface border border-border">
                <Flame className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-text whitespace-nowrap">
                    Kcal {nutritionTargets.dailyCalories}
                  </span>
                  {(nutritionTargets.protein || nutritionTargets.carbs || nutritionTargets.fat) && (
                    <span className="text-[10px] text-text-muted whitespace-nowrap">
                      CH {nutritionTargets.carbs || 0} - P {nutritionTargets.protein || 0} - G {nutritionTargets.fat || 0}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Weight Goal - mostrar rango si hay %, sino valor fijo */}
            {(summary?.weight?.weeklyLossPercentMin || summary?.weight?.weeklyGoal) && (
              <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-surface border border-border">
                <Scale className="w-4 h-4 text-success flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-text whitespace-nowrap">
                    Δ peso:
                  </span>
                  {summary?.weight?.weeklyLossPercentMin && summary?.weight?.weeklyLossPercentMax && currentWeight ? (
                    // Mostrar rango calculado desde % del peso actual
                    <span className="text-[10px] font-medium whitespace-nowrap text-success">
                      -{Math.round(currentWeight * (summary.weight.weeklyLossPercentMin / 100) * 1000)}/{Math.round(currentWeight * (summary.weight.weeklyLossPercentMax / 100) * 1000)} gr
                    </span>
                  ) : summary?.weight?.weeklyGoal && summary.weight.weeklyGoal !== 0 ? (
                    // Mostrar valor fijo
                    <span className={cn(
                      "text-[10px] font-medium whitespace-nowrap",
                      summary.weight.weeklyGoal < 0 ? "text-success" : "text-info"
                    )}>
                      {summary.weight.weeklyGoal > 0 ? "+" : ""}{summary.weight.weeklyGoal} gr/sem
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Action Button */}
        <motion.div>
          <Button
            onClick={() => router.push("/student/daily-record")}
            className="w-full h-14 bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 text-black font-semibold text-base shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5 mr-2" />
            Registrar Peso / Pasos / Sueño
          </Button>
        </motion.div>

        {/* Pending Fees Alert */}
        {hasPendingFees && (
          <motion.div>
            <Card
              className="bg-error/10 border-error/30 cursor-pointer touch-feedback"
              onClick={() => router.push("/student/fees")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-error" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-error">
                    {pendingFees.length} cuota{pendingFees.length > 1 ? "s" : ""} pendiente{pendingFees.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-text-muted">Tocá para ver detalles</p>
                </div>
                <ArrowRight className="w-5 h-5 text-error" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Grid - 4 cards estilo mockup */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Steps Card */}
          <motion.div>
            <Card
              className="bg-surface/80 border-border cursor-pointer touch-feedback h-full"
              onClick={() => router.push("/student/progress?tab=steps")}
            >
              <CardContent className="p-3.5">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      {/* Círculo de progreso con icono */}
                      <div className="relative">
                        <svg className="w-14 h-14 -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-primary/20"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray={`${stepsProgress * 1.508} 150.8`}
                            strokeLinecap="round"
                            className="text-primary"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Footprints className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-sm font-bold px-2.5 py-1">
                        {summary?.steps ? Math.round((summary.steps.weekAverage / summary.steps.dailyGoal) * 100) : 0}%
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-1">Promedio pasos semana</p>
                    <p className="text-2xl font-bold text-text leading-tight">
                      {summary?.steps?.weekAverage?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs">
                      {stepsDiff !== 0 ? (
                        <span className={stepsDiff > 0 ? "text-success" : "text-warning"}>
                          {stepsDiff > 0 ? "+" : ""}{stepsDiff.toLocaleString()} vs semana anterior
                        </span>
                      ) : (
                        <span className="text-primary">Objetivo: {summary?.steps?.dailyGoal?.toLocaleString() || 0}</span>
                      )}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Weight Card */}
          <motion.div>
            <Card
              className="bg-surface/80 border-border cursor-pointer touch-feedback h-full"
              onClick={() => router.push("/student/progress?tab=weight")}
            >
              <CardContent className="p-3.5">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="w-14 h-14 rounded-full bg-info/20 flex items-center justify-center">
                        <Scale className="w-6 h-6 text-info" />
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-sm font-bold px-2.5 py-1",
                          weightChange === 0 ? "bg-info/10 text-info" :
                          isOnTrack ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        )}
                      >
                        {weightChange === 0 ? "0.00 kg" : `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(2)} kg`}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-1">Promedio peso semana</p>
                    <p className="text-2xl font-bold text-text leading-tight">
                      {currentWeight !== null ? currentWeight.toFixed(2) : "--"} kg
                    </p>
                    <div className="flex items-center gap-1">
                      {weightChange !== 0 && (
                        weightChange < 0 ? (
                          <TrendingDown className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5 text-warning" />
                        )
                      )}
                      <p className={cn(
                        "text-xs",
                        weightChange < 0 ? "text-success" : weightChange > 0 ? "text-warning" : "text-text-muted"
                      )}>
                        {weightChange !== 0 
                          ? `${weightChange > 0 ? "+" : ""}${weightChangeGrams}g vs semana anterior`
                          : "Esta semana"
                        }
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sleep Card */}
          <motion.div>
            <Card
              className="bg-surface/80 border-border cursor-pointer touch-feedback h-full"
              onClick={() => router.push("/student/progress?tab=sleep")}
            >
              <CardContent className="p-3.5">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Moon className="w-6 h-6 text-purple-400" />
                      </div>
                      {sleepDiffMinutes !== 0 && previousSleepMinutes > 0 ? (
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-sm font-bold px-2.5 py-1",
                            sleepDiffMinutes > 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                          )}
                        >
                          {sleepDiffMinutes > 0 ? "+" : ""}{sleepDiffMinutes}min
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 text-sm font-bold px-2.5 py-1">
                          7-9h ideal
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-1">Promedio sueño semana</p>
                    <p className="text-2xl font-bold text-text leading-tight">
                      {sleepAverage || "--"}
                    </p>
                    <div className="flex items-center gap-1">
                      {sleepDiffMinutes !== 0 && previousSleepMinutes > 0 ? (
                        <>
                          {sleepDiffMinutes > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-warning" />
                          )}
                          <p className={cn(
                            "text-xs",
                            sleepDiffMinutes > 0 ? "text-success" : "text-warning"
                          )}>
                            vs semana anterior
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-text-muted">Esta semana</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Calories Card */}
          <motion.div>
            <Card
              className="bg-surface/80 border-border cursor-pointer touch-feedback h-full"
              onClick={() => router.push("/student/nutrition")}
            >
              <CardContent className="p-3.5">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      {/* Círculo de progreso con icono */}
                      <div className="relative">
                        <svg className="w-14 h-14 -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-amber-500/20"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray={`${Math.min(caloriesPercent, 100) * 1.508} 150.8`}
                            strokeLinecap="round"
                            className="text-amber-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Flame className="w-6 h-6 text-amber-500" />
                        </div>
                      </div>
                      {caloriesGoal > 0 && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 text-sm font-bold px-2.5 py-1">
                          {caloriesPercent}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-1">Promedio kcal semana</p>
                    <p className="text-2xl font-bold text-text leading-tight">
                      {caloriesAverage > 0 ? Math.round(caloriesAverage).toLocaleString() : "--"}
                    </p>
                    <div className="flex items-center gap-1">
                      {caloriesDiff !== 0 && (
                        <>
                          {caloriesDiff > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-warning" />
                          )}
                          <p className={cn(
                            "text-xs",
                            caloriesDiff > 0 ? "text-success" : "text-warning"
                          )}>
                            {caloriesDiff > 0 ? "+" : ""}{caloriesDiff} vs semana anterior
                          </p>
                        </>
                      )}
                      {caloriesDiff === 0 && (
                        <p className="text-xs text-text-muted">
                          {caloriesGoal > 0 ? `Objetivo: ${caloriesGoal.toLocaleString()}` : "Esta semana"}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Active Microcycle Card - Highlighted */}
        {activeMicro && (
          <motion.div>
            <Card
              className="bg-gradient-to-br from-primary/20 to-accent/10 border-primary/40 cursor-pointer touch-feedback overflow-hidden"
              onClick={() => router.push(`/student/routine?micro=${activeMicro.isNextMicroDifferent ? activeMicro.nextMicroIndex : activeMicro.microIndex}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/30">
                    <Dumbbell className="w-7 h-7 text-black" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-text">Microciclo {activeMicro.microIndex + 1}</h3>
                      <Badge className="bg-primary/20 text-primary text-xs">
                        {activeMicro.completedSets === activeMicro.totalSets && activeMicro.totalSets > 0 ? "Completado" : "En curso"}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-muted">{activeMicro.mesoName}</p>
                    
                    {/* Próximo y Último entreno */}
                    <div className="flex flex-col gap-1 mt-2 text-xs">
                      {activeMicro.lastWorkout && (
                        <div>
                          <span className="text-text-muted">Último entreno: </span>
                          <span className="text-text-secondary">
                            {activeMicro.lastWorkout}
                            {activeMicro.lastWorkoutDate && ` ${(activeMicro.lastWorkoutDate as Date).getDate()}/${(activeMicro.lastWorkoutDate as Date).getMonth() + 1}`}
                            {activeMicro.lastWorkoutMicroIndex !== activeMicro.microIndex && ` - M${activeMicro.lastWorkoutMicroIndex + 1}`}
                          </span>
                        </div>
                      )}
                      {activeMicro.nextWorkout && (
                        <div>
                          <span className="text-text-muted">Próximo entreno: </span>
                          <span className="text-primary font-medium">
                            {activeMicro.nextWorkout}
                            {activeMicro.isNextMicroDifferent && ` - M${activeMicro.nextMicroIndex + 1}`}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-muted">Progreso</span>
                        <span className="text-primary font-medium">
                          {activeMicro.completedSets}/{activeMicro.totalSets} sets
                        </span>
                      </div>
                      <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-primary-hover transition-all"
                          style={{ 
                            width: `${activeMicro.totalSets > 0 
                              ? (activeMicro.completedSets / activeMicro.totalSets) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    {activeMicro.completedSets === activeMicro.totalSets && activeMicro.totalSets > 0 ? (
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    ) : (
                      <Play className="w-8 h-8 text-primary" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Access Cards - Solo los que NO están en el menú inferior */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-muted px-1">Accesos rápidos</h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Meal Plan Card */}
            <motion.div>
              <Card
                className="bg-surface/80 border-border cursor-pointer touch-feedback overflow-hidden"
                onClick={() => router.push("/student/meal-plan")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <ClipboardList className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text text-xs leading-tight">Plan de Alimentación</h3>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Cardio Card */}
            <motion.div>
              <Card
                className="bg-surface/80 border-border cursor-pointer touch-feedback overflow-hidden"
                onClick={() => router.push("/student/cardio")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <Timer className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text text-xs leading-tight">Cardio</h3>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Steps vs Weight Correlation Chart - Lazy loaded */}
        {student?.id && !loading && (
          <motion.div className="pt-4">
            <Suspense fallback={<ChartSkeleton />}>
              <StepsWeightCorrelationChart studentId={student.id} />
            </Suspense>
          </motion.div>
        )}

        {/* Motivation Quote */}
        <motion.div className="pt-4 pb-6">
          <Card className="bg-gradient-to-br from-surface to-background border-border">
            <CardContent className="p-4 text-center">
              <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-text-secondary italic">
                "El único mal entrenamiento es el que no hiciste"
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

