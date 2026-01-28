"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart,
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Footprints,
  Scale,
  Loader2,
  Lightbulb,
  BarChart3,
  LineChart as LineChartIcon,
} from "lucide-react";
import api from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { getWeightWeeklyStats, type WeightWeeklyStats } from "@/lib/api/health";
import { getStepsWeeklyHistoryStats, type StepsWeeklyHistoryStats } from "@/lib/api/cardio";
import { getCaloriesWeeklyStats, type CaloriesWeeklyStats } from "@/lib/api/nutrition";

interface WeekData {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  avgCalories: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  daysWithNutrition: number;
  startWeight: number | null;
  endWeight: number | null;
  avgWeight: number | null;
  weightChange: number | null;
  weightChangePercent: number | null;
  avgSteps: number | null;
  totalSteps: number;
  daysWithSteps: number;
  stepsGoalPercent: number | null;
}

interface CorrelationData {
  hasData: boolean;
  weeks: WeekData[];
  targets: {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
  } | null;
  goals: {
    dailySteps: number;
    weeklyWeightChange: number;
  };
  insights: string[];
}

interface Props {
  studentId: number;
  className?: string;
}

export function WeeklyCorrelationDashboard({ studentId, className }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [data, setData] = useState<CorrelationData | null>(null);
  
  // UN ÚNICO estado para la semana seleccionada (0 = esta semana, 1 = semana pasada, etc.)
  const [weekOffset, setWeekOffset] = useState(0);
  
  // Estados para estadísticas históricas semanales
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [weightHistory, setWeightHistory] = useState<WeightWeeklyStats | null>(null);
  const [stepsHistory, setStepsHistory] = useState<StepsWeeklyHistoryStats | null>(null);
  const [caloriesHistory, setCaloriesHistory] = useState<CaloriesWeeklyStats | null>(null);
  const [historyWeeks, setHistoryWeeks] = useState(8); // Default 8 semanas
  
  // Datos de la semana seleccionada
  const [weekSummary, setWeekSummary] = useState<WeekData | null>(null);
  const [dailyChartData, setDailyChartData] = useState<Array<{
    day: string;
    dayShort: string;
    date: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    weight: number | null;
    steps: number | null;
  }>>([]);
  const [dailyChartRange, setDailyChartRange] = useState<{ start: string; end: string } | null>(null);
  
  // Refs para evitar llamadas duplicadas (StrictMode)
  const initialDataFetched = useRef(false);
  const lastStudentId = useRef<number | null>(null);
  
  // Cache de datos por semana (weekOffset -> data)
  const weekDataCache = useRef<Map<number, {
    weekSummary: WeekData;
    dailyChartData: typeof dailyChartData;
    dailyChartRange: { start: string; end: string };
  }>>(new Map());
  
  // Resetear refs y cache si cambia el studentId
  if (studentId !== lastStudentId.current) {
    lastStudentId.current = studentId;
    initialDataFetched.current = false;
    weekDataCache.current.clear();
  }

  // Cargar datos iniciales (targets y goals) - solo una vez
  useEffect(() => {
    if (!studentId || initialDataFetched.current) return;
    
    const fetchInitialData = async () => {
      initialDataFetched.current = true;
      setLoading(true);
      try {
        const response = await api.get(`/health/correlation/${studentId}?weeks=8`);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching correlation:", error);
        initialDataFetched.current = false; // Permitir reintento en caso de error
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [studentId]);

  // Cargar TODOS los datos de la semana seleccionada (resumen + gráfico diario)
  useEffect(() => {
    if (!studentId) return;
    
    // Verificar si ya tenemos los datos en cache
    const cachedData = weekDataCache.current.get(weekOffset);
    if (cachedData) {
      // Usar datos cacheados - sin loading, instantáneo
      setWeekSummary(cachedData.weekSummary);
      setDailyChartData(cachedData.dailyChartData);
      setDailyChartRange(cachedData.dailyChartRange);
      return;
    }
    
    const fetchWeekData = async () => {
      setLoadingWeek(true);
      try {
        // Calcular el lunes de la semana según el offset
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Lunes de esta semana
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff - (weekOffset * 7));
        const weekStartStr = monday.toISOString().split('T')[0];
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const weekEndStr = sunday.toISOString().split('T')[0];

        // Obtener datos de nutrición, peso y pasos para la semana específica
        const [nutritionRes, weightRes, stepsRes] = await Promise.all([
          api.get(`/nutrition/weekly/${studentId}?weekStart=${weekStartStr}`).catch(() => ({ data: null })),
          api.get(`/health/weight/${studentId}/daily-week?weekOffset=${weekOffset}`).catch(() => ({ data: null })),
          api.get(`/cardio/${studentId}/steps-weekly?weekOffset=${weekOffset}`).catch(() => ({ data: null })),
        ]);

        const nutritionData = nutritionRes.data;
        const weightData = weightRes.data;
        const stepsData = stepsRes.data;

        // Construir resumen de la semana
        const weightDays = weightData?.weightsByDay || [];
        const weightsWithData = weightDays.filter((d: any) => d.weight !== null);
        const avgWeight = weightsWithData.length > 0 
          ? weightsWithData.reduce((sum: number, d: any) => sum + d.weight, 0) / weightsWithData.length 
          : null;
        const startWeight = weightsWithData.length > 0 ? weightsWithData[0].weight : null;
        const endWeight = weightsWithData.length > 0 ? weightsWithData[weightsWithData.length - 1].weight : null;
        const weightChange = startWeight && endWeight ? endWeight - startWeight : null;

        const newWeekSummary: WeekData = {
          weekNumber: 8 - weekOffset,
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          avgCalories: nutritionData?.weeklyAverages?.calories || null,
          avgProtein: nutritionData?.weeklyAverages?.protein || null,
          avgCarbs: nutritionData?.weeklyAverages?.carbs || null,
          avgFat: nutritionData?.weeklyAverages?.fat || null,
          daysWithNutrition: nutritionData?.days?.filter((d: any) => d.consumed?.calories > 0).length || 0,
          startWeight,
          endWeight,
          avgWeight,
          weightChange,
          weightChangePercent: startWeight && weightChange ? (weightChange / startWeight) * 100 : null,
          avgSteps: stepsData?.averageSteps || null,
          totalSteps: stepsData?.totalSteps || 0,
          daysWithSteps: stepsData?.daysWithData || 0,
          stepsGoalPercent: stepsData?.averageSteps && stepsData?.dailyGoal 
            ? (stepsData.averageSteps / stepsData.dailyGoal) * 100 
            : null,
        };

        // Combinar datos por día para el gráfico
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const stepsByDay = stepsData?.stepsByDay || [];
        const combinedData: Array<{
          day: string;
          dayShort: string;
          date: string;
          calories: number | null;
          protein: number | null;
          carbs: number | null;
          fat: number | null;
          weight: number | null;
          steps: number | null;
        }> = [];

        for (let i = 0; i < 7; i++) {
          const nutritionDay = nutritionData?.days?.[i];
          const weightDay = weightDays[i];
          const stepsDay = stepsByDay[i];

          combinedData.push({
            day: days[i],
            dayShort: days[i],
            date: nutritionDay?.date || weightDay?.date || stepsDay?.date || '',
            calories: nutritionDay?.consumed?.calories || null,
            protein: nutritionDay?.consumed?.protein || null,
            carbs: nutritionDay?.consumed?.carbs || null,
            fat: nutritionDay?.consumed?.fat || null,
            weight: weightDay?.weight || null,
            steps: stepsDay?.steps || null,
          });
        }

        const newChartRange = { start: weekStartStr, end: weekEndStr };

        // Guardar en cache (excepto semana actual que puede cambiar)
        if (weekOffset > 0) {
          weekDataCache.current.set(weekOffset, {
            weekSummary: newWeekSummary,
            dailyChartData: combinedData,
            dailyChartRange: newChartRange,
          });
        }

        setWeekSummary(newWeekSummary);
        setDailyChartData(combinedData);
        setDailyChartRange(newChartRange);
      } catch (error) {
        console.error("Error fetching week data:", error);
      } finally {
        setLoadingWeek(false);
      }
    };

    fetchWeekData();
  }, [studentId, weekOffset]);

  // Cargar estadísticas históricas semanales
  useEffect(() => {
    if (!studentId) return;
    
    const fetchHistoryStats = async () => {
      setLoadingHistory(true);
      try {
        const [weightRes, stepsRes, caloriesRes] = await Promise.all([
          getWeightWeeklyStats(studentId, historyWeeks).catch(() => null),
          getStepsWeeklyHistoryStats(studentId, historyWeeks).catch(() => null),
          getCaloriesWeeklyStats(studentId, historyWeeks).catch(() => null),
        ]);
        
        setWeightHistory(weightRes);
        setStepsHistory(stepsRes);
        setCaloriesHistory(caloriesRes);
      } catch (error) {
        console.error("Error fetching history stats:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistoryStats();
  }, [studentId, historyWeeks]);

  // Navegación de semanas (única para todo el dashboard)
  const handlePrevWeek = () => {
    if (weekOffset < 24) { // Máximo 24 semanas hacia atrás
      setWeekOffset(weekOffset + 1);
    }
  };

  const handleNextWeek = () => {
    if (weekOffset > 0) {
      setWeekOffset(weekOffset - 1);
    }
  };
  
  const isCurrentWeek = weekOffset === 0;

  if (loading) {
    return (
      <Card className={cn("bg-surface/80 border-border", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-text flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Correlación Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-8 h-8 text-primary" />
            </motion.div>
            <p className="text-sm text-text-muted">Cargando datos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.hasData) {
    return (
      <Card className={cn("bg-surface/80 border-border", className)}>
        <CardContent className="p-6 text-center">
          <BarChart3 className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">
            Cargá macros, pasos y peso para ver la correlación semanal
          </p>
        </CardContent>
      </Card>
    );
  }

  // Usar weekSummary que se carga con los datos de la semana actual

  // Preparar datos para el gráfico diario con macros apilados
  const chartDisplayData = dailyChartData.map((d) => ({
    name: d.dayShort,
    proteína: d.protein || 0,
    carbos: d.carbs || 0,
    grasas: d.fat || 0,
    peso: d.weight,
    pasos: d.steps,
  }));

  // Calcular dominios para el gráfico
  // Máximo de cualquier macro individual
  const allMacroValues = dailyChartData.flatMap(d => [d.protein || 0, d.carbs || 0, d.fat || 0]);
  const pesoValues = dailyChartData.filter(d => d.weight !== null && d.weight !== undefined).map(d => d.weight!);
  
  const hasPesoData = pesoValues.length > 0;
  const hasMacroData = allMacroValues.some(v => v > 0);
  
  // Para macros agrupados, el máximo es el valor más alto de cualquier macro
  const maxMacros = allMacroValues.length > 0 ? Math.max(...allMacroValues) + 20 : 200;
  const minPeso = pesoValues.length > 0 ? Math.min(...pesoValues) - 2 : 60;
  const maxPeso = pesoValues.length > 0 ? Math.max(...pesoValues) + 2 : 100;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const totalMacros = (data?.proteína || 0) + (data?.carbos || 0) + (data?.grasas || 0);
      
      return (
        <div className="bg-surface border border-border rounded-lg p-2 shadow-lg text-xs min-w-[120px]">
          <p className="font-semibold text-text mb-1">{data?.name}</p>
          <div className="space-y-0.5">
            <p className="text-red-400">Proteína: {data?.proteína || 0}g</p>
            <p className="text-amber-400">Carbos: {data?.carbos || 0}g</p>
            <p className="text-blue-400">Grasas: {data?.grasas || 0}g</p>
            {totalMacros > 0 && (
              <p className="text-text-muted border-t border-border pt-1 mt-1">
                Total: {totalMacros}g
              </p>
            )}
            {data?.peso && (
              <p className="text-success">Peso: {data.peso} kg</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("space-y-4 relative", className)}>
      {/* Overlay de carga general */}
      {loadingWeek && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-xl"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-10 h-10 text-primary" />
          </motion.div>
          <p className="text-sm text-text-muted mt-3">Cargando semana...</p>
        </motion.div>
      )}
      
      {/* Selector de semana */}
      <Card className="bg-surface/80 border-border">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handlePrevWeek}
              disabled={weekOffset >= 24 || loadingWeek}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {weekSummary ? (
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold text-text">
                  Semana {weekSummary.weekNumber}
                </span>
                <span className="text-xs text-text-muted">
                  {formatDate(weekSummary.weekStart, { day: "numeric", month: "short" })} - {formatDate(weekSummary.weekEnd, { day: "numeric", month: "short" })}
                </span>
                {isCurrentWeek && (
                  <Badge variant="outline" className="text-[10px] mt-1 px-2 py-0 h-4 text-primary border-primary/50">
                    Esta semana
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-xs text-text-muted">Seleccionar semana</span>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleNextWeek}
              disabled={isCurrentWeek || loadingWeek}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de la semana seleccionada */}
      {weekSummary && (
        <div className="grid grid-cols-3 gap-2">
          {/* Peso */}
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <Scale className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-lg font-bold text-text">
                {weekSummary.avgWeight?.toFixed(1) || "—"}
              </p>
              <p className="text-[10px] text-text-muted">kg prom.</p>
              {weekSummary.weightChange !== null && (
                <div className={cn(
                  "flex items-center justify-center gap-1 mt-1",
                  weekSummary.weightChange < 0 ? "text-success" : weekSummary.weightChange > 0 ? "text-red-400" : "text-text-muted"
                )}>
                  {weekSummary.weightChange < 0 ? <TrendingDown className="w-3 h-3" /> : 
                   weekSummary.weightChange > 0 ? <TrendingUp className="w-3 h-3" /> : 
                   <Minus className="w-3 h-3" />}
                  <span className="text-[10px] font-medium">
                    {weekSummary.weightChange > 0 ? "+" : ""}{weekSummary.weightChange.toFixed(2)} kg
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calorías */}
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-text">
                {weekSummary.avgCalories || "—"}
              </p>
              <p className="text-[10px] text-text-muted">kcal/día</p>
              {data.targets?.dailyCalories && weekSummary.avgCalories && (
                <div className={cn(
                  "text-[10px] mt-1",
                  weekSummary.avgCalories <= data.targets.dailyCalories ? "text-success" : "text-orange-400"
                )}>
                  {Math.round((weekSummary.avgCalories / data.targets.dailyCalories) * 100)}% del objetivo
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pasos */}
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <Footprints className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-text">
                {weekSummary.avgSteps ? (weekSummary.avgSteps / 1000).toFixed(1) + "k" : "—"}
              </p>
              <p className="text-[10px] text-text-muted">pasos/día</p>
              {weekSummary.stepsGoalPercent !== null && (
                <div className={cn(
                  "text-[10px] mt-1",
                  weekSummary.stepsGoalPercent >= 100 ? "text-success" : weekSummary.stepsGoalPercent >= 80 ? "text-yellow-400" : "text-red-400"
                )}>
                  {Math.round(weekSummary.stepsGoalPercent)}% del objetivo
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Macros detallados */}
      {weekSummary && weekSummary.daysWithNutrition > 0 && (
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-text-muted">Macros promedio diario</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-red-400">{weekSummary.avgProtein || 0}g</p>
                <p className="text-[10px] text-text-muted">Proteína</p>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-400">{weekSummary.avgCarbs || 0}g</p>
                <p className="text-[10px] text-text-muted">Carbos</p>
              </div>
              <div>
                <p className="text-sm font-bold text-blue-400">{weekSummary.avgFat || 0}g</p>
                <p className="text-[10px] text-text-muted">Grasas</p>
              </div>
            </div>
            <p className="text-[10px] text-text-muted text-center mt-2">
              {weekSummary.daysWithNutrition} días con datos de {7}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Gráfico diario (Lun-Dom) - Sincronizado con la semana seleccionada */}
      <Card className="bg-surface/80 border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs text-text-muted flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Macros vs Peso
            </CardTitle>
            <span className="text-[10px] text-text-muted">
              {dailyChartRange?.start && dailyChartRange?.end 
                ? `${formatDate(dailyChartRange.start, { day: "numeric", month: "short" })} - ${formatDate(dailyChartRange.end, { day: "numeric", month: "short" })}`
                : "..."}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-2 relative">
          {loadingWeek && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-5 h-5 text-primary" />
              </motion.div>
            </div>
          )}
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={chartDisplayData} margin={{ top: 5, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 9 }} />
              <YAxis
                yAxisId="macros"
                orientation="left"
                domain={[0, maxMacros]}
                tick={{ fill: "#888", fontSize: 8 }}
                tickFormatter={(v) => `${v}g`}
                width={30}
              />
              <YAxis
                yAxisId="peso"
                orientation="right"
                domain={[minPeso, maxPeso]}
                tick={{ fill: "#4cceac", fontSize: 8 }}
                width={25}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* 3 barras agrupadas por día */}
              <Bar
                yAxisId="macros"
                dataKey="proteína"
                fill="#ef4444"
                fillOpacity={0.85}
                radius={[2, 2, 0, 0]}
                barSize={8}
              />
              <Bar
                yAxisId="macros"
                dataKey="carbos"
                fill="#f59e0b"
                fillOpacity={0.85}
                radius={[2, 2, 0, 0]}
                barSize={8}
              />
              <Bar
                yAxisId="macros"
                dataKey="grasas"
                fill="#3b82f6"
                fillOpacity={0.85}
                radius={[2, 2, 0, 0]}
                barSize={8}
              />

              {/* Línea de peso */}
              <Line
                yAxisId="peso"
                type="monotone"
                dataKey="peso"
                stroke="#4cceac"
                strokeWidth={3}
                dot={{ fill: "#4cceac", r: 5, stroke: "#4cceac", strokeWidth: 2 }}
                activeDot={{ fill: "#4cceac", r: 7 }}
                connectNulls
              />

            </ComposedChart>
          </ResponsiveContainer>

          {/* Leyenda */}
          <div className="flex flex-wrap justify-center gap-3 mt-2 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-red-500/80" />
              <span className="text-text-muted">Prote</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-amber-500/80" />
              <span className="text-text-muted">Carbos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-blue-500/80" />
              <span className="text-text-muted">Grasas</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="text-text-muted">Peso</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Pasos vs Peso - Correlación actividad física */}
      <Card className="bg-surface/80 border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs text-text-muted flex items-center gap-2">
              <Footprints className="w-3 h-3 text-primary" />
              Pasos vs Peso
            </CardTitle>
            <span className="text-[10px] text-text-muted">
              Más pasos → menor peso
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-2 relative">
          {loadingWeek && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-5 h-5 text-primary" />
              </motion.div>
            </div>
          )}
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={chartDisplayData} margin={{ top: 5, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 9 }} />
              <YAxis
                yAxisId="pasos"
                orientation="left"
                domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 10000)]}
                tick={{ fill: "#ff9800", fontSize: 8 }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                width={30}
              />
              <YAxis
                yAxisId="peso"
                orientation="right"
                domain={[minPeso, maxPeso]}
                tick={{ fill: "#4cceac", fontSize: 8 }}
                width={25}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a2e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(value, name) => {
                  if (name === "pasos") return [value?.toLocaleString() || "—", "Pasos"];
                  if (name === "peso") return [value ? `${value} kg` : "—", "Peso"];
                  return [value, name ?? ""];
                }}
              />
              
              {/* Barras de pasos */}
              <Bar
                yAxisId="pasos"
                dataKey="pasos"
                fill="#ff9800"
                fillOpacity={0.85}
                radius={[4, 4, 0, 0]}
                barSize={20}
              />

              {/* Línea de peso */}
              <Line
                yAxisId="peso"
                type="monotone"
                dataKey="peso"
                stroke="#4cceac"
                strokeWidth={3}
                dot={{ fill: "#4cceac", r: 5, stroke: "#4cceac", strokeWidth: 2 }}
                activeDot={{ fill: "#4cceac", r: 7 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Leyenda */}
          <div className="flex justify-center gap-6 mt-2 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-orange-500/80" />
              <span className="text-text-muted">Pasos/día</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="text-text-muted">Peso (kg)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =============== SECCIÓN DE EVOLUCIÓN SEMANAL =============== */}
      <Card className="bg-surface/80 border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-text flex items-center gap-2">
              <LineChartIcon className="w-4 h-4 text-primary" />
              Evolución Semanal
            </CardTitle>
            <div className="flex items-center gap-1">
              {[4, 8, 12].map((weeks) => (
                <Button
                  key={weeks}
                  variant={historyWeeks === weeks ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-[10px]",
                    historyWeeks === weeks && "bg-primary text-black"
                  )}
                  onClick={() => setHistoryWeeks(weeks)}
                >
                  {weeks}s
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-4 relative">
          {loadingHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg"
            >
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-xs text-text-muted mt-2">Cargando histórico...</p>
            </motion.div>
          )}

          {/* Gráfico de Peso Promedio Semanal */}
          {weightHistory?.hasData && weightHistory.weeks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Scale className="w-3 h-3 text-success" />
                  Peso promedio semanal
                </span>
                {weightHistory.summary.totalChange !== null && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4",
                      (weightHistory.summary.totalChange || 0) < 0 
                        ? "text-success border-success/50" 
                        : (weightHistory.summary.totalChange || 0) > 0 
                          ? "text-red-400 border-red-400/50" 
                          : "text-text-muted border-border"
                    )}
                  >
                    {(weightHistory.summary.totalChange || 0) > 0 ? "+" : ""}
                    {((weightHistory.summary.totalChange || 0) / 1000).toFixed(2)} kg
                  </Badge>
                )}
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart
                  data={weightHistory.weeks.map((w) => ({
                    name: `S${w.weekNumber}`,
                    value: w.averageWeight,
                    label: formatDate(w.weekStart, { day: "numeric", month: "short" }),
                  }))}
                  margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 9 }} />
                  <YAxis
                    domain={[
                      (dataMin: number) => Math.floor(dataMin - 1),
                      (dataMax: number) => Math.ceil(dataMax + 1)
                    ]}
                    tick={{ fill: "#4cceac", fontSize: 8 }}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    formatter={(value) => value != null ? [`${Number(value).toFixed(1)} kg`, "Peso"] : ["—", "Peso"]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.label || label}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#4cceac"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico de Pasos Promedio Semanal */}
          {stepsHistory?.hasData && stepsHistory.weeks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Footprints className="w-3 h-3 text-primary" />
                  Pasos promedio semanal
                </span>
                {stepsHistory.dailyGoal && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-text-muted border-border">
                    Meta: {(stepsHistory.dailyGoal / 1000).toFixed(0)}k/día
                  </Badge>
                )}
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart
                  data={stepsHistory.weeks.map((w) => ({
                    name: `S${w.weekNumber}`,
                    value: w.averageSteps,
                    label: formatDate(w.weekStart, { day: "numeric", month: "short" }),
                    goal: stepsHistory.dailyGoal,
                  }))}
                  margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 9 }} />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, stepsHistory.dailyGoal * 1.2)]}
                    tick={{ fill: "#ff9800", fontSize: 8 }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    formatter={(value) => value != null ? [`${Number(value).toLocaleString()} pasos`, "Promedio"] : ["—", "Promedio"]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.label || label}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  {stepsHistory.dailyGoal && (
                    <ReferenceLine
                      y={stepsHistory.dailyGoal}
                      stroke="#ff9800"
                      strokeDasharray="5 5"
                      strokeOpacity={0.5}
                    />
                  )}
                  <Bar
                    dataKey="value"
                    fill="#ff9800"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico de Macros Promedio Semanal */}
          {caloriesHistory?.hasData && caloriesHistory.weeks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" />
                  Macros promedio semanal
                </span>
                <div className="flex items-center gap-2 text-[9px]">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-red-500" />
                    <span className="text-text-muted">Prot</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-amber-500" />
                    <span className="text-text-muted">Carbs</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-blue-500" />
                    <span className="text-text-muted">Grasas</span>
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={caloriesHistory.weeks.map((w) => ({
                    name: `S${w.weekNumber}`,
                    protein: w.averageProtein,
                    carbs: w.averageCarbs,
                    fat: w.averageFat,
                    label: formatDate(w.weekStart, { day: "numeric", month: "short" }),
                  }))}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 8 }} />
                  <YAxis
                    tick={{ fill: "#888", fontSize: 8 }}
                    tickFormatter={(v) => `${v}g`}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    formatter={(value, name) => {
                      const labels: Record<string, string> = { protein: "Proteína", carbs: "Carbos", fat: "Grasas" };
                      return value != null ? [`${Number(value)}g`, labels[name as string] || name] : ["—", name];
                    }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.label || label}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar dataKey="protein" fill="#ef4444" radius={[2, 2, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="carbs" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="fat" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Mensaje si no hay datos */}
          {!loadingHistory && 
            (!weightHistory?.hasData || weightHistory.weeks.length === 0) &&
            (!stepsHistory?.hasData || stepsHistory.weeks.length === 0) &&
            (!caloriesHistory?.hasData || caloriesHistory.weeks.length === 0) && (
            <div className="text-center py-6">
              <LineChartIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-xs text-text-muted">
                Cargá datos de peso, pasos o calorías para ver la evolución semanal
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      {data.insights.length > 0 && (
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-text-muted flex items-center gap-2">
              <Lightbulb className="w-3 h-3 text-yellow-400" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {data.insights.map((insight, idx) => (
              <p key={idx} className="text-xs text-text">
                {insight}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

