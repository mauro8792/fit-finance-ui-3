"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStudentById } from "@/lib/api/coach";
import { getDailyFoodLog, getWeeklySummary } from "@/lib/api/nutrition";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Flame,
  Beef,
  Wheat,
  Droplets,
  Calendar,
  Target,
  ChevronLeft,
  ChevronRight,
  Utensils,
} from "lucide-react";
import { cn, formatDate, getTodayString } from "@/lib/utils";
import type { Student } from "@/types";

interface DailyData {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  entries: any[];
}

export default function StudentNutritionPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Number(params.studentId);

  const [loading, setLoading] = useState(true);
  const [changingDay, setChangingDay] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const initialFetched = useRef(false);

  // Load student info once
  useEffect(() => {
    const loadStudent = async () => {
      if (initialFetched.current) return;
      initialFetched.current = true;

      try {
        setLoading(true);
        const [studentData, weeklyRes] = await Promise.all([
          getStudentById(studentId),
          getWeeklySummary(studentId).catch(() => ({ days: [] })),
        ]);
        setStudent(studentData);
        setWeeklyData(weeklyRes?.days || []);
      } catch (error) {
        console.error("Error loading student:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
  }, [studentId]);

  // Load daily data when date changes
  useEffect(() => {
    const loadDailyData = async () => {
      if (!studentId) return;

      try {
        setChangingDay(true);
        const data = await getDailyFoodLog(studentId, selectedDate);
        setDailyData({
          totalCalories: parseFloat(data?.totalCalories) || 0,
          totalProtein: parseFloat(data?.totalProtein) || 0,
          totalCarbs: parseFloat(data?.totalCarbs) || 0,
          totalFat: parseFloat(data?.totalFat) || 0,
          targetCalories: parseFloat(data?.targetCalories) || 2000,
          targetProtein: parseFloat(data?.targetProtein) || 150,
          targetCarbs: parseFloat(data?.targetCarbs) || 200,
          targetFat: parseFloat(data?.targetFat) || 70,
          entries: data?.entries || [],
        });
      } catch (error) {
        console.error("Error loading daily data:", error);
        setDailyData(null);
      } finally {
        setChangingDay(false);
      }
    };

    loadDailyData();
  }, [studentId, selectedDate]);

  // Calculate percentages
  const caloriesPercent = dailyData?.targetCalories
    ? Math.round((dailyData.totalCalories / dailyData.targetCalories) * 100)
    : 0;
  const proteinPercent = dailyData?.targetProtein
    ? Math.round((dailyData.totalProtein / dailyData.targetProtein) * 100)
    : 0;
  const carbsPercent = dailyData?.targetCarbs
    ? Math.round((dailyData.totalCarbs / dailyData.targetCarbs) * 100)
    : 0;
  const fatPercent = dailyData?.targetFat
    ? Math.round((dailyData.totalFat / dailyData.targetFat) * 100)
    : 0;

  // Navigation
  const goToPrevDay = () => {
    const current = new Date(selectedDate + "T12:00:00");
    current.setDate(current.getDate() - 1);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const goToNextDay = () => {
    const current = new Date(selectedDate + "T12:00:00");
    current.setDate(current.getDate() + 1);
    const newDate = current.toISOString().split("T")[0];
    if (newDate <= getTodayString()) {
      setSelectedDate(newDate);
    }
  };

  const isToday = selectedDate === getTodayString();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Nutrición" backHref={`/coach/students/${studentId}`} />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={`Nutrición - ${student?.firstName || "Alumno"}`}
        backHref={`/coach/students/${studentId}`}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Date Navigator */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={goToPrevDay}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="flex flex-col items-center gap-0.5 px-4 py-1">
                <span className="text-sm font-semibold text-text">
                  {formatDate(selectedDate, { weekday: "long" })}
                </span>
                <span className="text-xs text-text-muted">
                  {formatDate(selectedDate, { day: "numeric", month: "long" })}
                </span>
                {isToday && (
                  <Badge
                    variant="outline"
                    className="text-[10px] mt-1 px-2 py-0 h-4 text-primary border-primary/50"
                  >
                    Hoy
                  </Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={goToNextDay}
                disabled={isToday}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Targets Card */}
        {dailyData && (
          <Card className="bg-surface/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Objetivos diarios
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <p className="text-text-muted">Cal</p>
                <p className="font-bold text-text">{Math.round(dailyData.targetCalories)}</p>
              </div>
              <div>
                <p className="text-text-muted">Prot</p>
                <p className="font-bold text-text">{Math.round(dailyData.targetProtein)}g</p>
              </div>
              <div>
                <p className="text-text-muted">Carbs</p>
                <p className="font-bold text-text">{Math.round(dailyData.targetCarbs)}g</p>
              </div>
              <div>
                <p className="text-text-muted">Grasas</p>
                <p className="font-bold text-text">{Math.round(dailyData.targetFat)}g</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Summary */}
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Consumo del día</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {changingDay ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <>
                {/* Calories */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="font-medium text-text">Calorías</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-text">
                        {Math.round(dailyData?.totalCalories || 0)}
                      </span>
                      <span className="text-text-muted text-sm">
                        /{Math.round(dailyData?.targetCalories || 0)}
                      </span>
                    </div>
                  </div>
                  <Progress value={Math.min(caloriesPercent, 100)} className="h-2" />
                </div>

                {/* Macros */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Protein */}
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <Beef className="w-5 h-5 text-red-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-text">
                      {Math.round(dailyData?.totalProtein || 0)}g
                    </p>
                    <p className="text-xs text-text-muted">
                      /{Math.round(dailyData?.targetProtein || 0)}g
                    </p>
                    <Progress value={Math.min(proteinPercent, 100)} className="h-1 mt-2" />
                  </div>

                  {/* Carbs */}
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <Wheat className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-text">
                      {Math.round(dailyData?.totalCarbs || 0)}g
                    </p>
                    <p className="text-xs text-text-muted">
                      /{Math.round(dailyData?.targetCarbs || 0)}g
                    </p>
                    <Progress value={Math.min(carbsPercent, 100)} className="h-1 mt-2" />
                  </div>

                  {/* Fat */}
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-text">
                      {Math.round(dailyData?.totalFat || 0)}g
                    </p>
                    <p className="text-xs text-text-muted">
                      /{Math.round(dailyData?.targetFat || 0)}g
                    </p>
                    <Progress value={Math.min(fatPercent, 100)} className="h-1 mt-2" />
                  </div>
                </div>

                {(!dailyData?.entries || dailyData.entries.length === 0) && (
                  <p className="text-center text-text-muted text-sm py-4">
                    No hay registros para este día
                  </p>
                )}

                {/* Food entries list */}
                {dailyData?.entries && dailyData.entries.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-text-muted font-medium">
                      {dailyData.entries.length} alimentos registrados
                    </p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {dailyData.entries.map((entry: any, idx: number) => {
                        const name = entry.foodItem?.name || entry.recipe?.name || "Alimento";
                        const qty = entry.quantityGrams || entry.quantity || 0;
                        const cal = entry.calories || 0;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2 py-1.5 bg-background/30 rounded text-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Utensils className="w-3 h-3 text-text-muted shrink-0" />
                              <span className="truncate text-text">{name}</span>
                              <span className="text-text-muted text-xs">
                                {qty}g
                              </span>
                            </div>
                            <span className="text-xs text-text-muted">
                              {Math.round(parseFloat(cal) || 0)} kcal
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Weekly Overview */}
        {weeklyData.length > 0 && (
          <Card className="bg-surface/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Últimos 7 días
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {weeklyData.slice(-7).map((day, index) => {
                  const dateStr = day.date?.substring?.(0, 10) || day.date;
                  const date = new Date(dateStr + "T12:00:00");
                  const dayName = date.toLocaleDateString("es-AR", { weekday: "narrow" });
                  const isSelected = dateStr === selectedDate;
                  const consumed = parseFloat(day.consumed?.calories) || parseFloat(day.totalCalories) || 0;
                  const target = parseFloat(day.targets?.calories) || dailyData?.targetCalories || 2000;
                  const calPercent = target > 0 ? (consumed / target) * 100 : 0;

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-lg transition-colors",
                        isSelected
                          ? "bg-primary/20 border border-primary"
                          : "bg-background/50 hover:bg-background"
                      )}
                    >
                      <span className="text-[10px] text-text-muted uppercase">
                        {dayName}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold mt-1",
                          calPercent >= 80 && calPercent <= 110
                            ? "text-success"
                            : calPercent > 110
                            ? "text-warning"
                            : "text-text-muted"
                        )}
                      >
                        {Math.round(calPercent)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

