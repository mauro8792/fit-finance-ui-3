"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getStudentById } from "@/lib/api/coach";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Footprints,
  Bike,
  Timer,
  Flame,
  Calendar,
  TrendingUp,
  Route,
  Activity,
  Zap,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import api from "@/lib/api";
import type { Student } from "@/types";

// Mapeo de actividades a iconos y nombres
const ACTIVITY_MAP: Record<string, { icon: string; name: string; color: string }> = {
  treadmill: { icon: "🚶‍♂️", name: "Cinta", color: "bg-green-500" },
  stationary_bike: { icon: "🚲", name: "Bici Fija", color: "bg-blue-500" },
  swimming: { icon: "🏊", name: "Natación", color: "bg-cyan-500" },
  elliptical: { icon: "🏃‍♀️", name: "Elíptica", color: "bg-purple-500" },
  rowing: { icon: "🚣", name: "Remo", color: "bg-amber-500" },
  hiit: { icon: "🏋️", name: "HIIT", color: "bg-red-500" },
  yoga: { icon: "🧘", name: "Yoga", color: "bg-pink-500" },
  stretching: { icon: "🤸", name: "Stretching", color: "bg-indigo-500" },
  dancing: { icon: "💃", name: "Baile", color: "bg-rose-500" },
  stairs: { icon: "🪜", name: "Escaleras", color: "bg-orange-500" },
  jump_rope: { icon: "🪢", name: "Saltar Soga", color: "bg-teal-500" },
  outdoor_walk: { icon: "🚶", name: "Caminata", color: "bg-lime-500" },
  outdoor_run: { icon: "🏃", name: "Correr", color: "bg-emerald-500" },
  outdoor_bike: { icon: "🚴", name: "Bicicleta", color: "bg-sky-500" },
};

const INTENSITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Baja", color: "text-green-400" },
  medium: { label: "Media", color: "text-yellow-400" },
  high: { label: "Alta", color: "text-red-400" },
};

interface CardioLog {
  id: number;
  date: string;
  activityType: string;
  durationMinutes: number;
  distanceKm?: number;
  caloriesBurned?: number;
  intensity: string;
  steps?: number;
  notes?: string;
}

interface CardioSummary {
  totalActivities: number;
  totalMinutes: number;
  totalCalories: number;
  totalDistance: number;
  activitiesByType: Record<string, number>;
  averageIntensity: string;
}

