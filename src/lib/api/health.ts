import api from "@/lib/api";

// ========== WEIGHT ==========

export const getWeightLogs = async (studentId: number, limit = 30) => {
  const { data } = await api.get(`/health/weight/${studentId}?limit=${limit}`);
  return data;
};

export const addWeightLog = async (studentId: number, weight: number, date?: string) => {
  const { data } = await api.post(`/health/weight/${studentId}`, {
    weight,
    date: date || (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })(),
  });
  return data;
};

// Obtener peso de una fecha específica (si existe)
export const getWeightByDate = async (studentId: number, date: string): Promise<{ weight: number; id: number } | null> => {
  try {
    const { data } = await api.get(`/health/weight/${studentId}?limit=100`);
    // La API puede devolver { value: [...] } o directamente el array
    let logs = [];
    if (Array.isArray(data)) {
      logs = data;
    } else if (data?.value && Array.isArray(data.value)) {
      logs = data.value;
    } else if (data && typeof data === 'object') {
      // Puede ser un objeto con los logs en otra propiedad
      logs = Object.values(data).find(v => Array.isArray(v)) || [];
    }
    
    // Buscar el registro que coincida con la fecha
    const found = logs.find((log: any) => {
      if (!log?.date) return false;
      const logDate = typeof log.date === 'string' ? log.date.split('T')[0] : '';
      return logDate === date;
    });
    
    if (found) {
      return { weight: Number(found.weight), id: found.id };
    }
    return null;
  } catch (error) {
    console.error('Error fetching weight by date:', error);
    return null;
  }
};

export const getWeightStats = async (studentId: number) => {
  const { data } = await api.get(`/health/weight/${studentId}/stats`);
  return data;
};

export const getWeightWeeklyStats = async (studentId: number) => {
  const { data } = await api.get(`/health/weight/${studentId}/weekly-stats`);
  return data;
};

export const updateWeightGoal = async (studentId: number, weeklyGoal: number) => {
  const { data } = await api.put(`/health/goals/${studentId}/weight`, { weeklyGoal });
  return data;
};

// ========== ANTHROPOMETRY ==========

export const getAnthropometry = async (studentId: number) => {
  const { data } = await api.get(`/health/anthropometry/${studentId}`);
  return data;
};

export const addAnthropometry = async (
  studentId: number,
  measurements: {
    chest?: number;
    waist?: number;
    hips?: number;
    leftArm?: number;
    rightArm?: number;
    leftThigh?: number;
    rightThigh?: number;
    leftCalf?: number;
    rightCalf?: number;
    notes?: string;
  }
) => {
  const { data } = await api.post(`/health/anthropometry/${studentId}`, measurements);
  return data;
};

// ========== DASHBOARD ==========

export const getHealthDashboard = async (studentId: number) => {
  const { data } = await api.get(`/health/dashboard/${studentId}`);
  return data;
};

