"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { getStudentById, getStudentWeightStats, getStudentStepsStats } from "@/lib/api/coach";
import { getWeightLogs } from "@/lib/api/health";
import { getStepsWeeklySummary, deleteStepsForDate, updateStepsForDate, updateWeight, deleteWeight } from "@/lib/api/student";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Scale,
  Footprints,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  X,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate, parseLocalDate } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import type { Student, WeightLog } from "@/types";
import { WeeklyCorrelationDashboard } from "@/components/charts/WeeklyCorrelationDashboard";
import api from "@/lib/api";

export default function StudentProgressPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = Number(params.studentId);

  // Get initial tab from URL or default to "weight"
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl === "steps" ? "steps" : tabFromUrl === "analysis" ? "analysis" : "weight");
  
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightLog[]>([]);
  const [stepsStats, setStepsStats] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loadingSteps, setLoadingSteps] = useState(false);

  // Edit steps state
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit weight state
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null);
  const [editWeightValue, setEditWeightValue] = useState<string>("");
  const [savingWeightEdit, setSavingWeightEdit] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [studentData, weightData, stepsData, statsData] = await Promise.all([
          getStudentById(studentId),
          getWeightLogs(studentId, 100),
          getStepsWeeklySummary(studentId, 0).catch(() => null),
          getStudentWeightStats(studentId).catch(() => null),
        ]);
        setStudent(studentData);
        setWeightHistory(weightData || []);
        setStepsStats(stepsData);
        setWeeklyStats(statsData);
      } catch (error) {
        console.error("Error loading progress:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  // Load steps for specific week when offset changes
  const loadStepsForWeek = async (offset: number) => {
    setLoadingSteps(true);
    try {
      const stepsData = await getStepsWeeklySummary(studentId, offset);
      setStepsStats(stepsData);
      setWeekOffset(offset);
    } catch (error) {
      console.error("Error loading steps:", error);
    } finally {
      setLoadingSteps(false);
    }
  };

  const handlePrevWeek = () => {
    if (weekOffset < 8) {
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
    if (!editValue) return;
    
    const newSteps = parseInt(editValue);
    if (isNaN(newSteps) || newSteps < 0) {
      toast.error("Ingresá una cantidad válida");
      return;
    }

    setSavingEdit(true);
    try {
      await updateStepsForDate(studentId, date, newSteps);
      toast.success("Pasos actualizados");
      setEditingDate(null);
      setEditValue("");
      loadStepsForWeek(weekOffset);
    } catch (error) {
      console.error("Error updating steps:", error);
      toast.error("Error al actualizar");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteSteps = async (date: string, dayName: string) => {
    if (!confirm(`¿Eliminar los pasos del ${dayName}?`)) return;

    try {
      await deleteStepsForDate(studentId, date);
      toast.success("Pasos eliminados");
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
      const weightData = await getWeightLogs(studentId, 100);
      setWeightHistory(weightData);
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
      const weightData = await getWeightLogs(studentId, 100);
      setWeightHistory(weightData);
    } catch (error) {
      console.error("Error deleting weight:", error);
      toast.error("Error al eliminar");
    }
  };

  // Prepare weight chart data (last 14 days)
  const weightChartData = [...weightHistory]
    .reverse()
    .slice(-14)
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

  // Get current weight
  const currentWeight = weightHistory.length > 0
    ? (typeof weightHistory[0].weight === 'number' ? weightHistory[0].weight : parseFloat(weightHistory[0].weight))
    : null;

  // Calculate weekly weight change
  const weeklyWeightChange = (() => {
    if (weeklyStats?.weeklyChange) {
      return weeklyStats.weeklyChange / 1000; // Convert grams to kg
    }
    if (weightHistory.length >= 2) {
      const latest = typeof weightHistory[0].weight === 'number' ? weightHistory[0].weight : parseFloat(weightHistory[0].weight);
      const weekAgo = weightHistory.find((w) => {
        const date = parseLocalDate(w.date);
        const diff = date ? (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24) : 0;
        return diff >= 6;
      });
      if (weekAgo) {
        const weekAgoWeight = typeof weekAgo.weight === 'number' ? weekAgo.weight : parseFloat(weekAgo.weight);
        return latest - weekAgoWeight;
      }
    }
    return 0;
  })();

  const stepsProgress = stepsStats?.dailyGoal
    ? Math.min(((stepsStats?.totalSteps || 0) / 7 / stepsStats.dailyGoal) * 100, 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Progreso" backHref={`/coach/students/${studentId}`} />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Progreso"
        subtitle={`${student?.firstName} ${student?.lastName}`}
        backHref={`/coach/students/${studentId}`}
        rightContent={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/coach/students/${studentId}/settings`)}
            className="text-text-muted"
          >
            <Settings className="w-5 h-5" />
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
                        {currentWeight !== null ? currentWeight.toFixed(1) : "--"} kg
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {weeklyWeightChange !== 0 && (
                          <>
                            {weeklyWeightChange < 0 ? (
                              <TrendingDown className="w-4 h-4 text-success" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-warning" />
                            )}
                            <span
                              className={cn(
                                "text-sm font-medium",
                                weeklyWeightChange < 0 ? "text-success" : "text-warning"
                              )}
                            >
                              {weeklyWeightChange > 0 ? "+" : ""}{weeklyWeightChange.toFixed(1)} kg esta semana
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                      <Scale className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  {/* Goal indicator */}
                  {student?.weeklyWeightGoal && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-text-muted" />
                        <span className="text-xs text-text-muted">
                          Objetivo: {student.weeklyWeightGoal > 0 ? "+" : ""}{student.weeklyWeightGoal}g/semana
                          ({Number(student.weeklyWeightGoal) < 0 ? "Déficit" : Number(student.weeklyWeightGoal) > 0 ? "Volumen" : "Mantener"})
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Weight Chart */}
              <Card className="bg-surface/80 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-text-secondary flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Últimos 14 días
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
            </motion.div>
          </TabsContent>

          {/* Steps Tab */}
          <TabsContent value="steps" className="mt-4 space-y-4">
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
                        {stepsStats?.averageSteps?.toLocaleString() || 0}
                      </p>
                      <p className="text-sm text-text-muted mt-1">
                        Meta: {student?.dailyStepsGoal?.toLocaleString() || stepsStats?.dailyGoal?.toLocaleString() || 0} pasos/día
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
                        {stepsStats?.compliancePercent?.toFixed(0) || 0}%
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
                  <div className="h-48 relative">
                    {loadingSteps && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {stepsChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stepsChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
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
                            contentStyle={{
                              background: "#1a1a2e",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "#94a3b8" }}
                            formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}
                          />
                          <ReferenceLine
                            y={stepsStats?.dailyGoal || student?.dailyStepsGoal || 0}
                            stroke="#4cceac"
                            strokeDasharray="5 5"
                            label={{
                              value: "Meta",
                              fill: "#4cceac",
                              fontSize: 10,
                              position: "right",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="pasos"
                            stroke="#4cceac"
                            fill="url(#stepsGradientCoach)"
                            strokeWidth={2}
                          />
                          <defs>
                            <linearGradient id="stepsGradientCoach" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4cceac" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#4cceac" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-text-muted">
                        No hay datos de pasos
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Stats */}
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
          </TabsContent>

          {/* Analysis Tab - forceMount para evitar re-renders y llamadas duplicadas */}
          <TabsContent value="analysis" className="mt-4" forceMount hidden={activeTab !== "analysis"}>
            <WeeklyCorrelationDashboard studentId={studentId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
