import api from "@/lib/api";

// Tipos de actividad Indoor (con cronómetro)
export const INDOOR_ACTIVITIES: Record<string, ActivityInfo> = {
  treadmill: { label: "Cinta", emoji: "🚶‍♂️", met: 8.0, color: "#4cceac", hasDistance: true },
  stationary_bike: { label: "Bici Fija", emoji: "🚲", met: 7.0, color: "#6870fa", hasDistance: true },
  swimming: { label: "Natación", emoji: "🏊", met: 8.0, color: "#3b82f6", hasDistance: true },
  elliptical: { label: "Elíptica", emoji: "🏃‍♀️", met: 5.0, color: "#ec4899", hasDistance: false },
  rowing: { label: "Remo", emoji: "🚣", met: 7.0, color: "#14b8a6", hasDistance: true },
  hiit: { label: "HIIT", emoji: "🏋️", met: 8.0, color: "#ef4444", hasDistance: false },
  yoga: { label: "Yoga", emoji: "🧘", met: 2.5, color: "#a855f7", hasDistance: false },
  stretching: { label: "Stretching", emoji: "🤸", met: 2.0, color: "#f59e0b", hasDistance: false },
  dance: { label: "Baile", emoji: "💃", met: 6.0, color: "#ec4899", hasDistance: false },
  stairs: { label: "Escaleras", emoji: "🪜", met: 9.0, color: "#ff9800", hasDistance: false },
  jump_rope: { label: "Saltar Soga", emoji: "🪢", met: 11.0, color: "#ef4444", hasDistance: false },
  walking: { label: "Caminata", emoji: "🚶", met: 3.5, color: "#4cceac", hasDistance: true },
  running: { label: "Correr", emoji: "🏃", met: 9.5, color: "#ef4444", hasDistance: true },
  cycling: { label: "Ciclismo", emoji: "🚴", met: 7.0, color: "#3b82f6", hasDistance: true },
};

// Niveles de intensidad
export const INTENSITY_LEVELS: Record<string, IntensityInfo> = {
  low: { label: "Baja", color: "#4cceac", description: "Recuperación activa" },
  medium: { label: "Media", color: "#ff9800", description: "Zona aeróbica" },
  high: { label: "Alta", color: "#ef4444", description: "Intervalos / sprints" },
};

export interface ActivityInfo {
  label: string;
  emoji: string;
  met: number;
  color: string;
  hasDistance: boolean;
}

export interface IntensityInfo {
  label: string;
  color: string;
  description: string;
}

export interface CardioLog {
  id: number;
  date: string;
  activityType: string;
  durationMinutes: number;
  intensity: string;
  distanceKm?: number;
  caloriesBurned?: number;
  steps?: number;
  notes?: string;
  createdAt: string;
}

export interface WeeklySummary {
  totalSessions: number;
  totalMinutes: number;
  totalDistance: number;
  totalSteps: number;
  byActivity: Record<string, { count: number; minutes: number }>;
}

/**
 * Crear un nuevo registro de cardio
 */
export const createCardio = async (studentId: number, data: {
  date: string;
  activityType: string;
  durationMinutes: number;
  intensity?: string;
  distanceKm?: number;
  caloriesBurned?: number;
  notes?: string;
}): Promise<CardioLog> => {
  const response = await api.post(`/cardio/${studentId}`, data);
  return response.data;
};

/**
 * Obtener todos los registros de cardio de un estudiante
 */
export const getCardioLogs = async (
  studentId: number,
  startDate?: string,
  endDate?: string
): Promise<CardioLog[]> => {
  let url = `/cardio/${studentId}`;
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await api.get(url);
  return response.data;
};

/**
 * Obtener registros de cardio de hoy
 */
export const getTodayCardio = async (studentId: number): Promise<CardioLog[]> => {
  const response = await api.get(`/cardio/${studentId}/today`);
  return response.data;
};

/**
 * Obtener resumen semanal
 */
export const getWeeklyCardio = async (studentId: number): Promise<WeeklySummary> => {
  const response = await api.get(`/cardio/${studentId}/week`);
  return response.data;
};

/**
 * Eliminar registro de cardio
 */
export const deleteCardio = async (id: number): Promise<void> => {
  await api.delete(`/cardio/${id}`);
};

/**
 * Obtener info de una actividad
 */
export const getActivityInfo = (type: string): ActivityInfo => {
  return INDOOR_ACTIVITIES[type] || { label: type, emoji: "🏃", met: 5, color: "#888", hasDistance: false };
};

/**
 * Obtener info de intensidad
 */
export const getIntensityInfo = (intensity: string): IntensityInfo | null => {
  return INTENSITY_LEVELS[intensity] || null;
};

/**
 * Formatear duración en minutos a texto legible
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};

/**
 * Formatear segundos a "MM:SS" o "HH:MM:SS"
 */
export const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

/**
 * Estimar calorías quemadas
 */
export const estimateCalories = (
  activityType: string,
  durationMinutes: number,
  weightKg: number = 70
): number => {
  const activity = INDOOR_ACTIVITIES[activityType];
  const met = activity?.met || 5;
  return Math.round(met * weightKg * (durationMinutes / 60));
};

/**
 * Obtener fecha local en formato YYYY-MM-DD
 */
export const getLocalDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

