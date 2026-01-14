"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, Maximize2, X, ChartLine, ChevronLeft, ChevronRight, Calendar, BarChart3, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

// Componente de spinner para el gráfico
function ChartSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-8 h-8 text-primary" />
      </motion.div>
      <p className="text-sm text-text-muted">Cargando datos...</p>
    </div>
  );
}

interface WeekData {
  name: string;
  weekStart?: string;
  weekEnd?: string;
  pasos: number | null;
  peso: number | null;
  stepsVariation?: number | null;
  weightVariation?: number | null;
}

interface DailyData {
  name: string;
  date: string;
  pasos: number | null;
  peso: number | null;
}

interface Props {
  studentId: number;
  className?: string;
}

export function StepsWeightCorrelationChart({ studentId, className }: Props) {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"weeks" | "daily">("weeks");
  const [fullscreen, setFullscreen] = useState(false);
  
  // Weekly view data (8 weeks overview)
  const [weeklyStepsData, setWeeklyStepsData] = useState<any>(null);
  const [weeklyWeightData, setWeeklyWeightData] = useState<any>(null);
  
  // Daily view data (single week, day by day)
  const [weekOffset, setWeekOffset] = useState(0);
  const [dailyStepsData, setDailyStepsData] = useState<any>(null);
  const [dailyWeightData, setDailyWeightData] = useState<any>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);

  // Load weekly overview data
  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        setLoading(true);
        
        const [stepsResponse, weightResponse] = await Promise.all([
          api.get(`/cardio/${studentId}/steps-weekly-stats?weeks=8`).catch(() => ({ data: null })),
          api.get(`/health/weight/${studentId}/weekly-stats?weeks=8`).catch(() => ({ data: null })),
        ]);
        
        setWeeklyStepsData(stepsResponse.data);
        setWeeklyWeightData(weightResponse.data);
      } catch (err) {
        console.error("Error fetching weekly data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchWeeklyData();
    }
  }, [studentId]);

  // Load daily data for specific week
  const loadDailyData = async (offset: number) => {
    setLoadingDaily(true);
    try {
      const [stepsResponse, weightResponse] = await Promise.all([
        api.get(`/cardio/${studentId}/steps-weekly?weekOffset=${offset}`).catch(() => ({ data: null })),
        api.get(`/health/weight/${studentId}/daily-week?weekOffset=${offset}`).catch(() => ({ data: null })),
      ]);
      
      setDailyStepsData(stepsResponse.data);
      setDailyWeightData(weightResponse.data);
      setWeekOffset(offset);
    } catch (err) {
      console.error("Error fetching daily data:", err);
    } finally {
      setLoadingDaily(false);
    }
  };

  // Load daily data when switching to daily view
  useEffect(() => {
    if (viewMode === "daily" && !dailyStepsData) {
      loadDailyData(0);
    }
  }, [viewMode]);

  const handlePrevWeek = () => {
    if (weekOffset < 8) loadDailyData(weekOffset + 1);
  };

  const handleNextWeek = () => {
    if (weekOffset > 0) loadDailyData(weekOffset - 1);
  };

  if (loading) {
    return (
      <Card className={cn("bg-surface/80 border-border", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-text flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Pasos vs Peso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSpinner />
        </CardContent>
      </Card>
    );
  }

  // Check if we have data
  const hasWeeklySteps = weeklyStepsData?.hasData && weeklyStepsData?.weeks?.length;
  const hasWeeklyWeight = weeklyWeightData?.hasData && weeklyWeightData?.weeks?.length;

  if (!hasWeeklySteps && !hasWeeklyWeight) {
    return (
      <Card className={cn("bg-surface/80 border-border", className)}>
        <CardContent className="p-6 text-center">
          <ChartLine className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">
            Cargá pasos y peso para ver la correlación
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare WEEKLY overview data (S1, S2, S3...)
  const weeklyChartData: WeekData[] = [];
  const maxWeeks = Math.max(
    weeklyStepsData?.weeks?.length || 0,
    weeklyWeightData?.weeks?.length || 0
  );

  for (let i = 0; i < maxWeeks; i++) {
    const stepsWeek = weeklyStepsData?.weeks?.[i];
    const weightWeek = weeklyWeightData?.weeks?.[i];

    weeklyChartData.push({
      name: `S${i + 1}`,
      weekStart: stepsWeek?.weekStart || weightWeek?.weekStart,
      weekEnd: stepsWeek?.weekEnd || weightWeek?.weekEnd,
      pasos: stepsWeek?.averageSteps || null,
      peso: weightWeek?.averageWeight || null,
      stepsVariation: stepsWeek?.variationSteps,
      weightVariation: weightWeek?.variationGrams,
    });
  }

  // Prepare DAILY data (Lun, Mar, Mié...)
  const dailyChartData: DailyData[] = [];
  if (dailyStepsData?.stepsByDay) {
    for (const day of dailyStepsData.stepsByDay) {
      const weightDay = dailyWeightData?.weightsByDay?.find(
        (w: any) => w.date === day.date
      );
      
      dailyChartData.push({
        name: day.dayShort || day.day?.substring(0, 3),
        date: day.date,
        pasos: day.steps || null,
        peso: weightDay?.weight || null,
      });
    }
  }

  // Calculate Y domains for current view
  const currentData = viewMode === "weeks" ? weeklyChartData : dailyChartData;
  const stepsValues = currentData.filter((d) => d.pasos).map((d) => d.pasos as number);
  const weightValues = currentData.filter((d) => d.peso).map((d) => d.peso as number);

  const minSteps = stepsValues.length > 0 ? Math.min(...stepsValues) : 0;
  const maxSteps = stepsValues.length > 0 ? Math.max(...stepsValues) : 10000;
  const stepsPadding = (maxSteps - minSteps) * 0.2 || 1000;

  const minWeight = weightValues.length > 0 ? Math.min(...weightValues) : 0;
  const maxWeight = weightValues.length > 0 ? Math.max(...weightValues) : 100;
  const weightPadding = (maxWeight - minWeight) * 0.3 || 2;

  const stepsGoal = weeklyStepsData?.dailyGoal || dailyStepsData?.dailyGoal || 0;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const isDaily = viewMode === "daily";
      
      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg min-w-[140px]">
          <p className="font-semibold text-text text-sm mb-1">
            {isDaily ? data.name : `Semana ${data.name?.replace("S", "")}`}
          </p>
          {isDaily && data.date && (
            <p className="text-xs text-text-muted mb-2">
              {formatDate(data.date, { day: "numeric", month: "short" })}
            </p>
          )}
          {!isDaily && data.weekStart && (
            <p className="text-xs text-text-muted mb-2">
              {data.weekStart} - {data.weekEnd}
            </p>
          )}

          {data.pasos != null && (
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-primary">🚶 Pasos:</span>
              <span className="text-xs font-bold text-primary">
                {data.pasos.toLocaleString()}
              </span>
            </div>
          )}

          {data.peso != null && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-success">⚖️ Peso:</span>
              <span className="text-xs font-bold text-success">
                {Number(data.peso).toFixed(2)} kg
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Chart component
  const ChartContent = ({ height = 220, data }: { height?: number; data: any[] }) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 45, left: -10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#888", fontSize: 10 }}
          axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
        />
        <YAxis
          yAxisId="pasos"
          orientation="left"
          domain={[Math.max(0, minSteps - stepsPadding), maxSteps + stepsPadding]}
          tick={{ fill: "#ff9800", fontSize: 9 }}
          axisLine={{ stroke: "#ff9800" }}
          tickFormatter={(value) =>
            value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
          }
          width={35}
        />
        <YAxis
          yAxisId="peso"
          orientation="right"
          domain={[
            Math.floor(minWeight - weightPadding),
            Math.ceil(maxWeight + weightPadding),
          ]}
          tick={{ fill: "#4cceac", fontSize: 9 }}
          axisLine={{ stroke: "#4cceac" }}
          tickFormatter={(value) => Number(value).toFixed(1)}
          width={35}
          tickCount={5}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Steps Area */}
        <Area
          yAxisId="pasos"
          type="monotone"
          dataKey="pasos"
          name="Pasos"
          fill="#ff9800"
          fillOpacity={0.3}
          stroke="#ff9800"
          strokeWidth={2}
          connectNulls
        />

        {/* Steps Goal Reference Line */}
        {stepsGoal > 0 && (
          <ReferenceLine
            yAxisId="pasos"
            y={stepsGoal}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: `Meta: ${(stepsGoal / 1000).toFixed(0)}k`,
              fill: "#ef4444",
              fontSize: 9,
              position: "right",
            }}
          />
        )}

        {/* Weight Line */}
        <Line
          yAxisId="peso"
          type="monotone"
          dataKey="peso"
          name="Peso (kg)"
          stroke="#4cceac"
          strokeWidth={3}
          dot={{ fill: "#4cceac", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: "#4cceac" }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  // Week label for daily view
  const weekLabel = dailyStepsData?.weekLabel || "Esta semana";
  const weekRange = dailyStepsData?.weekStart && dailyStepsData?.weekEnd
    ? `${formatDate(dailyStepsData.weekStart, { day: "numeric", month: "short" })} - ${formatDate(dailyStepsData.weekEnd, { day: "numeric", month: "short" })}`
    : "";

  return (
    <>
      <Card className={cn("bg-surface/80 border-border overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-text flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Pasos vs Peso
            </CardTitle>
            <div className="flex items-center gap-1">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList className="h-7 bg-background/50">
                  <TabsTrigger value="weeks" className="text-xs px-2 py-1 h-5">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    8 sem
                  </TabsTrigger>
                  <TabsTrigger value="daily" className="text-xs px-2 py-1 h-5">
                    <Calendar className="w-3 h-3 mr-1" />
                    Diario
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-text-muted hover:text-text"
                onClick={() => setFullscreen(true)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Week navigation for daily view */}
          {viewMode === "daily" && (
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePrevWeek}
                disabled={weekOffset >= 8 || loadingDaily}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <p className="text-xs font-medium text-text">{weekLabel}</p>
                {weekRange && <p className="text-[10px] text-text-muted">{weekRange}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextWeek}
                disabled={weekOffset <= 0 || loadingDaily}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-2">
          <div className="relative min-h-[180px]">
            {loadingDaily && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-6 h-6 text-primary" />
                </motion.div>
                <p className="text-xs text-text-muted mt-2">Cargando semana...</p>
              </div>
            )}
            <ChartContent 
              height={180} 
              data={viewMode === "weeks" ? weeklyChartData : dailyChartData} 
            />
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary opacity-50" />
              <span className="text-text-muted">Pasos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-text-muted">Peso</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-full h-full sm:max-w-[95vw] sm:h-[95vh] bg-background border-border p-0">
          <DialogHeader className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Evolución Pasos vs Peso
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFullscreen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-1">
              💡 Rotá el celular en horizontal para ver mejor el gráfico
            </p>
          </DialogHeader>

          <div className="flex-1 p-4 overflow-auto">
            <ChartContent height={300} data={weeklyChartData} />

            {/* Weekly Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 px-2 text-left text-text-muted">Sem</th>
                    <th className="py-2 px-2 text-right text-success">Peso</th>
                    <th className="py-2 px-2 text-right text-success">Δ Peso</th>
                    <th className="py-2 px-2 text-right text-primary">Pasos</th>
                    <th className="py-2 px-2 text-right text-primary">Δ Pasos</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyChartData.map((week) => (
                    <tr
                      key={week.name}
                      className="border-b border-border/50 hover:bg-surface/50"
                    >
                      <td className="py-2 px-2 text-text">{week.name}</td>
                      <td className="py-2 px-2 text-right font-semibold text-text">
                        {week.peso ? `${week.peso.toFixed(2)}kg` : "-"}
                      </td>
                      <td
                        className={cn(
                          "py-2 px-2 text-right font-semibold",
                          week.weightVariation != null
                            ? week.weightVariation < 0
                              ? "text-success"
                              : week.weightVariation > 0
                              ? "text-red-400"
                              : "text-text-muted"
                            : "text-text-muted"
                        )}
                      >
                        {week.weightVariation != null
                          ? `${week.weightVariation > 0 ? "+" : ""}${week.weightVariation}g`
                          : "-"}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-text">
                        {week.pasos ? week.pasos.toLocaleString() : "-"}
                      </td>
                      <td
                        className={cn(
                          "py-2 px-2 text-right font-semibold",
                          week.stepsVariation != null
                            ? week.stepsVariation > 0
                              ? "text-success"
                              : week.stepsVariation < 0
                              ? "text-red-400"
                              : "text-text-muted"
                            : "text-text-muted"
                        )}
                      >
                        {week.stepsVariation != null
                          ? `${week.stepsVariation > 0 ? "+" : ""}${week.stepsVariation.toLocaleString()}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
