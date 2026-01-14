"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { useHistoryCache } from "@/stores/history-cache";
import { getMacrocyclesByStudent, getMicrocyclesByMesocycle } from "@/lib/api/routine";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Dumbbell,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
  List,
  Search,
  X,
  ChevronDown,
  Target,
  Award,
  Activity,
  Layers,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import api from "@/lib/api";

interface TrainingDay {
  id: number;
  dayNumber: number;
  dayName: string;
  fecha: string | null;
  esDescanso: boolean;
  exercises: Exercise[];
  macrocycleName: string;
  mesocycleName: string;
  microcycleName: string;
  totalExercises: number;
  totalSets: number;
}

interface Exercise {
  id: number;
  exerciseCatalog?: {
    id: number;
    name: string;
  };
  sets: SetData[];
}

interface SetData {
  id: number;
  load?: number;
  reps?: number;
  actualRir?: number;
  status: string;
}

interface ExerciseSession {
  fecha: string;
  dia: string;
  microciclo: string;
  maxLoad: number;
  avgLoad: number;
  maxReps: number;
  totalVolume: number;
  avgRir: number | null;
  sets: number;
  dateObj: Date;
}

interface ProgressStats {
  firstSession: ExerciseSession;
  lastSession: ExerciseSession;
  bestSession: ExerciseSession;
  loadImprovement: number;
  loadImprovementPercent: string;
  volumeImprovement: number;
  volumeImprovementPercent: string;
  totalSessions: number;
}

