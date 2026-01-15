"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { useCardioSession } from "@/stores/cardio-session";
import { getCardioSummary, getStepsWeeklyStats, getRecentActivities, formatTime, getActivityInfo } from "@/lib/api/cardio";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Footprints,
  TrendingUp,
  Target,
  Calendar,
  Plus,
  ChevronRight,
  Flame,
  Timer,
  Route,
  Play,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface StepsStats {
  today: number;
  goal: number;
  weeklyAverage: number;
  weeklyTotal: number;
  streak: number;
}

interface CardioLog {
  id: number;
  activityType: string;
  durationMinutes: number;
  distanceKm?: number;
  steps?: number;
  caloriesBurned?: number;
  intensity?: string;
  date: string;
  notes?: string;
}

const ACTIVITY_ICONS: Record<string, { icon: string; name: string }> = {
  treadmill: { icon: "🚶‍♂️", name: "Cinta" },
  stationary_bike: { icon: "🚲", name: "Bici Fija" },
  swimming: { icon: "🏊", name: "Natación" },
  elliptical: { icon: "🏃‍♀️", name: "Elíptica" },
  rowing: { icon: "🚣", name: "Remo" },
  hiit: { icon: "🏋️", name: "HIIT" },
  yoga: { icon: "🧘", name: "Yoga" },
  stretching: { icon: "🤸", name: "Stretching" },
  dancing: { icon: "💃", name: "Baile" },
  stairs: { icon: "🪜", name: "Escaleras" },
  jump_rope: { icon: "🪢", name: "Saltar Soga" },
  outdoor_walk: { icon: "🚶", name: "Caminata" },
  outdoor_run: { icon: "🏃", name: "Correr" },
  outdoor_bike: { icon: "🚴", name: "Bicicleta" },
  walk: { icon: "🚶", name: "Caminata" },
  other: { icon: "💪", name: "Otro" },
};

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function CardioPage() {
  const router = useRouter();
  const { student } = useAuthStore();
  const { status, activityType, elapsedSeconds, updateElapsed, restoreSession } = useCardioSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StepsStats | null>(null);
  const [weekLogs, setWeekLogs] = useState<CardioLog[]>([]);
  const [weeklySteps, setWeeklySteps] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  
  // Verificar si hay sesión de cronómetro activa
  const hasActiveSession = status === "running" || status === "paused";
  const activeActivity = activityType ? getActivityInfo(activityType) : null;

  // Restaurar y actualizar timer
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (status === "running") {
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    }
  }, [status, updateElapsed]);

  useEffect(() => {
    const loadData = async () => {
      if (!student?.id) return;

      try {
        setLoading(true);
        const [summaryData, stepsStatsData, activitiesData] = await Promise.all([
          getCardioSummary(student.id),
          getStepsWeeklyStats(student.id),
          getRecentActivities(student.id),
        ]);

        // Extraer pasos de hoy del array stepsByDay
        const todayStr = new Date().toISOString().split('T')[0];
        const todayData = stepsStatsData.stepsByDay?.find((d: any) => d.date === todayStr);
        const todaySteps = todayData?.steps || 0;

        setStats({
          today: todaySteps,
          goal: stepsStatsData.dailyGoal || 8000,
          weeklyAverage: stepsStatsData.averageSteps || 0,
          weeklyTotal: stepsStatsData.totalSteps || 0,
          streak: stepsStatsData.daysAchieved || 0,
        });

        setWeekLogs(Array.isArray(activitiesData) ? activitiesData : []);

        // Build weekly steps array from stepsByDay (Lun-Dom format)
        if (stepsStatsData.stepsByDay) {
          // stepsByDay viene en orden Lun-Dom (0-6), convertir a Dom-Sab (0-6)
          const stepsArray = new Array(7).fill(0);
          stepsStatsData.stepsByDay.forEach((day: any, index: number) => {
            // Lun(0)->1, Mar(1)->2, Mie(2)->3, Jue(3)->4, Vie(4)->5, Sab(5)->6, Dom(6)->0
            const jsIndex = index === 6 ? 0 : index + 1;
            stepsArray[jsIndex] = day.steps || 0;
          });
          setWeeklySteps(stepsArray);
        }
      } catch (error) {
        console.error("Error loading cardio data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [student?.id]);

  const progress = stats ? (stats.today / stats.goal) * 100 : 0;
  const todayIndex = new Date().getDay();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Cardio" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Cardio"
        subtitle="Pasos y actividades"
        actions={[
          {
            label: "Historial",
            onClick: () => router.push("/student/cardio/history"),
          },
        ]}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Active Session Banner */}
        {hasActiveSession && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card 
              className="bg-gradient-to-r from-primary/30 to-primary/10 border-primary/40 cursor-pointer hover:border-primary/60 transition-all"
              onClick={() => router.push("/student/cardio/tracker")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-14 h-14 rounded-xl bg-primary/30 flex items-center justify-center text-3xl"
                      animate={status === "running" ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      {activeActivity?.emoji}
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-text">{activeActivity?.label}</p>
                        <Badge className={cn(
                          "text-xs",
                          status === "running" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                        )}>
                          {status === "running" ? "⏱️ En curso" : "⏸️ Pausado"}
                        </Badge>
                      </div>
                      <p className="text-2xl font-mono font-bold text-primary">
                        {formatTime(elapsedSeconds)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Today's Steps Card */}
        <Card className="bg-gradient-to-br from-primary/20 to-surface border-primary/30 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/30 flex items-center justify-center">
                  <Footprints className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Pasos hoy</p>
                  <p className="text-3xl font-bold text-text">
                    {stats?.today.toLocaleString() || 0}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-muted">Meta</p>
                <p className="text-lg font-semibold text-primary">
                  {stats?.goal.toLocaleString()}
                </p>
              </div>
            </div>

            <Progress value={Math.min(progress, 100)} className="h-3 mb-2" />

            <div className="flex justify-between text-sm">
              <span className="text-text-muted">{Math.round(progress)}% completado</span>
              {progress >= 100 ? (
                <Badge className="bg-success/20 text-success">
                  🎉 ¡Meta cumplida!
                </Badge>
              ) : (
                <span className="text-text-muted">
                  Faltan {((stats?.goal || 0) - (stats?.today || 0)).toLocaleString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Chart */}
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              Esta semana
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end justify-between gap-1 h-24">
              {weeklySteps.map((steps, index) => {
                const height = stats?.goal ? Math.min((steps / stats.goal) * 100, 100) : 0;
                const isToday = index === todayIndex;
                const metGoal = steps >= (stats?.goal || 0);

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full h-20 flex items-end justify-center">
                      <motion.div
                        className={cn(
                          "w-full max-w-8 rounded-t-lg",
                          metGoal
                            ? "bg-gradient-to-t from-success to-success/50"
                            : isToday
                            ? "bg-gradient-to-t from-primary to-primary/50"
                            : "bg-gradient-to-t from-text-muted/30 to-text-muted/10"
                        )}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(height, 5)}%` }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs",
                        isToday ? "text-primary font-semibold" : "text-text-muted"
                      )}
                    >
                      {DAYS[index]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between mt-4 pt-3 border-t border-border">
              <div className="text-center">
                <p className="text-lg font-bold text-text">
                  {stats?.weeklyAverage.toLocaleString()}
                </p>
                <p className="text-xs text-text-muted">Promedio</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-text">
                  {stats?.weeklyTotal.toLocaleString()}
                </p>
                <p className="text-xs text-text-muted">Total</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-text">
                  {stats?.streak || 0}
                  <span className="text-sm ml-1">🔥</span>
                </p>
                <p className="text-xs text-text-muted">Racha</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          {!hasActiveSession && (
            <Button
              className="h-auto py-4 flex flex-col items-center gap-2 bg-gradient-to-br from-primary/30 to-primary/10 border-primary/30 hover:from-primary/40 hover:to-primary/20 col-span-2"
              variant="outline"
              onClick={() => router.push("/student/cardio/start")}
            >
              <Play className="w-7 h-7 text-primary" />
              <span className="text-sm font-medium">Iniciar actividad con cronómetro</span>
            </Button>
          )}
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 bg-surface/50 border-border hover:bg-surface"
            onClick={() => router.push("/student/cardio/add-steps")}
          >
            <Footprints className="w-6 h-6 text-primary" />
            <span className="text-sm">Cargar pasos</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 bg-surface/50 border-border hover:bg-surface"
            onClick={() => router.push("/student/cardio/calendar")}
          >
            <Calendar className="w-6 h-6 text-accent" />
            <span className="text-sm">Ver calendario</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 bg-surface/50 border-border hover:bg-surface col-span-2"
            onClick={() => router.push("/student/cardio/add-activity")}
          >
            <Plus className="w-6 h-6 text-accent" />
            <span className="text-sm">Agregar actividad manual</span>
          </Button>
        </div>

        {/* Recent Activities - exclude steps/walk logs */}
        {weekLogs.filter(log => !['steps', 'manual_steps', 'walk'].includes(log.activityType)).length > 0 && (
          <Card className="bg-surface/80 border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Actividades recientes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => router.push("/student/cardio/history")}
                >
                  Ver todo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {weekLogs
                .filter(log => !['steps', 'manual_steps', 'walk'].includes(log.activityType))
                .slice(0, 5)
                .map((log) => {
                  const activityInfo = ACTIVITY_ICONS[log.activityType] || ACTIVITY_ICONS.other;
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 p-3 bg-background/50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                        {activityInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text text-sm">
                          {activityInfo.name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                          {log.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {log.durationMinutes} min
                            </span>
                          )}
                          {log.distanceKm && (
                            <span className="flex items-center gap-1">
                              <Route className="w-3 h-3" />
                              {log.distanceKm.toFixed(1)} km
                            </span>
                          )}
                          {log.caloriesBurned && (
                            <span className="flex items-center gap-1 text-orange-400">
                              <Flame className="w-3 h-3" />
                              {log.caloriesBurned} kcal
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-text-muted">
                        {formatDate(log.date, { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

