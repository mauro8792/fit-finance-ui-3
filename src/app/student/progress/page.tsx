"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { getDashboardSummary, getWeightHistory, getStepsWeeklySummary, getStepsWeeklyStats, getRecentStepsDays, updateStepsForDate, deleteStepsForDate, updateWeight, deleteWeight } from "@/lib/api/student";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Scale,
  Footprints,
  TrendingUp,
  TrendingDown,
  Plus,
  Calendar,
  Target,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  X,
  Ruler,
  Camera,
} from "lucide-react";
import { cn, formatDate, parseLocalDate } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
  Cell,
} from "recharts";
import type { DashboardSummary, WeightLog } from "@/types";
import { WeeklyCorrelationDashboard } from "@/components/charts/WeeklyCorrelationDashboard";

export default function ProgressPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { student } = useAuthStore();
  
  // Get initial tab from URL or default to "weight"
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl === "steps" ? "steps" : "weight");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightLog[]>([]);
  const [stepsStats, setStepsStats] = useState<any>(null);
  const [weeklyAverages, setWeeklyAverages] = useState<any>(null);
  const [weeklyAvgOffset, setWeeklyAvgOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [recentDays, setRecentDays] = useState<any>(null); // For daily records section
  
  // Cache refs to avoid duplicate calls
  const dataLoadedRef = useRef(false);
  const weekCacheRef = useRef<Map<number, any>>(new Map());
  
  // Edit steps state
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [isStepsChartHovered, setIsStepsChartHovered] = useState(false);
  const [activeBarIndex, setActiveBarIndex] = useState<number | undefined>(undefined);

  // Edit weight state
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null);
  const [editWeightValue, setEditWeightValue] = useState<string>("");
  const [savingWeightEdit, setSavingWeightEdit] = useState(false);

  // Load initial data (with cache to avoid duplicate calls)
  useEffect(() => {
    const loadData = async () => {
      if (!student?.id || dataLoadedRef.current) return;
      dataLoadedRef.current = true;

      try {
        setLoading(true);
        const [summaryData, weightData, stepsData, weeklyData, recentData] = await Promise.all([
          getDashboardSummary(student.id).catch(() => null),
          getWeightHistory(student.id, 100).catch(() => []),
          getStepsWeeklySummary(student.id, 0).catch(() => null),
          getStepsWeeklyStats(student.id).catch(() => null),
          getRecentStepsDays(student.id, 5).catch(() => null),
        ]);
        setSummary(summaryData);
        setWeightHistory(weightData);
        setStepsStats(stepsData);
        setWeeklyAverages(weeklyData);
        setRecentDays(recentData);
        
        // Cache the current week's data
        if (stepsData) {
          weekCacheRef.current.set(0, stepsData);
        }
      } catch (error) {
        console.error("Error loading progress:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [student?.id]);

  // Load steps for specific week when offset changes (with cache)
  const loadStepsForWeek = useCallback(async (offset: number) => {
    if (!student?.id) return;
    
    // Check cache first
    const cached = weekCacheRef.current.get(offset);
    if (cached) {
      setStepsStats(cached);
      setWeekOffset(offset);
      return;
    }
    
    setLoadingSteps(true);
    try {
      const stepsData = await getStepsWeeklySummary(student.id, offset);
      setStepsStats(stepsData);
      setWeekOffset(offset);
      // Cache the result
      weekCacheRef.current.set(offset, stepsData);
    } catch (error) {
      console.error("Error loading steps:", error);
    } finally {
      setLoadingSteps(false);
    }
  }, [student?.id]);
  
  // Reload recent days after edit/delete
  const reloadRecentDays = useCallback(async () => {
    if (!student?.id) return;
    try {
      const recentData = await getRecentStepsDays(student.id, 5);
      setRecentDays(recentData);
      // Also invalidate week cache since data changed
      weekCacheRef.current.clear();
      // Reload current week view
      const stepsData = await getStepsWeeklySummary(student.id, weekOffset);
      setStepsStats(stepsData);
      weekCacheRef.current.set(weekOffset, stepsData);
    } catch (error) {
      console.error("Error reloading recent days:", error);
    }
  }, [student?.id, weekOffset]);

  const handlePrevWeek = () => {
    if (weekOffset < 8) { // Limit to 8 weeks back
      loadStepsForWeek(weekOffset + 1);
    }
  };

  const handleNextWeek = () => {
    if (weekOffset > 0) {
      loadStepsForWeek(weekOffset - 1);
    }
  };

  // Edit steps handlers
  const handleStartEdit = (date: string, currentSteps: number) => {
    setEditingDate(date);
    setEditValue(currentSteps.toString());
  };

  const handleCancelEdit = () => {
    setEditingDate(null);
    setEditValue("");
  };

  const handleSaveEdit = async (date: string) => {
    if (!student?.id || !editValue) return;
    
    const newSteps = parseInt(editValue);
    if (isNaN(newSteps) || newSteps < 0) {
      toast.error("Ingresá una cantidad válida");
      return;
    }

    setSavingEdit(true);
    try {
      await updateStepsForDate(student.id, date, newSteps);
      toast.success("Pasos actualizados");
      setEditingDate(null);
      setEditValue("");
      // Reload both recent days and current week
      reloadRecentDays();
    } catch (error) {
      console.error("Error updating steps:", error);
      toast.error("Error al actualizar");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteSteps = async (date: string, dayName: string) => {
    if (!student?.id) return;
    
    if (!confirm(`¿Eliminar los pasos del ${dayName}?`)) return;

    try {
      await deleteStepsForDate(student.id, date);
      toast.success("Pasos eliminados");
      // Reload both recent days and current week
      reloadRecentDays();
    } catch (error) {
      console.error("Error deleting steps:", error);
      toast.error("Error al eliminar");
    }
  };

  // Edit weight handlers
  const handleStartWeightEdit = (id: number, currentWeight: number) => {
    setEditingWeightId(id);
    setEditWeightValue(currentWeight.toString());
  };

  const handleCancelWeightEdit = () => {
    setEditingWeightId(null);
    setEditWeightValue("");
  };

  const handleSaveWeightEdit = async (id: number) => {
    if (!editWeightValue) return;
    
    const newWeight = parseFloat(editWeightValue);
    if (isNaN(newWeight) || newWeight <= 0) {
      toast.error("Ingresá un peso válido");
      return;
    }

    setSavingWeightEdit(true);
    try {
      await updateWeight(id, newWeight);
      toast.success("Peso actualizado");
      setEditingWeightId(null);
      setEditWeightValue("");
      // Reload data
      if (student?.id) {
        const weightData = await getWeightHistory(student.id, 100);
        setWeightHistory(weightData);
      }
    } catch (error) {
      console.error("Error updating weight:", error);
      toast.error("Error al actualizar");
    } finally {
      setSavingWeightEdit(false);
    }
  };

  const handleDeleteWeight = async (id: number, date: string) => {
    if (!confirm(`¿Eliminar el registro de peso del ${date}?`)) return;

    try {
      await deleteWeight(id);
      toast.success("Registro eliminado");
      // Reload data
      if (student?.id) {
        const weightData = await getWeightHistory(student.id, 100);
        setWeightHistory(weightData);
      }
    } catch (error) {
      console.error("Error deleting weight:", error);
      toast.error("Error al eliminar");
    }
  };

  // Prepare weight chart data - mostrar TODO el histórico
  const weightChartData = [...weightHistory]
    .reverse() // Ordenar de más antiguo a más reciente
    .map((w) => ({
      date: formatDate(w.date, { day: "2-digit", month: "2-digit" }),
      peso: typeof w.weight === 'string' ? parseFloat(w.weight) : w.weight,
    }));

  // Prepare steps chart data from stepsByDay
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const stepsChartData = stepsStats?.stepsByDay?.map((d: any) => {
    // Determine if this is today
    const dateStr = d.fullDate || d.date;
    const isToday = dateStr === todayStr;
    
    // Get day short name
    let dayShort = d.dayShort || d.day?.substring(0, 3) || "";
    if (d.fullDate) {
      const dayDate = new Date(d.fullDate + 'T12:00:00');
      dayShort = dayNamesShort[dayDate.getDay()];
    }
    
    return {
      date: dayShort,
      dayShort: dayShort,
      pasos: d.steps || 0,
      meta: d.goal || stepsStats?.dailyGoal || 0,
      minimum: d.minimum || stepsStats?.dailyMinimum || 5000,
      achieved: d.achieved,
      achievedMinimum: d.achievedMinimum,
      isToday,
      fullDate: dateStr,
    };
  }) || [];

  // Get current weight from summary or from the latest weight history entry
  const currentWeight = typeof summary?.weight?.current === 'number' 
    ? summary.weight.current 
    : (weightHistory.length > 0 
      ? (typeof weightHistory[0].weight === 'number' ? weightHistory[0].weight : parseFloat(weightHistory[0].weight))
      : null);
  
  // Weight change comes in GRAMS from backend, convert to KG
  const weightChangeGrams = typeof summary?.weight?.weeklyChange === 'number' ? summary.weight.weeklyChange : 0;
  const weightChange = weightChangeGrams / 1000; // Convert to kg
  
  const stepsProgress = summary?.steps
    ? Math.min((summary.steps.weekAverage / summary.steps.dailyGoal) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Mi Progreso"
        subtitle="Seguimiento de peso y actividad"
        rightContent={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(activeTab === "steps" ? "/student/cardio/calendar" : "/student/progress/add-weight")}
            className="text-primary"
          >
            <Plus className="w-4 h-4 mr-1" />
            Cargar
          </Button>
        }
      />

      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-surface border border-border">
            <TabsTrigger
              value="weight"
              className="data-[state=active]:bg-primary data-[state=active]:text-black text-xs"
            >
              <Scale className="w-4 h-4 mr-1" />
              Peso
            </TabsTrigger>
            <TabsTrigger
              value="steps"
              className="data-[state=active]:bg-accent data-[state=active]:text-black text-xs"
            >
              <Footprints className="w-4 h-4 mr-1" />
              Pasos
            </TabsTrigger>
            <TabsTrigger
              value="analysis"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-black text-xs"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Análisis
            </TabsTrigger>
          </TabsList>

          {/* Weight Tab */}
          <TabsContent value="weight" className="mt-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Current Weight Card */}
                <Card className="bg-surface/80 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-text-muted">Peso actual</p>
                        <p className="text-3xl font-bold text-text">
                          {currentWeight !== null ? currentWeight.toFixed(2) : "--"} kg
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {weightChange !== 0 && (
                            <>
                              {weightChange < 0 ? (
                                <TrendingDown className="w-4 h-4 text-success" />
                              ) : (
                                <TrendingUp className="w-4 h-4 text-warning" />
                              )}
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  weightChange < 0 ? "text-success" : "text-warning"
                                )}
                              >
                                {weightChange > 0 ? "+" : ""}{weightChange.toFixed(2)} kg esta semana
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                        <Scale className="w-7 h-7 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weight Chart */}
                <Card className="bg-surface/80 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-text-secondary flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Evolución del peso
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <div className="h-48">
                      {weightChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={weightChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              domain={["dataMin - 0.5", "dataMax + 0.5"]}
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              tickLine={false}
                              axisLine={false}
                              width={35}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "#1a1a2e",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                              }}
                              labelStyle={{ color: "#94a3b8" }}
                            />
                            <Line
                              type="monotone"
                              dataKey="peso"
                              stroke="#ff9800"
                              strokeWidth={2}
                              dot={{ fill: "#ff9800", strokeWidth: 0, r: 4 }}
                              activeDot={{ r: 6, fill: "#ff9800" }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-text-muted">
                          No hay datos de peso
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Entries - Editable */}
                {weightHistory.length > 0 && (
                  <Card className="bg-surface/80 border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-text-secondary">
                        Registros recientes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {weightHistory.slice(0, 5).map((entry) => {
                          const weightNum = typeof entry.weight === 'number' ? entry.weight : parseFloat(entry.weight);
                          const dateStr = formatDate(entry.date, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          });

                          return (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between px-4 py-3"
                            >
                              <span className="text-sm text-text-muted">
                                {dateStr}
                              </span>

                              {editingWeightId === entry.id ? (
                                // Edit mode
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editWeightValue}
                                    onChange={(e) => setEditWeightValue(e.target.value)}
                                    className="w-20 h-8 text-right text-sm"
                                    autoFocus
                                  />
                                  <span className="text-sm text-text-muted">kg</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-success"
                                    onClick={() => handleSaveWeightEdit(entry.id)}
                                    disabled={savingWeightEdit}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-text-muted"
                                    onClick={handleCancelWeightEdit}
                                    disabled={savingWeightEdit}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                // View mode
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-text">
                                    {weightNum.toFixed(2)} kg
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-text-muted hover:text-primary"
                                    onClick={() => handleStartWeightEdit(entry.id, weightNum)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-text-muted hover:text-red-400"
                                    onClick={() => handleDeleteWeight(entry.id, dateStr)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Card de Antropometría */}
                <Card 
                  className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 cursor-pointer hover:border-purple-500/50 transition-colors"
                  onClick={() => router.push("/student/progress/measurements")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-purple-500/30 flex items-center justify-center">
                          <Camera className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-text">Antropometría</p>
                          <p className="text-xs text-text-muted">Historial de mediciones y fotos de progreso</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* Steps Tab */}
          <TabsContent value="steps" className="mt-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Steps Summary Card */}
                <Card className="bg-surface/80 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-text-muted">Promedio semanal</p>
                        <p className="text-3xl font-bold text-text">
                          {summary?.steps?.weekAverage?.toLocaleString() || 0}
                        </p>
                        <p className="text-sm text-text-muted mt-1">
                          Objetivo: {summary?.steps?.dailyGoal?.toLocaleString() || 0} pasos/día
                        </p>
                      </div>
                      <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
                        <Footprints className="w-7 h-7 text-accent" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Cumplimiento</span>
                        <span className="font-medium text-accent">
                          {typeof summary?.steps?.compliancePercent === 'number' ? summary.steps.compliancePercent.toFixed(0) : 0}%
                        </span>
                      </div>
                      <Progress value={stepsProgress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Averages Historical Chart */}
                <Card className="bg-surface/80 border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base text-text-secondary flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Promedios semanales
                      </CardTitle>
                      {weeklyAverages?.weeks?.length > 7 && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setWeeklyAvgOffset(prev => Math.min(prev + 7, (weeklyAverages?.weeks?.length || 7) - 7))}
                            disabled={weeklyAvgOffset >= (weeklyAverages?.weeks?.length || 7) - 7}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setWeeklyAvgOffset(prev => Math.max(prev - 7, 0))}
                            disabled={weeklyAvgOffset <= 0}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {weeklyAverages?.hasData && weeklyAverages?.weeks?.length > 0 ? (
                      <>
                        {/* Bar Chart with values on top - Weekly Averages */}
                        {(() => {
                          const goal = weeklyAverages?.dailyGoal || 8000;
                          // Get last 7 weeks based on offset
                          const allWeeks = weeklyAverages?.weeks || [];
                          const startIdx = Math.max(0, allWeeks.length - 7 - weeklyAvgOffset);
                          const endIdx = allWeeks.length - weeklyAvgOffset;
                          const visibleWeeks = allWeeks.slice(startIdx, endIdx);
                          
                          const maxAvg = Math.max(...visibleWeeks.map((w: any) => w.averageSteps), goal);
                          const yAxisMax = Math.ceil(maxAvg / 2000) * 2000;
                          
                          // Check if current week is in visible range
                          const currentWeekIdx = allWeeks.length - 1;
                          
                          // Format steps number (abbreviate if > 999)
                          const formatSteps = (n: number) => {
                            if (n >= 10000) return `${(n/1000).toFixed(0)}k`;
                            if (n >= 1000) return `${(n/1000).toFixed(1)}k`;
                            return n.toString();
                          };
                          
                          const CHART_HEIGHT = 140; // Fixed height in pixels for the bar area
                          
                          return (
                            <div className="mb-3">
                              {/* Chart area - only goal value on Y-axis */}
                              <div className="flex gap-4">
                                {/* Y-axis - only goal value */}
                                <div className="relative w-11 text-right pr-3" style={{ height: CHART_HEIGHT }}>
                                  <span 
                                    className="absolute text-[9px] text-accent font-medium transform -translate-y-1/2"
                                    style={{ bottom: `${(goal / yAxisMax) * 100}%` }}
                                  >
                                    {(goal/1000).toFixed(0)}k
                                  </span>
                                </div>
                                
                                {/* Bars area */}
                                <div className="flex-1 flex items-end justify-between gap-2 relative" style={{ height: CHART_HEIGHT }}>
                                  {/* Goal reference line */}
                                  <div 
                                    className="absolute left-0 right-0 border-t-2 border-dashed border-accent/60 z-10"
                                    style={{ bottom: `${(goal / yAxisMax) * 100}%` }}
                                  />
                                  
                                  {visibleWeeks.map((week: any, index: number) => {
                                    const heightPercent = yAxisMax > 0 ? (week.averageSteps / yAxisMax) * 100 : 0;
                                    const reachedGoal = week.averageSteps >= goal;
                                    const isCurrentWeek = startIdx + index === currentWeekIdx;
                                    
                                    return (
                                      <div 
                                        key={index} 
                                        className={cn(
                                          "flex-1 flex flex-col items-center justify-end rounded-lg transition-colors h-full",
                                          isCurrentWeek && "bg-primary/15"
                                        )}
                                      >
                                        {/* Value on top of bar */}
                                        {week.averageSteps > 0 && (
                                          <div className="flex flex-col items-center mb-1">
                                            {reachedGoal && <img src="/icons/Imagen12.png" alt="goal" className="w-4 h-4" />}
                                            <span className={cn(
                                              "text-[9px] font-medium",
                                              reachedGoal ? "text-accent" : "text-text-muted"
                                            )}>
                                              {formatSteps(week.averageSteps)}
                                            </span>
                                          </div>
                                        )}
                                        
                                        {/* Bar */}
                                        <div 
                                          className={cn(
                                            "w-full max-w-[36px] rounded-t-md transition-all",
                                            reachedGoal ? "bg-accent" : "bg-accent/50"
                                          )}
                                          style={{ 
                                            height: `${Math.max(heightPercent, week.averageSteps > 0 ? 3 : 0)}%`,
                                            minHeight: week.averageSteps > 0 ? '4px' : '0px'
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              
                              {/* X-axis labels */}
                              <div className="flex gap-4 mt-1">
                                <div className="w-11" /> {/* Spacer for Y-axis */}
                                <div className="flex-1 flex justify-between gap-2">
                                  {visibleWeeks.map((week: any, index: number) => {
                                    const isCurrentWeek = startIdx + index === currentWeekIdx;
                                    const weekDate = new Date(week.weekStart + 'T12:00:00');
                                    const dayNum = weekDate.getDate();
                                    const monthShort = weekDate.toLocaleDateString('es', { month: 'short' }).slice(0, 3);
                                    
                                    return (
                                      <span 
                                        key={index}
                                        className={cn(
                                          "flex-1 text-[9px] leading-tight text-center",
                                          isCurrentWeek ? "text-primary font-bold" : "text-text-muted"
                                        )}
                                      >
                                        {dayNum}/{monthShort}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                          <div className="text-center">
                            <p className="text-xl font-bold text-text">
                              {(weeklyAverages?.weeks?.[weeklyAverages.weeks.length - 1]?.averageSteps || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-text-muted">Promedio esta semana</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-text">
                              {(weeklyAverages?.weeks?.[weeklyAverages.weeks.length - 1]?.totalSteps || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-text-muted">Total esta semana</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-36 flex items-center justify-center text-text-muted">
                        No hay datos históricos de pasos
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Steps Chart with Week Navigation - Unified Style */}
                <Card className="bg-surface/80 border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base text-text-secondary flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        {stepsStats?.weekLabel || "Esta semana"}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handlePrevWeek}
                          disabled={weekOffset >= 8 || loadingSteps}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleNextWeek}
                          disabled={weekOffset <= 0 || loadingSteps}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {stepsStats?.weekStart && stepsStats?.weekEnd && (
                      <p className="text-xs text-text-muted mt-1">
                        {formatDate(stepsStats.weekStart, { day: "numeric", month: "short" })} - {formatDate(stepsStats.weekEnd, { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {loadingSteps && (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!loadingSteps && stepsChartData.length > 0 && (
                      <>
                        {/* Bar Chart with values on top */}
                        {(() => {
                          const goal = stepsStats?.dailyGoal || summary?.steps?.dailyGoal || 8000;
                          const minimum = stepsStats?.dailyMinimum || 5000;
                          const maxSteps = Math.max(...stepsChartData.map((d: any) => d.pasos), goal);
                          const yAxisMax = Math.ceil(maxSteps / 2000) * 2000;
                          
                          // Format steps number (abbreviate if > 999)
                          const formatSteps = (n: number) => {
                            if (n >= 10000) return `${(n/1000).toFixed(0)}k`;
                            if (n >= 1000) return `${(n/1000).toFixed(1)}k`;
                            return n.toString();
                          };
                          
                          const CHART_HEIGHT = 140; // Fixed height in pixels for the bar area
                          
                          return (
                            <div className="mb-3">
                              {/* Chart area - goal and minimum values on Y-axis */}
                              <div className="flex gap-4">
                                {/* Y-axis - goal and minimum values */}
                                <div className="relative w-11 text-right pr-3" style={{ height: CHART_HEIGHT }}>
                                  {/* Goal value */}
                                  <span 
                                    className="absolute text-[9px] text-accent font-medium transform -translate-y-1/2"
                                    style={{ bottom: `${(goal / yAxisMax) * 100}%` }}
                                  >
                                    {(goal/1000).toFixed(0)}k
                                  </span>
                                  {/* Minimum value */}
                                  <span 
                                    className="absolute text-[8px] text-success font-medium transform -translate-y-1/2"
                                    style={{ bottom: `${(minimum / yAxisMax) * 100}%` }}
                                  >
                                    {(minimum/1000).toFixed(1)}k
                                  </span>
                                </div>
                                
                                {/* Bars area */}
                                <div className="flex-1 relative" style={{ height: CHART_HEIGHT }}>
                                  {/* Goal reference line */}
                                  <div 
                                    className="absolute left-0 right-0 border-t-2 border-dashed border-accent/60 z-10"
                                    style={{ bottom: `${(goal / yAxisMax) * 100}%` }}
                                  />
                                  {/* Minimum reference line */}
                                  <div 
                                    className="absolute left-0 right-0 border-t border-dotted border-success/50 z-10"
                                    style={{ bottom: `${(minimum / yAxisMax) * 100}%` }}
                                  />
                                  
                                  {/* Bars container */}
                                  <div className="absolute inset-0 flex items-end justify-between gap-2">
                                    {stepsChartData.map((day: any, index: number) => {
                                      const heightPercent = yAxisMax > 0 ? (day.pasos / yAxisMax) * 100 : 0;
                                      const reachedGoal = day.achieved || day.pasos >= goal;
                                      const reachedMinimum = day.achievedMinimum || day.pasos >= (day.minimum || stepsStats?.dailyMinimum || 5000);
                                      const isToday = day.isToday;
                                      
                                      return (
                                        <div 
                                          key={index} 
                                          className={cn(
                                            "flex-1 relative rounded-lg transition-colors",
                                            isToday && "bg-primary/15"
                                          )}
                                          style={{ height: '100%' }}
                                        >
                                          {/* Background bar (shadow/track) - full height */}
                                          <div 
                                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[36px] rounded-md bg-text-muted/20"
                                            style={{ height: '100%' }}
                                          />
                                          
                                          {/* Foreground bar - actual progress */}
                                          <div 
                                            className={cn(
                                              "absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[36px] rounded-md transition-all flex flex-col items-center justify-end pb-1",
                                              reachedGoal ? "bg-accent" : reachedMinimum ? "bg-success" : "bg-accent/50"
                                            )}
                                            style={{ 
                                              height: `${Math.max(heightPercent, day.pasos > 0 ? 2 : 0)}%`,
                                              minHeight: day.pasos > 0 ? '24px' : '0px'
                                            }}
                                          >
                                            {/* Icon inside bar - at bottom */}
                                            {reachedGoal ? (
                                              <img src="/icons/gorila.png" alt="goal" className="w-6 h-6" />
                                            ) : reachedMinimum ? (
                                              <span className="text-sm text-background font-bold">✓</span>
                                            ) : null}
                                          </div>
                                          
                                          {/* Value on top of bar - positioned absolutely */}
                                          {day.pasos > 0 && (
                                            <div 
                                              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
                                              style={{ bottom: `calc(${Math.max(heightPercent, 2)}% + 4px)` }}
                                            >
                                              <span className={cn(
                                                "text-[9px] font-medium whitespace-nowrap",
                                                reachedGoal ? "text-accent" : reachedMinimum ? "text-success" : "text-text-muted"
                                              )}>
                                                {formatSteps(day.pasos)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              
                              {/* X-axis labels */}
                              <div className="flex gap-4 mt-1">
                                <div className="w-11" /> {/* Spacer for Y-axis */}
                                <div className="flex-1 flex justify-between gap-2">
                                  {stepsChartData.map((day: any, index: number) => {
                                    const isToday = day.isToday;
                                    
                                    return (
                                      <span 
                                        key={index}
                                        className={cn(
                                          "flex-1 text-[10px] text-center",
                                          isToday ? "text-primary font-bold" : "text-text-muted"
                                        )}
                                      >
                                        {day.dayShort}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                      </>
                    )}
                    {!loadingSteps && stepsChartData.length === 0 && (
                      <div className="h-36 flex items-center justify-center text-text-muted">
                        No hay datos de pasos
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Daily Records - Shows last 5 days (independent of week chart) */}
                {recentDays?.days?.length > 0 && (
                  <Card className="bg-surface/80 border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-text-secondary">
                        Registros diarios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {recentDays.days.map((day: any) => (
                            <div
                              key={day.date}
                              className="flex items-center justify-between px-4 py-3"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-text">
                                  {day.day}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {formatDate(day.date, { day: "numeric", month: "short" })}
                                </p>
                              </div>

                              {editingDate === day.date ? (
                                // Edit mode
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-24 h-8 text-right text-sm"
                                    autoFocus
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-success"
                                    onClick={() => handleSaveEdit(day.date)}
                                    disabled={savingEdit}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-text-muted"
                                    onClick={handleCancelEdit}
                                    disabled={savingEdit}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                // View mode
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    {day.steps > 0 ? (
                                      <p className="font-semibold text-text">
                                        {day.steps.toLocaleString()}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-text-muted">—</p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-text-muted hover:text-primary"
                                    onClick={() => handleStartEdit(day.date, day.steps || 0)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  {day.steps > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-text-muted hover:text-red-400"
                                      onClick={() => handleDeleteSteps(day.date, day.day)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </TabsContent>

          {/* Analysis Tab - forceMount para evitar re-renders y llamadas duplicadas */}
          <TabsContent value="analysis" className="mt-4" forceMount hidden={activeTab !== "analysis"}>
            {student?.id && (
              <WeeklyCorrelationDashboard studentId={student.id} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

