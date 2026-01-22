"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getStudentById, updateStudentGoals, updateStudentPermissions } from "@/lib/api/coach";
import { getNutritionProfile, updateNutritionProfile } from "@/lib/api/nutrition";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Scale,
  Footprints,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Calculator,
  Save,
  User,
  Shield,
  TrendingDown,
  TrendingUp,
  Equal,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Student } from "@/types";
import api from "@/lib/api";

interface NutritionProfile {
  sex?: string;
  age?: number;
  currentWeight?: number;
  heightCm?: number;
  bodyFatPercentage?: number;
  trainingDaysPerWeek?: number;
  activityFactor?: number;
  targetDailyCalories?: number;
  targetProteinGrams?: number;
  targetCarbsGrams?: number;
  targetFatGrams?: number;
  notes?: string;
}

const ACTIVITY_LEVELS = [
  { value: "0.10", label: "Sedentario" },
  { value: "0.15", label: "Ligero" },
  { value: "0.20", label: "Moderado" },
  { value: "0.25", label: "Activo" },
  { value: "0.30", label: "Muy activo" },
];

const GOALS = [
  { value: "deficit", label: "Bajar peso", icon: TrendingDown, color: "text-red-400", factor: 0.85 },
  { value: "maintenance", label: "Mantener", icon: Equal, color: "text-green-400", factor: 1.0 },
  { value: "surplus", label: "Subir peso", icon: TrendingUp, color: "text-blue-400", factor: 1.1 },
];

