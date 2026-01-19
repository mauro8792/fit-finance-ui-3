"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { getDashboardSummary, getWeightHistory, getStepsWeeklySummary, updateStepsForDate, deleteStepsForDate, updateWeight, deleteWeight } from "@/lib/api/student";
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [loadingSteps, setLoadingSteps] = useState(false);
  
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

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!student?.id) return;

      try {
        setLoading(true);
        const [summaryData, weightData, stepsData] = await Promise.all([
          getDashboardSummary(student.id).catch(() => null),
          getWeightHistory(student.id, 100).catch(() => []),
          getStepsWeeklySummary(student.id, 0).catch(() => null),
        ]);
        setSummary(summaryData);
        setWeightHistory(weightData);
        setStepsStats(stepsData);
      } catch (error) {
        console.error("Error loading progress:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [student?.id]);

  // Load steps for specific week when offset changes
  const loadStepsForWeek = async (offset: number) => {
    if (!student?.id) return;
    
    setLoadingSteps(true);
    try {
      const stepsData = await getStepsWeeklySummary(student.id, offset);
      setStepsStats(stepsData);
      setWeekOffset(offset);
    } catch (error) {
      console.error("Error loading steps:", error);
    } finally {
      setLoadingSteps(false);
    }
  };

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
      // Reload data
      loadStepsForWeek(weekOffset);
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
      // Reload data
      loadStepsForWeek(weekOffset);
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
  const stepsChartData = stepsStats?.stepsByDay?.map((d: any) => ({
    date: d.dayShort || d.day?.substring(0, 3) || "",
    pasos: d.steps || 0,
    meta: d.goal || stepsStats?.dailyGoal || 0,
  })) || [];

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
                          Meta: {summary?.steps?.dailyGoal?.toLocaleString() || 0} pasos/día
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

                {/* Steps Chart with Week Navigation */}
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
                  <CardContent className="p-2">
                    <div 
                      className="h-48 w-full relative outline-none focus:outline-none [&_svg]:outline-none [&_*]:outline-none"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      onMouseEnter={() => setIsStepsChartHovered(true)}
                      onMouseLeave={() => {
                        setIsStepsChartHovered(false);
                        setActiveBarIndex(undefined);
                      }}
                      onTouchStart={() => setIsStepsChartHovered(true)}
                      onTouchEnd={() => {
                        // Delay para permitir que se muestre el tooltip antes de ocultarlo
                        setTimeout(() => {
                          setIsStepsChartHovered(false);
                          setActiveBarIndex(undefined);
                        }, 2000);
                      }}
                    >
                      {loadingSteps && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {stepsChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={192} debounce={50}>
                          <BarChart 
                            data={stepsChartData} 
                            barCategoryGap="20%"
                            style={{ outline: 'none' }}
                            onMouseMove={(state) => {
                              if (state && typeof state.activeTooltipIndex === 'number') {
                                setActiveBarIndex(state.activeTooltipIndex);
                              }
                            }}
                            onMouseLeave={() => setActiveBarIndex(undefined)}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} horizontal={true} />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              tickLine={false}
                              axisLine={false}
                              width={40}
                            />
                            <Tooltip
                              active={isStepsChartHovered && activeBarIndex !== undefined}
                              content={({ payload, label }) => {
                                // Solo mostrar si el usuario está realmente haciendo hover
                                if (!isStepsChartHovered || activeBarIndex === undefined || !payload || payload.length === 0) return null;
                                const value = payload[0]?.value;
                                return (
                                  <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 shadow-lg">
                                    <p className="text-text-muted text-xs">{label}</p>
                                    <p className="text-accent font-medium">
                                      pasos: {typeof value === 'number' ? value.toLocaleString() : value}
                                    </p>
                                  </div>
                                );
                              }}
                              cursor={false}
                            />
                            <ReferenceLine
                              y={stepsStats?.dailyGoal || summary?.steps?.dailyGoal || 0}
                              stroke="#4cceac"
                              strokeDasharray="5 5"
                              label={{
                                value: "Meta",
                                fill: "#4cceac",
                                fontSize: 10,
                                position: "right",
                              }}
                            />
                            <Bar
                              dataKey="pasos"
                              radius={[4, 4, 0, 0]}
                            >
                              {stepsChartData.map((entry: any, index: number) => {
                                const goal = stepsStats?.dailyGoal || summary?.steps?.dailyGoal || 8000;
                                const reachedGoal = entry.pasos >= goal;
                                return (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={reachedGoal ? "#4cceac" : "#4cceac80"}
                                  />
                                );
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-text-muted">
                          No hay datos de pasos
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Stats - Uses selected week data */}
                <Card className="bg-surface/80 border-border">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-text">
                          {(stepsStats?.totalSteps || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-text-muted">Total semanal</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-text">
                          {stepsStats?.daysWithData || 0}/7
                        </p>
                        <p className="text-xs text-text-muted">Días con datos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Records - Editable */}
                {stepsStats?.stepsByDay?.some((d: any) => d.steps > 0) && (
                  <Card className="bg-surface/80 border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-text-secondary">
                        Registros diarios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {stepsStats.stepsByDay
                          .filter((d: any) => d.steps > 0)
                          .slice(0, 5)
                          .map((day: any) => (
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
                                    <p className="font-semibold text-text">
                                      {day.steps.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                      {day.achieved ? (
                                        <span className="text-success">✓ Meta</span>
                                      ) : (
                                        <span>{day.percentage}%</span>
                                      )}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-text-muted hover:text-primary"
                                    onClick={() => handleStartEdit(day.date, day.steps)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-text-muted hover:text-red-400"
                                    onClick={() => handleDeleteSteps(day.date, day.day)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
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

