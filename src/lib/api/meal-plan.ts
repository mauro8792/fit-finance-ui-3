import api from "../api";

// Types
export interface MealPlanFood {
  id?: number;
  foodItemId?: number;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
}

export interface MealPlanMeal {
  id?: number;
  name: string;
  icon: string;
  order: number;
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  foods: MealPlanFood[];
}

export interface MealPlanTemplate {
  id: number;
  name: string;
  objective: string;
  description?: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealsCount: number;
  isActive: boolean;
  status: "draft" | "active";
  meals: MealPlanMeal[];
  assignedCount?: number;
  assignedStudents?: { id: number; name: string; isCustomized: boolean }[];
  createdAt: string;
  updatedAt?: string;
}

export interface StudentMealPlan {
  id: number;
  name: string;
  objective: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  isActive: boolean;
  meals: MealPlanMeal[];
}

export interface AssignedPlan {
  id: number;
  templateId: number;
  templateName: string;
  studentId: number;
  studentName: string;
  isCustomized: boolean;
  assignedAt: string;
}

// ===================== COACH ENDPOINTS =====================

export const createMealPlanTemplate = async (data: {
  name: string;
  objective?: string;
  description?: string;
  status?: "draft" | "active";
  meals?: {
    name: string;
    icon: string;
    order: number;
    foods: {
      foodItemId?: number;
      name: string;
      quantity: number;
      unit: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      notes?: string;
    }[];
  }[];
}): Promise<MealPlanTemplate> => {
  const response = await api.post("/meal-plans", data);
  return response.data;
};

export const getMealPlanTemplates = async (): Promise<MealPlanTemplate[]> => {
  const response = await api.get("/meal-plans");
  return response.data;
};

export const getMealPlanTemplate = async (id: number): Promise<MealPlanTemplate> => {
  const response = await api.get(`/meal-plans/${id}`);
  return response.data;
};

export const updateMealPlanTemplate = async (
  id: number,
  data: {
    name?: string;
    objective?: string;
    description?: string;
    status?: "draft" | "active";
    meals?: {
      name: string;
      icon: string;
      order: number;
      foods: {
        foodItemId?: number;
        name: string;
        quantity: number;
        unit: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        notes?: string;
      }[];
    }[];
  }
): Promise<MealPlanTemplate> => {
  const response = await api.patch(`/meal-plans/${id}`, data);
  return response.data;
};

export const deleteMealPlanTemplate = async (id: number): Promise<void> => {
  await api.delete(`/meal-plans/${id}`);
};

export const duplicateMealPlanTemplate = async (id: number): Promise<MealPlanTemplate> => {
  const response = await api.post(`/meal-plans/${id}/duplicate`);
  return response.data;
};

export const getAssignedPlans = async (): Promise<AssignedPlan[]> => {
  const response = await api.get("/meal-plans/assigned");
  return response.data.map((item: any) => ({
    id: item.id,
    templateId: item.templateId,
    templateName: item.template?.name || "Plan",
    studentId: item.studentId,
    studentName: item.student
      ? `${item.student.firstName} ${item.student.lastName}`
      : "Alumno",
    isCustomized: !!item.customizations,
    assignedAt: item.createdAt,
  }));
};

export const assignMealPlan = async (
  templateId: number,
  data: { studentIds: number[]; customName?: string; notes?: string }
): Promise<{ assigned: number; skipped: number }> => {
  const response = await api.post(`/meal-plans/${templateId}/assign`, data);
  return response.data;
};

export const unassignMealPlan = async (
  templateId: number,
  studentId: number
): Promise<void> => {
  await api.delete(`/meal-plans/${templateId}/unassign/${studentId}`);
};

// ===================== STUDENT ENDPOINTS =====================

export const getMyMealPlans = async (): Promise<StudentMealPlan[]> => {
  const response = await api.get("/meal-plans/my-plans");
  return response.data;
};

export const getStudentMealPlans = async (
  studentId: number
): Promise<StudentMealPlan[]> => {
  const response = await api.get(`/meal-plans/student/${studentId}`);
  return response.data;
};

