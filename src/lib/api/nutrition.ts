import api from "@/lib/api";

// ========== PROFILE ==========

export const getNutritionProfile = async (studentId: number) => {
  const { data } = await api.get(`/nutrition/profile/${studentId}`);
  return data;
};

export const updateNutritionProfile = async (
  studentId: number,
  profile: {
    sex?: string;
    age?: number;
    currentWeight?: number;
    heightCm?: number;
    bodyFatPercentage?: number;
    trainingDaysPerWeek?: number;
    activityFactor?: number;
    targetDailyCalories?: number;
    targetCalories?: number;
    targetProteinGrams?: number;
    targetProtein?: number;
    targetCarbsGrams?: number;
    targetCarbs?: number;
    targetFatGrams?: number;
    targetFat?: number;
    mealsPerDay?: number;
    notes?: string;
  }
) => {
  // Enviar SOLO los campos que el backend acepta
  const payload = {
    sex: profile.sex,
    age: profile.age,
    currentWeight: profile.currentWeight,
    heightCm: profile.heightCm,
    bodyFatPercentage: profile.bodyFatPercentage,
    trainingDaysPerWeek: profile.trainingDaysPerWeek,
    activityFactor: profile.activityFactor,
    targetDailyCalories: profile.targetDailyCalories || profile.targetCalories,
    targetProteinGrams: profile.targetProteinGrams || profile.targetProtein,
    targetCarbsGrams: profile.targetCarbsGrams || profile.targetCarbs,
    targetFatGrams: profile.targetFatGrams || profile.targetFat,
    notes: profile.notes,
  };
  const { data } = await api.post(`/nutrition/profile/${studentId}`, payload);
  return data;
};

// ========== FOOD LOGS ==========

export const getDailyFoodLog = async (studentId: number, date?: string) => {
  const dateParam = date || (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })();
  const { data } = await api.get(`/nutrition/log/${studentId}?date=${dateParam}`);
  return data;
};

export const addFoodLog = async (
  studentId: number,
  entry: {
    foodItemId?: number;
    recipeId?: number;
    quantityGrams: number;
    mealType?: string;
    mealTypeId?: number;
    date?: string;
  }
) => {
  const { data } = await api.post(`/nutrition/log/${studentId}`, {
    foodItemId: entry.foodItemId,
    recipeId: entry.recipeId,
    quantityGrams: entry.quantityGrams,
    mealTypeId: entry.mealTypeId,
    date: entry.date || (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })(),
  });
  return data;
};

export const deleteFoodLog = async (logId: number) => {
  const { data } = await api.delete(`/nutrition/log/${logId}`);
  return data;
};

// ========== FOOD ITEMS ==========

export const searchFoods = async (studentId: number, query: string) => {
  const { data } = await api.get(`/nutrition/foods/${studentId}?search=${encodeURIComponent(query)}`);
  return data;
};

export const getFoodItem = async (foodId: number) => {
  const { data } = await api.get(`/nutrition/foods/${foodId}`);
  return data;
};

export const createFoodItem = async (
  studentId: number,
  food: {
    name: string;
    brand?: string;
    category?: string;
    portionGrams?: number;
    caloriesPer100g?: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
    fiberPer100g?: number;
    sugarPer100g?: number;
    sodiumPer100g?: number;
    barcode?: string;
  }
) => {
  const { data } = await api.post(`/nutrition/foods/${studentId}`, food);
  return data;
};

// ========== RECIPES ==========

export const getRecipes = async (studentId: number) => {
  const { data } = await api.get(`/nutrition/recipes/${studentId}`);
  return data;
};

export const getRecipe = async (recipeId: number) => {
  const { data } = await api.get(`/nutrition/recipes/detail/${recipeId}`);
  return data;
};

export const createRecipe = async (
  studentId: number,
  recipe: {
    name: string;
    description?: string;
    ingredients: Array<{
      foodItemId: number;
      quantityGrams: number;
    }>;
  }
) => {
  const { data } = await api.post(`/nutrition/recipes/${studentId}`, recipe);
  return data;
};

