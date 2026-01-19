import api from "@/lib/api";
import type { Student, Fee } from "@/types";

// ========== STUDENTS ==========

export const getCoachStudents = async (coachUserId: number, includeInactive = false): Promise<Student[]> => {
  const url = includeInactive
    ? `/students/coach/${coachUserId}?includeInactive=true`
    : `/students/coach/${coachUserId}`;
  const { data } = await api.get(url);
  return data;
};

export const getCoachStudentsSummary = async () => {
  const { data } = await api.get("/macrocycle/coach/students-summary");
  return data;
};

export const getStudentById = async (studentId: number): Promise<Student> => {
  const { data } = await api.get(`/students/${studentId}`);
  return data;
};

export const updateStudent = async (studentId: number, updates: Partial<Student>) => {
  const { data } = await api.put(`/students/${studentId}`, updates);
  return data;
};

export const updateStudentPermissions = async (studentId: number, permissions: any) => {
  const { data } = await api.put(`/students/${studentId}/permissions`, permissions);
  return data;
};

export const updateStudentGoals = async (
  studentId: number,
  goals: { dailyStepsGoal?: number; weeklyWeightGoal?: number }
) => {
  // Actualizar pasos goal - endpoint correcto: /cardio/:studentId/steps-goal
  if (goals.dailyStepsGoal !== undefined) {
    await api.put(`/cardio/${studentId}/steps-goal`, { dailyStepsGoal: goals.dailyStepsGoal });
  }
  // Actualizar peso goal - endpoint correcto: /health/goals/:studentId/weight
  if (goals.weeklyWeightGoal !== undefined) {
    await api.put(`/health/goals/${studentId}/weight`, { weeklyWeightGoal: goals.weeklyWeightGoal });
  }
};

// ========== RECENT ACTIVITY ==========

export const getRecentActivity = async (coachUserId: number, limit = 10) => {
  const { data } = await api.get(`/students/coach/${coachUserId}/recent-activity?limit=${limit}`);
  return data;
};

// ========== STUDENT STATS ==========

export const getStudentWeightStats = async (studentId: number) => {
  const { data } = await api.get(`/health/weight/${studentId}/stats`);
  return data;
};

export const getStudentStepsStats = async (studentId: number) => {
  const { data } = await api.get(`/cardio/${studentId}/steps-weekly`);
  return data;
};

export const getStudentNotes = async (studentId: number, limit = 10) => {
  const { data } = await api.get(`/set/student/${studentId}/notes?limit=${limit}`);
  return data;
};

// ========== FEES ==========

interface CoachFeesResponse {
  coach: any;
  fees: Fee[];
  statistics: {
    total: number;
    paid: number;
    partial: number;
    pending: number;
    overdue: number;
  };
  period: {
    month: number;
    year: number;
  };
}

export const getCoachFees = async (): Promise<Fee[]> => {
  const { data } = await api.get<CoachFeesResponse>(`/fee/coach/my-students-fees`);
  // El API devuelve { coach, fees, statistics, period }, extraemos solo fees
  return data.fees || [];
};

export const getCoachFeesWithStats = async (): Promise<CoachFeesResponse> => {
  const { data } = await api.get<CoachFeesResponse>(`/fee/coach/my-students-fees`);
  return data;
};

export const createPayment = async (paymentData: {
  feeId: number;
  studentId: number;
  amount: number;
  paymentMethod: string;
  reference?: string;
}) => {
  const { amount, ...rest } = paymentData;
  const { data } = await api.post("/payments", {
    ...rest,
    amountPaid: amount,
    paymentDate: (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })(),
  });
  return data;
};

interface NotifyOverdueResponse {
  success: boolean;
  message: string;
  notified: number;
  details: { studentName: string; month: string; year: number; amount: number }[];
}

export const notifyOverdueFees = async (): Promise<NotifyOverdueResponse> => {
  const { data } = await api.post<NotifyOverdueResponse>("/fee/coach/notify-overdue");
  return data;
};

// ========== NUTRITION ==========

export const getStudentNutritionProfile = async (studentId: number) => {
  const { data } = await api.get(`/nutrition/profile/${studentId}`);
  return data;
};

export const updateNutritionProfile = async (studentId: number, profileData: any) => {
  const { data } = await api.post(`/nutrition/profile/${studentId}`, profileData);
  return data;
};

export const getStudentWeeklyNutrition = async (studentId: number) => {
  const { data } = await api.get(`/nutrition/weekly/${studentId}`);
  return data;
};

// ========== EXERCISE CATALOG ==========

export interface CatalogExercise {
  id: number;
  name: string;
  description?: string;
  muscleGroup: string;
  equipment?: string;
  videoUrl?: string;
  imageUrl?: string;
}

export const getExerciseCatalog = async (
  muscleGroup?: string,
  search?: string
): Promise<CatalogExercise[]> => {
  let url = "/exercise-catalog";
  const params = new URLSearchParams();
  if (muscleGroup) params.append("muscleGroup", muscleGroup);
  if (search) params.append("search", search);
  if (params.toString()) url += `?${params.toString()}`;
  
  const { data } = await api.get(url);
  return data;
};

export const getMuscleGroups = async (): Promise<string[]> => {
  const { data } = await api.get("/exercise-catalog/muscle-groups");
  return data;
};

