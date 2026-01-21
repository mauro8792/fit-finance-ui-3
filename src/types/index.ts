// Re-export routine v2 types
export * from './routine-v2';

// ========== AUTH ==========
export interface User {
  id: number;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: Role[];
}

export interface Role {
  id: number;
  name: string;
}

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  startDate: string;
  document: string;
  isActive: boolean;
  userId: number;
  coachId: number;
  sportId: number;
  permissions: StudentPermissions;
  dailyStepsGoal: number;
  weeklyWeightGoal: number | null;
  user?: User;
  sportPlan?: {
    id: number;
    name: string;
    monthlyFee?: number;
    weeklyFrequency?: number;
  };
  effectiveMonthlyFee?: number;
  email?: string;
  objective?: string;
  canAccessRoutine?: boolean;
  canAccessNutrition?: boolean;
  canAccessWeight?: boolean;
  canAccessCardio?: boolean;
}

export interface StudentPermissions {
  canAccessRoutine: boolean;
  canAccessNutrition: boolean;
  canAccessWeight: boolean;
  canAccessCardio: boolean;
  canAccessProgress: boolean;
}

export interface Coach {
  id: number;
  userId: number;
  specialization?: string;
  experience?: string;
  certification?: string;
  bio?: string;
  isActive: boolean;
  paymentAlias?: string;
  paymentNotes?: string;
  defaultFeeAmount?: number;
  user?: User;
}

export type UserType = "student" | "coach" | "admin" | "superadmin" | null;

export interface AuthState {
  status: "checking" | "authenticated" | "not-authenticated" | "select-profile";
  user: User | null;
  student: Student | null;
  coach: Coach | null;
  userType: UserType;
  token: string | null;
  error: string | null;
}

// ========== ROUTINE ==========
export interface Macrocycle {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  studentId: number;
  mesocycles: Mesocycle[];
}

export interface Mesocycle {
  id: number;
  name: string;
  description?: string;
  objetivo?: string;
  status?: "active" | "completed" | "pending" | "draft" | "published";
  startDate: string;
  endDate?: string;
  order: number;
  macrocycleId: number;
  microcycles: Microcycle[];
}

export interface Microcycle {
  id: number;
  name: string;
  description?: string;
  weekNumber: number;
  isDeload?: boolean;
  startDate: string;
  endDate?: string;
  mesocycleId: number;
  days: Day[];
}

export interface Day {
  id: number;
  dia: number;
  nombre: string;
  esDescanso?: boolean;
  fecha?: string;
  exercises: Exercise[];
}

export interface Exercise {
  id: number;
  orden: number;
  exerciseCatalogId?: number;
  exerciseCatalog?: CatalogExercise;
  series: string;
  repeticiones: string;
  descanso: string;
  rirEsperado: string;
  sets: Set[];
  catalogExercise?: CatalogExercise;
}

export interface Set {
  id: number;
  reps: string;
  load: number;
  expectedRir?: string;
  actualRir?: number;
  actualRpe?: number;
  notes?: string;
  order?: number;
  isExtra?: boolean;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  isAmrap?: boolean;
  amrapInstruction?: string;
  amrapNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogExercise {
  id: number;
  name: string;
  description?: string;
  muscleGroup: string;
  equipment?: string;
  videoUrl?: string;
  imageUrl?: string;
}

// ========== NUTRITION ==========
export interface NutritionProfile {
  id: number;
  studentId: number;
  sex?: string;
  age?: number;
  currentWeight?: number;
  heightCm?: number;
  bodyFatPercentage?: number;
  trainingDaysPerWeek: number;
  targetDailyCalories: number;
  targetProteinPerKg: number;
  targetFatPerKg: number;
  targetCarbsPerKg: number;
  targetProteinGrams?: number;
  targetFatGrams?: number;
  targetCarbsGrams?: number;
}

export interface FoodItem {
  id: number;
  name: string;
  category: string;
  portionGrams: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  caloriesPer100g: number;
  studentId?: number;
  coachId?: number;
}

export interface MealType {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  studentId: number;
}

export interface DailyFoodLog {
  id: number;
  studentId: number;
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  targetCalories?: number;
  targetProtein?: number;
  targetFat?: number;
  targetCarbs?: number;
  entries: FoodLogEntry[];
}

export interface FoodLogEntry {
  id: number;
  dailyLogId: number;
  foodItemId?: number;
  recipeId?: number;
  mealTypeId?: number;
  quantityGrams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  foodItem?: FoodItem;
  mealType?: MealType;
}

// ========== HEALTH ==========
export interface WeightLog {
  id: number;
  date: string;
  weight: number;
  notes?: string;
}

export interface Anthropometry {
  id: number;
  studentId: number;
  date: string;
  weight?: number;
  