export default function StudentSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Number(params.studentId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [nutritionProfile, setNutritionProfile] = useState<NutritionProfile | null>(null);
  const dataFetched = useRef(false);

  // Form states
  const [sex, setSex] = useState("M");
  const [age, setAge] = useState("25");
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("170");
  const [bodyFat, setBodyFat] = useState("15");
  const [trainingDays, setTrainingDays] = useState("4");
  const [activityFactor, setActivityFactor] = useState("0.15");
  const [goal, setGoal] = useState("maintenance");
  
  // Macros
  const [targetCalories, setTargetCalories] = useState("2000");
  const [targetProtein, setTargetProtein] = useState("150");
  const [targetCarbs, setTargetCarbs] = useState("200");
  const [targetFat, setTargetFat] = useState("70");
  
  // Goals
  const [dailyStepsGoal, setDailyStepsGoal] = useState("8000");
  const [minimumDailySteps, setMinimumDailySteps] = useState("5000");
  const [weeklyWeightGoal, setWeeklyWeightGoal] = useState("0");
  
  // Permissions
  const [canAccessRoutine, setCanAccessRoutine] = useState(true);
  const [canAccessNutrition, setCanAccessNutrition] = useState(true);
  const [canAccessWeight, setCanAccessWeight] = useState(true);
  const [canAccessCardio, setCanAccessCardio] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (dataFetched.current) return;
      dataFetched.current = true;

      try {
        setLoading(true);
        const [studentData, profileData] = await Promise.all([
          getStudentById(studentId),
          getNutritionProfile(studentId).catch(() => null),
        ]);
        
        setStudent(studentData);
        setNutritionProfile(profileData);

        // Set form values from student
        if (studentData) {
          setDailyStepsGoal(studentData.dailyStepsGoal?.toString() || "8000");
          setMinimumDailySteps(studentData.minimumDailySteps?.toString() || "5000");
          setWeeklyWeightGoal(studentData.weeklyWeightGoal?.toString() || "0");
          // Permisos - por defecto todo activo si no está definido
          setCanAccessRoutine(studentData.canAccessRoutine !== false);
          setCanAccessNutrition(studentData.canAccessNutrition !== false);
          setCanAccessWeight(studentData.canAccessWeight !== false);
          setCanAccessCardio(studentData.canAccessCardio !== false);
        }

        // Set form values from nutrition profile
        if (profileData) {
          setSex(profileData.sex || "M");
          setAge(profileData.age?.toString() || "25");
          setWeight(profileData.currentWeight?.toString() || "70");
          setHeight(profileData.heightCm?.toString() || "170");
          setBodyFat(profileData.bodyFatPercentage?.toString() || "15");
          setTrainingDays(profileData.trainingDaysPerWeek?.toString() || "4");
          setActivityFactor(profileData.activityFactor?.toString() || "0.15");
          setTargetCalories(profileData.targetDailyCalories?.toString() || "2000");
          setTargetProtein(profileData.targetProteinGrams?.toString() || "150");
          setTargetCarbs(profileData.targetCarbsGrams?.toString() || "200");
          setTargetFat(profileData.targetFatGrams?.toString() || "70");
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        toast.error("Error al cargar configuración");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  // Auto-calculate calories from macros
  const calculateCaloriesFromMacros = () => {
    const p = parseInt(targetProtein) || 0;
    const c = parseInt(targetCarbs) || 0;
    const f = parseInt(targetFat) || 0;
    return (p * 4) + (c * 4) + (f * 9);
  };

  // When macros change, update calories
  useEffect(() => {
    const newCalories = calculateCaloriesFromMacros();
    setTargetCalories(newCalories.toString());
  }, [targetProtein, targetCarbs, targetFat]);

  // Calculate suggested values
  const handleCalculate = async () => {
    try {
      setCalculating(true);
      
      const { data } = await api.post("/nutrition/profile/calculate-calories", {
        weight: parseFloat(weight),
        heightCm: parseFloat(height),
        age: parseInt(age),
        sex,
        activityFactor: parseFloat(activityFactor),
        trainingDaysPerWeek: parseInt(trainingDays),
      });

      const goalConfig = GOALS.find(g => g.value === goal);
      const factor = goalConfig?.factor || 1.0;
      const maintenance = data.maintenance || 2000;
      const adjustedCalories = Math.round(maintenance * factor);
      
      // Calculate macros
      const w = parseFloat(weight);
      const protein = Math.round(w * 1.8); // 1.8g/kg
      const fat = Math.round(w * 0.8);     // 0.8g/kg
      const proteinCal = protein * 4;
      const fatCal = fat * 9;
      const carbsCal = adjustedCalories - proteinCal - fatCal;
      const carbs = Math.max(Math.round(carbsCal / 4), 100);

      setTargetProtein(protein.toString());
      setTargetCarbs(carbs.toString());
      setTargetFat(fat.toString());
      setTargetCalories(adjustedCalories.toString());

      toast.success(`TMB: ${data.tmb} kcal | Mantenimiento: ${maintenance} kcal | Ajustado: ${adjustedCalories} kcal`);
    } catch (error) {
      console.error("Error calculating:", error);
      toast.error("Error al calcular calorías");
    } finally {
      setCalculating(false);
    }
  };

  // Save all settings
  const handleSave = async () => {
    try {
      setSaving(true);

      // Save nutrition profile
      await updateNutritionProfile(studentId, {
        sex,
        age: parseInt(age),
        currentWeight: parseFloat(weight),
        heightCm: parseFloat(height),
        bodyFatPercentage: parseFloat(bodyFat),
        trainingDaysPerWeek: parseInt(trainingDays),
        activityFactor: parseFloat(activityFactor),
        targetDailyCalories: parseInt(targetCalories),
        targetProteinGrams: parseInt(targetProtein),
        targetCarbsGrams: parseInt(targetCarbs),
        targetFatGrams: parseInt(targetFat),
      });

      // Save goals
      await updateStudentGoals(studentId, {
        dailyStepsGoal: parseInt(dailyStepsGoal),
        minimumDailySteps: parseInt(minimumDailySteps),
        weeklyWeightGoal: parseInt(weeklyWeightGoal),
      });

      // Save permissions
      await updateStudentPermissions(studentId, {
        canAccessRoutine,
        canAccessNutrition,
        canAccessWeight,
        canAccessCardio,
      });

      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Configuración" backHref={`/coach/students/${studentId}`} />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={`Configuración`}
        subtitle={student ? `${student.firstName} ${student.lastName}` : undefined}
        backHref={`/coach/students/${studentId}`}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Nutrition Profile */}
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Objetivos Nutricionales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Personal Data Row */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs text-text-muted">Sexo</Label>
                <Select value={sex} onValueChange={setSex}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-text-muted">Edad</Label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-text-muted">Peso (kg)</Label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-text-muted">Altura (cm)</Label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Activity Row */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-text-muted">% Grasa</Label>
                <Input
                  type="number"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-text-muted">Días/sem</Label>
                <Input
                  type="number"
                  min="0"
                  max="7"
                  value={trainingDays}
                  onChange={(e) => setTrainingDays(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-text-muted">Actividad</Label>
                <Select value={activityFactor} onValueChange={setActivityFactor}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Goal Selection */}
            <div>
              <Label className="text-xs text-text-muted mb-2 block">Objetivo</Label>
              <div className="grid grid-cols-3 gap-2">
                {GOALS.map((g) => {
                  const Icon = g.icon;
                  return (
                    <button
                      key={g.value}
                      onClick={() => setGoal(g.value)}
                      className={cn(
                        "p-3 rounded-lg border text-center transition-all",
                        goal === g.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/50 hover:bg-background"
                      )}
                    >
                      <Icon className={cn("w-5 h-5 mx-auto mb-1", g.color)} />
                      <span className="text-xs font-medium text-text">{g.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calculate Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCalculate}
              disabled={calculating}
            >
              {calculating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              Calcular Calorías Sugeridas
            </Button>

            <Separator />

            {/* Calories Display */}
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-4 text-center border border-primary/30">
              <p className="text-xs text-text-muted mb-1">Calorías diarias (auto)</p>
              <p className="text-3xl font-bold text-primary">{targetCalories}</p>
              <p className="text-sm text-primary">kcal</p>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-3 gap-2">
              {/* Protein */}
              <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/30">
                <Beef className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <Label className="text-[10px] text-red-400">Proteína</Label>
                <Input
                  type="number"
                  value={targetProtein}
                  onChange={(e) => setTargetProtein(e.target.value)}
                  className="h-10 text-center text-lg font-bold mt-1"
                />
                <span className="text-xs text-red-400">g</span>
              </div>

              {/* Carbs */}
              <div className="bg-amber-500/10 rounded-lg p-3 text-center border border-amber-500/30">
                <Wheat className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <Label className="text-[10px] text-amber-400">Carbos</Label>
                <Input
                  type="number"
                  value={targetCarbs}
                  onChange={(e) => setTargetCarbs(e.target.value)}
                  className="h-10 text-center text-lg font-bold mt-1"
                />
                <span className="text-xs text-amber-400">g</span>
              </div>

              {/* Fat */}
              <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/30">
                <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <Label className="text-[10px] text-blue-400">Grasas</Label>
                <Input
                  type="number"
                  value={targetFat}
                  onChange={(e) => setTargetFat(e.target.value)}
                  className="h-10 text-center text-lg font-bold mt-1"
                />
                <span className="text-xs text-blue-400">g</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Goals */}
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Footprints className="w-4 h-4 text-accent" />
              Objetivos de Actividad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Steps Goal */}
            <div>
              <Label className="text-xs text-text-muted flex items-center gap-2 mb-2">
                <Footprints className="w-3 h-3" />
                Meta de pasos diarios
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={dailyStepsGoal}
                  onChange={(e) => setDailyStepsGoal(e.target.value)}
                  className="flex-1"
                  placeholder="8000"
                />
                <Badge variant="outline" className="px-3">pasos/día</Badge>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Recomendado: 8,000 - 10,000 pasos diarios
              </p>
            </div>

            {/* Minimum Steps */}
            <div>
              <Label className="text-xs text-text-muted flex items-center gap-2 mb-2">
                <Footprints className="w-3 h-3" />
                Mínimo de pasos diarios
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={minimumDailySteps}
                  onChange={(e) => setMinimumDailySteps(e.target.value)}
                  className="flex-1"
                  placeholder="5000"
                />
                <Badge variant="outline" className="px-3">pasos/día</Badge>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Si no puede llegar a la meta, al menos que cumpla este mínimo
              </p>
            </div>

            {/* Weight Goal */}
            <div>
              <Label className="text-xs text-text-muted flex items-center gap-2 mb-2">
                <Scale className="w-3 h-3" />
                Meta de cambio de peso semanal
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={weeklyWeightGoal}
                  onChange={(e) => setWeeklyWeightGoal(e.target.value)}
                  className="flex-1"
                  placeholder="0"
                />
                <Badge variant="outline" className="px-3">g/semana</Badge>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Negativo para déficit (ej: -250), positivo para volumen (ej: +200), 0 para mantener
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="bg-surface/80 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-warning" />
              Permisos del Alumno
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text">Ver Rutina</span>
              </div>
              <Switch
                checked={canAccessRoutine}
                onCheckedChange={setCanAccessRoutine}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text">Ver Nutrición</span>
              </div>
              <Switch
                checked={canAccessNutrition}
                onCheckedChange={setCanAccessNutrition}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text">Registrar Peso</span>
              </div>
              <Switch
                checked={canAccessWeight}
                onCheckedChange={setCanAccessWeight}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text">Registrar Pasos</span>
              </div>
              <Switch
                checked={canAccessCardio}
                onCheckedChange={setCanAccessCardio}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          className="w-full h-12 bg-gradient-to-r from-primary to-primary-hover text-black font-semibold"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

