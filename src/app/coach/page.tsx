"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { useCoachCache } from "@/stores/coach-cache";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Dumbbell,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Calendar,
  Clock,
  Zap,
  Plus,
  ListChecks,
  UtensilsCrossed,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentSummary {
  id: number;
  firstName: string;
  lastName: string;
  isActive: boolean;
  macrocycles: any[];
}

interface DashboardStats {
  totalStudents: number;
  studentsWithRoutines: number;
  totalMacrocycles: number;
}

export default function CoachDashboard() {
  const router = useRouter();
  const { user, coach } = useAuthStore();
  const { getStudentsSummary, setStudentsSummary } = useCoachCache();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    studentsWithRoutines: 0,
    totalMacrocycles: 0,
  });
  const dataFetched = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id || dataFetched.current) return;
      dataFetched.current = true;

      try {
        setLoading(true);
        
        // Intentar usar cache primero
        const cached = getStudentsSummary();
        if (cached) {
          setStudents(cached.students);
          setStats(cached.stats);
          setLoading(false);
          return;
        }
        
        // Si no hay cache, hacer la llamada
        const { data } = await api.get("/macrocycle/coach/students-summary");
        const studentsData = data.students || [];
        const statsData = data.stats || { totalStudents: 0, studentsWithRoutines: 0, totalMacrocycles: 0 };
        
        setStudents(studentsData);
        setStats(statsData);
        
        // Guardar en cache
        setStudentsSummary(studentsData, statsData);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, getStudentsSummary, setStudentsSummary]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const firstName = user?.fullName?.split(" ")[0] || "Coach";

  // Stats calculadas
  const studentsWithoutRoutine = stats.totalStudents - stats.studentsWithRoutines;
  const coveragePercent = stats.totalStudents > 0 
    ? Math.round((stats.studentsWithRoutines / stats.totalStudents) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-4 pt-6 pb-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-text">{firstName} 💪</h1>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/20">
            <Dumbbell className="w-6 h-6 text-black" />
          </div>
        </motion.div>
      </header>

      {/* Content */}
      <div className="px-4 space-y-4 stagger-children">
        {/* Stats Grid - 2x2 */}
        <motion.div className="grid grid-cols-2 gap-3">
          {/* Total Students */}
          <Card
            className="bg-surface/80 border-border cursor-pointer touch-feedback"
            onClick={() => router.push("/coach/students")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </div>
              <p className="text-2xl font-bold text-text">{stats.totalStudents}</p>
              <p className="text-xs text-text-muted">Alumnos</p>
            </CardContent>
          </Card>

          {/* With Routine */}
          <Card
            className="bg-surface/80 border-border cursor-pointer touch-feedback"
            onClick={() => router.push("/coach/routines")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-accent" />
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </div>
              <p className="text-2xl font-bold text-text">{stats.studentsWithRoutines}</p>
              <p className="text-xs text-text-muted">Con Rutinas</p>
            </CardContent>
          </Card>

          {/* Coverage */}
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
              </div>
              <p className="text-2xl font-bold text-success">{coveragePercent}%</p>
              <p className="text-xs text-text-muted">Cobertura</p>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card 
            className={cn(
              "border-border cursor-pointer touch-feedback",
              studentsWithoutRoutine > 0 ? "bg-warning/10 border-warning/30" : "bg-surface/80"
            )}
            onClick={() => studentsWithoutRoutine > 0 && router.push("/coach/routines?filter=without")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  studentsWithoutRoutine > 0 ? "bg-warning/20" : "bg-text-muted/20"
                )}>
                  <AlertCircle className={cn(
                    "w-5 h-5",
                    studentsWithoutRoutine > 0 ? "text-warning" : "text-text-muted"
                  )} />
                </div>
                {studentsWithoutRoutine > 0 && (
                  <ChevronRight className="w-4 h-4 text-warning" />
                )}
              </div>
              <p className={cn(
                "text-2xl font-bold",
                studentsWithoutRoutine > 0 ? "text-warning" : "text-text"
              )}>
                {studentsWithoutRoutine}
              </p>
              <p className="text-xs text-text-muted">Pendientes</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts - Solo si hay pendientes */}
        {studentsWithoutRoutine > 0 && (
          <motion.div>
            <Card 
              className="bg-warning/10 border-warning/30 cursor-pointer touch-feedback"
              onClick={() => router.push("/coach/routines?filter=without")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-warning text-sm">
                    {studentsWithoutRoutine} alumno{studentsWithoutRoutine > 1 ? "s" : ""} sin rutina asignada
                  </p>
                  <p className="text-xs text-text-muted">Tocá para ver quiénes</p>
                </div>
                <ChevronRight className="w-5 h-5 text-warning" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div className="space-y-3">
          <h2 className="text-sm font-medium text-text-muted flex items-center gap-2 px-1">
            <Zap className="w-4 h-4 text-primary" />
            Accesos Rápidos
          </h2>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-0 divide-y divide-border">
              <div
                className="p-4 flex items-center gap-3 cursor-pointer touch-feedback"
                onClick={() => router.push("/coach/routines/create")}
              >
                <Plus className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-text">NUEVA PLANTILLA</span>
              </div>
              <div
                className="p-4 flex items-center gap-3 cursor-pointer touch-feedback"
                onClick={() => router.push("/coach/templates")}
              >
                <Dumbbell className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-text">MIS PLANTILLAS</span>
              </div>
              <div
                className="p-4 flex items-center gap-3 cursor-pointer touch-feedback"
                onClick={() => router.push("/coach/exercises")}
              >
                <ListChecks className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-text">CATÁLOGO DE EJERCICIOS</span>
              </div>
              <div
                className="p-4 flex items-center gap-3 cursor-pointer touch-feedback"
                onClick={() => router.push("/coach/food-catalog")}
              >
                <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-text">CATÁLOGO DE ALIMENTOS</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Access Students */}
        <motion.div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-medium text-text-muted">Tus alumnos</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs h-8"
              onClick={() => router.push("/coach/students")}
            >
              Ver todos
            </Button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {students.slice(0, 8).map((student) => (
              <Card
                key={student.id}
                className="bg-surface/80 border-border cursor-pointer touch-feedback shrink-0 w-28"
                onClick={() => router.push(`/coach/students/${student.id}`)}
              >
                <CardContent className="p-3 flex flex-col items-center text-center">
                  <Avatar className="w-12 h-12 mb-2">
                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-text">
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium text-text truncate w-full">
                    {student.firstName}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Motivation */}
        <motion.div className="pt-2 pb-6">
          <Card className="bg-gradient-to-br from-surface to-background border-border">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-text-secondary">
                💪 {stats.totalStudents} atletas confían en vos
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