// ========== MEAL TYPES ==========

export const getMealTypes = async (studentId: number) => {
  const { data } = await api.get(`/nutrition/meal-types/${studentId}`);
  return data;
};

// ========== DASHBOARD ==========

export const getNutritionDashboard = async (studentId: number) => {
  const { data } = await api.get(`/nutrition/dashboard/${studentId}`);
  return data;
};

export const getWeeklySummary = async (studentId: number) => {
  const { data } = await api.get(`/nutrition/weekly/${studentId}`);
  return data;
};

export interface CaloriesWeeklyStats {
  hasData: boolean;
  weeks: Array<{
    weekNumber: number;
    weekStart: string;
    weekEnd: string;
    averageCalories: number;
    averageProtein: number;
    averageCarbs: number;
    averageFat: number;
    daysWithData: number;
    variationCalories: number | null;
    variationPercent: number | null;
  }>;
  targets: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  summary: {
    totalRecords: number;
    totalWeeks: number;
    currentAverage: number | null;
    initialAverage: number | null;
    totalChange: number | null;
    totalChangePercent: number | null;
    avgWeeklyChange: number | null;
  };
}

export const getCaloriesWeeklyStats = async (studentId: number, weeks = 12): Promise<CaloriesWeeklyStats> => {
  const { data } = await api.get(`/nutrition/stats/${studentId}/weekly-stats?weeks=${weeks}`);
  return data;
};

// ========== COACH FOOD CATALOG ==========

export interface FoodItem {
  id: number;
  name: string;
  category: string;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  sodiumPer100g?: number;
  caloriesPer100g: number;
  portionGrams: number;
}

export interface FoodCategory {
  value: string;
  label: string;
}

export const getCoachFoodItems = async (filters?: { search?: string; category?: string }): Promise<FoodItem[]> => {
  const params = new URLSearchParams();
  if (filters?.category) params.append("category", filters.category);
  if (filters?.search) params.append("search", filters.search);
  const { data } = await api.get(`/nutrition/coach/foods?${params.toString()}`);
  return data;
};

export const getCategories = async (): Promise<FoodCategory[]> => {
  const { data } = await api.get("/nutrition/categories");
  return data;
};

export const createCoachFoodItem = async (food: {
  name: string;
  category: string;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  sodiumPer100g?: number;
  portionGrams: number;
}): Promise<FoodItem> => {
  const { data } = await api.post("/nutrition/coach/foods", food);
  return data;
};

export const updateCoachFoodItem = async (
  foodId: number,
  food: {
    name: string;
    category: string;
    carbsPer100g: number;
    proteinPer100g: number;
    fatPer100g: number;
    fiberPer100g?: number;
    sodiumPer100g?: number;
    portionGrams: number;
  }
): Promise<FoodItem> => {
  const { data } = await api.put(`/nutrition/coach/foods/${foodId}`, food);
  return data;
};

export const deleteCoachFoodItem = async (foodId: number): Promise<void> => {
  await api.delete(`/nutrition/coach/foods/${foodId}`);
};

export const initializeCoachCatalog = async (): Promise<{ created: number; message: string }> => {
  const { data } = await api.post("/nutrition/coach/foods/initialize");
  return data;
};

// Alimentos personalizados de alumnos (para el coach)
export interface StudentCustomFood extends FoodItem {
  studentId: number;
  createdById: number;
  createdAt: string;
}

export interface StudentFoodsGroup {
  studentId: number;
  studentName: string;
  foods: StudentCustomFood[];
}

export interface StudentCustomFoodsResponse {
  foods: StudentCustomFood[];
  byStudent: StudentFoodsGroup[];
}

export const getStudentCustomFoods = async (): Promise<StudentCustomFoodsResponse> => {
  const { data } = await api.get("/nutrition/coach/student-foods");
  return data;
};

export const getStudentFoodById = async (foodId: number): Promise<StudentCustomFood & { studentName: string }> => {
  const { data } = await api.get(`/nutrition/coach/student-foods/${foodId}`);
  return data;
};

