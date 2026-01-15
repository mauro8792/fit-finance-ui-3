"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { getMonthlySteps, MonthlyStepsData } from "@/lib/api/cardio";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Footprints, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Obtener el día de hoy en formato yyyy-mm-dd (local)
const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function StepsCalendarPage() {
  const router = useRouter();
  const { student } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stepsData, setStepsData] = useState<MonthlyStepsData[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  // Cargar pasos del mes
  useEffect(() => {
    if (!student?.id) return;

    const loadSteps = async () => {
      setLoading(true);
      try {
        const data = await getMonthlySteps(student.id, year, month);
        setStepsData(data);
      } catch (error) {
        console.error("Error loading steps:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSteps();
  }, [student?.id, year, month]);

  // Crear mapa de pasos por fecha para acceso rápido
  const stepsMap = useMemo(() => {
    const map = new Map<string, MonthlyStepsData>();
    stepsData.forEach((item) => {
      map.set(item.date, item);
    });
    return map;
  }, [stepsData]);

  // Calcular días del calendario
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Ajustar para que la semana empiece en Lunes (0=Lun, 6=Dom)
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay < 0) startDay = 6; // Domingo se convierte en 6

    const days: { day: number | null; date: string | null }[] = [];

    // Días vacíos al inicio
    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, date: null });
    }

    // Días del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, date: dateStr });
    }

    return days;
  }, [year, month]);

  // Estadísticas del mes
  const monthStats = useMemo(() => {
    const totalSteps = stepsData.reduce((sum, item) => sum + item.steps, 0);
    const daysWithSteps = stepsData.length;
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const daysElapsed = isCurrentMonth ? today.getDate() : totalDaysInMonth;

    return {
      totalSteps,
      daysWithSteps,
      daysElapsed,
      avgSteps: daysWithSteps > 0 ? Math.round(totalSteps / daysWithSteps) : 0,
    };
  }, [stepsData, year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    const today = new Date();
    const nextMonth = new Date(year, month, 1);
    // No permitir ir más allá del mes actual
    if (nextMonth <= new Date(today.getFullYear(), today.getMonth() + 1, 0)) {
      setCurrentDate(nextMonth);
    }
  };

  const handleDayClick = (date: string | null) => {
    if (!date) return;
    
    const today = getTodayLocal();
    // No permitir seleccionar días futuros
    if (date > today) return;

    // Ir a la página de agregar/editar pasos con la fecha seleccionada
    router.push(`/student/cardio/add-steps?date=${date}`);
  };

  const today = getTodayLocal();
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() + 1 === month;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Calendario de Pasos" backHref="/student/cardio" />

      <div className="px-4 py-4 space-y-4">
        {/* Month Navigation */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="w-10 h-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <h2 className="text-lg font-semibold text-text">
                {MONTHS[month - 1]} {year}
              </h2>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                disabled={isCurrentMonth}
                className="w-10 h-10"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-text-muted py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((item, index) => {
                  const hasSteps = item.date ? stepsMap.has(item.date) : false;
                  const stepsInfo = item.date ? stepsMap.get(item.date) : null;
                  const isToday = item.date === today;
                  const isFuture = item.date ? item.date > today : false;

                  return (
                    <motion.button
                      key={index}
                      whileTap={!isFuture && item.day ? { scale: 0.95 } : undefined}
                      onClick={() => handleDayClick(item.date)}
                      disabled={!item.day || isFuture}
                      className={cn(
                        "relative aspect-square flex flex-col items-center justify-center rounded-lg transition-all",
                        !item.day && "invisible",
                        item.day && !isFuture && "hover:bg-surface cursor-pointer",
                        isFuture && "opacity-30 cursor-not-allowed",
                        isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        hasSteps && "bg-primary/20"
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isToday ? "text-primary" : hasSteps ? "text-primary" : "text-text",
                          isFuture && "text-text-muted"
                        )}
                      >
                        {item.day}
                      </span>

                      {/* Indicador de pasos */}
                      {hasSteps && (
                        <div className="absolute bottom-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </div>
                      )}

                      {/* Tooltip con cantidad de pasos */}
                      {stepsInfo && (
                        <span className="absolute -bottom-0.5 text-[8px] text-primary font-medium">
                          {stepsInfo.steps >= 1000 
                            ? `${(stepsInfo.steps / 1000).toFixed(0)}k` 
                            : stepsInfo.steps
                          }
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Instrucción */}
            <p className="text-center text-xs text-text-muted mt-4 px-2">
              👆 Tocá un día para cargar o editar los pasos
            </p>
          </CardContent>
        </Card>

        {/* Monthly Stats */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Footprints className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-text">Resumen del mes</h3>
                <p className="text-xs text-text-muted">
                  {MONTHS[month - 1]} {year}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {monthStats.totalSteps.toLocaleString()}
                </p>
                <p className="text-xs text-text-muted">Pasos totales</p>
              </div>

              <div className="bg-background rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-text">
                  {monthStats.daysWithSteps}/{monthStats.daysElapsed}
                </p>
                <p className="text-xs text-text-muted">Días registrados</p>
              </div>

              <div className="bg-background rounded-lg p-3 text-center col-span-2">
                <p className="text-2xl font-bold text-text">
                  {monthStats.avgSteps.toLocaleString()}
                </p>
                <p className="text-xs text-text-muted">Promedio diario</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary/20 border-2 border-primary" />
            <span>Con pasos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-text-muted" />
            <span>Sin pasos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded ring-2 ring-primary ring-offset-1 ring-offset-background" />
            <span>Hoy</span>
          </div>
        </div>
      </div>
    </div>
  );
}