// ======== Funciones API originales ========

/**
 * Obtener resumen de cardio
 */
export const getCardioSummary = async (studentId: number) => {
  const response = await api.get(`/cardio/${studentId}/summary`);
  return response.data;
};

/**
 * Obtener estadísticas semanales de pasos (para una semana específica)
 */
export const getStepsWeeklyStats = async (studentId: number) => {
  const response = await api.get(`/cardio/${studentId}/steps-weekly`);
  return response.data;
};

/**
 * Obtener estadísticas históricas semanales de pasos (para gráficos de evolución)
 */
export interface StepsWeeklyHistoryStats {
  hasData: boolean;
  weeks: Array<{
    weekNumber: number;
    weekStart: string;
    weekEnd: string;
    totalSteps: number;
    averageSteps: number;
    maxSteps: number;
    minSteps: number;
    daysWithData: number;
    daysAchieved: number;
    complianceRate: number;
    variationSteps: number | null;
    variationPercent: number | null;
  }>;
  dailyGoal: number;
  summary: {
    totalRecords: number;
    totalWeeks: number;
    totalSteps: number;
    currentAverage: number | null;
    initialAverage: number | null;
    totalChange: number | null;
    totalChangePercent: number | null;
    avgWeeklyChange: number | null;
    overallComplianceRate: number;
    totalDaysAchieved: number;
    totalDaysWithData: number;
  };
}

export const getStepsWeeklyHistoryStats = async (studentId: number, weeks = 12): Promise<StepsWeeklyHistoryStats> => {
  const response = await api.get(`/cardio/${studentId}/steps-weekly-stats?weeks=${weeks}`);
  return response.data;
};

/**
 * Obtener resumen de la semana
 */
export const getWeekCardio = async (studentId: number) => {
  const response = await api.get(`/cardio/${studentId}/week`);
  return response.data;
};

/**
 * Obtener actividades recientes (lista completa)
 */
export const getRecentActivities = async (studentId: number) => {
  const response = await api.get(`/cardio/${studentId}`);
  return response.data;
};

/**
 * Agregar actividad manual
 */
export const addManualActivity = async (
  studentId: number,
  data: {
    activityType: string;
    durationMinutes: number;
    distanceKm?: number;
    steps?: number;
    caloriesBurned?: number;
    notes?: string;
    date: string;
    intensity: "low" | "medium" | "high";
  }
) => {
  const response = await api.post(`/cardio/${studentId}`, data);
  return response.data;
};

/**
 * Obtener historial de actividades
 */
export const getActivityHistory = async (studentId: number, limit: number = 50) => {
  // El backend devuelve todos los registros, tomamos los últimos N
  const response = await api.get(`/cardio/${studentId}`);
  const data = Array.isArray(response.data) ? response.data : [];
  // Ordenar por fecha descendente y limitar
  return data
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
};

/**
 * Agregar pasos manualmente
 */
export const addSteps = async (studentId: number, data: { steps: number; date: string; notes?: string; replace?: boolean }) => {
  const response = await api.post(`/cardio/${studentId}/manual-steps`, data);
  return response.data;
};

// Alias para compatibilidad
export const addManualSteps = addSteps;

// Obtener pasos de un mes completo (para el calendario)
export interface MonthlyStepsData {
  date: string; // yyyy-mm-dd
  steps: number;
  id: number;
}

export const getMonthlySteps = async (studentId: number, year: number, month: number): Promise<MonthlyStepsData[]> => {
  try {
    // Obtener primer y último día del mes
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    
    const response = await api.get(`/cardio/${studentId}`, { 
      params: { startDate, endDate, limit: 100 } 
    });
    
    let logs = [];
    if (Array.isArray(response.data)) {
      logs = response.data;
    } else if (response.data?.value && Array.isArray(response.data.value)) {
      logs = response.data.value;
    }
    
    // Filtrar solo los registros de tipo 'walk' (pasos) y mapear
    return logs
      .filter((log: any) => log?.activityType === 'walk' && log?.steps > 0)
      .map((log: any) => ({
        date: typeof log.date === 'string' ? log.date.split('T')[0] : '',
        steps: Number(log.steps) || 0,
        id: log.id,
      }));
  } catch (error) {
    console.error('Error fetching monthly steps:', error);
    return [];
  }
};

// Obtener pasos de una fecha específica (si existe)
export const getStepsByDate = async (studentId: number, date: string): Promise<{ steps: number; id: number } | null> => {
  try {
    const response = await api.get(`/cardio/${studentId}`, { params: { limit: 100 } });
    // La API puede devolver array directo o { value: [...] }
    let logs = [];
    if (Array.isArray(response.data)) {
      logs = response.data;
    } else if (response.data?.value && Array.isArray(response.data.value)) {
      logs = response.data.value;
    }
    
    // Buscar registro de tipo 'walk' que coincida con la fecha
    const found = logs.find((log: any) => {
      if (!log?.date) return false;
      const logDate = typeof log.date === 'string' ? log.date.split('T')[0] : '';
      return logDate === date && log.activityType === 'walk';
    });
    
    if (found) {
      return { steps: Number(found.steps) || 0, id: found.id };
    }
    return null;
  } catch (error) {
    console.error('Error fetching steps by date:', error);
    return null;
  }
};