export default function StudentCardioPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Number(params.studentId);

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [cardioLogs, setCardioLogs] = useState<CardioLog[]>([]);
  const [stepsData, setStepsData] = useState<any>(null);
  const [summary, setSummary] = useState<CardioSummary | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [studentData, logsRes, stepsRes, summaryRes] = await Promise.all([
          getStudentById(studentId),
          api.get(`/cardio/${studentId}`).catch(() => ({ data: [] })),
          api.get(`/cardio/${studentId}/steps-weekly?weekOffset=0`).catch(() => ({ data: null })),
          api.get(`/cardio/${studentId}/summary?days=30`).catch(() => ({ data: null })),
        ]);

        setStudent(studentData);
        setCardioLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
        setStepsData(stepsRes.data);
        setSummary(summaryRes.data);
      } catch (error) {
        console.error("Error loading cardio data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  // Preparar datos para el gráfico de pasos semanal
  const stepsChartData = stepsData?.stepsByDay?.map((d: any) => ({
    day: d.dayShort || d.day?.substring(0, 3) || "",
    pasos: d.steps || 0,
    meta: stepsData?.dailyGoal || 8000,
  })) || [];

  // Agrupar actividades recientes (últimos 14 días)
  const recentActivities = cardioLogs
    .filter(log => log.activityType !== 'steps' && log.activityType !== 'manual_steps')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // Calcular totales de la semana
  const weekTotal = {
    activities: recentActivities.filter(a => {
      const date = new Date(a.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }).length,
    minutes: recentActivities.reduce((sum, a) => {
      const date = new Date(a.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo ? sum + (a.durationMinutes || 0) : sum;
    }, 0),
    calories: recentActivities.reduce((sum, a) => {
      const date = new Date(a.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo ? sum + (a.caloriesBurned || 0) : sum;
    }, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Cardio" backHref={`/coach/students/${studentId}`} />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Cardio"
        subtitle={`${student?.firstName} ${student?.lastName}`}
        backHref={`/coach/students/${studentId}`}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Resumen de Pasos */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Footprints className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Pasos esta semana</p>
                  <p className="text-2xl font-bold text-text">
                    {(stepsData?.totalSteps || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-muted">Promedio</p>
                <p className="text-lg font-semibold text-primary">
                  {(stepsData?.averageSteps || 0).toLocaleString()}/día
                </p>
              </div>
            </div>
            
            {/* Progreso hacia meta */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">
                  Meta: {(stepsData?.dailyGoal || 8000).toLocaleString()} pasos/día
                </span>
                <span className={cn(
                  "font-medium",
                  (stepsData?.compliancePercent || 0) >= 100 ? "text-success" : "text-primary"
                )}>
                  {(stepsData?.compliancePercent || 0).toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={Math.min(stepsData?.compliancePercent || 0, 100)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Pasos Semanal */}
        {stepsChartData.length > 0 && (
          <Card className="bg-surface/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-text-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Pasos por día
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stepsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a2e",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [(value ?? 0).toLocaleString(), "Pasos"]}
                    />
                    <ReferenceLine
                      y={stepsData?.dailyGoal || 8000}
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
                      stroke="#ff9800"
                      fill="url(#stepsGradient)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="stepsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff9800" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ff9800" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen de Actividades */}
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-secondary flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Actividades esta semana
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                  <Bike className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-xl font-bold text-text">{weekTotal.activities}</p>
                <p className="text-xs text-text-muted">Sesiones</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                  <Timer className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xl font-bold text-text">{weekTotal.minutes}</p>
                <p className="text-xs text-text-muted">Minutos</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-xl font-bold text-text">{weekTotal.calories}</p>
                <p className="text-xs text-text-muted">Calorías</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Actividades Recientes */}
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-secondary flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Actividades recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivities.length > 0 ? (
              <div className="divide-y divide-border">
                {recentActivities.map((activity) => {
                  const activityInfo = ACTIVITY_MAP[activity.activityType] || {
                    icon: "🏃",
                    name: activity.activityType,
                    color: "bg-gray-500",
                  };
                  const intensityInfo = INTENSITY_MAP[activity.intensity] || {
                    label: activity.intensity,
                    color: "text-text-muted",
                  };

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 p-4"
                    >
                      {/* Icono de actividad */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                        activityInfo.color + "/20"
                      )}>
                        {activityInfo.icon}
                      </div>

                      {/* Info de actividad */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text">{activityInfo.name}</p>
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] px-1.5 py-0", intensityInfo.color)}
                          >
                            {intensityInfo.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-text-muted">
                          {formatDate(activity.date, { 
                            weekday: "short", 
                            day: "numeric", 
                            month: "short" 
                          })}
                        </p>
                      </div>

                      {/* Métricas */}
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-1 text-sm text-text">
                          <Timer className="w-3 h-3 text-text-muted" />
                          <span>{activity.durationMinutes} min</span>
                        </div>
                        {activity.distanceKm && (
                          <div className="flex items-center gap-1 text-xs text-text-muted">
                            <Route className="w-3 h-3" />
                            <span>{activity.distanceKm.toFixed(1)} km</span>
                          </div>
                        )}
                        {activity.caloriesBurned && (
                          <div className="flex items-center gap-1 text-xs text-orange-400">
                            <Flame className="w-3 h-3" />
                            <span>{activity.caloriesBurned} kcal</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bike className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                <p className="text-text-muted text-sm">
                  El alumno aún no registró actividades de cardio
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

