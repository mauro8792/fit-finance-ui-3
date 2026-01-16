"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { useRoutineStore } from "@/stores/routine-store";
import { useHistoryCache } from "@/stores/history-cache";
import { getDashboardSummary, getStudentFees, getWeightHistory } from "@/lib/api/student";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Footprints,
  Scale,
  Dumbbell,
  Utensils,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  CreditCard,
  Target,
  Zap,
  Play,
  CheckCircle2,
  History,
  Loader2,
  Timer,
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
        const [summaryData, feesData, weightData] = await Promise.all([
          getDashboardSummary(student.id).catch(() => null),
          getStudentFees(student.id).catch(() => []),
          getWeightHistory(student.id, 1).catch(() => []),
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
  const activeMicro = currentMicro && activeMeso && macrocycle ? (() => {
    let totalSets = 0;
    let completedSets = 0;
    currentMicro.days?.forEach((day) => {
      day.exercises?.forEach((ex) => {
        totalSets += ex.sets?.length || 0;
        completedSets += ex.sets?.filter((s) => s.status === "completed").length || 0;
      });
    });
    
    return {
      micro: currentMicro,
      microIndex: selectedMicroIndex,
      mesoName: activeMeso.name,
      macroName: macrocycle.name,
      totalSets,
      completedSets,
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

  // Calculate steps progress
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
        {/* Quick Action Button */}
        <motion.div>
          <Button
            onClick={() => router.push("/student/daily-record")}
            className="w-full h-14 bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 text-black font-semibold text-base shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5 mr-2" />
            Registrar Peso / Pasos
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Steps Card */}
          <motion.div>
            <Card
              className="bg-surface/80 border-border cursor-pointer touch-feedback h-full"
              onClick={() => router.push("/student/progress?tab=steps")}
            >
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <Footprints className="w-5 h-5 text-accent" />
                      </div>
                      <Badge variant="secondary" className="bg-accent/10 text-accent text-xs">
                        {typeof summary?.steps?.compliancePercent === 'number' ? summary.steps.compliancePercent.toFixed(0) : 0}%
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted mb-1">Pasos promedio</p>
                    <p className="text-xl font-bold text-text">
                      {summary?.steps?.weekAverage?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-text-muted">
                      Meta: {summary?.steps?.dailyGoal?.toLocaleString() || 0}
                    </p>
                    <Progress value={stepsProgress} className="h-1.5 mt-2" />
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
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                        <Scale className="w-5 h-5 text-info" />
                      </div>
                      {weightChange !== 0 && (
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            isOnTrack ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                          )}
                        >
                          {weightChange > 0 ? "+" : ""}{weightChange.toFixed(2)} kg
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mb-1">Peso actual</p>
                    <p className="text-xl font-bold text-text">
                      {currentWeight !== null ? currentWeight.toFixed(2) : "--"} kg
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {weightChange !== 0 && (
                        weightChange < 0 ? (
                          <TrendingDown className="w-3 h-3 text-success" />
                        ) : (
                          <TrendingUp className="w-3 h-3 text-warning" />
                        )
                      )}
                      <p className="text-xs text-text-muted">
                        Esta semana
                      </p>
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
              onClick={() => router.push(`/student/routine?micro=${activeMicro.microIndex}`)}
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
                        En curso
                      </Badge>
                    </div>
                    <p className="text-sm text-text-muted">{activeMicro.mesoName}</p>
                    
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

        {/* Quick Access Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-muted px-1">Accesos rápidos</h2>

          {/* Routine Card - Only if no active micro */}
          {!activeMicro && (
            <motion.div>
              <Card
                className="bg-surface/80 border-border cursor-pointer touch-feedback overflow-hidden"
                onClick={() => router.push("/student/routine")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg">
                      <Dumbbell className="w-6 h-6 text-black" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-text">Mi Rutina</h3>
                      <p className="text-sm text-text-muted">Ver entrenamiento de hoy</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-muted" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Nutrition Card */}
          <motion.div>
            <Card
              className="bg-surface/80 border-border cursor-pointer touch-feedback overflow-hidden"
              onClick={() => router.push("/student/nutrition")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center shadow-lg">
                    <Utensils className="w-6 h-6 text-black" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text">Nutrición</h3>
                    <p className="text-sm text-text-muted">Registrar comidas</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-muted" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Meal Plan Card */}
          <motion.div>
            <Card
              className="bg-surface/80 border-border cursor-pointer touch-feedback overflow-hidden"
              onClick={() => router.push("/student/meal-plan")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text">Plan de Alimentación</h3>
                    <p className="text-sm text-text-muted">Guía del coach</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-muted" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Progress Card */}
          <motion.div>
            <Card
              className="bg-surface/80 border-border cursor-pointer touch-feedback overflow-hidden"
              onClick={() => router.push("/student/progress")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-info to-blue-400 flex items-center justify-center shadow-lg">
                    <Target className="w-6 h-6 text-black" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text">Mi Progreso</h3>
                    <p className="text-sm text-text-muted">Gráficos y estadísticas</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-muted" />
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
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
                    <Timer className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text">Cardio</h3>
                    <p className="text-sm text-text-muted">Pasos, actividades y cronómetro</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-muted" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Training History Card */}
          <motion.div>
            <Card
              className="bg-surface/80 border-border cursor-pointer touch-feedback overflow-hidden"
              onClick={() => router.push("/student/history")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <History className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text">Mi Historial</h3>
                    <p className="text-sm text-text-muted">Entrenamientos y progreso por ejercicio</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-muted" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
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