  // Perímetros (cm)
  perimetroBrazoRelajado?: number;
  perimetroBrazoContraido?: number;
  perimetroAntebrazo?: number;
  perimetroTorax?: number;
  perimetroCintura?: number;
  perimetroCaderas?: number;
  perimetroMusloSuperior?: number;
  perimetroMusloMedial?: number;
  perimetroPantorrilla?: number;
  
  // Pliegues cutáneos (mm)
  plieguePantorrilla?: number;
  pliegueTriceps?: number;
  pliegueSubescapular?: number;
  pliegueSupraespinal?: number;
  pliegueAbdominal?: number;
  pliegueMusloMedial?: number;
  sumaPliegues?: number;
  
  // Composición corporal (calculada)
  porcentajeGrasa?: number;
  porcentajeMuscular?: number;
  masaGrasaKg?: number;
  masaMagraKg?: number;
  
  // Fotos (URLs de Cloudinary)
  photoFront?: string;
  photoSide?: string;
  photoBack?: string;
  
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeightStats {
  currentWeight: number | null;
  initialWeight: number | null;
  weightChange: number | null;
  weeklyTrend: number | null;
  totalDays: number;
}

// ========== CARDIO ==========
export interface CardioLog {
  id: number;
  studentId: number;
  date: string;
  activityType: string;
  durationMinutes: number;
  distanceKm?: number;
  caloriesBurned?: number;
  intensity: "low" | "medium" | "high";
  steps?: number;
  notes?: string;
}

// ========== FEES ==========
export interface Fee {
  id: number;
  studentId: number;
  studentName?: string;
  studentPhone?: string;
  month?: number;
  year?: number;
  monthName?: string;
  // API puede devolver 'value' o 'amount'
  value?: number;
  amount?: number;
  amountPaid?: number;
  remainingAmount?: number;
  dueDate: string;
  dueDayOfMonth?: number;
  status: "pending" | "partial" | "paid" | "overdue" | "completed";
  paidAmount?: number;
  paidDate?: string;
  description?: string;
  sportName?: string;
  sportPlanName?: string;
  isOverdue?: boolean;
  isCurrent?: boolean;
}

export interface Payment {
  id: number;
  feeId: number;
  studentId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
}

// ========== DASHBOARD ==========
export interface DashboardSummary {
  student: {
    id: number;
    firstName: string;
    lastName: string;
  };
  week: {
    start: string;
    end: string;
  };
  steps: {
    dailyGoal: number;
    weekAverage: number;
    weekTotal: number;
    daysWithData: number;
    today?: number; // Pasos de hoy
    todayPercent?: number; // % del objetivo de hoy
    compliancePercent?: number; // % del promedio semanal (para compatibilidad)
  };
  weight: {
    current: number | null; // Promedio semana actual
    lastWeight: number | null; // Último peso registrado
    weeklyGoal: number | null;
    weeklyChange: number | null; // Diferencia en gramos vs semana anterior
    previousWeekAverage: number | null;
    daysWithDataCurrentWeek?: number;
    daysWithDataPreviousWeek?: number;
  };
}

