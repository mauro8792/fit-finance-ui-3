import api from "@/lib/api";
import type { DashboardSummary, WeightLog, CardioLog, Fee } from "@/types";

// ========== DASHBOARD ==========

export const getDashboardSummary = async (studentId: number): Promise<DashboardSummary> => {
  const { data } = await api.get(`/health/dashboard/${studentId}`);
  return data;
};

// ========== WEIGHT ==========

export const getWeightHistory = async (studentId: number, limit = 30): Promise<WeightLog[]> => {
  const { data } = await api.get(`/health/weight/${studentId}?limit=${limit}`);
  // Handle both array response and wrapped response ({ value: [...] })
  const result = data?.value || data || [];
  return Array.isArray(result) ? result : [];
};

export const createWeight = async (studentId: number, weight: number, date?: string, notes?: string) => {
  const { data } = await api.post(`/health/weight/${studentId}`, {
    weight,
    date: date || (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })(),
    notes,
  });
  return data;
};

export const updateWeight = async (weightId: number, weight: number) => {
  const { data } = await api.put(`/health/weight/${weightId}`, { weight });
  return data;
};

export const deleteWeight = async (weightId: number) => {
  const { data } = await api.delete(`/health/weight/${weightId}`);
  return data;
};

// ========== CARDIO ==========

export const getCardioToday = async (studentId: number): Promise<CardioLog[]> => {
  const { data } = await api.get(`/cardio/${studentId}/today`);
  return data;
};

export const getCardioWeek = async (studentId: number) => {
  const { data } = await api.get(`/cardio/${studentId}/week`);
  return data;
};

export const getStepsWeeklyStats = async (studentId: number) => {
  const { data } = await api.get(`/cardio/${studentId}/steps-weekly-stats`);
  return data;
};

// Get daily steps data for a specific week (for "Esta semana" chart)
// weekOffset: 0 = current week, 1 = last week, 2 = two weeks ago, etc.
export const getStepsWeeklySummary = async (studentId: number, weekOffset: number = 0) => {
  const { data } = await api.get(`/cardio/${studentId}/steps-weekly?weekOffset=${weekOffset}`);
  return data;
};

// Update steps for a specific date (replaces existing)
export const updateStepsForDate = async (studentId: number, date: string, steps: number) => {
  // First delete existing, then add new
  const { data } = await api.post(`/cardio/${studentId}/manual-steps`, {
    date,
    steps,
    replace: true, // Flag to replace instead of add
  });
  return data;
};

// Delete steps for a specific date
export const deleteStepsForDate = async (studentId: number, date: string) => {
  const { data } = await api.delete(`/cardio/${studentId}/steps-by-date/${date}`);
  return data;
};

export const createCardio = async (
  studentId: number,
  cardioData: {
    activityType: string;
    durationMinutes?: number;
    distanceKm?: number;
    steps?: number;
    intensity?: string;
    date?: string;
    notes?: string;
  }
) => {
  const { data } = await api.post(`/cardio/${studentId}`, {
    ...cardioData,
    date: cardioData.date || (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })(),
  });
  return data;
};

// ========== FEES ==========

interface FeesResponse {
  fees: Fee[];
  coach?: {
    id: number;
    name?: string;
    paymentAlias?: string;
  } | null;
}

export const getStudentFees = async (studentId: number): Promise<Fee[]> => {
  const { data } = await api.get(`/fee/my-fees/${studentId}`);
  // API returns { student, coach, summary, fees }, extract fees array
  return data?.fees || [];
};

export const getStudentFeesWithCoach = async (studentId: number): Promise<FeesResponse> => {
  const { data } = await api.get(`/fee/my-fees/${studentId}`);
  return {
    fees: data?.fees || [],
    coach: data?.coach || null,
  };
};

export const getPaymentHistory = async (studentId: number) => {
  try {
    const { data } = await api.get(`/payments/my-history`);
    // API returns { value: [...], Count: n }
    return data?.value || data || [];
  } catch {
    // Payment history endpoint may not be available
    return [];
  }
};

