"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Activity, Dumbbell, Target, TrendingUp } from "lucide-react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface MicrocycleMetricsProps {
  microcycle: any;
  isV2?: boolean;
  showChart?: boolean;
  compact?: boolean;
}

export function MicrocycleMetrics({ 
  microcycle, 
  isV2 = true, 
  showChart = true,
  compact = false 
}: MicrocycleMetricsProps) {
  if (!microcycle?.days) return null;

  // Calcular métricas
  const metrics = calculateMicrocycleMetrics(microcycle, isV2);

  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-2">
        <MetricBadge label="Series" value={metrics.totalSeries} color="primary" />
        <MetricBadge label="Completadas" value={metrics.completedSeries} color="success" />
        <MetricBadge label="RIR Medio" value={metrics.averageRir?.toFixed(1) || "—"} color="accent" />
        <MetricBadge label="Progreso" value={`${metrics.progressPercent}%`} color="warning" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Métricas principales */}
      <Card className="bg-surface/80 border-border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Métricas del Microciclo
          </h3>
          
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <p className="text-lg font-bold text-primary">{metrics.totalSeries}</p>
              <p className="text-[8px] text-text-muted leading-tight">Series<br/>Totales</p>
            </div>
            <div className="p-1.5 rounded-lg bg-success/10">
              <p className="text-lg font-bold text-success">{metrics.completedSeries}</p>
              <p className="text-[8px] text-text-muted leading-tight">Comple-<br/>tadas</p>
            </div>
            <div className="p-1.5 rounded-lg bg-accent/10">
              <p className="text-lg font-bold text-accent">
                {metrics.averageRir !== null ? metrics.averageRir.toFixed(1) : "—"}
              </p>
              <p className="text-[8px] text-text-muted leading-tight">RIR<br/>Medio</p>
            </div>
            <div className="p-1.5 rounded-lg bg-warning/10">
              <p className="text-lg font-bold text-warning">{metrics.progressPercent}%</p>
              <p className="text-[8px] text-text-muted leading-tight">Progreso</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de series por grupo muscular */}
      {showChart && metrics.seriesByMuscleGroup.length > 0 && (
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-accent" />
              Series por Grupo Muscular
            </h3>
            
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={metrics.seriesByMuscleGroup} 
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fill: '#9ca3af', fontSize: 9 }}
                    width={75}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a24', 
                      border: '1px solid #2a2a35',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`${value} series`, 'Total']}
                  />
                  <Bar dataKey="series" radius={[0, 4, 4, 0]}>
                    {metrics.seriesByMuscleGroup.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getBarColor(entry.series, metrics.maxSeriesInGroup)}
                      />
                    ))}
                    <LabelList 
                      dataKey="series" 
                      position="right" 
                      fill="#ffffff"
                      fontSize={11}
                      fontWeight={600}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda de colores */}
            <div className="flex justify-center gap-4 mt-2 text-[10px] text-text-muted">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-500" /> Alto
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-500" /> Medio
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500" /> Bajo
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente auxiliar para badges de métricas
function MetricBadge({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: string | number; 
  color: 'primary' | 'success' | 'accent' | 'warning';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/30',
    success: 'bg-success/10 text-success border-success/30',
    accent: 'bg-accent/10 text-accent border-accent/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
  };

  return (
    <div className={cn("text-center p-2 rounded-lg border", colorClasses[color])}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[9px] opacity-80">{label}</p>
    </div>
  );
}

// Función para calcular métricas
function calculateMicrocycleMetrics(microcycle: any, isV2: boolean) {
  let totalSeries = 0;
  let completedSeries = 0;
  let rirSum = 0;
  let rirCount = 0;
  const muscleGroups: Record<string, number> = {};

  microcycle.days?.forEach((day: any) => {
    day.exercises?.forEach((exercise: any) => {
      const muscleGroup = exercise.exerciseCatalog?.muscleGroup || 
                         exercise.ejercicioCatalogo?.grupoMuscular || 
                         "Otro";
      
      exercise.sets?.forEach((set: any) => {
        totalSeries++;
        
        // Contar series completadas
        const isCompleted = isV2 
          ? (set.isCompleted || set.completedAt) 
          : set.status === "completed";
        
        if (isCompleted) {
          completedSeries++;
        }
        
        // Sumar RIR real (actualRir)
        const rir = set.actualRir;
        if (rir !== null && rir !== undefined && !isNaN(rir)) {
          rirSum += Number(rir);
          rirCount++;
        }
        
        // Contar series por grupo muscular
        muscleGroups[muscleGroup] = (muscleGroups[muscleGroup] || 0) + 1;
      });
    });
  });

  // Convertir a array para el gráfico y ordenar
  const seriesByMuscleGroup = Object.entries(muscleGroups)
    .map(([name, series]) => ({ name: shortenMuscleGroup(name), fullName: name, series }))
    .sort((a, b) => b.series - a.series)
    .slice(0, 10); // Top 10 grupos

  const maxSeriesInGroup = Math.max(...seriesByMuscleGroup.map(g => g.series), 1);
  const progressPercent = totalSeries > 0 
    ? Math.round((completedSeries / totalSeries) * 100) 
    : 0;
  const averageRir = rirCount > 0 ? rirSum / rirCount : null;

  return {
    totalSeries,
    completedSeries,
    averageRir,
    progressPercent,
    seriesByMuscleGroup,
    maxSeriesInGroup,
  };
}

// Acortar nombres de grupos musculares para el gráfico
function shortenMuscleGroup(name: string): string {
  const shortcuts: Record<string, string> = {
    'Deltoides Anterior': 'Delt. Ant.',
    'Deltoides Lateral': 'Delt. Lat.',
    'Deltoides Posterior': 'Delt. Post.',
    'Dorsal Ancho': 'Dorsal',
    'Trapecio Romboides': 'Trap/Romb',
    'Trapecio': 'Trapecio',
    'Romboides': 'Romboides',
    'Glúteo Mayor': 'Glúteo M.',
    'Glúteo Medio': 'Glúteo Med.',
    'Gemelo Sóleo': 'Gemelo',
    'Gemelos': 'Gemelos',
    'Cuádriceps': 'Cuádriceps',
    'Isquiotibiales': 'Isquios',
    'Abdominales': 'Abdomen',
    'Bíceps': 'Bíceps',
    'Tríceps': 'Tríceps',
    'Pectoral': 'Pectoral',
    'Pecho': 'Pecho',
    'Hombros': 'Hombros',
    'Espalda': 'Espalda',
    'Pantorrillas': 'Pantorr.',
    'Antebrazos': 'Antebraz.',
    'Core': 'Core',
  };
  // Si el nombre es muy largo y no está en shortcuts, acortarlo
  if (shortcuts[name]) return shortcuts[name];
  if (name.length > 10) return name.substring(0, 8) + '.';
  return name;
}

// Color de barras según volumen
function getBarColor(series: number, max: number): string {
  const ratio = series / max;
  if (ratio >= 0.7) return '#ef4444'; // Rojo - Alto volumen
  if (ratio >= 0.4) return '#f59e0b'; // Ámbar - Medio
  return '#10b981'; // Verde - Bajo
}