export default function TrainingHistoryPage() {
  const router = useRouter();
  const { student } = useAuthStore();
  const { getHistory, setHistory } = useHistoryCache();
  const [historyData, setHistoryData] = useState<TrainingDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [viewMode, setViewMode] = useState<"progress" | "list">("progress");
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleItems, setVisibleItems] = useState(5);
  const [selectedDay, setSelectedDay] = useState<TrainingDay | null>(null);
  const [openDayDialog, setOpenDayDialog] = useState(false);
  const dataFetched = useRef(false);

  // Fetch historial de entrenamientos con cache
  useEffect(() => {
    const fetchHistory = async () => {
      const studentId = student?.id;
      if (!studentId) {
        setError("No se encontraron datos del estudiante");
        setLoading(false);
        return;
      }

      // Verificar cache primero
      const cachedHistory = getHistory(studentId);
      if (cachedHistory && cachedHistory.length > 0) {
        console.log("📦 Historial cargado desde cache");
        setHistoryData(cachedHistory);
        setLoading(false);
        return;
      }

      // Si ya estamos cargando, no hacer otra petición
      if (dataFetched.current) return;
      dataFetched.current = true;

      try {
        setLoading(true);
        setError(null);

        console.log("🔄 Cargando historial desde API...");

        // Obtener macrociclos del estudiante
        const macros = await getMacrocyclesByStudent(studentId);

        // Para cada macrociclo, obtener mesociclos y microciclos con días entrenados
        const historialCompleto: TrainingDay[] = [];

        for (const macro of macros) {
          // Get mesocycles for this macro
          const mesosResponse = await api.get(`/mesocycle/macrocycle/${macro.id}`);
          const mesos = mesosResponse.data;

          for (const meso of mesos) {
            const micros = await getMicrocyclesByMesocycle(meso.id);

            for (const micro of micros) {
              // Filtrar días que tienen fecha (fueron entrenados)
              const diasEntrenados = (micro.days || [])
                .filter((day: any) => day.fecha && !day.esDescanso)
                .map((day: any) => {
                  const exercises = day.exercises || [];
                  return {
                    id: day.id,
                    dayNumber: day.dia,
                    dayName: day.nombre || `Día ${day.dia}`,
                    fecha: day.fecha,
                    esDescanso: day.esDescanso,
                    exercises: exercises,
                    macrocycleName: macro.name,
                    mesocycleName: meso.name,
                    microcycleName: micro.name,
                    totalExercises: exercises.length,
                    totalSets: exercises.reduce((total: number, ex: any) => {
                      const sets = ex.sets || [];
                      return total + sets.length;
                    }, 0),
                  };
                });

              historialCompleto.push(...diasEntrenados);
            }
          }
        }

        // Ordenar por fecha (más reciente primero)
        historialCompleto.sort((a, b) => {
          const dateA = new Date(a.fecha + "T12:00:00");
          const dateB = new Date(b.fecha + "T12:00:00");
          return dateB.getTime() - dateA.getTime();
        });

        // Guardar en cache
        setHistory(studentId, historialCompleto);
        console.log("✅ Historial guardado en cache");

        setHistoryData(historialCompleto);
      } catch (err: any) {
        console.error("Error cargando historial:", err);
        setError(err.message || "Error al cargar el historial");
      } finally {
        setLoading(false);
      }
    };

    if (student?.id) {
      fetchHistory();
    }
  }, [student?.id, getHistory, setHistory]);

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-AR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Función para obtener días desde la fecha
  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00");
    const today = new Date();
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = Math.abs(todayOnly.getTime() - dateOnly.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Ayer";
    return `Hace ${diffDays} días`;
  };

  // Extraer todos los ejercicios únicos con sus datos de progreso
  const exerciseProgress = useMemo(() => {
    const exerciseMap = new Map<string, ExerciseSession[]>();

    historyData.forEach((day) => {
      if (!day.exercises) return;

      day.exercises.forEach((exercise) => {
        const exerciseName = exercise.exerciseCatalog?.name;
        if (!exerciseName) return;

        const sets = exercise.sets || [];
        const validSets = sets.filter((s) => s && (s.load || 0) > 0);

        if (validSets.length > 0) {
          if (!exerciseMap.has(exerciseName)) {
            exerciseMap.set(exerciseName, []);
          }

          const maxLoad = Math.max(...validSets.map((s) => s.load || 0));
          const avgLoad =
            validSets.reduce((sum, s) => sum + (s.load || 0), 0) / validSets.length;
          const maxReps = Math.max(...validSets.map((s) => s.reps || 0));
          const totalVolume = validSets.reduce(
            (sum, s) => sum + (s.load || 0) * (s.reps || 0),
            0
          );
          const setsWithRir = validSets.filter((s) => (s.actualRir || 0) > 0);
          const avgRir =
            setsWithRir.length > 0
              ? setsWithRir.reduce((sum, s) => sum + (s.actualRir || 0), 0) /
                setsWithRir.length
              : null;

          exerciseMap.get(exerciseName)!.push({
            fecha: day.fecha!,
            dia: day.dayName,
            microciclo: day.microcycleName,
            maxLoad,
            avgLoad,
            maxReps,
            totalVolume,
            avgRir,
            sets: validSets.length,
            dateObj: new Date(day.fecha + "T12:00:00"),
          });
        }
      });
    });

    // Ordenar cada ejercicio por fecha
    exerciseMap.forEach((sessions) => {
      sessions.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    });

    return exerciseMap;
  }, [historyData]);

  // Obtener lista de ejercicios únicos
  const uniqueExercises = useMemo(() => {
    return Array.from(exerciseProgress.keys()).sort();
  }, [exerciseProgress]);

  // Filtrar ejercicios según término de búsqueda
  const filteredExercises = useMemo(() => {
    if (!searchTerm.trim()) return uniqueExercises;
    return uniqueExercises.filter((exercise) =>
      exercise.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueExercises, searchTerm]);

  // Historial visible con "cargar más"
  const visibleHistory = useMemo(() => {
    return historyData.slice(0, visibleItems);
  }, [historyData, visibleItems]);

  const hasMore = visibleItems < historyData.length;

  // Agrupar entrenamientos por Mesociclo y Microciclo
  const groupedHistory = useMemo(() => {
    const groups: {
      mesoName: string;
      micros: {
        microName: string;
        days: TrainingDay[];
      }[];
    }[] = [];

    historyData.forEach((day) => {
      // Buscar o crear grupo de mesociclo
      let mesoGroup = groups.find((g) => g.mesoName === day.mesocycleName);
      if (!mesoGroup) {
        mesoGroup = { mesoName: day.mesocycleName, micros: [] };
        groups.push(mesoGroup);
      }

      // Buscar o crear grupo de microciclo dentro del mesociclo
      let microGroup = mesoGroup.micros.find((m) => m.microName === day.microcycleName);
      if (!microGroup) {
        microGroup = { microName: day.microcycleName, days: [] };
        mesoGroup.micros.push(microGroup);
      }

      microGroup.days.push(day);
    });

    // Ordenar microciclos por fecha del primer día (más reciente primero)
    groups.forEach((meso) => {
      meso.micros.sort((a, b) => {
        const dateA = new Date(a.days[0]?.fecha + "T12:00:00");
        const dateB = new Date(b.days[0]?.fecha + "T12:00:00");
        return dateB.getTime() - dateA.getTime();
      });
    });

    return groups;
  }, [historyData]);

  // Datos del ejercicio seleccionado
  const selectedExerciseData = useMemo(() => {
    if (!selectedExercise || !exerciseProgress.has(selectedExercise)) {
      return [];
    }
    return exerciseProgress.get(selectedExercise) || [];
  }, [selectedExercise, exerciseProgress]);

  // Calcular estadísticas de progreso del ejercicio seleccionado
  const progressStats = useMemo((): ProgressStats | null => {
    if (!selectedExerciseData || selectedExerciseData.length === 0) {
      return null;
    }

    const firstSession = selectedExerciseData[0];
    const lastSession = selectedExerciseData[selectedExerciseData.length - 1];
    const bestSession = selectedExerciseData.reduce((best, current) =>
      (current.totalVolume || 0) > (best.totalVolume || 0) ? current : best
    );

    const loadImprovement = (lastSession.maxLoad || 0) - (firstSession.maxLoad || 0);
    const loadImprovementPercent =
      (firstSession.maxLoad || 0) > 0
        ? ((loadImprovement / firstSession.maxLoad) * 100).toFixed(1)
        : "0.0";

    const volumeImprovement =
      (lastSession.totalVolume || 0) - (firstSession.totalVolume || 0);
    const volumeImprovementPercent =
      (firstSession.totalVolume || 0) > 0
        ? ((volumeImprovement / firstSession.totalVolume) * 100).toFixed(1)
        : "0.0";

    return {
      firstSession,
      lastSession,
      bestSession,
      loadImprovement,
      loadImprovementPercent,
      volumeImprovement,
      volumeImprovementPercent,
      totalSessions: selectedExerciseData.length,
    };
  }, [selectedExerciseData]);

  // Estadísticas generales
  const stats = useMemo(
    () => ({
      totalDias: historyData.length,
      ultimoEntrenamiento: historyData[0]?.fecha,
      ejerciciosUnicos: uniqueExercises.length,
      setsTotal: historyData.reduce((total, day) => total + day.totalSets, 0),
    }),
    [historyData, uniqueExercises]
  );

  // Datos para el gráfico
  const chartData = useMemo(() => {
    return selectedExerciseData.map((session, index) => {
      const microMatch = session.microciclo?.match(/\d+/);
      const microNum = microMatch ? `M${microMatch[0]}` : "";
      return {
        name: microNum ? `${session.dia} - ${microNum}` : session.dia,
        volumen: Math.round(session.totalVolume),
        carga: session.maxLoad,
        reps: session.maxReps,
      };
    });
  }, [selectedExerciseData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Mi Historial" backHref="/student" />
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Mi Historial" backHref="/student" />
        <div className="px-4 py-8">
          <Card className="bg-error/10 border-error/30">
            <CardContent className="p-6 text-center">
              <X className="w-12 h-12 text-error mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-error mb-2">
                Error al cargar historial
              </h3>
              <p className="text-text-muted">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Mi Historial"
        subtitle={
          viewMode === "progress"
            ? "Analiza tu progreso por ejercicio"
            : "Revisa todos tus entrenamientos"
        }
        backHref="/student"
      />

      <div className="px-4 py-4 space-y-4">
        {/* Tabs */}
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "progress" | "list")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-surface">
            <TabsTrigger
              value="progress"
              className="data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Progreso
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              <List className="w-4 h-4 mr-2" />
              Entrenamientos
            </TabsTrigger>
          </TabsList>

          {/* Estadísticas generales - Visible en ambas pestañas */}
          {historyData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-3 mt-4"
            >
              <Card className="bg-info/20 border-info/30">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-info mx-auto mb-2" />
                  <p className="text-2xl font-bold text-text">{stats.totalDias}</p>
                  <p className="text-xs text-text-muted">Días entrenados</p>
                </CardContent>
              </Card>

              <Card className="bg-success/20 border-success/30">
                <CardContent className="p-4 text-center">
                  <Dumbbell className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-2xl font-bold text-text">
                    {stats.ejerciciosUnicos}
                  </p>
                  <p className="text-xs text-text-muted">Ejercicios únicos</p>
                </CardContent>
              </Card>

              <Card className="bg-warning/20 border-warning/30">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-warning mx-auto mb-2" />
                  <p className="text-2xl font-bold text-text">{stats.setsTotal}</p>
                  <p className="text-xs text-text-muted">Sets totales</p>
                </CardContent>
              </Card>

              <Card className="bg-accent/20 border-accent/30">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-lg font-bold text-text">
                    {stats.ultimoEntrenamiento
                      ? getDaysAgo(stats.ultimoEntrenamiento)
                      : "N/A"}
                  </p>
                  <p className="text-xs text-text-muted">Último entreno</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* VISTA DE PROGRESO */}
          <TabsContent value="progress" className="mt-4 space-y-4">
            {/* Selector de ejercicio */}
            {uniqueExercises.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-gradient-to-r from-primary/20 to-accent/10 border-primary/30">
                  <CardContent className="p-4">
                    <p className="text-sm text-text-muted mb-3 text-center">
                      {selectedExercise
                        ? "Ejercicio seleccionado:"
                        : "Selecciona un ejercicio para ver su progreso"}
                    </p>
                    <Button
                      variant="secondary"
                      className="w-full h-12 bg-surface hover:bg-surface-hover text-text font-semibold"
                      onClick={() => setOpenDialog(true)}
                    >
                      <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                      {selectedExercise || "Elegir Ejercicio"}
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Estadísticas del ejercicio seleccionado */}
            {selectedExercise && selectedExerciseData.length > 0 && progressStats && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Mejora de Volumen */}
                  <Card className="bg-success/10 border-success/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-success" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-text-muted mb-1">
                            Mejora de Volumen
                          </p>
                          <p className="text-2xl font-bold text-success">
                            {progressStats.volumeImprovement > 0 ? "+" : ""}
                            {progressStats.volumeImprovement.toFixed(0)} kg
                          </p>
                          <p className="text-xs text-text-muted">
                            ({progressStats.volumeImprovementPercent}%)
                          </p>
                          <div className="mt-2 text-xs text-text-secondary">
                            <p>
                              Primera sesión:{" "}
                              {progressStats.firstSession.totalVolume.toFixed(0)} kg
                            </p>
                            <p>
                              Última sesión:{" "}
                              {progressStats.lastSession.totalVolume.toFixed(0)} kg
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mejor Sesión */}
                  <Card className="bg-warning/10 border-warning/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                          <Award className="w-6 h-6 text-warning" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-text-muted mb-1">
                            Mejor Sesión (Mayor Volumen)
                          </p>
                          <p className="text-2xl font-bold text-warning">
                            {progressStats.bestSession.totalVolume.toFixed(0)} kg
                          </p>
                          <p className="text-xs text-text-muted">
                            {progressStats.bestSession.dia} -{" "}
                            {progressStats.bestSession.microciclo}
                          </p>
                          <div className="mt-2 text-xs text-text-secondary">
                            <p>Carga máx: {progressStats.bestSession.maxLoad} kg</p>
                            <p>Reps máx: {progressStats.bestSession.maxReps}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total Sesiones */}
                  <Card className="bg-accent/10 border-accent/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                          <Activity className="w-6 h-6 text-accent" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-text-muted mb-1">
                            Total Sesiones
                          </p>
                          <p className="text-2xl font-bold text-accent">
                            {progressStats.totalSessions}
                          </p>
                          <p className="text-xs text-text-muted">
                            Sesiones registradas
                          </p>
                          <p className="mt-2 text-xs text-text-secondary">
                            Promedio volumen:{" "}
                            {(
                              selectedExerciseData.reduce(
                                (sum, s) => sum + s.totalVolume,
                                0
                              ) / selectedExerciseData.length
                            ).toFixed(0)}{" "}
                            kg
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Gráfico de Evolución */}
                <Card className="bg-surface/80 border-border">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Evolución de Volumen (Tonelaje)
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient
                              id="colorVolumen"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#4caf50"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#4caf50"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.1)"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "#64748b", fontSize: 10 }}
                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            tick={{ fill: "#64748b", fontSize: 10 }}
                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                            tickFormatter={(value) => `${value} kg`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1a1a2e",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "#fff" }}
                            formatter={(value, name) => {
                              if (name === "volumen") return [`${value ?? 0} kg`, "Volumen"];
                              if (name === "carga") return [`${value ?? 0} kg`, "Carga máx"];
                              return [value ?? 0, name];
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="volumen"
                            stroke="#4caf50"
                            strokeWidth={3}
                            fill="url(#colorVolumen)"
                            dot={{ fill: "#4caf50", strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabla de Sesiones */}
                <Card className="bg-surface/80 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                        <List className="w-5 h-5 text-primary" />
                        Detalle de Sesiones
                      </h3>
                      <span className="text-xs text-text-muted">
                        Últimas {Math.min(10, selectedExerciseData.length)} de {selectedExerciseData.length}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-1.5 text-text-muted font-medium text-xs">
                              Fecha
                            </th>
                            <th className="text-left py-2 px-1.5 text-text-muted font-medium text-xs">
                              Día
                            </th>
                            <th className="text-center py-2 px-1.5 text-text-muted font-medium text-xs">
                              Micro
                            </th>
                            <th className="text-right py-2 px-1.5 text-text-muted font-medium text-xs">
                              Máx
                            </th>
                            <th className="text-right py-2 px-1.5 text-text-muted font-medium text-xs">
                              Prom
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...selectedExerciseData]
                            .reverse()
                            .slice(0, 10)
                            .map((session, index) => {
                              const microMatch = session.microciclo?.match(/\d+/);
                              const microNum = microMatch ? `M${microMatch[0]}` : "-";
                              return (
                                <tr
                                  key={index}
                                  className="border-b border-border/50 hover:bg-surface-hover"
                                >
                                <td className="py-2 px-1.5 text-text text-xs">
                                    {new Date(
                                      session.fecha + "T12:00:00"
                                    ).toLocaleDateString("es-AR", {
                                      day: "2-digit",
                                      month: "2-digit",
                                    })}
                                  </td>
                                  <td className="py-2 px-1.5 text-text text-xs">{session.dia}</td>
                                  <td className="py-2 px-1.5 text-center text-primary text-xs font-medium">
                                    {microNum}
                                  </td>
                                  <td className="py-2 px-1.5 text-right font-semibold text-success text-xs">
                                    {session.maxLoad} kg
                                  </td>
                                  <td className="py-2 px-1.5 text-right text-text-muted text-xs">
                                    {Math.round(session.avgLoad)} kg
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Mensaje cuando no hay ejercicio seleccionado */}
            {!selectedExercise && uniqueExercises.length > 0 && (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="w-16 h-16 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-text mb-2">
                    Selecciona un ejercicio
                  </h3>
                  <p className="text-text-muted text-sm">
                    Elige un ejercicio del menú superior para ver su progreso detallado
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Mensaje cuando no hay datos */}
            {selectedExercise && selectedExerciseData.length === 0 && (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-8 text-center">
                  <X className="w-16 h-16 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-text mb-2">
                    Sin datos suficientes
                  </h3>
                  <p className="text-text-muted text-sm">
                    Este ejercicio no tiene sets registrados con carga.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* VISTA DE LISTA - Agrupada por Meso/Micro */}
          <TabsContent value="list" className="mt-4 space-y-4">
            {historyData.length === 0 ? (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-8 text-center">
                  <Dumbbell className="w-16 h-16 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-text mb-2">
                    No hay entrenamientos registrados
                  </h3>
                  <p className="text-text-muted text-sm">
                    Comienza a entrenar y registra tus sets para ver tu historial aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {groupedHistory.map((meso, mesoIndex) => (
                  <motion.div
                    key={meso.mesoName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: mesoIndex * 0.1 }}
                  >
                    {/* Header del Mesociclo */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text text-sm">
                          {meso.mesoName}
                        </h3>
                        <p className="text-xs text-text-muted">
                          {meso.micros.reduce((acc, m) => acc + m.days.length, 0)} entrenamientos
                        </p>
                      </div>
                    </div>

                    {/* Microciclos dentro del Mesociclo */}
                    <div className="space-y-3 ml-2 border-l-2 border-accent/30 pl-4">
                      {meso.micros.map((micro) => {
                        // Extraer número del microciclo
                        const microMatch = micro.microName?.match(/\d+/);
                        const microNum = microMatch ? `M${microMatch[0]}` : micro.microName;

                        return (
                          <div key={micro.microName} className="space-y-2">
                            {/* Header del Microciclo */}
                            <div className="flex items-center gap-2 py-1">
                              <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                                <FolderOpen className="w-3 h-3 text-primary" />
                              </div>
                              <span className="text-xs font-medium text-primary">
                                {microNum}
                              </span>
                              <span className="text-xs text-text-muted">
                                • {micro.days.length} días
                              </span>
                            </div>

                            {/* Días del Microciclo */}
                            <div className="space-y-2">
                              {micro.days.map((day, dayIndex) => {
                                const completion =
                                  day.totalSets > 0
                                    ? (
                                        day.exercises.reduce(
                                          (acc, ex) =>
                                            acc +
                                            ex.sets.filter((s) => s.status === "completed").length,
                                          0
                                        ) / day.totalSets
                                      ) * 100
                                    : 0;
                                const isComplete = completion === 100;

                                return (
                                  <Card
                                    key={`${day.id}-${dayIndex}`}
                                    className={cn(
                                      "bg-surface/60 border-border cursor-pointer touch-feedback",
                                      "hover:border-primary/50 hover:bg-surface/80 transition-all"
                                    )}
                                    onClick={() => {
                                      setSelectedDay(day);
                                      setOpenDayDialog(true);
                                    }}
                                  >
                                    <CardContent className="p-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div
                                            className={cn(
                                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                              isComplete ? "bg-success/20" : "bg-warning/20"
                                            )}
                                          >
                                            {isComplete ? (
                                              <CheckCircle2 className="w-4 h-4 text-success" />
                                            ) : (
                                              <Clock className="w-4 h-4 text-warning" />
                                            )}
                                          </div>
                                          <div>
                                            <h4 className="font-medium text-text text-sm">
                                              {day.dayName}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-xs text-text-muted">
                                                {day.totalExercises} ej • {day.totalSets} sets
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="text-right">
                                          <p className="text-xs font-medium text-text">
                                            {new Date(
                                              day.fecha + "T12:00:00"
                                            ).toLocaleDateString("es-AR", {
                                              day: "2-digit",
                                              month: "2-digit",
                                            })}
                                          </p>
                                          <p className="text-xs text-text-muted">
                                            {getDaysAgo(day.fecha!)}
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para seleccionar ejercicio */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="bg-surface border-border max-w-md h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-0 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Selecciona un Ejercicio
            </DialogTitle>
          </DialogHeader>

          {/* Buscador */}
          <div className="px-4 py-3 space-y-2 shrink-0 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                placeholder="Buscar ejercicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
            <p className="text-xs text-text-muted">
              {filteredExercises.length} ejercicios disponibles
            </p>
          </div>

          {/* Lista de ejercicios - con altura fija y scroll */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-2">
              {filteredExercises.length === 0 ? (
                <p className="text-center text-text-muted py-8">
                  {searchTerm
                    ? "No se encontraron ejercicios"
                    : "No hay ejercicios disponibles"}
                </p>
              ) : (
                filteredExercises.map((exercise, index) => (
                  <button
                    key={`${exercise}-${index}`}
                    onClick={() => {
                      setSelectedExercise(exercise);
                      setOpenDialog(false);
                      setSearchTerm("");
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg transition-all",
                      "hover:bg-surface-hover",
                      selectedExercise === exercise
                        ? "bg-primary/20 text-primary font-medium"
                        : "text-text"
                    )}
                  >
                    {selectedExercise === exercise && (
                      <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    )}
                    {exercise}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalle del día de entrenamiento */}
      <Dialog open={openDayDialog} onOpenChange={setOpenDayDialog}>
        <DialogContent className="bg-surface border-border max-w-lg h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-3 shrink-0 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              {selectedDay?.dayName || "Entrenamiento"}
            </DialogTitle>
            {selectedDay && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {selectedDay.microcycleName}
                </Badge>
                <span className="text-xs text-text-muted">
                  {new Date(selectedDay.fecha + "T12:00:00").toLocaleDateString(
                    "es-AR",
                    { weekday: "long", day: "numeric", month: "long" }
                  )}
                </span>
              </div>
            )}
          </DialogHeader>

          {/* Lista de ejercicios del día */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
            {selectedDay?.exercises.map((exercise, exIndex) => {
              const totalVolume = exercise.sets.reduce(
                (sum, s) => sum + ((s.load || 0) * (s.reps || 0)),
                0
              );
              const maxLoad = Math.max(...exercise.sets.map((s) => s.load || 0));
              
              return (
                <Card key={exIndex} className="bg-background/50 border-border">
                  <CardContent className="p-3">
                    {/* Nombre del ejercicio */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-text text-sm">
                        {exercise.exerciseCatalog?.name || `Ejercicio ${exIndex + 1}`}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-success/20 text-success text-xs">
                          {totalVolume} kg vol
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Tabla de sets */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1.5 px-2 text-text-muted font-medium">
                              Set
                            </th>
                            <th className="text-center py-1.5 px-2 text-text-muted font-medium">
                              Peso
                            </th>
                            <th className="text-center py-1.5 px-2 text-text-muted font-medium">
                              Reps
                            </th>
                            <th className="text-center py-1.5 px-2 text-text-muted font-medium">
                              RIR
                            </th>
                            <th className="text-right py-1.5 px-2 text-text-muted font-medium">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {exercise.sets.map((set, setIndex) => (
                            <tr
                              key={setIndex}
                              className="border-b border-border/30"
                            >
                              <td className="py-1.5 px-2 text-text-muted">
                                {setIndex + 1}
                              </td>
                              <td className={cn(
                                "py-1.5 px-2 text-center font-medium",
                                set.load === maxLoad ? "text-primary" : "text-text"
                              )}>
                                {set.load || 0} kg
                              </td>
                              <td className="py-1.5 px-2 text-center text-text">
                                {set.reps || 0}
                              </td>
                              <td className="py-1.5 px-2 text-center text-text-muted">
                                {set.actualRir ?? "-"}
                              </td>
                              <td className="py-1.5 px-2 text-right">
                                {set.status === "completed" ? (
                                  <CheckCircle2 className="w-4 h-4 text-success inline" />
                                ) : (
                                  <Clock className="w-4 h-4 text-warning inline" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Resumen del día */}
            {selectedDay && (
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="p-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-text">
                        {selectedDay.totalExercises}
                      </p>
                      <p className="text-xs text-text-muted">Ejercicios</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-text">
                        {selectedDay.totalSets}
                      </p>
                      <p className="text-xs text-text-muted">Sets</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">
                        {selectedDay.exercises.reduce(
                          (total, ex) =>
                            total +
                            ex.sets.reduce(
                              (sum, s) => sum + ((s.load || 0) * (s.reps || 0)),
                              0
                            ),
                          0
                        )}{" "}
                        kg
                      </p>
                      <p className="text-xs text-text-muted">Vol. Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
